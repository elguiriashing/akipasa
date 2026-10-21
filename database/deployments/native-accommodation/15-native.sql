-- Generated canonical native accommodation deployment phase 15. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
-- No browser INSERT/UPDATE or customer booking RPC: reviewed server quotes are a separate contract.
create table public.accommodation_property_reservations(
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.accommodation_properties(id),unit_id uuid not null,profile_id uuid references public.profiles(id) on delete set null,check_in date not null,check_out date not null,guests integer not null check(guests between 1 and 30),status text not null default 'requested' check(status in ('requested','confirmed','checked_in','completed','cancelled','declined')),
 contact_name text not null check(char_length(btrim(contact_name)) between 2 and 120),contact_email text not null check(char_length(contact_email)<=254 and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),quoted_total_cents integer not null check(quoted_total_cents>=0),quote_snapshot jsonb not null check(jsonb_typeof(quote_snapshot)='object'),idempotency_key uuid not null,locale text not null default 'es' check(locale in ('es','en')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(check_in<check_out and check_out-check_in<=365),unique(property_id,idempotency_key),foreign key(unit_id,property_id) references public.accommodation_property_units(id,property_id)
);
alter table public.accommodation_property_reservations enable row level security;
revoke all on public.accommodation_property_reservations from public,anon,authenticated;
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
revoke all on function accommodation_property_private.inventory_identity() from public,anon,authenticated,service_role;
do $native_closed$ declare r record; v boolean;begin
 if to_regclass('accommodation_property_private.launch_settings') is not null then
  if not exists(select 1 from accommodation_property_private.launch_settings) or exists(select 1 from accommodation_property_private.launch_settings s where s.enabled or s.uploads_enforced or coalesce(to_jsonb(s)->>'inventory_enabled','false')<>'false') then raise exception 'Native deployment requires disabled settings';end if;
 end if;
 for r in select c.oid::regclass t from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and ((n.nspname='accommodation_property_private' and c.relname<>'launch_settings') or (n.nspname='public' and (c.relname='accommodation_properties' or c.relname like 'accommodation_property_%'))) loop
  execute format('select exists(select 1 from %s limit 1)',r.t) into v;if v then raise exception 'Native deployment requires empty tables';end if;
 end loop;
 if exists(select 1 from storage.buckets where id='accommodation-media' and public) then raise exception 'Native bucket must remain private';end if;
 if exists(select 1 from storage.objects where bucket_id='accommodation-media') then raise exception 'Native deployment requires empty Storage';end if;
end $native_closed$;
commit;
