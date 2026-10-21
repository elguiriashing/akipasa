-- Native property inventory leaves all legacy venue tables and identities unchanged.
begin;
alter table accommodation_property_private.launch_settings add column inventory_enabled boolean not null default false;
alter table accommodation_property_private.launch_settings add constraint accommodation_inventory_requires_foundation check(not inventory_enabled or enabled);
create function public.can_manage_accommodation_inventory(p_property uuid) returns boolean language sql stable security definer set search_path='' as $$
 select (select inventory_enabled from accommodation_property_private.launch_settings where singleton) and public.can_manage_accommodation_property(p_property)
$$;
revoke all on function public.can_manage_accommodation_inventory(uuid) from public,anon;
grant execute on function public.can_manage_accommodation_inventory(uuid) to authenticated;
create table public.accommodation_property_room_types(
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.accommodation_properties(id),name text not null check(char_length(btrim(name)) between 2 and 120),max_guests integer not null check(max_guests between 1 and 30),active boolean not null default true,created_at timestamptz not null default now(),unique(id,property_id)
);
create table public.accommodation_property_units(
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.accommodation_properties(id),room_type_id uuid not null,name text not null check(char_length(btrim(name)) between 1 and 120),active boolean not null default true,created_at timestamptz not null default now(),unique(id,property_id),unique(property_id,name),foreign key(room_type_id,property_id) references public.accommodation_property_room_types(id,property_id)
);
create table public.accommodation_property_nightly_rates(
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.accommodation_properties(id),room_type_id uuid not null,start_date date not null,end_date_exclusive date not null,nightly_price_cents integer not null check(nightly_price_cents>=0),minimum_nights integer not null default 1 check(minimum_nights between 1 and 365),created_at timestamptz not null default now(),check(start_date<end_date_exclusive and end_date_exclusive-start_date<=3660),foreign key(room_type_id,property_id) references public.accommodation_property_room_types(id,property_id)
);
create table public.accommodation_property_unit_blocks(
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.accommodation_properties(id),unit_id uuid not null,start_date date not null,end_date_exclusive date not null,created_at timestamptz not null default now(),check(start_date<end_date_exclusive and end_date_exclusive-start_date<=3660),foreign key(unit_id,property_id) references public.accommodation_property_units(id,property_id)
);
create table public.accommodation_property_booking_settings(
 property_id uuid primary key references public.accommodation_properties(id),mode text not null default 'disabled' check(mode in ('disabled','external','request')),external_url text check(external_url is null or (char_length(external_url)<=2000 and external_url ~ '^https://[^[:space:]]+$')),policy text not null default '' check(char_length(policy)<=4000),notification_email text check(notification_email is null or (char_length(notification_email)<=254 and notification_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')),check(mode<>'request' or char_length(btrim(policy))>=10),check(mode<>'external' or external_url is not null)
);
-- No browser INSERT/UPDATE or customer booking RPC: reviewed server quotes are a separate contract.
create table public.accommodation_property_reservations(
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.accommodation_properties(id),unit_id uuid not null,profile_id uuid references public.profiles(id) on delete set null,check_in date not null,check_out date not null,guests integer not null check(guests between 1 and 30),status text not null default 'requested' check(status in ('requested','confirmed','checked_in','completed','cancelled','declined')),
 contact_name text not null check(char_length(btrim(contact_name)) between 2 and 120),contact_email text not null check(char_length(contact_email)<=254 and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),quoted_total_cents integer not null check(quoted_total_cents>=0),quote_snapshot jsonb not null check(jsonb_typeof(quote_snapshot)='object'),idempotency_key uuid not null,locale text not null default 'es' check(locale in ('es','en')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(check_in<check_out and check_out-check_in<=365),unique(property_id,idempotency_key),foreign key(unit_id,property_id) references public.accommodation_property_units(id,property_id)
);
create index native_accommodation_types_property on public.accommodation_property_room_types(property_id,id);
create index native_accommodation_units_property on public.accommodation_property_units(property_id,id);
create index native_accommodation_rates_scope on public.accommodation_property_nightly_rates(property_id,room_type_id,start_date,end_date_exclusive);
create index native_accommodation_blocks_scope on public.accommodation_property_unit_blocks(property_id,unit_id,start_date,end_date_exclusive);
create index native_accommodation_reservations_scope on public.accommodation_property_reservations(property_id,unit_id,check_in,check_out) where status in ('requested','confirmed','checked_in');
create function accommodation_property_private.inventory_identity() returns trigger language plpgsql set search_path='' as $$
begin
 if new.property_id is distinct from old.property_id then raise exception 'Property scope immutable' using errcode='42501';end if;
 if tg_table_name<>'accommodation_property_booking_settings' then
  if new.id is distinct from old.id then raise exception 'Inventory identity immutable' using errcode='42501';end if;
 end if;
 return new;
end $$;
create function accommodation_property_private.inventory_rate_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and not public.can_manage_accommodation_inventory(new.property_id) then raise exception 'Property inventory membership required' using errcode='42501';end if;
 update public.accommodation_property_room_types set active=active where id=new.room_type_id and property_id=new.property_id;
 if not found then raise exception 'Room type property mismatch' using errcode='42501';end if;
 if exists(select 1 from public.accommodation_property_nightly_rates r where r.room_type_id=new.room_type_id and r.property_id=new.property_id and r.id<>new.id and daterange(r.start_date,r.end_date_exclusive,'[)') && daterange(new.start_date,new.end_date_exclusive,'[)')) then raise exception 'Overlapping native nightly rates' using errcode='23P01';end if;
 return new;
end $$;
create trigger native_accommodation_rates_no_overlap before insert or update on public.accommodation_property_nightly_rates for each row execute function accommodation_property_private.inventory_rate_guard();
create function accommodation_property_private.inventory_occupancy_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare v_start date;v_end date;v_active boolean;
begin
 if auth.uid() is not null and current_setting('role',true)<>'service_role' and not public.can_manage_accommodation_inventory(new.property_id) then raise exception 'Property inventory membership required' using errcode='42501';end if;
 -- Both block and reservation writes touch the unit, also rejecting stale repeatable-read snapshots.
 update public.accommodation_property_units set active=active where id=new.unit_id and property_id=new.property_id returning active into v_active;
 if not found then raise exception 'Unit property mismatch' using errcode='42501';end if;
 if tg_table_name='accommodation_property_reservations' then
  if new.status not in ('requested','confirmed','checked_in') then return new;end if;
  if not v_active then raise exception 'Unit unavailable';end if;
  v_start:=new.check_in;v_end:=new.check_out;
  if exists(select 1 from public.accommodation_property_reservations r where r.unit_id=new.unit_id and r.property_id=new.property_id and r.id<>new.id and r.status in ('requested','confirmed','checked_in') and daterange(r.check_in,r.check_out,'[)') && daterange(v_start,v_end,'[)')) then raise exception 'Native unit unavailable' using errcode='23P01';end if;
 else v_start:=new.start_date;v_end:=new.end_date_exclusive;
  if exists(select 1 from public.accommodation_property_unit_blocks b where b.unit_id=new.unit_id and b.property_id=new.property_id and b.id<>new.id and daterange(b.start_date,b.end_date_exclusive,'[)') && daterange(v_start,v_end,'[)')) then raise exception 'Native unit already blocked' using errcode='23P01';end if;
 end if;
 if tg_table_name='accommodation_property_reservations' then
  if exists(select 1 from public.accommodation_property_unit_blocks b where b.unit_id=new.unit_id and b.property_id=new.property_id and daterange(b.start_date,b.end_date_exclusive,'[)') && daterange(v_start,v_end,'[)')) then raise exception 'Native unit blocked' using errcode='23P01';end if;
 else
  if exists(select 1 from public.accommodation_property_reservations r where r.unit_id=new.unit_id and r.property_id=new.property_id and r.status in ('requested','confirmed','checked_in') and daterange(r.check_in,r.check_out,'[)') && daterange(v_start,v_end,'[)')) then raise exception 'Native unit reserved' using errcode='23P01';end if;
 end if;return new;
end $$;
create trigger native_accommodation_blocks_occupancy before insert or update on public.accommodation_property_unit_blocks for each row execute function accommodation_property_private.inventory_occupancy_guard();
create trigger native_accommodation_reservation_occupancy before insert or update of unit_id,property_id,check_in,check_out,status on public.accommodation_property_reservations for each row execute function accommodation_property_private.inventory_occupancy_guard();
create function public.accommodation_property_change_status(p_reservation uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare r public.accommodation_property_reservations;
begin
 select * into r from public.accommodation_property_reservations where id=p_reservation for update;
 if not found or not public.can_manage_accommodation_inventory(r.property_id) then raise exception 'Property membership required' using errcode='42501';end if;
 if p_status=r.status then return;end if;
 if not ((r.status='requested' and p_status in ('confirmed','declined','cancelled')) or (r.status='confirmed' and p_status in ('checked_in','cancelled')) or (r.status='checked_in' and p_status='completed')) then raise exception 'Invalid native reservation transition';end if;
 update public.accommodation_property_reservations set status=p_status,updated_at=now() where id=r.id;
 insert into accommodation_property_private.audit(property_id,actor,action,detail) values(r.property_id,auth.uid(),'reservation_status',jsonb_build_object('reservation',r.id,'from',r.status,'to',p_status));
end $$;
revoke all on function public.accommodation_property_change_status(uuid,text) from public,anon;
grant execute on function public.accommodation_property_change_status(uuid,text) to authenticated;
alter table public.accommodation_property_room_types enable row level security;
revoke all on public.accommodation_property_room_types from public,anon,authenticated;
grant select,insert,update,delete on public.accommodation_property_room_types to authenticated;
create policy native_room_types_owner on public.accommodation_property_room_types for all to authenticated using(public.can_manage_accommodation_inventory(property_id)) with check(public.can_manage_accommodation_inventory(property_id));
create trigger native_room_types_identity before update on public.accommodation_property_room_types for each row execute function accommodation_property_private.inventory_identity();
alter table public.accommodation_property_units enable row level security;
revoke all on public.accommodation_property_units from public,anon,authenticated;
grant select,insert,update,delete on public.accommodation_property_units to authenticated;
create policy native_units_owner on public.accommodation_property_units for all to authenticated using(public.can_manage_accommodation_inventory(property_id)) with check(public.can_manage_accommodation_inventory(property_id));
create trigger native_units_identity before update on public.accommodation_property_units for each row execute function accommodation_property_private.inventory_identity();
alter table public.accommodation_property_nightly_rates enable row level security;
revoke all on public.accommodation_property_nightly_rates from public,anon,authenticated;
grant select,insert,update,delete on public.accommodation_property_nightly_rates to authenticated;
create policy native_nightly_rates_owner on public.accommodation_property_nightly_rates for all to authenticated using(public.can_manage_accommodation_inventory(property_id)) with check(public.can_manage_accommodation_inventory(property_id));
create trigger native_nightly_rates_identity before update on public.accommodation_property_nightly_rates for each row execute function accommodation_property_private.inventory_identity();
alter table public.accommodation_property_unit_blocks enable row level security;
revoke all on public.accommodation_property_unit_blocks from public,anon,authenticated;
grant select,insert,update,delete on public.accommodation_property_unit_blocks to authenticated;
create policy native_unit_blocks_owner on public.accommodation_property_unit_blocks for all to authenticated using(public.can_manage_accommodation_inventory(property_id)) with check(public.can_manage_accommodation_inventory(property_id));
create trigger native_unit_blocks_identity before update on public.accommodation_property_unit_blocks for each row execute function accommodation_property_private.inventory_identity();
alter table public.accommodation_property_booking_settings enable row level security;
revoke all on public.accommodation_property_booking_settings from public,anon,authenticated;
grant select,insert,update,delete on public.accommodation_property_booking_settings to authenticated;
create policy native_booking_settings_owner on public.accommodation_property_booking_settings for all to authenticated using(public.can_manage_accommodation_inventory(property_id)) with check(public.can_manage_accommodation_inventory(property_id));
create trigger native_booking_settings_identity before update on public.accommodation_property_booking_settings for each row execute function accommodation_property_private.inventory_identity();
alter table public.accommodation_property_reservations enable row level security;
revoke all on public.accommodation_property_reservations from public,anon,authenticated;
grant select on public.accommodation_property_reservations to authenticated;
create policy native_reservations_read on public.accommodation_property_reservations for select to authenticated using(public.can_manage_accommodation_inventory(property_id));
create trigger native_reservations_identity before update on public.accommodation_property_reservations for each row execute function accommodation_property_private.inventory_identity();
revoke all on function accommodation_property_private.inventory_identity(),accommodation_property_private.inventory_rate_guard(),accommodation_property_private.inventory_occupancy_guard() from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
