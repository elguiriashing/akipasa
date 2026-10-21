-- Generated canonical native accommodation deployment phase 02. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
create trigger native_accommodation_orphan_review before update of owner_profile_id on public.accommodation_properties for each row execute function accommodation_property_private.orphan_property();
create index accommodation_properties_owner on public.accommodation_properties(owner_profile_id,id);
create index accommodation_properties_workspace on public.accommodation_properties(workspace_id,id) where workspace_id is not null;
create table public.accommodation_property_members(property_id uuid not null references public.accommodation_properties(id),profile_id uuid not null references public.profiles(id) on delete cascade,role text not null check(role='manager'),created_at timestamptz not null default now(),primary key(property_id,profile_id));
alter table public.accommodation_property_members enable row level security;
revoke all on public.accommodation_property_members from public,anon,authenticated;
create index accommodation_property_members_profile on public.accommodation_property_members(profile_id,property_id);
create table accommodation_property_private.property_entitlements(
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.accommodation_properties(id),
 source text not null check(source in ('verified_billing','legacy_review','trial','promotion','admin_override')),
 reference text not null check(char_length(btrim(reference)) between 3 and 300),
 starts_at timestamptz not null default now(),ends_at timestamptz,revoked_at timestamptz,
 created_at timestamptz not null default now(),check(ends_at is null or ends_at>starts_at),unique(property_id,source,reference)
);
alter table accommodation_property_private.property_entitlements enable row level security;
revoke all on accommodation_property_private.property_entitlements from public,anon,authenticated;
create index accommodation_property_entitlements_active on accommodation_property_private.property_entitlements(property_id,starts_at,ends_at) where revoked_at is null;
create table accommodation_property_private.audit(id bigint generated always as identity primary key,property_id uuid not null,actor uuid,action text not null,detail jsonb not null default '{}',created_at timestamptz not null default now());
alter table accommodation_property_private.audit enable row level security;
revoke all on accommodation_property_private.audit from public,anon,authenticated;
create function accommodation_property_private.append_only() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'Immutable accommodation audit';end $$;
revoke all on function accommodation_property_private.append_only() from public,anon,authenticated,service_role;
create trigger accommodation_audit_immutable before update or delete on accommodation_property_private.audit for each row execute function accommodation_property_private.append_only();
create function accommodation_property_private.ready() returns boolean language sql stable security definer set search_path='' as $$select enabled from accommodation_property_private.launch_settings where singleton$$;
revoke all on function accommodation_property_private.ready() from public,anon,authenticated,service_role;
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
