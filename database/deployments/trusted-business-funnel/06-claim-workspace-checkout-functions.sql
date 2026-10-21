-- Generated from canonical migrations. DO NOT edit; run node scripts/build-funnel-deployment.mjs.
-- Phase 06: claim-workspace-checkout-functions. No collection activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $funnel_dependency$ begin if not (to_regprocedure('suite_funnel_private.withdraw()') is not null) then raise exception 'Missing prerequisite for funnel phase 06';end if;end $funnel_dependency$;
do $funnel_gate$ begin
 if not exists(select 1 from suite_funnel_private.settings where singleton and not enabled and retention_days is null and retention_approval_ref is null and enabled_since is null)
 then raise exception 'Funnel install requires disabled collection and NULL approval settings';end if;
 if exists(select 1 from suite_funnel_private.stages limit 1) then raise exception 'Funnel install requires an empty optional ledger';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and
  (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute')))
 then raise exception 'Private funnel function permissions are not closed';end if;
end $funnel_gate$;
create function suite_funnel_private.claim_completed() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.status::text='approved' and old.status::text is distinct from 'approved'
 and new.decided_by=auth.uid() and exists(select 1 from public.profiles p where p.id=new.decided_by and p.app_role::text in('administrator','moderator'))
 and exists(select 1 from public.venue_claims c join public.venue_members m on m.venue_id=c.venue_id and m.profile_id=c.claimant_id
 where c.id=new.id and c.status::text='approved' and c.decided_by is not null and c.decided_at is not null and m.role::text='owner')
 then perform suite_funnel_private.emit('claim_completed','claim:'||new.id,new.claimant_id,null,new.venue_id);end if;
 return new;
end $$;
revoke all on function suite_funnel_private.claim_completed() from public,anon,authenticated,service_role;
create function suite_funnel_private.hq_activated() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 -- Explicit owner-created management workspace, not a visit, staff provisioning or migration.
 if auth.uid()=new.owner_profile_id and exists(select 1 from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id
 where w.id=new.id and w.owner_profile_id=new.owner_profile_id and w.status in('active','trial') and m.profile_id=w.owner_profile_id and m.status='active' and m.role='owner')
 then perform suite_funnel_private.emit('hq_activated','workspace:'||new.id,new.owner_profile_id,new.id,new.source_venue_id);end if;
 return new;
end $$;
revoke all on function suite_funnel_private.hq_activated() from public,anon,authenticated,service_role;
create function suite_funnel_private.checkout_started() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.session_id like 'cs_%' and new.state='reserved' and (tg_op='INSERT' or old.session_id is distinct from new.session_id)
 and exists(select 1 from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id
 where w.id=new.workspace_id and w.owner_profile_id=new.profile_id and m.profile_id=new.profile_id and m.role='owner' and m.status='active')
 then perform suite_funnel_private.emit('checkout_started','checkout:'||new.token,new.profile_id,new.workspace_id,null);end if;
 return new;
end $$;
revoke all on function suite_funnel_private.checkout_started() from public,anon,authenticated,service_role;
do $funnel_gate$ begin
 if not exists(select 1 from suite_funnel_private.settings where singleton and not enabled and retention_days is null and retention_approval_ref is null and enabled_since is null)
 then raise exception 'Funnel install requires disabled collection and NULL approval settings';end if;
 if exists(select 1 from suite_funnel_private.stages limit 1) then raise exception 'Funnel install requires an empty optional ledger';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and
  (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute')))
 then raise exception 'Private funnel function permissions are not closed';end if;
end $funnel_gate$;
commit;
