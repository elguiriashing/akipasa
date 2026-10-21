-- Generated canonical native accommodation deployment phase 01. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
do $$ begin
 if to_regclass('storage.buckets') is not null then
  if exists(select 1 from storage.buckets where id='accommodation-media' and public) then raise exception 'Existing public native media bucket requires privacy reconciliation';end if;
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('accommodation-media','accommodation-media',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
 end if;
end $$;
create schema accommodation_property_private;
revoke all on schema accommodation_property_private from public,anon,authenticated;
revoke all on schema accommodation_property_private from public,anon,authenticated;
create table accommodation_property_private.launch_settings(singleton boolean primary key default true check(singleton),enabled boolean not null default false,uploads_enforced boolean not null default false,check(not uploads_enforced or enabled));
alter table accommodation_property_private.launch_settings enable row level security;
revoke all on accommodation_property_private.launch_settings from public,anon,authenticated;
insert into accommodation_property_private.launch_settings default values;
create table public.accommodation_properties(
 id uuid primary key default gen_random_uuid(),owner_profile_id uuid references public.profiles(id) on delete set null,orphaned_at timestamptz,
 workspace_id text references public.crm_workspaces(id),legacy_venue_id uuid unique references public.venues(id),
 name text not null check(char_length(btrim(name)) between 2 and 120),slug text unique,
 status text not null default 'private' check(status in ('private','pending','published','rejected')),
 address text not null default '' check(char_length(address)<=500),city text not null default '' check(char_length(city)<=160),
 latitude double precision check(latitude between -85 and 85),longitude double precision check(longitude between -180 and 180),
 accommodation_type text not null default 'hotel' check(accommodation_type in ('hotel','apartment','rural_house','hostel','guest_house','campsite','motel','student_accommodation')),
 website_url text check(website_url is null or (char_length(website_url)<=2000 and website_url ~ '^https://[^[:space:]]+$')),
 description_es text not null default '' check(char_length(description_es)<=6000),description_en text not null default '' check(char_length(description_en)<=6000),
 revision_id uuid not null default gen_random_uuid(),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.accommodation_properties enable row level security;
revoke all on public.accommodation_properties from public,anon,authenticated;
create function accommodation_property_private.orphan_property() returns trigger language plpgsql set search_path='' as $$
begin
 if old.owner_profile_id is not null and new.owner_profile_id is null then new.orphaned_at:=now();new.status:='private';end if;
 return new;
end $$;
revoke all on function accommodation_property_private.orphan_property() from public,anon,authenticated,service_role;
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
