-- AkiSuite production release preflight: read-only, safe to run repeatedly.
-- Run against the intended Supabase project before any schema promotion.
-- This script does not verify a backup, Storage object availability, tenant isolation or app acceptance.
select current_database() as database_name, current_setting('server_version') as postgres_version;
select version, name from supabase_migrations.schema_migrations
where version >= '20261016000000' order by version;
select expected.object_name, to_regclass('public.'||expected.object_name) is not null as present
from (values ('crm_workspaces'),('accommodation_room_types'),('accommodation_units'),
 ('accommodation_nightly_rates'),('accommodation_reservations'),('accommodation_properties'),
 ('operating_organisations'),('rental_operating_location_links')) expected(object_name);
select p.proname, p.oid::regprocedure as signature,
 has_function_privilege('anon',p.oid,'EXECUTE') as anonymous_executable,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_executable
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
 ('create_private_operating_location','create_operating_organisation',
 'attach_rental_operating_location','create_accommodation_property')
order by p.proname;
-- Execute the existing exact table-count query documented in
-- docs/INDEPENDENT_ACCOMMODATION_RELEASE.md separately before and after migration.
-- IMPORTANT: confirm backup/PITR restore point and schema-compatible rehearsal out of band.

-- Exact counts are essential. pg_stat_user_tables estimates are NOT migration invariants.
select 'accommodation_room_types' as relation,count(*)::bigint as exact_rows from public.accommodation_room_types
union all select 'accommodation_units',count(*) from public.accommodation_units
union all select 'accommodation_nightly_rates',count(*) from public.accommodation_nightly_rates
union all select 'accommodation_unit_blocks',count(*) from public.accommodation_unit_blocks
union all select 'accommodation_quotes',count(*) from public.accommodation_quotes
union all select 'accommodation_reservations',count(*) from public.accommodation_reservations
union all select 'accommodation_confirmation_emails',count(*) from public.accommodation_confirmation_emails
union all select 'crm_workspaces',count(*) from public.crm_workspaces
union all select 'crm_workspace_members',count(*) from public.crm_workspace_members
union all select 'car_rental_companies',count(*) from public.car_rental_companies
union all select 'car_rental_bookings',count(*) from public.car_rental_bookings
order by relation;
-- Expected bucket/policy names must be absent before first migration.
select id,public,file_size_limit from storage.buckets where id='accommodation-media';
select schemaname,tablename,policyname from pg_policies
where (schemaname='storage' and policyname in
 ('accommodation_objects_read','accommodation_objects_insert','accommodation_objects_delete'))
or (schemaname='public' and tablename like 'accommodation_property%')
order by schemaname,tablename,policyname;
