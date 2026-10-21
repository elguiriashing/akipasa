-- Generated from canonical migrations. DO NOT edit; run node scripts/build-funnel-deployment.mjs.
-- Phase 08: privacy-and-integrity-triggers. No collection activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $funnel_dependency$ begin if not (to_regprocedure('suite_funnel_private.billing_transition()') is not null) then raise exception 'Missing prerequisite for funnel phase 08';end if;end $funnel_dependency$;
do $funnel_gate$ begin
 if not exists(select 1 from suite_funnel_private.settings where singleton and not enabled and retention_days is null and retention_approval_ref is null and enabled_since is null)
 then raise exception 'Funnel install requires disabled collection and NULL approval settings';end if;
 if exists(select 1 from suite_funnel_private.stages limit 1) then raise exception 'Funnel install requires an empty optional ledger';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and
  (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute')))
 then raise exception 'Private funnel function permissions are not closed';end if;
end $funnel_gate$;
create trigger suite_funnel_activation before update of enabled on suite_funnel_private.settings for each row execute function suite_funnel_private.stamp_activation();
create trigger suite_funnel_remove_event after delete on suite_funnel_private.stages for each row execute function suite_funnel_private.remove_optional_event();
create trigger suite_funnel_lock_consent before update or delete on public.personalisation_settings for each row execute function suite_funnel_private.lock_subject();
create trigger suite_funnel_lock_age before update of birth_year or delete on public.profiles for each row execute function suite_funnel_private.lock_subject();
create trigger suite_funnel_lock_onboarding before insert or update of status on account_private.onboarding for each row execute function suite_funnel_private.lock_subject();
create trigger suite_funnel_consent_withdraw after update or delete on public.personalisation_settings for each row execute function suite_funnel_private.withdraw();
create trigger suite_funnel_age_withdraw after update of birth_year on public.profiles for each row execute function suite_funnel_private.withdraw();
create trigger suite_funnel_onboarding_withdraw after insert or update of status on account_private.onboarding for each row execute function suite_funnel_private.withdraw();
do $funnel_gate$ begin
 if not exists(select 1 from suite_funnel_private.settings where singleton and not enabled and retention_days is null and retention_approval_ref is null and enabled_since is null)
 then raise exception 'Funnel install requires disabled collection and NULL approval settings';end if;
 if exists(select 1 from suite_funnel_private.stages limit 1) then raise exception 'Funnel install requires an empty optional ledger';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and
  (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute')))
 then raise exception 'Private funnel function permissions are not closed';end if;
end $funnel_gate$;
commit;
