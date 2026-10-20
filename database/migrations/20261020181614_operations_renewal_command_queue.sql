-- Explicit service-enqueued migration commands only; empty/default disabled.
begin;
create table akibusiness_private.operations_migration_commands (
 subscription_id text primary key references akibusiness_private.operations_subscriptions(subscription_id),
 workspace_id text not null unique references public.crm_workspaces(id),
 command_id uuid not null unique default gen_random_uuid(),
 manifest_sha256 text not null check(manifest_sha256 ~ '^[a-f0-9]{64}$'),
 source_snapshot jsonb not null check(jsonb_typeof(source_snapshot)='object'),
 state text not null default 'queued' check(state in ('queued','prepared','scheduled','blocked')),
 schedule_id text unique,
 lease uuid, leased_until timestamptz,
 retry_after timestamptz not null default now(),first_attempt_at timestamptz,
 attempts integer not null default 0,last_error text,
 planned_parameters jsonb,readback_defaults jsonb,preview_evidence jsonb,created_at timestamptz not null default now(),completed_at timestamptz
);
alter table akibusiness_private.operations_migration_commands enable row level security;
revoke all on akibusiness_private.operations_migration_commands from public,anon,authenticated,service_role;
grant select on akibusiness_private.operations_migration_commands to service_role;
create index operations_migration_commands_due on akibusiness_private.operations_migration_commands(retry_after) where state in ('queued','prepared');
create function public.enqueue_crm_operations_migration(p_subscription text,p_workspace text,p_manifest text,p_snapshot jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare b akibusiness_private.operations_subscriptions; command akibusiness_private.operations_migration_commands;
begin
 if p_manifest !~ '^[a-f0-9]{64}$' or p_manifest is null or jsonb_typeof(p_snapshot)<>'object' or p_snapshot is null then raise exception 'Sealed reviewed snapshot required'; end if;
 select * into b from akibusiness_private.operations_subscriptions where subscription_id=p_subscription and workspace_id=p_workspace and source_token is null;
 if not found or b.next_tier<>'basico' or not akibusiness_private.valid_tools('basico',b.next_tools) then raise exception 'Explicit legacy migration binding required'; end if;
 if not exists(select 1 from public.billing_subscriptions s where s.stripe_subscription_id=p_subscription and s.profile_id=b.profile_id and s.stripe_customer_id=b.customer_id and s.plan_code in ('business','business_pro') and s.status='active') then raise exception 'Active legacy ledger required'; end if;
 if not exists(select 1 from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id where w.id=p_workspace and w.owner_profile_id=b.profile_id and w.source_venue_id is null and w.status='active' and m.profile_id=b.profile_id and m.role='owner' and m.status='active') then raise exception 'Verified private scope required'; end if;
 if exists(select 1 from akibusiness_private.toolboxes where workspace_id=p_workspace) then raise exception 'Migration already activated'; end if;
 if p_snapshot->>'id' is distinct from p_subscription or p_snapshot->>'customer' is distinct from b.customer_id or p_snapshot->>'profileId' is distinct from b.profile_id::text
  or p_snapshot->>'status' is distinct from 'active' or p_snapshot->>'quantity' is distinct from '1' or p_snapshot->>'invoiceStatus' is distinct from 'paid'
  or not (p_snapshot ? 'periodEnd') or (p_snapshot->>'periodEnd')::bigint<=extract(epoch from now()) then raise exception 'Reviewed source scope/payment required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace,7723));
 select * into command from akibusiness_private.operations_migration_commands where subscription_id=p_subscription;
 if found then
  if command.workspace_id<>p_workspace or command.manifest_sha256<>p_manifest or command.source_snapshot<>p_snapshot then raise exception 'Immutable migration command conflict'; end if;
  return command.command_id;
 end if;
 insert into akibusiness_private.operations_migration_commands(subscription_id,workspace_id,manifest_sha256,source_snapshot) values(p_subscription,p_workspace,p_manifest,p_snapshot) returning command_id into command.command_id;
 insert into akibusiness_private.operations_billing_events(event_id,subscription_id,evidence) values('migration-queued:'||command.command_id::text,p_subscription,p_manifest);
 return command.command_id;
end $$;
create function public.claim_crm_operations_migration() returns jsonb
language plpgsql security definer set search_path='' as $$
declare command akibusiness_private.operations_migration_commands;
begin
 select * into command from akibusiness_private.operations_migration_commands where state in ('queued','prepared') and retry_after<=now() and (leased_until is null or leased_until<=now()) order by retry_after,created_at limit 1 for update skip locked;
 if not found then return null; end if;
 update akibusiness_private.operations_migration_commands set lease=gen_random_uuid(),leased_until=now()+interval '5 minutes',first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1 where subscription_id=command.subscription_id returning * into command;
 return to_jsonb(command);
end $$;
create function public.crm_operations_migration_scope(p_command uuid,p_lease uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c akibusiness_private.operations_migration_commands; b akibusiness_private.operations_subscriptions;
begin
 select * into c from akibusiness_private.operations_migration_commands where command_id=p_command and lease=p_lease and state in ('queued','prepared');
 if not found then raise exception 'Migration lease changed'; end if;
 select * into b from akibusiness_private.operations_subscriptions where subscription_id=c.subscription_id and workspace_id=c.workspace_id and source_token is null;
 if not found or b.next_tier<>'basico' or not akibusiness_private.valid_tools('basico',b.next_tools) or exists(select 1 from akibusiness_private.toolboxes where workspace_id=b.workspace_id) then raise exception 'Migration binding changed'; end if;
 if not exists(select 1 from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id where w.id=b.workspace_id and w.owner_profile_id=b.profile_id and w.source_venue_id is null and w.status='active' and m.profile_id=b.profile_id and m.role='owner' and m.status='active') or not exists(select 1 from public.billing_subscriptions s where s.stripe_subscription_id=b.subscription_id and s.profile_id=b.profile_id and s.stripe_customer_id=b.customer_id and s.plan_code in ('business','business_pro') and s.status='active') then raise exception 'Migration ownership or ledger changed'; end if;
 return public.crm_operations_binding(b.subscription_id,null);
end $$;
create function public.prepare_crm_operations_migration(p_command uuid,p_lease uuid,p_schedule text,p_parameters jsonb default null,p_defaults jsonb default null) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_schedule !~ '^sub_sched_[A-Za-z0-9]+$' or p_schedule is null then raise exception 'Provider schedule reference required'; end if;
 update akibusiness_private.operations_migration_commands set schedule_id=p_schedule,state='prepared',planned_parameters=coalesce(planned_parameters,p_parameters),readback_defaults=coalesce(readback_defaults,p_defaults) where command_id=p_command and lease=p_lease and state in ('queued','prepared') and (schedule_id is null or schedule_id=p_schedule) and (p_parameters is null or (jsonb_typeof(p_parameters)='object' and (planned_parameters is null or planned_parameters=p_parameters))) and (p_defaults is null or (jsonb_typeof(p_defaults)='object' and (readback_defaults is null or readback_defaults=p_defaults)));
 if not found then raise exception 'Migration lease or schedule changed'; end if;
end $$;
create function public.finish_crm_operations_migration(p_command uuid,p_lease uuid,p_result text,p_evidence jsonb default null) returns void
language plpgsql security definer set search_path='' as $$
declare command akibusiness_private.operations_migration_commands;
begin
 if p_result not in ('scheduled','blocked','retry') or p_result is null then raise exception 'Explicit migration outcome required'; end if;
 if p_result='scheduled' and (p_evidence->>'verified') is distinct from 'true' then raise exception 'Verified provider readback required'; end if;
 update akibusiness_private.operations_migration_commands set state=case when p_result='retry' then state else p_result end,
  lease=null,leased_until=null,retry_after=now()+least(interval '6 hours',interval '5 minutes'*power(2,least(attempts-1,6))),
  last_error=case when p_result='scheduled' then null else p_result end,preview_evidence=p_evidence,
  completed_at=case when p_result='scheduled' then now() else null end
  where command_id=p_command and lease=p_lease and state in ('queued','prepared') returning * into command;
 if not found then raise exception 'Migration lease changed'; end if;
 if p_result='scheduled' then
  insert into akibusiness_private.operations_billing_events(event_id,subscription_id,evidence) values('migration-scheduled:'||p_command::text,command.subscription_id,command.manifest_sha256||':schedule:'||command.schedule_id);
 end if;
end $$;
revoke all on function public.crm_operations_migration_scope(uuid,uuid),public.enqueue_crm_operations_migration(text,text,text,jsonb),public.claim_crm_operations_migration(),public.prepare_crm_operations_migration(uuid,uuid,text,jsonb,jsonb),public.finish_crm_operations_migration(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.crm_operations_migration_scope(uuid,uuid),public.enqueue_crm_operations_migration(text,text,text,jsonb),public.claim_crm_operations_migration(),public.prepare_crm_operations_migration(uuid,uuid,text,jsonb,jsonb),public.finish_crm_operations_migration(uuid,uuid,text,jsonb) to service_role;
commit;
