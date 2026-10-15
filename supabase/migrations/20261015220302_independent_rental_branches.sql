-- Independent AkiCoches branches. Existing fleet/bookings retain their IDs.
create table public.car_rental_company_members (
 company_id uuid not null references public.car_rental_companies(id) on delete cascade,
 profile_id uuid not null references public.profiles(id) on delete cascade,
 role text not null check(role in ('owner','manager')),
 primary key(company_id,profile_id)
);
-- Preserve existing explicit management grants as a one-time snapshot, not a live venue link.
insert into public.car_rental_company_members(company_id,profile_id,role)
 select c.id,m.profile_id,m.role::text from public.car_rental_companies c
 join public.venue_members m on m.venue_id=c.venue_id
 where m.role::text in ('owner','manager') on conflict do nothing;
alter table public.car_rental_company_members enable row level security;
revoke all on public.car_rental_company_members from public,anon,authenticated;
grant select on public.car_rental_company_members to authenticated;
grant all on public.car_rental_company_members to service_role;
create policy rental_member_self on public.car_rental_company_members for select to authenticated using(profile_id=(select auth.uid()));

create function public.can_manage_rental_company(p_company uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
 select 1 from public.car_rental_companies c where c.id=p_company and
 (c.submitted_by=auth.uid() or exists(select 1 from public.car_rental_company_members m
 where m.company_id=c.id and m.profile_id=auth.uid() and m.role in ('owner','manager'))))
$$;
revoke all on function public.can_manage_rental_company(uuid) from public;
grant execute on function public.can_manage_rental_company(uuid) to anon,authenticated,service_role;

create table public.car_rental_media (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.car_rental_companies(id) on delete cascade,
 storage_bucket text not null default 'rental-media' check(storage_bucket in ('rental-media','event-media')),
 storage_path text not null,
 alt text not null default '' check(length(alt)<=180),
 size_bytes bigint not null default 0 check(size_bytes between 0 and 8388608),
 legacy_media_id uuid,
 created_at timestamptz not null default now(),
 unique(company_id,legacy_media_id), unique(storage_bucket,storage_path,company_id)
);
alter table public.car_rental_media enable row level security;
revoke all on public.car_rental_media from public,anon,authenticated;
grant select on public.car_rental_media to anon,authenticated;
grant insert,update,delete on public.car_rental_media to authenticated;
grant all on public.car_rental_media to service_role;
alter table public.car_rental_vehicles add column rental_media_id uuid references public.car_rental_media(id) on delete set null;
alter table public.car_rental_companies add column logo_media_id uuid references public.car_rental_media(id) on delete set null,
 add column hero_media_id uuid references public.car_rental_media(id) on delete set null;
grant update(logo_media_id,hero_media_id) on public.car_rental_companies to authenticated;
-- Import only previously selected vehicle covers into the branch's own inventory.
-- The owner workspace copies legacy bytes into rental-media before changing these paths.
insert into public.car_rental_media(company_id,storage_bucket,storage_path,alt,size_bytes,legacy_media_id)
 select distinct v.company_id,'event-media',m.storage_path,left(coalesce(m.alt_es,m.alt_en,''),180),coalesce(m.size_bytes,0),m.id
 from public.car_rental_vehicles v join public.venue_media m on m.id=v.cover_media_id;
update public.car_rental_vehicles v set rental_media_id=m.id
 from public.car_rental_media m where m.company_id=v.company_id and m.legacy_media_id=v.cover_media_id;
update public.car_rental_vehicles set cover_media_id=null where cover_media_id is not null;
create or replace function public.guard_car_rental_company_review_state() returns trigger language plpgsql set search_path='' as $$
begin
 if (auth.uid() is null and current_user in ('postgres','service_role')) or public.has_platform_role(array['moderator','administrator']::public.app_role[]) then return new; end if;
 if public.can_manage_rental_company(old.id) and new.status is not distinct from old.status and new.submitted_by=old.submitted_by and new.venue_id is not distinct from old.venue_id and new.reviewed_by is not distinct from old.reviewed_by and new.reviewed_at is not distinct from old.reviewed_at and new.review_note is not distinct from old.review_note then return new; end if;
 raise exception 'listing review state is staff-controlled' using errcode='42501';
