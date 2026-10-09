-- AkiDuermo room-night inventory foundation. No public booking permissions are granted.
-- Not enabled until the application and transaction suites have passed.
create extension if not exists btree_gist;

create table if not exists public.accommodation_room_types (
 id uuid primary key default gen_random_uuid(),
 venue_id uuid not null references public.venues(id) on delete cascade,
 name text not null check (char_length(btrim(name)) between 2 and 120),
 max_guests integer not null check (max_guests between 1 and 30),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique (id, venue_id)
);

create table if not exists public.accommodation_units (
 id uuid primary key default gen_random_uuid(),
 venue_id uuid not null references public.venues(id) on delete cascade,
 room_type_id uuid not null,
 name text not null check (char_length(btrim(name)) between 1 and 120),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 foreign key (room_type_id,venue_id) references public.accommodation_room_types(id,venue_id),
 unique (id,venue_id),
 unique (venue_id,name)
);

create table if not exists public.accommodation_nightly_rates (
 id uuid primary key default gen_random_uuid(),
 venue_id uuid not null references public.venues(id) on delete cascade,
 room_type_id uuid not null,
 start_date date not null,
 end_date_exclusive date not null,
 nightly_price_cents integer not null check (nightly_price_cents >= 0),
 minimum_nights integer not null default 1 check (minimum_nights between 1 and 365),
 check (start_date < end_date_exclusive),
 foreign key (room_type_id,venue_id) references public.accommodation_room_types(id,venue_id),
 exclude using gist (room_type_id with =, daterange(start_date,end_date_exclusive,'[)') with &&)
);

create table if not exists public.accommodation_reservations (
 id uuid primary key default gen_random_uuid(),
 venue_id uuid not null references public.venues(id) on delete cascade,
 unit_id uuid not null,
 check_in date not null,
 check_out date not null,
 guests integer not null check (guests between 1 and 30),
 status text not null default 'requested'
  check (status in ('requested','confirmed','checked_in','completed','cancelled','declined')),
 contact_name text not null check (char_length(btrim(contact_name)) between 2 and 120),
 contact_email text not null,
 quoted_total_cents integer not null check (quoted_total_cents >= 0),
 quote_snapshot jsonb not null default '{}'::jsonb,
 idempotency_key uuid not null,
 created_at timestamptz not null default now(),
 check (check_in < check_out),
 foreign key (unit_id,venue_id) references public.accommodation_units(id,venue_id),
 unique (venue_id,idempotency_key),
 exclude using gist (unit_id with =, daterange(check_in,check_out,'[)') with &&)
  where (status in ('requested','confirmed','checked_in'))
);

create table if not exists public.accommodation_unit_blocks (
 id uuid primary key default gen_random_uuid(),
 venue_id uuid not null references public.venues(id) on delete cascade,
 unit_id uuid not null,
 start_date date not null,
 end_date_exclusive date not null,
 reason text not null default 'maintenance',
 check (start_date < end_date_exclusive),
 foreign key (unit_id,venue_id) references public.accommodation_units(id,venue_id),
 exclude using gist (unit_id with =, daterange(start_date,end_date_exclusive,'[)') with &&)
);

-- Protect against block/reservation races with the same per-unit transaction lock.
-- All future book and maintenance block writes must take the same lock on the unit.
create or replace function public.accommodation_guard_occupancy()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare occupied boolean;
begin
 perform 1 from public.accommodation_units where id=new.unit_id and venue_id=new.venue_id for update;
 if not found then raise exception 'Accommodation unit does not belong to this property'; end if;
 if tg_table_name = 'accommodation_unit_blocks' then
  select exists (
   select 1 from public.accommodation_reservations r
   where r.unit_id=new.unit_id and r.status in ('requested','confirmed','checked_in')
     and daterange(r.check_in,r.check_out,'[)') && daterange(new.start_date,new.end_date_exclusive,'[)')
  ) into occupied;
 else
  if new.status not in ('requested','confirmed','checked_in') then return new; end if;
  select exists (
   select 1 from public.accommodation_unit_blocks b
   where b.unit_id=new.unit_id and daterange(b.start_date,b.end_date_exclusive,'[)')
     && daterange(new.check_in,new.check_out,'[)')
  ) into occupied;
 end if;
 if occupied then raise exception 'Unit unavailable for selected nights'; end if;
 return new;
end;
$$;

create trigger accommodation_booking_guard before insert or update of unit_id,venue_id,check_in,check_out,status
 on public.accommodation_reservations for each row execute function public.accommodation_guard_occupancy();
create trigger accommodation_block_guard before insert or update of unit_id,venue_id,start_date,end_date_exclusive
 on public.accommodation_unit_blocks for each row execute function public.accommodation_guard_occupancy();

-- Deny customer access until a reviewed server-side pricing and booking RPC is shipped.
-- Owners/managers can inspect property inventory, but cannot forge a guest booking through RLS.
do $$
declare t text;
begin
 foreach t in array array['accommodation_room_types','accommodation_units','accommodation_nightly_rates','accommodation_reservations','accommodation_unit_blocks'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
 end loop;
end $$;
grant select,insert,update,delete on public.accommodation_room_types,public.accommodation_units,public.accommodation_nightly_rates,public.accommodation_unit_blocks to authenticated;
grant select on public.accommodation_reservations to authenticated;
create policy accommodation_types_owner on public.accommodation_room_types for all to authenticated
 using (public.is_venue_member(venue_id,array['owner','manager']::public.venue_member_role[]))
 with check (public.is_venue_member(venue_id,array['owner','manager']::public.venue_member_role[]));
create policy accommodation_units_owner on public.accommodation_units for all to authenticated
 using (public.is_venue_member(venue_id,array['owner','manager']::public.venue_member_role[]))
 with check (public.is_venue_member(venue_id,array['owner','manager']::public.venue_member_role[]));
create policy accommodation_rates_owner on public.accommodation_nightly_rates for all to authenticated
 using (public.is_venue_member(venue_id,array['owner','manager']::public.venue_member_role[]))
 with check (public.is_venue_member(venue_id,array['owner','manager']::public.venue_member_role[]));
create policy accommodation_blocks_owner on public.accommodation_unit_blocks for all to authenticated
 using (public.is_venue_member(venue_id,array['owner','manager']::public.venue_member_role[]))
 with check (public.is_venue_member(venue_id,array['owner','manager']::public.venue_member_role[]));
create policy accommodation_reservations_owner_read on public.accommodation_reservations for select to authenticated
 using (public.is_venue_member(venue_id,array['owner','manager']::public.venue_member_role[]));
