-- Read-only inventory for Supabase security lint triage.
-- No DDL; safe to run on the linked project.
-- Verify each flagged grant against actual application callers before revoking.
-- Issue: https://github.com/elguiriashing/akipasa/issues/308

-- 1. Extension layout and ownership (including PostGIS).
select e.extname, n.nspname as extension_schema,
       pg_get_userbyid(e.extowner) as extension_owner
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
order by e.extname;

-- 2. Public tables without RLS, including extension-owned ones.
select n.nspname as schema_name, c.relname as table_name,
       pg_get_userbyid(c.relowner) as owner,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_can_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_can_select,
       exists (select 1 from pg_depend d
               where d.classid='pg_class'::regclass and d.objid=c.oid
                 and d.deptype='e') as extension_owned
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p')
  and not c.relrowsecurity
order by c.relname;

-- 3. Privileged routines reachable by browser roles.
-- In particular, PUBLIC grants may make a function callable by both roles.
select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_userbyid(p.proowner) as owner,
       p.proconfig as function_settings,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_exec,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_exec
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where p.prosecdef
  and (has_function_privilege('anon',p.oid,'EXECUTE')
       or has_function_privilege('authenticated',p.oid,'EXECUTE'))
order by n.nspname,p.proname;

-- 4. RLS enabled but without a policy (often intentional in private schemas).
select n.nspname as schema_name, c.relname as table_name,
       has_table_privilege('anon',c.oid,'SELECT') as anon_can_select,
       has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_can_select
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where c.relkind in ('r','p') and c.relrowsecurity
  and not exists(select 1 from pg_policy pol where pol.polrelid=c.oid)
order by n.nspname,c.relname;

-- Never resolve lint warnings by making every row publicly readable.
-- PostGIS migration, password protection and RPC ACL changes require separate reviews.