end $$;

-- Service-only migration audit; never used for runtime authorization or profile/media reads.
create table public.car_rental_legacy_venue_links(company_id uuid primary key,venue_id uuid not null,detached_at timestamptz not null default now());
alter table public.car_rental_legacy_venue_links enable row level security;
revoke all on public.car_rental_legacy_venue_links from public,anon,authenticated;
grant select on public.car_rental_legacy_venue_links to service_role;
insert into public.car_rental_legacy_venue_links(company_id,venue_id) select id,venue_id from public.car_rental_companies where venue_id is not null;
update public.car_rental_companies set venue_id=null where venue_id is not null;
revoke execute on function public.link_owned_rental_company_venue(uuid,uuid) from authenticated;

create function public.guard_independent_rental_media() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='car_rental_vehicles' then
  if new.rental_media_id is not null and not exists(select 1 from public.car_rental_media m where m.id=new.rental_media_id and m.company_id=new.company_id) then
   raise exception 'media must belong to this branch' using errcode='23514'; end if;
 else
  if (new.logo_media_id is not null and not exists(select 1 from public.car_rental_media m where m.id=new.logo_media_id and m.company_id=new.id)) or (new.hero_media_id is not null and not exists(select 1 from public.car_rental_media m where m.id=new.hero_media_id and m.company_id=new.id)) then
   raise exception 'media must belong to this branch' using errcode='23514'; end if;
 end if;
 return new;
end $$;
revoke all on function public.guard_independent_rental_media() from public,anon,authenticated;
create trigger independent_vehicle_media before insert or update of company_id,rental_media_id on public.car_rental_vehicles for each row execute function public.guard_independent_rental_media();
create trigger independent_branch_media before insert or update of logo_media_id,hero_media_id on public.car_rental_companies for each row execute function public.guard_independent_rental_media();

-- Replace venue-derived access with independent branch membership.
do $$ declare p record; begin
 for p in select tablename,policyname from pg_policies where schemaname='public' and tablename in('car_rental_companies','car_rental_vehicles','car_rental_calendar_blocks','car_rental_bookings') loop
 execute format('drop policy %I on public.%I',p.policyname,p.tablename); end loop;
