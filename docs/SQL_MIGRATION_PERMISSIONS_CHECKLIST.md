# SQL migration permissions checklist

Every new API-facing table must declare its privileges and RLS policies in the
same transaction. Never depend on Supabase legacy automatic grants.

## Required sequence

1. Create the table and indexes.
2. Revoke all table privileges from `PUBLIC`, `anon`, and `authenticated`.
3. Enable row-level security.
4. Create policies for every allowed operation using verified ownership or the
   existing organisation/location authorization helpers.
5. Grant only the operations required by each role. Revoke default `PUBLIC`
   execution on functions and grant execution only to the intended roles.
6. Exercise allowed and denied paths as anonymous, owner, non-owner, and service
   roles on an isolated database before production.

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

grant select, insert on public.example_private to authenticated;
```

The example is not a reusable organization model. A missing `SELECT` policy can
also prevent `UPDATE`. Views require `security_invoker`; security-definer
functions require a fixed `search_path`, explicit execution grants, bounded
inputs, and independent caller authorization.

## Pre-merge audit

- Inspect every new table, view, function, sequence, and exposed schema object.
- Reject an exposed table with no RLS or no explicit privilege statement.
- Review `using (true)`, service-role grants, and deny-all policies explicitly.
- Verify `pg_class.relrowsecurity`, `information_schema.role_table_grants`, and
  positive/negative Data API calls on an isolated database.
- Do not change global default privileges without a separate compatibility
  review of every deployed product using the shared database.
