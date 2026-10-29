begin;

-- Restore the 0022/0033 terms-record boundary after observed deployed ACL drift.
-- Clients acknowledge through the existing authenticated, server-stamped RPC;
-- ordinary Profile edits retain their existing column privileges and owner RLS.
set local search_path = public, pg_catalog;

do $terms_acl_guard$
declare
  acceptance_rpc oid := to_regprocedure('public.accept_current_terms(text,text)');
begin
  if not exists (
    select 1 from pg_class
    where oid = 'public.profiles'::regclass and relrowsecurity
  ) then
    raise exception 'Terms protection requires enabled Profile row-level security';
  end if;
  if has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
     or has_table_privilege('anon', 'public.profiles', 'UPDATE') then
    raise exception 'Broad Profile UPDATE privileges require explicit reconciliation';
  end if;
  if acceptance_rpc is null or not exists (
    select 1 from pg_proc p
    where p.oid = acceptance_rpc and p.prosecdef
      and p.proowner not in ('anon'::regrole, 'authenticated'::regrole)
      and exists (
        select 1 from pg_class c join pg_roles r on r.oid = p.proowner
        where c.oid = 'public.profiles'::regclass and c.relowner = p.proowner
          and (not c.relforcerowsecurity or r.rolsuper or r.rolbypassrls)
      )
      and has_column_privilege(p.proowner, 'public.profiles', 'id', 'SELECT')
      and has_column_privilege(p.proowner, 'public.profiles', 'preferred_locale', 'UPDATE')
      and has_column_privilege(p.proowner, 'public.profiles', 'updated_at', 'UPDATE')
      and has_column_privilege(p.proowner, 'public.profiles', 'terms_version', 'UPDATE')
      and has_column_privilege(p.proowner, 'public.profiles', 'terms_accepted_at', 'UPDATE')
  ) or not has_function_privilege('authenticated', acceptance_rpc, 'EXECUTE') then
    raise exception 'The existing authenticated terms acceptance RPC must remain available';
  end if;
end
$terms_acl_guard$;

revoke update (terms_version, terms_accepted_at)
  on table public.profiles from public, anon, authenticated;

do $terms_acl_verify$
begin
  if has_column_privilege('authenticated', 'public.profiles', 'terms_version', 'UPDATE')
     or has_column_privilege('authenticated', 'public.profiles', 'terms_accepted_at', 'UPDATE')
     or has_column_privilege('anon', 'public.profiles', 'terms_version', 'UPDATE')
     or has_column_privilege('anon', 'public.profiles', 'terms_accepted_at', 'UPDATE') then
    raise exception 'Inherited terms UPDATE privileges require explicit reconciliation';
  end if;
  if not exists (
    select 1 from pg_proc p
    where p.oid = 'public.accept_current_terms(text,text)'::regprocedure
      and has_column_privilege(p.proowner, 'public.profiles', 'terms_version', 'UPDATE')
      and has_column_privilege(p.proowner, 'public.profiles', 'terms_accepted_at', 'UPDATE')
  ) or not has_function_privilege(
    'authenticated', 'public.accept_current_terms(text,text)', 'EXECUTE'
  ) then
    raise exception 'Terms protection must preserve the existing acceptance RPC';
  end if;
end
$terms_acl_verify$;

-- No existing acceptance record, RPC definition/ACL, role, policy or other
-- editable column is changed. A failed prerequisite rolls back the whole patch.
commit;
