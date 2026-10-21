-- Generated from canonical migrations. DO NOT edit; run node scripts/build-funnel-deployment.mjs.
-- Phase 09: trusted-source-triggers. No collection activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $funnel_dependency$ begin if not (exists(select 1 from pg_catalog.pg_trigger where tgname='suite_funnel_onboarding_withdraw' and not tgisinternal)) then raise exception 'Missing prerequisite for funnel phase 09';end if;end $funnel_dependency$;
do $funnel_gate$ begin
 if not exists(select 1 from suite_funnel_private.settings where singleton and not enabled and retention_days is null and retention_approval_ref is null and enabled_since is null)
 then raise exception 'Funnel install requires disabled collection and NULL approval settings';end if;
 if exists(select 1 from suite_funnel_private.stages limit 1) then raise exception 'Funnel install requires an empty optional ledger';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and
  (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute')))
 then raise exception 'Private funnel function permissions are not closed';end if;
end $funnel_gate$;
create constraint trigger suite_funnel_claim after insert or update on public.venue_claims deferrable initially deferred for each row execute function suite_funnel_private.claim_completed();
create constraint trigger suite_funnel_hq after insert on public.crm_workspaces deferrable initially deferred for each row execute function suite_funnel_private.hq_activated();
create trigger suite_funnel_checkout after insert or update on akibusiness_private.operations_checkouts for each row execute function suite_funnel_private.checkout_started();
create constraint trigger suite_funnel_billing after insert or update on akibusiness_private.toolboxes deferrable initially deferred for each row execute function suite_funnel_private.billing_transition();
do $funnel_gate$ begin
 if not exists(select 1 from suite_funnel_private.settings where singleton and not enabled and retention_days is null and retention_approval_ref is null and enabled_since is null)
 then raise exception 'Funnel install requires disabled collection and NULL approval settings';end if;
 if exists(select 1 from suite_funnel_private.stages limit 1) then raise exception 'Funnel install requires an empty optional ledger';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and
  (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute')))
 then raise exception 'Private funnel function permissions are not closed';end if;
end $funnel_gate$;
commit;
