-- Read-only owner projection of a verified legacy renewal schedule.
-- No queue, provider, billing, entitlement or subscription mutations.
begin;
create function public.crm_operations_migration_status(p_workspace text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not akibusiness_private.operations_owner(p_workspace) then
  raise exception 'Location owner required' using errcode='42501';
 end if;
 return (
  select jsonb_build_object('tier','basico','effective_at',to_timestamp((c.source_snapshot->>'periodEnd')::double precision),'state','scheduled')
  from akibusiness_private.operations_migration_commands c
  join akibusiness_private.operations_subscriptions b on b.subscription_id=c.subscription_id and b.workspace_id=c.workspace_id
  join public.crm_workspaces w on w.id=b.workspace_id
  join public.billing_subscriptions s on s.stripe_subscription_id=b.subscription_id and s.profile_id=b.profile_id and s.stripe_customer_id=b.customer_id
  where c.workspace_id=p_workspace and b.profile_id=auth.uid() and b.source_token is null
   and b.next_tier='basico' and akibusiness_private.valid_tools('basico',b.next_tools)
   and w.source_venue_id is null and s.plan_code in ('business','business_pro') and s.status='active'
   and c.state='scheduled' and c.completed_at is not null and c.schedule_id is not null
   and c.preview_evidence->'verified'='true'::jsonb
   and c.preview_evidence->>'scheduleId'=c.schedule_id
   and c.preview_evidence->>'manifestSha256'=c.manifest_sha256
   and c.preview_evidence->>'targetPrice'='price_1USgZRGfzDhsgsQZaZYnAjZC'
   and c.preview_evidence->'amountDue'='0'::jsonb and c.preview_evidence->>'currency'='eur'
   and c.preview_evidence->>'currentStatus'='active'
   and c.preview_evidence->>'effectiveAt'=c.source_snapshot->>'periodEnd'
   and c.preview_evidence->>'invoicePreviewId' is not null
   and c.source_snapshot->>'id'=b.subscription_id and c.source_snapshot->>'customer'=b.customer_id
   and c.source_snapshot->>'profileId'=auth.uid()::text
   and c.source_snapshot->>'status'='active' and c.source_snapshot->>'invoiceStatus'='paid'
   and c.source_snapshot->>'quantity'='1'
   and case when c.source_snapshot->>'periodEnd' ~ '^[0-9]{9,10}$'
       then (c.source_snapshot->>'periodEnd')::bigint between 946684800 and 4102444800 else false end
   and exists(select 1 from akibusiness_private.operations_billing_events e
    where e.event_id='migration-scheduled:'||c.command_id::text and e.subscription_id=b.subscription_id
      and e.evidence=c.manifest_sha256||':schedule:'||c.schedule_id)
   and not exists(select 1 from akibusiness_private.toolboxes t where t.workspace_id=b.workspace_id)
 );
end $$;
revoke all on function public.crm_operations_migration_status(text) from public,anon;
grant execute on function public.crm_operations_migration_status(text) to authenticated;
comment on function public.crm_operations_migration_status(text) is 'Owner-only minimal verified renewal migration status; scheduling is not a payment or tool entitlement.';
commit;
