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
