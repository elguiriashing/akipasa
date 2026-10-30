begin;
set local search_path=pg_catalog;

-- SOURCE ONLY. No credential policies/grants, account eligibility, attendance,
-- XP or customer rows change. Deploy separately only after reviewed approval.
do $preview_preconditions$
declare
  helper oid:=to_regprocedure('public.account_features_allowed()');
  preview oid:=to_regprocedure('public.checkin_venue_preview(uuid)');
  trusted_owner oid;
begin
  if to_regclass('public.profiles') is null
    or to_regclass('public.venues') is null
    or to_regclass('public.venue_checkin_credentials') is null
    or helper is null then
    raise exception 'Existing check-in schema and canonical account guard required';
  end if;
  select relowner into trusted_owner from pg_class where oid='public.profiles'::regclass;
  if trusted_owner<>current_user::regrole::oid
    or trusted_owner in ('anon'::regrole::oid,'authenticated'::regrole::oid)
    or not exists(select 1 from pg_class where oid='public.venue_checkin_credentials'::regclass
      and relowner=trusted_owner and relrowsecurity and not relforcerowsecurity)
    or not exists(select 1 from pg_class where oid='public.venues'::regclass and relowner=trusted_owner) then
    raise exception 'Trusted schema ownership and credential RLS must remain unchanged';
  end if;
  if not exists(select 1 from pg_proc p where p.oid=helper
    and p.proowner=trusted_owner and p.prosecdef and p.provolatile='s'
    and p.prorettype='boolean'::regtype and not p.proretset
    and p.proconfig @> array['search_path=""']
    and md5(pg_get_functiondef(p.oid))='d40c0bd5a77eab45a995449c542774a7')
    or not has_function_privilege('authenticated',helper,'EXECUTE')
    or has_function_privilege('anon',helper,'EXECUTE') then
    raise exception 'Known canonical authenticated account guard required';
  end if;
  if not exists(select 1 from pg_attribute where attrelid='public.venue_checkin_credentials'::regclass and attname='token' and atttypid='uuid'::regtype and not attisdropped)
    or not exists(select 1 from pg_attribute where attrelid='public.venue_checkin_credentials'::regclass and attname='venue_id' and atttypid='uuid'::regtype and not attisdropped)
    or not exists(select 1 from pg_attribute where attrelid='public.venue_checkin_credentials'::regclass and attname='active' and atttypid='boolean'::regtype and not attisdropped)
    or not exists(select 1 from pg_attribute where attrelid='public.venues'::regclass and attname='id' and atttypid='uuid'::regtype and not attisdropped)
    or not exists(select 1 from pg_attribute where attrelid='public.venues'::regclass and attname='name' and not attisdropped)
    or not exists(select 1 from pg_attribute where attrelid='public.venues'::regclass and attname='status' and not attisdropped) then
    raise exception 'Known credential and public venue columns required';
  end if;
  if preview is not null and not exists(select 1 from pg_proc p where p.oid=preview
    and p.proowner=trusted_owner and p.prosecdef and p.provolatile='s'
    and p.proconfig @> array['search_path=""'] and p.proretset
    and pg_get_function_result(p.oid)='TABLE(venue_id uuid, venue_name text)'
    and md5(p.prosrc)='0ddaa8de6cb95a43ff735951050f8d1f'
    and has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not has_function_privilege('anon',p.oid,'EXECUTE')
    and not exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      where a.grantee not in (trusted_owner,'authenticated'::regrole::oid)
        or (a.grantee='authenticated'::regrole::oid and a.is_grantable))) then
    raise exception 'Unknown existing preview requires explicit reconciliation';
  end if;
end
$preview_preconditions$;

create or replace function public.checkin_venue_preview(p_token uuid)
returns table(venue_id uuid,venue_name text)
language plpgsql stable security definer set search_path='' as $preview$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode='42501';
  end if;
  if public.account_features_allowed() is not true then
    raise exception 'account completion required' using errcode='42501';
  end if;
  return query
    select v.id, v.name::text
    from public.venue_checkin_credentials c
    join public.venues v on v.id=c.venue_id
    where c.token=p_token and c.active and v.status::text='published';
end;
$preview$;
revoke all on function public.checkin_venue_preview(uuid) from public,anon,authenticated,service_role;
grant execute on function public.checkin_venue_preview(uuid) to authenticated;

do $preview_postconditions$
begin
  if not exists(select 1 from pg_proc p where p.oid='public.checkin_venue_preview(uuid)'::regprocedure
    and p.proowner=(select relowner from pg_class where oid='public.profiles'::regclass)
    and p.prosecdef and p.provolatile='s' and p.proconfig @> array['search_path=""']
    and p.proretset and pg_get_function_result(p.oid)='TABLE(venue_id uuid, venue_name text)'
    and md5(p.prosrc)='0ddaa8de6cb95a43ff735951050f8d1f'
    and not exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      where a.grantee not in (p.proowner,'authenticated'::regrole::oid)
        or (a.grantee='authenticated'::regrole::oid and a.is_grantable)))
    or not has_function_privilege('authenticated','public.checkin_venue_preview(uuid)','EXECUTE')
    or has_function_privilege('anon','public.checkin_venue_preview(uuid)','EXECUTE') then
    raise exception 'Safe check-in preview verification failed';
  end if;
end
$preview_postconditions$;

-- Rollback, SOURCE ONLY: drop function public.checkin_venue_preview(uuid);
-- Coordinate reverting its UI caller first. Never change credential RLS or use
-- check_in_by_token as a preview: that existing RPC records verified attendance.
-- Preconditions/postconditions fail atomically; an identical rerun is safe.
commit;
