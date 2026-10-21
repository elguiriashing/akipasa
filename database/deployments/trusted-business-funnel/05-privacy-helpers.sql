-- Generated from canonical migrations. DO NOT edit; run node scripts/build-funnel-deployment.mjs.
-- Phase 05: privacy-helpers. No collection activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $funnel_dependency$ begin if not (to_regprocedure('suite_funnel_private.emit(text,text,uuid,text,uuid)') is not null) then raise exception 'Missing prerequisite for funnel phase 05';end if;end $funnel_dependency$;
do $funnel_gate$ begin
 if not exists(select 1 from suite_funnel_private.settings where singleton and not enabled and retention_days is null and retention_approval_ref is null and enabled_since is null)
 then raise exception 'Funnel install requires disabled collection and NULL approval settings';end if;
 if exists(select 1 from suite_funnel_private.stages limit 1) then raise exception 'Funnel install requires an empty optional ledger';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and
  (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute')))
 then raise exception 'Private funnel function permissions are not closed';end if;
end $funnel_gate$;
create function suite_funnel_private.remove_optional_event() returns trigger
language plpgsql security definer set search_path='' as $$begin delete from public.analytics_events where id=old.analytics_id and action::text='suite_business_stage';return old;end $$;
revoke all on function suite_funnel_private.remove_optional_event() from public,anon,authenticated,service_role;
create function suite_funnel_private.lock_subject() returns trigger
language plpgsql security definer set search_path='' as $$
declare subject uuid;
begin
 if tg_table_name='profiles' then
  if tg_op='DELETE' then subject:=old.id;else subject:=new.id;end if;
 elsif tg_op='DELETE' then subject:=old.profile_id;else subject:=new.profile_id;end if;
 perform pg_advisory_xact_lock(hashtextextended(subject::text,734414));
 if tg_op='DELETE' then return old;else return new;end if;
end $$;
revoke all on function suite_funnel_private.lock_subject() from public,anon,authenticated,service_role;
create function suite_funnel_private.withdraw() returns trigger
language plpgsql security definer set search_path='' as $$
declare subject uuid;
begin
 if tg_op='DELETE' then subject:=old.profile_id;
 elsif tg_table_name in('personalisation_settings','onboarding') then subject:=new.profile_id;else subject:=new.id;end if;
 if not suite_funnel_private.subject_allowed(subject) then delete from suite_funnel_private.stages where profile_id=subject;end if;
 return new;
end $$;
revoke all on function suite_funnel_private.withdraw() from public,anon,authenticated,service_role;
do $funnel_gate$ begin
 if not exists(select 1 from suite_funnel_private.settings where singleton and not enabled and retention_days is null and retention_approval_ref is null and enabled_since is null)
 then raise exception 'Funnel install requires disabled collection and NULL approval settings';end if;
 if exists(select 1 from suite_funnel_private.stages limit 1) then raise exception 'Funnel install requires an empty optional ledger';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and
  (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute')))
 then raise exception 'Private funnel function permissions are not closed';end if;
end $funnel_gate$;
commit;
