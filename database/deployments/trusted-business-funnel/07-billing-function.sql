-- Generated from canonical migrations. DO NOT edit; run node scripts/build-funnel-deployment.mjs.
-- Phase 07: billing-function. No collection activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $funnel_dependency$ begin if not (to_regprocedure('suite_funnel_private.checkout_started()') is not null) then raise exception 'Missing prerequisite for funnel phase 07';end if;end $funnel_dependency$;
do $funnel_gate$ begin
 if not exists(select 1 from suite_funnel_private.settings where singleton and not enabled and retention_days is null and retention_approval_ref is null and enabled_since is null)
 then raise exception 'Funnel install requires disabled collection and NULL approval settings';end if;
 if exists(select 1 from suite_funnel_private.stages limit 1) then raise exception 'Funnel install requires an empty optional ledger';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and
  (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute')))
 then raise exception 'Private funnel function permissions are not closed';end if;
end $funnel_gate$;
create function suite_funnel_private.billing_transition() returns trigger
language plpgsql security definer set search_path='' as $$
declare subject uuid; evidence text; event_key text; evidence_count integer;
begin
 if new.source<>'stripe' or new.subscription_id is null or (tg_op='UPDATE' and old.billing_revision=new.billing_revision) then return new;end if;
 -- Deferred until the sole verified billing apply has appended its durable event.
 if not exists(select 1 from akibusiness_private.toolboxes b where b.workspace_id=new.workspace_id and b.billing_revision=new.billing_revision) then return new;end if;
 select b.profile_id into subject from akibusiness_private.operations_subscriptions b join public.crm_workspaces w on w.id=b.workspace_id
 where b.subscription_id=new.subscription_id and b.workspace_id=new.workspace_id and w.owner_profile_id=b.profile_id;
 if subject is null then return new;end if;
 select count(*),min(e.event_id),min(e.evidence) into evidence_count,event_key,evidence from akibusiness_private.operations_billing_events e
 where e.subscription_id=new.subscription_id and e.processed_at=transaction_timestamp()
 and (e.evidence like 'stripe-invoice:in_%' or e.evidence like 'stripe-current:%');
 if evidence_count<>1 then return new;end if; -- Ambiguous provenance is unavailable, never guessed.
 if new.billing_status='active' and new.paid_until>now() and evidence like 'stripe-invoice:in_%' then
 perform suite_funnel_private.emit('payment_verified',evidence,subject,new.workspace_id,null);
 if tg_op='UPDATE' and array_position(array['basico','standard','pro'],new.tier)>array_position(array['basico','standard','pro'],old.tier) then
 perform suite_funnel_private.emit('subscription_upgraded',evidence,subject,new.workspace_id,null);end if;
 end if;
 if new.billing_status='canceled' and tg_op='UPDATE' and old.billing_status<>'canceled' then
 perform suite_funnel_private.emit('subscription_cancelled','cancellation:'||event_key,subject,new.workspace_id,null);end if;
 return new;
end $$;
revoke all on function suite_funnel_private.billing_transition() from public,anon,authenticated,service_role;
do $funnel_gate$ begin
 if not exists(select 1 from suite_funnel_private.settings where singleton and not enabled and retention_days is null and retention_approval_ref is null and enabled_since is null)
 then raise exception 'Funnel install requires disabled collection and NULL approval settings';end if;
 if exists(select 1 from suite_funnel_private.stages limit 1) then raise exception 'Funnel install requires an empty optional ledger';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and
  (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute')))
 then raise exception 'Private funnel function permissions are not closed';end if;
end $funnel_gate$;
commit;
