-- Generated from canonical migrations. DO NOT edit; run node scripts/build-funnel-deployment.mjs.
-- Phase 10: manager-and-maintenance-rpcs. No collection activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $funnel_dependency$ begin if not (exists(select 1 from pg_catalog.pg_trigger where tgname='suite_funnel_billing' and not tgisinternal)) then raise exception 'Missing prerequisite for funnel phase 10';end if;end $funnel_dependency$;
do $funnel_gate$ begin
 if not exists(select 1 from suite_funnel_private.settings where singleton and not enabled and retention_days is null and retention_approval_ref is null and enabled_since is null)
 then raise exception 'Funnel install requires disabled collection and NULL approval settings';end if;
 if exists(select 1 from suite_funnel_private.stages limit 1) then raise exception 'Funnel install requires an empty optional ledger';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and
  (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute')))
 then raise exception 'Private funnel function permissions are not closed';end if;
end $funnel_gate$;
create function public.suite_business_funnel(p_workspace text,p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; source_venue uuid; collection_since timestamptz; retention integer;
begin
 if not public.account_features_allowed() or not exists(select 1 from public.crm_workspace_members m
 where m.workspace_id=p_workspace and m.profile_id=auth.uid() and m.status='active' and m.role in('owner','admin','manager'))
 or not public.crm_can_access_workspace(p_workspace) then raise exception 'Workspace manager required' using errcode='42501';end if;
 if p_days is null or p_days<1 or p_days>90 then raise exception 'Period must be between 1 and 90 days';end if;
 select source_venue_id into source_venue from public.crm_workspaces where id=p_workspace;
 if not coalesce((select enabled from suite_funnel_private.settings where singleton),false) then
 return jsonb_build_object('available',false,'reason','not_activated');end if;
 select enabled_since,retention_days into collection_since,retention from suite_funnel_private.settings where singleton;
 if collection_since is null then return jsonb_build_object('available',false,'reason','not_initialized');end if;
 select coalesce(jsonb_object_agg(stage,total),'{}') into result from (
 select s.stage,count(*) total from suite_funnel_private.stages s where s.occurred_at>=greatest(collection_since,now()-make_interval(days=>least(p_days,retention)))
 and (s.workspace_id=p_workspace or (s.workspace_id is null and s.venue_id=source_venue and public.is_venue_member(source_venue)))
 and suite_funnel_private.subject_allowed(s.profile_id) group by s.stage) counts;
 return jsonb_build_object('available',true,'scope','workspace','days',p_days,'stages',result,'coverage','consented_verified_observations_only',
 'retention_days',retention,'collection_started_at',collection_since,'claim_stage_available',source_venue is not null and public.is_venue_member(source_venue),'cta_attribution_available',false,'conversion_rate_available',false,'hq_activation_definition','owner_created_management_workspace');
end $$;
create function public.purge_suite_business_funnel(p_limit integer default 500) returns integer
language plpgsql security definer set search_path='' as $$
declare removed integer; retention integer;
begin
 select retention_days into retention from suite_funnel_private.settings where singleton and retention_approval_ref is not null;
 if retention is null then return 0;end if;
 delete from suite_funnel_private.stages where analytics_id in(select analytics_id from suite_funnel_private.stages where occurred_at<now()-make_interval(days=>retention) order by occurred_at,analytics_id limit greatest(1,least(coalesce(p_limit,500),1000)));
 get diagnostics removed=row_count;return removed;
end $$;
revoke all on all functions in schema suite_funnel_private from public,anon,authenticated,service_role;
revoke all on function public.suite_business_funnel(text,integer) from public,anon;
grant execute on function public.suite_business_funnel(text,integer) to authenticated;
revoke all on function public.purge_suite_business_funnel(integer) from public,anon,authenticated;
grant execute on function public.purge_suite_business_funnel(integer) to service_role;
do $funnel_gate$ begin
 if not exists(select 1 from suite_funnel_private.settings where singleton and not enabled and retention_days is null and retention_approval_ref is null and enabled_since is null)
 then raise exception 'Funnel install requires disabled collection and NULL approval settings';end if;
 if exists(select 1 from suite_funnel_private.stages limit 1) then raise exception 'Funnel install requires an empty optional ledger';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and
  (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute')))
 then raise exception 'Private funnel function permissions are not closed';end if;
end $funnel_gate$;
commit;
