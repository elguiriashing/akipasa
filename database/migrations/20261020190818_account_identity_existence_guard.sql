-- A signed JWT may outlive its deleted identity/profile. Do not treat that as legacy access.
begin;
create or replace function public.account_features_allowed() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null
 and exists(select 1 from public.profiles p where p.id=auth.uid())
 and not exists(select 1 from account_private.onboarding o where o.profile_id=auth.uid() and o.status<>'complete')
$$;
revoke all on function public.account_features_allowed() from public,anon;
grant execute on function public.account_features_allowed() to authenticated;
commit;
