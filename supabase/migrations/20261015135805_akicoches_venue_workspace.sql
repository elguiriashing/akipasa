-- AkiCoches is managed from a venue workspace, while remaining a distinct
-- rental catalogue. Legacy operator-only companies remain valid with venue_id null.
alter table public.car_rental_companies
  add column if not exists venue_id uuid references public.venues(id) on delete set null;

-- One operator may manage several venues; the old single-company workspace is
-- retained as a legacy fallback and chooses one deterministic company.
drop index if exists public.car_rental_companies_one_per_owner_idx;
create index if not exists car_rental_companies_owner_idx
  on public.car_rental_companies(submitted_by);
create unique index if not exists car_rental_companies_one_per_venue_idx
  on public.car_rental_companies(venue_id) where venue_id is not null;
create index if not exists car_rental_companies_venue_idx
  on public.car_rental_companies(venue_id);

alter table public.car_rental_vehicles
  add column if not exists cover_media_id uuid references public.venue_media(id) on delete set null;

create or replace function public.guard_car_rental_cover_venue()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.cover_media_id is not null and not exists (
    select 1 from public.car_rental_companies c
    join public.venue_media m on m.venue_id = c.venue_id
    where c.id = new.company_id and m.id = new.cover_media_id
  ) then
    raise exception 'vehicle cover must belong to its venue' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_car_rental_cover_venue() from public, anon, authenticated;
create trigger car_rental_cover_venue
before insert or update of company_id, cover_media_id on public.car_rental_vehicles
for each row execute function public.guard_car_rental_cover_venue();

-- A legacy operator may create an unlinked company, but linking to a venue
-- requires that venue's owner/manager role. Never accept a client-supplied
-- venue ID on the strength of submitted_by alone.
drop policy if exists car_rental_companies_owner_insert on public.car_rental_companies;
create policy car_rental_companies_owner_insert
  on public.car_rental_companies for insert to authenticated
  with check (
    submitted_by = (select auth.uid()) and status = 'pending_review'
    and (venue_id is null or public.is_venue_member(
      venue_id, array['owner','manager']::public.venue_member_role[]
    ))
  );

-- Venue managers can review requests and maintain blocked dates for only their
-- linked fleet. Existing legacy-owner and public availability policies remain.
create policy car_rental_bookings_venue_manager_read
  on public.car_rental_bookings for select to authenticated
  using (exists (
    select 1 from public.car_rental_vehicles v
    join public.car_rental_companies c on c.id = v.company_id
    where v.id = vehicle_id and c.venue_id is not null
      and public.is_venue_member(c.venue_id, array['owner','manager']::public.venue_member_role[])
  ));
create policy car_rental_calendar_venue_manager_insert
  on public.car_rental_calendar_blocks for insert to authenticated
  with check (reason = 'maintenance' and exists (
    select 1 from public.car_rental_vehicles v
    join public.car_rental_companies c on c.id = v.company_id
    where v.id = vehicle_id and c.venue_id is not null
      and public.is_venue_member(c.venue_id, array['owner','manager']::public.venue_member_role[])
  ));
create policy car_rental_calendar_venue_manager_delete
  on public.car_rental_calendar_blocks for delete to authenticated
  using (reason = 'maintenance' and exists (
    select 1 from public.car_rental_vehicles v
    join public.car_rental_companies c on c.id = v.company_id
    where v.id = vehicle_id and c.venue_id is not null
      and public.is_venue_member(c.venue_id, array['owner','manager']::public.venue_member_role[])
  ));

