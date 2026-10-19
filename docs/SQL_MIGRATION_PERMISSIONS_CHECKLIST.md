# SQL migration permissions checklist (AkiSuite)

Every new API-facing table migration MUST include explicit GRANT/REVOKE statements and RLS policies in the same transaction. Do not depend on Supabase's legacy automatic privileges.

## Required sequence
1. Create table and indexes.
2. REVOKE ALL ON TABLE public.example FROM PUBLIC, anon, authenticated; consider service_role according to backend needs.
3. ALTER TABLE public.example ENABLE ROW LEVEL SECURITY;
4. CREATE POLICY for each permitted operation, scoped by verified user ownership, organization membership and location-level authorization. Never use user-editable JWT metadata as authorization.
5. GRANT only required operations to anon/authenticated/service_role. Grant sequence USAGE only when required for inserts. For functions, revoke default PUBLIC EXECUTE and grant explicit EXECUTE to approved roles.
6. Verify actual grants, RLS status, and positive/negative Data API requests as anon, authenticated owner, authenticated non-owner and backend service role.

## Example: owner-only table (adapt to actual schema)
```sql
create table public.example_private (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  value text not null
);
revoke all on table public.example_private from public, anon, authenticated;
alter table public.example_private enable row level security;
create policy example_private_select on public.example_private
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy example_private_insert on public.example_private
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy example_private_update on public.example_private
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
grant select, insert, update on public.example_private to authenticated;
```

Never copy the example's ownership model to organization/location data without verifying the application's actual authorization functions. RLS does not replace GRANT; GRANT does not replace RLS. A missing SELECT policy can also prevent UPDATE.

## Pre-merge audit
- Review all pending migrations for CREATE TABLE, VIEW, FUNCTION, SEQUENCE and schema exposure.
- Flag tables with no explicit privilege policy; exposed tables without RLS; policies with unrestricted USING(true); SECURITY DEFINER; default PUBLIC EXECUTE; and reliance on inherited/default grants.
- Check views for security_invoker, function search_path and EXECUTE privileges.
- Test on disposable/local database before production. Confirm authorized CRUD and denied cross-tenant/anonymous access via PostgREST; inspect pg_class.relrowsecurity and information_schema.role_table_grants.
- Do not change global default privileges in production without a separate compatibility review of existing applications.