end $$;
create policy rental_branch_read on public.car_rental_companies for select to anon,authenticated using(status='published' or public.can_manage_rental_company(id) or public.has_platform_role(array['moderator','administrator']::public.app_role[]));
create policy rental_branch_insert on public.car_rental_companies for insert to authenticated with check(submitted_by=auth.uid() and status='pending_review' and venue_id is null);
create policy rental_branch_update on public.car_rental_companies for update to authenticated using(public.can_manage_rental_company(id) or public.has_platform_role(array['moderator','administrator']::public.app_role[])) with check(public.can_manage_rental_company(id) or public.has_platform_role(array['moderator','administrator']::public.app_role[]));
create policy rental_vehicle_read on public.car_rental_vehicles for select to anon,authenticated using(public.can_manage_rental_company(company_id) or exists(select 1 from public.car_rental_companies c where c.id=company_id and c.status='published' and active));
create policy rental_vehicle_insert on public.car_rental_vehicles for insert to authenticated with check(public.can_manage_rental_company(company_id) and cover_media_id is null);
create policy rental_vehicle_update on public.car_rental_vehicles for update to authenticated using(public.can_manage_rental_company(company_id)) with check(public.can_manage_rental_company(company_id) and cover_media_id is null);
create policy rental_vehicle_delete on public.car_rental_vehicles for delete to authenticated using(public.can_manage_rental_company(company_id));
create policy rental_calendar_read on public.car_rental_calendar_blocks for select to anon,authenticated using(exists(select 1 from public.car_rental_vehicles v join public.car_rental_companies c on c.id=v.company_id where v.id=vehicle_id and (public.can_manage_rental_company(c.id) or (c.status='published' and v.active))));
create policy rental_calendar_insert on public.car_rental_calendar_blocks for insert to authenticated with check(reason='maintenance' and exists(select 1 from public.car_rental_vehicles v where v.id=vehicle_id and public.can_manage_rental_company(v.company_id)));
create policy rental_calendar_delete on public.car_rental_calendar_blocks for delete to authenticated using(reason='maintenance' and exists(select 1 from public.car_rental_vehicles v where v.id=vehicle_id and public.can_manage_rental_company(v.company_id)));
create policy rental_booking_read on public.car_rental_bookings for select to authenticated using(renter_id=auth.uid() or exists(select 1 from public.car_rental_vehicles v where v.id=vehicle_id and public.can_manage_rental_company(v.company_id)));
create policy rental_media_manage_read on public.car_rental_media for select to authenticated using(public.can_manage_rental_company(company_id));
create policy rental_media_public_read on public.car_rental_media for select to anon,authenticated using(exists(select 1 from public.car_rental_companies c where c.id=company_id and c.status='published' and (car_rental_media.id in(c.logo_media_id,c.hero_media_id) or exists(select 1 from public.car_rental_vehicles v where v.company_id=c.id and v.active and v.rental_media_id=car_rental_media.id))));
create policy rental_media_insert on public.car_rental_media for insert to authenticated with check(public.can_manage_rental_company(company_id) and storage_bucket='rental-media' and split_part(storage_path,'/',1)=company_id::text);
create policy rental_media_update on public.car_rental_media for update to authenticated using(public.can_manage_rental_company(company_id)) with check(public.can_manage_rental_company(company_id) and storage_bucket='rental-media' and split_part(storage_path,'/',1)=company_id::text);
create policy rental_media_delete on public.car_rental_media for delete to authenticated using(public.can_manage_rental_company(company_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('rental-media','rental-media',false,8388608,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy rental_objects_read on storage.objects for select to anon,authenticated using(
 (bucket_id='rental-media' and exists(select 1 from public.car_rental_media m where m.storage_bucket=bucket_id and m.storage_path=name))
 or (bucket_id='event-media' and exists(select 1 from public.car_rental_media m where m.storage_bucket=bucket_id and m.storage_path=name)));
create policy rental_objects_insert on storage.objects for insert to authenticated with check(bucket_id='rental-media' and exists(select 1 from public.car_rental_companies c where c.id::text=split_part(name,'/',1) and public.can_manage_rental_company(c.id)));
create policy rental_objects_delete on storage.objects for delete to authenticated using(bucket_id='rental-media' and exists(select 1 from public.car_rental_companies c where c.id::text=split_part(name,'/',1) and public.can_manage_rental_company(c.id)));

alter table public.car_rental_bookings add column locale text not null default 'es' check(locale in('en','es'));
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
  branch_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_status not in ('confirmed','declined','cancelled','completed') then raise exception 'invalid booking status' using errcode = '22023'; end if;
  select * into b from public.car_rental_bookings where id = p_booking for update;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;
  select c.submitted_by, c.id into owner_id, branch_id
    from public.car_rental_vehicles v join public.car_rental_companies c on c.id = v.company_id
    where v.id = b.vehicle_id;
  if b.renter_id <> (select auth.uid()) and owner_id <> (select auth.uid())
     and not public.can_manage_rental_company(branch_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if b.renter_id = (select auth.uid()) and not public.can_manage_rental_company(branch_id) and p_status <> 'cancelled' then
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

create or replace function public.request_car_rental_booking(
  p_vehicle uuid,
  p_start date,
  p_end date,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_note text,
  p_idempotency_key uuid,
  p_locale text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  price integer;
  booking_id uuid;
  day_count integer;
begin
  if actor is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_locale is null or p_locale not in ('en','es') or p_idempotency_key is null or p_start is null or p_end is null or p_start < current_date or p_end <= p_start or p_end > p_start+30 then raise exception 'invalid rental dates' using errcode='22023'; end if;
  if char_length(btrim(coalesce(p_contact_name,''))) not between 2 and 120
   or char_length(btrim(coalesce(p_contact_email,''))) not between 5 and 254
   or char_length(btrim(coalesce(p_contact_phone,''))) not between 7 and 40
   or coalesce(p_contact_phone,'') !~ '^\+?[0-9 ().-]{7,40}$'
   or length(regexp_replace(p_contact_phone,'[^0-9]','','g')) not between 7 and 15
   or char_length(coalesce(p_note,''))>1000 then raise exception 'invalid contact details' using errcode='22023'; end if;
  if not exists(select 1 from auth.users u where u.id=actor and u.email_confirmed_at is not null and lower(u.email)=lower(btrim(p_contact_email))) then raise exception 'verified account email required' using errcode='42501'; end if;
  select id into booking_id from public.car_rental_bookings where renter_id=actor and idempotency_key=p_idempotency_key;
  if booking_id is not null then
   if not exists(select 1 from public.car_rental_bookings where id=booking_id and vehicle_id=p_vehicle and start_date=p_start and end_date=p_end) then raise exception 'request key already used' using errcode='PT409'; end if;
   return booking_id;
  end if;
  select v.daily_price_cents into price
    from public.car_rental_vehicles v
    join public.car_rental_companies c on c.id=v.company_id
    where v.id=p_vehicle and v.active and c.status='published';
  if price is null then raise exception 'vehicle not available' using errcode = 'P0002'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_vehicle::text, 0));
  if exists (select 1 from public.car_rental_calendar_blocks b
    where b.vehicle_id=p_vehicle and b.start_date < p_end and b.end_date > p_start) then
    raise exception 'vehicle dates are no longer available' using errcode = 'PT409';
  end if;
  day_count := p_end - p_start;
  insert into public.car_rental_bookings(
    locale,vehicle_id,renter_id,idempotency_key,start_date,end_date,contact_name,
    contact_email,contact_phone,note,quoted_total_cents
  ) values (
    p_locale,p_vehicle,actor,p_idempotency_key,p_start,p_end,btrim(p_contact_name),
    lower(btrim(p_contact_email)),nullif(btrim(p_contact_phone),''),
    nullif(btrim(p_note),''),price * day_count
  ) on conflict (renter_id,idempotency_key) do update set idempotency_key=excluded.idempotency_key
    returning id into booking_id;
  return booking_id;
end;
$$;
revoke all on function public.request_car_rental_booking(uuid,date,date,text,text,text,text,uuid,text) from public, anon;
grant execute on function public.request_car_rental_booking(uuid,date,date,text,text,text,text,uuid,text) to authenticated;


-- Keep the older API signature compatible during rolling product deployments.
create or replace function public.request_car_rental_booking(p_vehicle uuid,p_start date,p_end date,p_contact_name text,p_contact_email text,p_contact_phone text,p_note text,p_idempotency_key uuid)
returns uuid language sql security invoker set search_path='' as $$ select public.request_car_rental_booking(p_vehicle,p_start,p_end,p_contact_name,p_contact_email,p_contact_phone,p_note,p_idempotency_key,'es') $$;
revoke all on function public.request_car_rental_booking(uuid,date,date,text,text,text,text,uuid) from public,anon;
grant execute on function public.request_car_rental_booking(uuid,date,date,text,text,text,text,uuid) to authenticated;

alter table public.suite_email_outbox drop constraint if exists suite_email_outbox_kind_check;
alter table public.suite_email_outbox add constraint suite_email_outbox_kind_check check(kind in('claim_received','welcome_akipasa','welcome_akiduermo','welcome_akibusiness','welcome_akihq','event_booking_requested','event_booking_cancelled','stay_booking_requested','stay_booking_cancelled','event_saved_reminder','stay_saved_reminder','rental_booking_update'));
create function public.queue_rental_booking_email() returns trigger language plpgsql security definer set search_path='' as $$
declare c public.car_rental_companies%rowtype; car text; recipient record; body jsonb;
begin
 if tg_op='UPDATE' and new.status=old.status then return new; end if;
 select co.* into c from public.car_rental_vehicles v join public.car_rental_companies co on co.id=v.company_id where v.id=new.vehicle_id;
 select name into car from public.car_rental_vehicles where id=new.vehicle_id;
 body:=jsonb_build_object('bookingId',new.id,'companyId',c.id,'companyName',c.name,'vehicleName',car,'status',new.status,'start',new.start_date,'end',new.end_date,'totalCents',new.quoted_total_cents,'customerName',new.contact_name,'customerEmail',new.contact_email,'customerPhone',new.contact_phone,'note',new.note);
 for recipient in select u.id,u.email,case when u.id=new.renter_id then 'customer' else 'operator' end audience from auth.users u where u.id in(new.renter_id,c.submitted_by) and u.email_confirmed_at is not null and u.deleted_at is null loop
  insert into public.suite_email_outbox(dedupe_key,kind,profile_id,recipient,locale,payload,status,last_error)
  values('rental:'||new.id||':'||new.status||':'||recipient.id,'rental_booking_update',recipient.id,lower(recipient.email),new.locale,body||jsonb_build_object('audience',recipient.audience),'blocked','awaiting_rental_sender') on conflict(dedupe_key) do nothing;
 end loop;
 return new;
end $$;
revoke all on function public.queue_rental_booking_email() from public,anon,authenticated;
create trigger rental_booking_email after insert or update of status on public.car_rental_bookings for each row execute function public.queue_rental_booking_email();

create function public.managed_rental_branches() returns setof public.car_rental_companies language sql stable security invoker set search_path='' as $$ select * from public.car_rental_companies where public.can_manage_rental_company(id) order by created_at $$;
revoke all on function public.managed_rental_branches() from public,anon;
grant execute on function public.managed_rental_branches() to authenticated;

create function public.rental_branch_booking_summary(p_company uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare summary jsonb; today date := (now() at time zone 'Europe/Madrid')::date;
begin
 if not public.can_manage_rental_company(p_company) then raise exception 'not authorized' using errcode='42501'; end if;
 select jsonb_build_object('current',count(*) filter(where b.status='confirmed' and b.start_date<=today and b.end_date>today),'pending',count(*) filter(where b.status='requested'),'pickups',count(*) filter(where b.status='confirmed' and b.start_date=today),'returns',count(*) filter(where b.status='confirmed' and b.end_date=today),'upcoming',count(*) filter(where b.status='confirmed' and b.start_date>today)) into summary
 from public.car_rental_bookings b join public.car_rental_vehicles v on v.id=b.vehicle_id where v.company_id=p_company;
 return summary;
end $$;
revoke all on function public.rental_branch_booking_summary(uuid) from public,anon;
grant execute on function public.rental_branch_booking_summary(uuid) to authenticated;

-- New messages cannot be consumed by an older sender during the rolling release.
create function public.activate_rental_booking_emails() returns integer language plpgsql security definer set search_path='' as $$
declare activated integer;
begin
 update public.suite_email_outbox set status='pending',last_error=null where kind='rental_booking_update' and status='blocked' and last_error='awaiting_rental_sender';
 get diagnostics activated=row_count;
 return activated;
end $$;
revoke all on function public.activate_rental_booking_emails() from public,anon,authenticated;
grant execute on function public.activate_rental_booking_emails() to service_role;
