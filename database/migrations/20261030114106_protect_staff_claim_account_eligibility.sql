begin;

-- The exact-claim lookup was added after account-coverage migration 180946.
-- Keep the original role/filter/result contract while enforcing its list sibling's
-- central account eligibility boundary. No claims, roles or onboarding rows change.
set local search_path = public, pg_catalog;

do $staff_claim_guard$
declare
  lookup_rpc oid := to_regprocedure('public.staff_pending_venue_claim_by_id(uuid)');
  account_guard oid := to_regprocedure('public.account_features_allowed()');
  profile_owner oid := (select relowner from pg_class where oid='public.profiles'::regclass);
begin
  if lookup_rpc is null or account_guard is null then
    raise exception 'Staff lookup and canonical account guard must already exist';
  end if;
  if not exists (
    select 1 from pg_proc p join pg_language l on l.oid=p.prolang
    where p.oid=lookup_rpc and p.prosecdef and p.provolatile='s'
      and l.lanname='plpgsql' and p.proconfig @> array['search_path=""']
      and p.proowner=profile_owner
      and p.proowner not in ('anon'::regrole,'authenticated'::regrole)
      and md5(p.prosrc) in ('154545dcdaf45d679cc35adeaf1677b7','085d3d37194bf241cb0fd23f92ca2478')
  ) then
    raise exception 'Unknown staff lookup definition requires explicit reconciliation';
  end if;
  if not exists (
    select 1 from pg_proc p where p.oid=account_guard and p.prosecdef and p.provolatile='s'
      and p.prorettype='boolean'::regtype and not p.proretset
      and p.proowner=profile_owner and p.proconfig @> array['search_path=""']
  ) or not has_function_privilege('authenticated',account_guard,'EXECUTE')
    or has_function_privilege('anon',account_guard,'EXECUTE') then
    raise exception 'Trusted authenticated canonical account guard must remain available';
  end if;
  if not has_function_privilege('authenticated',lookup_rpc,'EXECUTE')
    or has_function_privilege('anon',lookup_rpc,'EXECUTE') then
    raise exception 'Existing staff lookup execution boundary requires reconciliation';
  end if;
end
$staff_claim_guard$;

create or replace function public.staff_pending_venue_claim_by_id(p_claim uuid)
returns table(id uuid, created_at timestamptz, evidence text, status text,
  claimant_id uuid, venues jsonb, claimant jsonb, total_count bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p where p.id=auth.uid()
      and p.app_role::text in ('moderator','administrator')
  ) then raise exception 'staff role required' using errcode='42501'; end if;
  if public.account_features_allowed() is not true then
    raise exception 'account completion required' using errcode='42501';
  end if;
  return query
  select c.id,c.created_at,c.evidence,c.status::text,c.claimant_id,
    jsonb_build_object('name',v.name,'address',v.address,'slug',v.slug,
      'discovery_vertical',v.discovery_vertical,'contact_phone',v.contact_phone,
      'website_url',v.website_url,'timezone',coalesce(city.timezone,'Europe/Madrid')),
    jsonb_build_object('display_name',p.display_name,'email',u.email::text,
      'phone',p.phone,'created_at',p.created_at,'submission',c.claim_details),
    1::bigint
  from public.venue_claims c
  join public.venues v on v.id=c.venue_id
  join public.profiles p on p.id=c.claimant_id
  left join auth.users u on u.id=p.id and u.deleted_at is null
  left join public.cities city on city.id=v.city_id
  where c.status::text='pending' and c.id=p_claim;
end;
$$;
revoke all on function public.staff_pending_venue_claim_by_id(uuid) from public,anon;
grant execute on function public.staff_pending_venue_claim_by_id(uuid) to authenticated;

do $staff_claim_verify$
begin
  if not exists (
    select 1 from pg_proc p
    where p.oid='public.staff_pending_venue_claim_by_id(uuid)'::regprocedure
      and md5(p.prosrc)='085d3d37194bf241cb0fd23f92ca2478' and p.prosecdef and p.provolatile='s'
      and p.proconfig @> array['search_path=""']
      and p.proowner=(select relowner from pg_class where oid='public.profiles'::regclass)
  ) or not has_function_privilege('authenticated',
    'public.staff_pending_venue_claim_by_id(uuid)','EXECUTE')
    or has_function_privilege('anon',
    'public.staff_pending_venue_claim_by_id(uuid)','EXECUTE') then
    raise exception 'Staff lookup account boundary verification failed';
  end if;
end
$staff_claim_verify$;

-- Keep owner/ACL, canonical helper, legacy eligibility, all other RPCs and data.
-- Preconditions and verification fail atomically; applying again is idempotent.
commit;
