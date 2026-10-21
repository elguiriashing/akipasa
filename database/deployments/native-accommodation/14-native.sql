-- Generated canonical native accommodation deployment phase 14. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
create table public.accommodation_property_units(
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.accommodation_properties(id),room_type_id uuid not null,name text not null check(char_length(btrim(name)) between 1 and 120),active boolean not null default true,created_at timestamptz not null default now(),unique(id,property_id),unique(property_id,name),foreign key(room_type_id,property_id) references public.accommodation_property_room_types(id,property_id)
);
alter table public.accommodation_property_units enable row level security;
revoke all on public.accommodation_property_units from public,anon,authenticated;
create table public.accommodation_property_nightly_rates(
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.accommodation_properties(id),room_type_id uuid not null,start_date date not null,end_date_exclusive date not null,nightly_price_cents integer not null check(nightly_price_cents>=0),minimum_nights integer not null default 1 check(minimum_nights between 1 and 365),created_at timestamptz not null default now(),check(start_date<end_date_exclusive and end_date_exclusive-start_date<=3660),foreign key(room_type_id,property_id) references public.accommodation_property_room_types(id,property_id)
);
alter table public.accommodation_property_nightly_rates enable row level security;
revoke all on public.accommodation_property_nightly_rates from public,anon,authenticated;
create table public.accommodation_property_unit_blocks(
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.accommodation_properties(id),unit_id uuid not null,start_date date not null,end_date_exclusive date not null,created_at timestamptz not null default now(),check(start_date<end_date_exclusive and end_date_exclusive-start_date<=3660),foreign key(unit_id,property_id) references public.accommodation_property_units(id,property_id)
);
alter table public.accommodation_property_unit_blocks enable row level security;
revoke all on public.accommodation_property_unit_blocks from public,anon,authenticated;
create table public.accommodation_property_booking_settings(
 property_id uuid primary key references public.accommodation_properties(id),mode text not null default 'disabled' check(mode in ('disabled','external','request')),external_url text check(external_url is null or (char_length(external_url)<=2000 and external_url ~ '^https://[^[:space:]]+$')),policy text not null default '' check(char_length(policy)<=4000),notification_email text check(notification_email is null or (char_length(notification_email)<=254 and notification_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')),check(mode<>'request' or char_length(btrim(policy))>=10),check(mode<>'external' or external_url is not null)
);
alter table public.accommodation_property_booking_settings enable row level security;
revoke all on public.accommodation_property_booking_settings from public,anon,authenticated;
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
