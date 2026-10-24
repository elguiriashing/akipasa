-- Generated from canonical migrations. DO NOT edit; run node scripts/build-funnel-deployment.mjs.
-- Phase 11: own-identity-export. No collection activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $funnel_dependency$ begin if not (to_regprocedure('public.purge_suite_business_funnel(integer)') is not null) then raise exception 'Missing prerequisite for funnel phase 11';end if;end $funnel_dependency$;
do $funnel_gate$ begin
 if not exists(select 1 from suite_funnel_private.settings where singleton and not enabled and retention_days is null and retention_approval_ref is null and enabled_since is null)
 then raise exception 'Funnel install requires disabled collection and NULL approval settings';end if;
 if exists(select 1 from suite_funnel_private.stages limit 1) then raise exception 'Funnel install requires an empty optional ledger';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and
  (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute')))
 then raise exception 'Private funnel function permissions are not closed';end if;
end $funnel_gate$;
-- Privacy access is identity-only, intentionally exempt from feature/onboarding/age gates.
create index suite_funnel_subject_export on suite_funnel_private.stages(profile_id,analytics_id);
create function public.my_business_funnel_export(p_after text default '0',p_until text default null,p_limit integer default 500)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare subject uuid:=auth.uid();after_id bigint;until_id bigint;total bigint;items jsonb;
begin
 if subject is null then raise exception 'Authentication required' using errcode='42501';end if;
 if p_after is null or p_after !~ '^(0|[1-9][0-9]{0,18})$' or (p_until is not null and p_until !~ '^(0|[1-9][0-9]{0,18})$') or p_limit is null or p_limit not between 1 and 1000 then raise exception 'Invalid export page' using errcode='22023';end if;
 after_id:=p_after::bigint;
 if p_until is null then select coalesce(max(analytics_id),0) into until_id from suite_funnel_private.stages where profile_id=subject;else until_id:=p_until::bigint;end if;
 if after_id>until_id then raise exception 'Invalid export continuation' using errcode='22023';end if;
 select count(*) into total from suite_funnel_private.stages where profile_id=subject and analytics_id<=until_id;
 select coalesce(jsonb_agg(to_jsonb(page) order by page.analytics_id::bigint),'[]') into items from (
 select analytics_id::text,stage,workspace_id,venue_id,occurred_at,consented_at
 from suite_funnel_private.stages s where s.profile_id=subject and s.analytics_id>after_id and s.analytics_id<=until_id
 order by s.analytics_id limit p_limit) page;
 -- Proof keys are internal integrity references, not meaningful user-facing evidence;
 -- raw invoice/session/event identifiers remain solely in existing billing exports.
 return jsonb_build_object('until',until_id::text,'total',total,'rows',items);
end $$;
revoke all on function public.my_business_funnel_export(text,text,integer) from public,anon;
grant execute on function public.my_business_funnel_export(text,text,integer) to authenticated;
do $funnel_gate$ begin
 if not exists(select 1 from suite_funnel_private.settings where singleton and not enabled and retention_days is null and retention_approval_ref is null and enabled_since is null)
 then raise exception 'Funnel install requires disabled collection and NULL approval settings';end if;
 if exists(select 1 from suite_funnel_private.stages limit 1) then raise exception 'Funnel install requires an empty optional ledger';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and
  (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute')))
 then raise exception 'Private funnel function permissions are not closed';end if;
end $funnel_gate$;
commit;
