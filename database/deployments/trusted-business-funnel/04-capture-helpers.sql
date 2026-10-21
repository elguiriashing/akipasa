-- Generated from canonical migrations. DO NOT edit; run node scripts/build-funnel-deployment.mjs.
-- Phase 04: capture-helpers. No collection activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $funnel_dependency$ begin if not (to_regclass('akibusiness_private.suite_funnel_billing_evidence') is not null) then raise exception 'Missing prerequisite for funnel phase 04';end if;end $funnel_dependency$;
do $funnel_gate$ begin
 if not exists(select 1 from suite_funnel_private.settings where singleton and not enabled and retention_days is null and retention_approval_ref is null and enabled_since is null)
 then raise exception 'Funnel install requires disabled collection and NULL approval settings';end if;
 if exists(select 1 from suite_funnel_private.stages limit 1) then raise exception 'Funnel install requires an empty optional ledger';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and
  (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute')))
 then raise exception 'Private funnel function permissions are not closed';end if;
end $funnel_gate$;
create function suite_funnel_private.stamp_activation() returns trigger
language plpgsql security definer set search_path='' as $$begin
 if new.enabled and not old.enabled then new.enabled_since:=now();end if;return new;
end $$;
revoke all on function suite_funnel_private.stamp_activation() from public,anon,authenticated,service_role;
create function suite_funnel_private.subject_allowed(p_profile uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join public.personalisation_settings s on s.profile_id=p.id
 where p.id=p_profile and s.analytics_enabled and s.marketing_enabled and s.updated_at<=now()
 and (p.birth_year is null or extract(year from now() at time zone 'UTC')::integer-p.birth_year>=18)
 and not exists(select 1 from account_private.onboarding o where o.profile_id=p.id and o.status<>'complete'))
$$;
revoke all on function suite_funnel_private.subject_allowed(uuid) from public,anon,authenticated,service_role;
create function suite_funnel_private.emit(p_stage text,p_proof text,p_profile uuid,p_workspace text,p_venue uuid) returns void
language plpgsql security definer set search_path='' as $$
declare event_id bigint; consent_time timestamptz;
begin
 if not coalesce((select enabled from suite_funnel_private.settings where singleton),false)
 then return;end if;
 perform pg_advisory_xact_lock(hashtextextended(p_profile::text,734414));
 if not suite_funnel_private.subject_allowed(p_profile) then return;end if;
 select updated_at into consent_time from public.personalisation_settings where profile_id=p_profile;
 event_id:=nextval(pg_get_serial_sequence('public.analytics_events','id'));
 insert into suite_funnel_private.stages(analytics_id,stage,proof_key,profile_id,workspace_id,venue_id,consented_at)
 values(event_id,p_stage,p_proof,p_profile,p_workspace,p_venue,consent_time) on conflict(stage,proof_key) do nothing;
 if not found then return;end if;
 insert into public.analytics_events(id,action,venue_id,profile_id,metadata) overriding system value
 values(event_id,'suite_business_stage',p_venue,p_profile,jsonb_strip_nulls(jsonb_build_object('stage',p_stage,'workspace_id',p_workspace,'product',case when p_stage in('claim_completed','hq_activated') then 'hq' else 'business' end)));
exception when others then
 -- Optional measurement must never abort a verified billing/claim operation.
 update suite_funnel_private.settings set capture_failures=capture_failures+1,last_error=sqlstate where singleton;
 raise log 'business_funnel_capture_failed SQLSTATE=%',sqlstate;
 return;
end $$;
revoke all on function suite_funnel_private.emit(text,text,uuid,text,uuid) from public,anon,authenticated,service_role;
do $funnel_gate$ begin
 if not exists(select 1 from suite_funnel_private.settings where singleton and not enabled and retention_days is null and retention_approval_ref is null and enabled_since is null)
 then raise exception 'Funnel install requires disabled collection and NULL approval settings';end if;
 if exists(select 1 from suite_funnel_private.stages limit 1) then raise exception 'Funnel install requires an empty optional ledger';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and
  (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute')))
 then raise exception 'Private funnel function permissions are not closed';end if;
end $funnel_gate$;
commit;