-- Preserve the concurrency lock, legal state transitions and renter cancellation
-- contract; extend authorization only to the linked venue owner/manager.
create or replace function public.set_car_rental_booking_status(
  p_booking uuid,
  p_status text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.car_rental_bookings%rowtype;
  owner_id uuid;
  linked_venue uuid;
begin
  if (select auth.uid()) is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_status not in ('confirmed','declined','cancelled','completed') then raise exception 'invalid booking status' using errcode = '22023'; end if;
  select * into b from public.car_rental_bookings where id = p_booking for update;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;
  select c.submitted_by, c.venue_id into owner_id, linked_venue
    from public.car_rental_vehicles v join public.car_rental_companies c on c.id = v.company_id
    where v.id = b.vehicle_id;
  if b.renter_id <> (select auth.uid()) and owner_id <> (select auth.uid())
     and (linked_venue is null or not public.is_venue_member(linked_venue, array['owner','manager']::public.venue_member_role[])) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if b.renter_id = (select auth.uid()) and p_status <> 'cancelled' then
    raise exception 'renter may only cancel a request' using errcode = '42501';
  end if;
  if p_status = 'confirmed' then
    perform pg_advisory_xact_lock(hashtextextended(b.vehicle_id::text, 0));
    if exists (
      select 1 from public.car_rental_calendar_blocks x
      where x.vehicle_id = b.vehicle_id
        and x.start_date < b.end_date and x.end_date > b.start_date
    ) then raise exception 'vehicle dates are no longer available' using errcode = 'PT409'; end if;
    if b.status not in ('requested') then raise exception 'booking cannot be confirmed from this state' using errcode = 'PT409'; end if;
    insert into public.car_rental_calendar_blocks(vehicle_id,start_date,end_date,reason)
      values (b.vehicle_id,b.start_date,b.end_date,'booking');
  elsif p_status = 'cancelled' then
    if b.status not in ('requested','confirmed') then raise exception 'booking cannot be cancelled from this state' using errcode = 'PT409'; end if;
    delete from public.car_rental_calendar_blocks
      where vehicle_id=b.vehicle_id and start_date=b.start_date and end_date=b.end_date and reason='booking';
  elsif p_status = 'declined' and b.status <> 'requested' then
    raise exception 'booking cannot be declined from this state' using errcode = 'PT409';
  elsif p_status = 'completed' and (b.status <> 'confirmed' or b.end_date > current_date) then
    raise exception 'only completed rentals can be completed' using errcode = 'PT409';
  end if;
  update public.car_rental_bookings set status = p_status, updated_at = now() where id = b.id;
end;
$$;
revoke all on function public.set_car_rental_booking_status(uuid,text) from public, anon;
grant execute on function public.set_car_rental_booking_status(uuid,text) to authenticated;

drop policy if exists car_rental_companies_public_read on public.car_rental_companies;
create policy car_rental_companies_public_read
  on public.car_rental_companies for select to anon, authenticated
  using (
    status = 'published' or submitted_by = (select auth.uid())
    or (venue_id is not null and public.is_venue_member(venue_id))
    or public.has_platform_role(array['moderator','administrator']::public.app_role[])
  );

-- A venue team may manage only the rental company connected to that venue.
drop policy if exists car_rental_companies_owner_update on public.car_rental_companies;
create policy car_rental_companies_owner_update
  on public.car_rental_companies for update to authenticated
  using (
    submitted_by = (select auth.uid())
    or (venue_id is not null and public.is_venue_member(venue_id, array['owner','manager']::public.venue_member_role[]))
    or public.has_platform_role(array['moderator','administrator']::public.app_role[])
  )
  with check (
    submitted_by = (select auth.uid())
    or (venue_id is not null and public.is_venue_member(venue_id, array['owner','manager']::public.venue_member_role[]))
    or public.has_platform_role(array['moderator','administrator']::public.app_role[])
  );

drop policy if exists car_rental_vehicles_operator_read on public.car_rental_vehicles;
-- Keep legacy owner policies for unlinked rental companies.
create policy car_rental_vehicles_venue_operator_insert
  on public.car_rental_vehicles for insert to authenticated
  with check (exists (
    select 1 from public.car_rental_companies c
    where c.id = company_id and c.venue_id is not null
      and public.is_venue_member(c.venue_id, array['owner','manager']::public.venue_member_role[])
      and (cover_media_id is null or exists (
        select 1 from public.venue_media m where m.id = cover_media_id and m.venue_id = c.venue_id
      ))
  ));
create policy car_rental_vehicles_venue_operator_update
  on public.car_rental_vehicles for update to authenticated
  using (exists (
    select 1 from public.car_rental_companies c
    where c.id = company_id and c.venue_id is not null
      and public.is_venue_member(c.venue_id, array['owner','manager']::public.venue_member_role[])
  ))
  with check (exists (
    select 1 from public.car_rental_companies c
    where c.id = company_id and c.venue_id is not null
      and public.is_venue_member(c.venue_id, array['owner','manager']::public.venue_member_role[])
      and (cover_media_id is null or exists (
        select 1 from public.venue_media m where m.id = cover_media_id and m.venue_id = c.venue_id
      ))
  ));

drop policy if exists car_rental_vehicles_read on public.car_rental_vehicles;
create policy car_rental_vehicles_read
  on public.car_rental_vehicles for select to anon, authenticated
  using (
    (active and exists (select 1 from public.car_rental_companies c where c.id = company_id and c.status = 'published'))
    or exists (select 1 from public.car_rental_companies c where c.id = company_id and (
      c.submitted_by = (select auth.uid()) or (c.venue_id is not null and public.is_venue_member(c.venue_id))
      or public.has_platform_role(array['moderator','administrator']::public.app_role[])
    ))
  );
