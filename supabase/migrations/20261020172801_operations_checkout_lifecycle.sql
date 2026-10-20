-- Requires the reviewed 20261020170509 toolbox foundation. No automatic enrollment.
-- Existing Stripe ownership and the AkiPasa-only signed webhook remain authoritative.
begin;
create table akibusiness_private.operations_checkouts (
 workspace_id text primary key references public.crm_workspaces(id),
 profile_id uuid not null references public.profiles(id), customer_id text not null,
 token uuid not null unique default gen_random_uuid(), tier text not null,
 tools text[] not null, price_id text not null,
 expires_at timestamptz not null default now()+interval '35 minutes',
 state text not null default 'reserved' check(state in ('reserved','completed','released')),
 session_id text unique, created_at timestamptz not null default now(),
 check(akibusiness_private.valid_tools(tier,tools))
);
create table akibusiness_private.operations_subscriptions (
 subscription_id text primary key check(subscription_id like 'sub_%'),
 workspace_id text not null unique references public.crm_workspaces(id),
 profile_id uuid not null references public.profiles(id), customer_id text not null,
 next_tier text, next_tools text[], source_token uuid unique,
 created_at timestamptz not null default now(),
 check(next_tier is null or akibusiness_private.valid_tools(next_tier,next_tools))
);
create table akibusiness_private.operations_billing_events (
 event_id text primary key, subscription_id text not null,
 evidence text not null, processed_at timestamptz not null default now()
);
create table akibusiness_private.operations_plan_changes(
 workspace_id text primary key references public.crm_workspaces(id), subscription_id text not null,
 token uuid not null unique default gen_random_uuid(),tier text not null,tools text[] not null,
 schedule_id text unique,effective_at timestamptz,state text not null default 'pending' check(state in ('pending','scheduled','completed')),
 created_at timestamptz not null default now(), check(akibusiness_private.valid_tools(tier,tools)));
alter table akibusiness_private.operations_plan_changes enable row level security;
revoke all on akibusiness_private.operations_plan_changes from public,anon,authenticated;
grant select,insert,update on akibusiness_private.operations_plan_changes to service_role;
alter table akibusiness_private.operations_checkouts enable row level security;
alter table akibusiness_private.operations_subscriptions enable row level security;
alter table akibusiness_private.operations_billing_events enable row level security;
revoke all on akibusiness_private.operations_checkouts,akibusiness_private.operations_subscriptions,akibusiness_private.operations_billing_events from public,anon,authenticated;
grant select,insert,update on akibusiness_private.operations_checkouts,akibusiness_private.operations_subscriptions,akibusiness_private.operations_billing_events to service_role;

create function akibusiness_private.operations_owner(p_workspace text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and akibusiness_private.account_allowed() and exists(select 1 from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id
 where w.id=p_workspace and w.owner_profile_id=auth.uid() and w.status in ('active','trial')
 and m.profile_id=auth.uid() and m.role='owner' and m.status='active')
$$;
create function public.reserve_crm_operations_checkout(p_workspace text,p_tier text,p_tools text[],p_price text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c akibusiness_private.operations_checkouts; customer text;
begin
 if not akibusiness_private.operations_owner(p_workspace) then raise exception 'Location owner required' using errcode='42501'; end if;
 if not akibusiness_private.valid_tools(p_tier,p_tools) or p_price is distinct from (case p_tier when 'basico' then 'price_1USgZRGfzDhsgsQZaZYnAjZC' when 'standard' then 'price_1USgZhGfzDhsgsQZBLuFFQ3c' when 'pro' then 'price_1USgZiGfzDhsgsQZYEgPv3HL' else '' end) then raise exception 'Unapproved operating offer'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace,7723));
 if exists(select 1 from akibusiness_private.operations_subscriptions where workspace_id=p_workspace) then raise exception 'Existing subscription requires change workflow' using errcode='PT409'; end if;
 if exists(select 1 from public.billing_subscriptions where profile_id=auth.uid() and plan_code in ('business','business_pro') and status in ('active','trialing','past_due','unpaid','paused','incomplete')) then raise exception 'Existing business migration required' using errcode='PT409'; end if;
 select stripe_customer_id into customer from public.billing_customers where profile_id=auth.uid();
 if customer is null then raise exception 'Verified billing customer required'; end if;
 select * into c from akibusiness_private.operations_checkouts where workspace_id=p_workspace for update;
 if found and c.state='reserved' then
  -- Never automatically free a token: Stripe asynchronous payments can complete late.
  if c.profile_id<>auth.uid() or c.customer_id<>customer or c.tier<>p_tier or c.tools<>p_tools or c.price_id<>p_price or c.expires_at<=now() then raise exception 'Checkout needs authoritative reconciliation' using errcode='PT409'; end if;
  return to_jsonb(c);
 end if;
 insert into akibusiness_private.operations_checkouts(workspace_id,profile_id,customer_id,tier,tools,price_id)
 values(p_workspace,auth.uid(),customer,p_tier,p_tools,p_price)
 on conflict(workspace_id) do update set profile_id=excluded.profile_id,customer_id=excluded.customer_id,tier=excluded.tier,tools=excluded.tools,price_id=excluded.price_id,token=gen_random_uuid(),state='reserved',session_id=null,expires_at=now()+interval '35 minutes',created_at=now()
 returning * into c;
 return to_jsonb(c);
end $$;
create function public.record_crm_operations_checkout_session(p_token uuid,p_session text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_session not like 'cs_%' then raise exception 'Invalid Stripe session'; end if;
 update akibusiness_private.operations_checkouts set session_id=p_session where token=p_token and state='reserved' and (session_id is null or session_id=p_session);
 if not found then raise exception 'Checkout reservation changed'; end if;
end $$;
create function public.crm_operations_binding(p_subscription text,p_token uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare b akibusiness_private.operations_subscriptions; c akibusiness_private.operations_checkouts; t akibusiness_private.toolboxes;
begin
 select * into b from akibusiness_private.operations_subscriptions where subscription_id=p_subscription;
 if found then
  select * into t from akibusiness_private.toolboxes where workspace_id=b.workspace_id;
  return jsonb_build_object('subscriptionId',b.subscription_id,'workspaceId',b.workspace_id,'profileId',b.profile_id,'customerId',b.customer_id,
   'tier',t.tier,'tools',t.active_tools,'anchor',t.anchor,'paidUntil',t.paid_until,'nextTier',b.next_tier,'nextTools',b.next_tools,'token',b.source_token);
 end if;
 if p_token is null then return null; end if;
 select * into c from akibusiness_private.operations_checkouts where token=p_token and state='reserved';
 if not found then return null; end if;
 return jsonb_build_object('subscriptionId',p_subscription,'workspaceId',c.workspace_id,'profileId',c.profile_id,'customerId',c.customer_id,
  'tier',null,'tools',null,'anchor',null,'paidUntil',null,'nextTier',c.tier,'nextTools',c.tools,'token',c.token);
end $$;
create function public.crm_operations_initial_state(p_workspace text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b akibusiness_private.operations_subscriptions;
begin
 if not akibusiness_private.operations_owner(p_workspace) then raise exception 'Location owner required' using errcode='42501'; end if;
 select * into b from akibusiness_private.operations_subscriptions where workspace_id=p_workspace and source_token is null;
 if not found or exists(select 1 from akibusiness_private.toolboxes where workspace_id=p_workspace) then return null; end if;
 return jsonb_build_object('initial_open',true,'tier','basico','tools',b.next_tools);
end $$;
create function public.configure_crm_operations_initial(p_workspace text,p_tools text[]) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not akibusiness_private.operations_owner(p_workspace) then raise exception 'Location owner required' using errcode='42501'; end if;
 if not akibusiness_private.valid_tools('basico',p_tools) then raise exception 'Exactly four initial tools required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace,7723));
 if exists(select 1 from akibusiness_private.toolboxes where workspace_id=p_workspace) then raise exception 'Initial selection already activated' using errcode='PT409'; end if;
 update akibusiness_private.operations_subscriptions set next_tier='basico',next_tools=p_tools where workspace_id=p_workspace and source_token is null;
 if not found then raise exception 'Migration initial selection unavailable'; end if;
 insert into akibusiness_private.operations_billing_events(event_id,subscription_id,evidence) select 'initial-config:'||gen_random_uuid()::text,subscription_id,'owner:'||auth.uid()::text||':tools:'||array_to_string(p_tools,',') from akibusiness_private.operations_subscriptions where workspace_id=p_workspace;
end $$;
create function public.set_crm_operations_next(p_workspace text,p_tier text,p_tools text[]) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not akibusiness_private.operations_owner(p_workspace) then raise exception 'Location owner required' using errcode='42501'; end if;
 if not akibusiness_private.valid_tools(p_tier,p_tools) then raise exception 'Invalid target toolbox'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace,7723));
 if not exists(select 1 from akibusiness_private.toolboxes where workspace_id=p_workspace) then raise exception 'Use initial configuration before activation'; end if;
 if exists(select 1 from akibusiness_private.operations_plan_changes where workspace_id=p_workspace and state<>'completed') then raise exception 'Scheduled change requires reconciliation' using errcode='PT409'; end if;
 update akibusiness_private.operations_subscriptions set next_tier=p_tier,next_tools=p_tools where workspace_id=p_workspace;
 if not found then raise exception 'Subscription unavailable'; end if;
end $$;
create function public.crm_operations_scheduled_change(p_workspace text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not akibusiness_private.operations_owner(p_workspace) then raise exception 'Location owner required' using errcode='42501'; end if;
 return(select jsonb_build_object('tier',tier,'effective_at',effective_at,'state',state) from akibusiness_private.operations_plan_changes where workspace_id=p_workspace and state='scheduled');
end $$;
create function public.reserve_crm_operations_downgrade(p_workspace text,p_tier text,p_tools text[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare b akibusiness_private.operations_subscriptions; c akibusiness_private.operations_plan_changes; t akibusiness_private.toolboxes;
begin
 if not akibusiness_private.operations_owner(p_workspace) then raise exception 'Location owner required' using errcode='42501'; end if;
 if not akibusiness_private.valid_tools(p_tier,p_tools) then raise exception 'Invalid lower toolbox'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace,7723));
 select * into b from akibusiness_private.operations_subscriptions where workspace_id=p_workspace;
 select * into t from akibusiness_private.toolboxes where workspace_id=p_workspace;
 if b.subscription_id is null or t.workspace_id is null or akibusiness_private.capacity(p_tier)>=akibusiness_private.capacity(t.tier) then raise exception 'Effective subscription downgrade required'; end if;
 select * into c from akibusiness_private.operations_plan_changes where workspace_id=p_workspace for update;
 if found and c.state<>'completed' then
  if c.subscription_id<>b.subscription_id or c.tier<>p_tier or c.tools<>p_tools then raise exception 'Existing scheduled change requires reconciliation' using errcode='PT409'; end if;
  return to_jsonb(c);
 end if;
 insert into akibusiness_private.operations_plan_changes(workspace_id,subscription_id,tier,tools) values(p_workspace,b.subscription_id,p_tier,p_tools)
 on conflict(workspace_id) do update set subscription_id=excluded.subscription_id,tier=excluded.tier,tools=excluded.tools,token=gen_random_uuid(),schedule_id=null,state='pending',created_at=now() returning * into c;
 update akibusiness_private.operations_subscriptions set next_tier=p_tier,next_tools=p_tools where workspace_id=p_workspace;
 return to_jsonb(c);
end $$;
create function public.record_crm_operations_schedule(p_token uuid,p_schedule text,p_complete boolean,p_effective timestamptz default null) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_complete and (p_effective is null or p_effective<=now()) then raise exception 'Verified future renewal boundary required'; end if;
 if p_schedule not like 'sub_sched_%' then raise exception 'Invalid subscription schedule'; end if;
 update akibusiness_private.operations_plan_changes set schedule_id=p_schedule,effective_at=coalesce(p_effective,effective_at),state=case when p_complete then 'scheduled' else 'pending' end where token=p_token and state in ('pending','scheduled') and (schedule_id is null or schedule_id=p_schedule);
 if not found then raise exception 'Plan change reservation changed'; end if;
end $$;
-- Explicit operator migration provisioning, using the same private-location
-- invariants as create_private_operating_location without impersonating auth.uid().
create function public.provision_crm_operations_migration(p_subscription text,p_profile uuid,p_request uuid,p_name text,p_evidence text) returns text
language plpgsql security definer set search_path='' as $$
declare previous public.private_operating_location_requests; workspace text; label text:=btrim(p_name);
begin
 if length(coalesce(p_evidence,''))<20 or p_request is null or label is null or length(label) not between 2 and 120 or label ~ '[[:cntrl:]]' then raise exception 'Explicit reviewed migration required'; end if;
 if not exists(select 1 from public.billing_subscriptions s where s.stripe_subscription_id=p_subscription and s.profile_id=p_profile and s.plan_code in ('business','business_pro') and s.status='active') then raise exception 'Approved existing business subscription required'; end if;
 if not exists(select 1 from auth.users u join public.profiles p on p.id=u.id where u.id=p_profile and u.email_confirmed_at is not null and u.deleted_at is null) then raise exception 'Verified existing account required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_profile::text||':'||p_request::text,0));
 select * into previous from public.private_operating_location_requests where profile_id=p_profile and request_id=p_request;
 if found then
  if previous.requested_name<>label or not exists(select 1 from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id where w.id=previous.workspace_id and w.owner_profile_id=p_profile and w.source_venue_id is null and w.status in ('active','trial') and m.profile_id=p_profile and m.role='owner' and m.status='active') then raise exception 'Private migration request ownership changed'; end if;
  return previous.workspace_id;
 end if;
 workspace:='private-'||gen_random_uuid()::text;
 insert into public.crm_workspaces(id,name,slug,owner_profile_id,source_venue_id,plan,status,seat_limit) values(workspace,label,workspace,p_profile,null,'starter','active',4);
 insert into public.crm_workspace_members(workspace_id,profile_id,role,status) values(workspace,p_profile,'owner','active');
 insert into public.private_operating_location_requests(profile_id,request_id,workspace_id,requested_name) values(p_profile,p_request,workspace,label);
 insert into akibusiness_private.operations_billing_events(event_id,subscription_id,evidence) values('migration-provision:'||p_subscription,p_subscription,p_evidence);
 return workspace;
end $$;
-- Operator-run prebinding only; provisioning must already use the existing verified
-- private-location RPC. Does not enroll/reprice/revoke anything.
create function public.bind_crm_operations_migration(p_subscription text,p_workspace text,p_tools text[],p_evidence text) returns void
language plpgsql security definer set search_path='' as $$
declare legacy public.billing_subscriptions; b akibusiness_private.operations_subscriptions;
begin
 if not akibusiness_private.valid_tools('basico',p_tools) or length(coalesce(p_evidence,''))<20 then raise exception 'Reviewed manifest evidence required'; end if;
 select * into legacy from public.billing_subscriptions where stripe_subscription_id=p_subscription and plan_code in ('business','business_pro') and status='active';
 if not found then raise exception 'Legacy business subscription required'; end if;
 if not exists(select 1 from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id where w.id=p_workspace and w.owner_profile_id=legacy.profile_id and w.source_venue_id is null and w.status in ('active','trial') and m.profile_id=legacy.profile_id and m.status='active' and m.role='owner') then raise exception 'Verified private operating location required'; end if;
 select * into b from akibusiness_private.operations_subscriptions where subscription_id=p_subscription for update;
 if found then
  if b.workspace_id<>p_workspace or b.profile_id<>legacy.profile_id or b.customer_id<>legacy.stripe_customer_id then raise exception 'Migration binding conflict'; end if;
  return;
 end if;
 insert into akibusiness_private.operations_subscriptions(subscription_id,workspace_id,profile_id,customer_id,next_tier,next_tools)
 values(p_subscription,p_workspace,legacy.profile_id,legacy.stripe_customer_id,'basico',p_tools);
 insert into akibusiness_private.operations_billing_events(event_id,subscription_id,evidence) values('migration-bind:'||p_subscription,p_subscription,p_evidence);
end $$;
create function public.apply_crm_operations_billing(p_event text,p_subscription text,p_token uuid,p_profile uuid,p_customer text,p_workspace text,
 p_tier text,p_tools text[],p_anchor timestamptz,p_paid_until timestamptz,p_status text,p_revision bigint,p_evidence text) returns void
language plpgsql security definer set search_path='' as $$
declare b akibusiness_private.operations_subscriptions; c akibusiness_private.operations_checkouts;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_workspace,7723));
 if exists(select 1 from akibusiness_private.operations_billing_events where event_id=p_event) then return; end if;
 if not exists(select 1 from public.crm_workspaces w where w.id=p_workspace and w.owner_profile_id=p_profile) then raise exception 'Subscription location ownership mismatch'; end if;
 select * into b from akibusiness_private.operations_subscriptions where subscription_id=p_subscription for update;
 if found then
  if b.workspace_id<>p_workspace or b.profile_id<>p_profile or b.customer_id<>p_customer then raise exception 'Subscription binding mismatch'; end if;
  if not exists(select 1 from akibusiness_private.toolboxes where workspace_id=p_workspace) and (b.next_tier<>p_tier or b.next_tools<>p_tools) then raise exception 'Reviewed initial toolbox required'; end if;
 else
  select * into c from akibusiness_private.operations_checkouts where token=p_token and workspace_id=p_workspace and profile_id=p_profile and customer_id=p_customer and state='reserved' for update;
  if not found or c.tier<>p_tier or c.tools<>p_tools then raise exception 'Checkout reservation binding mismatch'; end if;
  insert into akibusiness_private.operations_subscriptions(subscription_id,workspace_id,profile_id,customer_id,source_token)
  values(p_subscription,p_workspace,p_profile,p_customer,p_token);
  update akibusiness_private.operations_checkouts set state='completed' where token=p_token;
 end if;
 perform akibusiness_private.sync(p_workspace,p_tier,p_tools,p_anchor,p_paid_until,p_status,'stripe',p_subscription,p_revision,p_evidence,true);
 -- Retire only this migrated legacy business ledger after the verified new-price invoice.
 if p_evidence like 'stripe-invoice:%' then
  update public.billing_subscriptions set status='canceled',updated_at=now() where stripe_subscription_id=p_subscription and profile_id=p_profile and stripe_customer_id=p_customer and plan_code in ('business','business_pro');
  perform public.reconcile_profile_entitlements(p_profile);
 end if;
 update akibusiness_private.operations_plan_changes set state='completed' where workspace_id=p_workspace and subscription_id=p_subscription and tier=p_tier and state='scheduled';
 insert into akibusiness_private.operations_billing_events(event_id,subscription_id,evidence) values(p_event,p_subscription,p_evidence);
end $$;
revoke all on function akibusiness_private.operations_owner(text) from public,anon,authenticated;
revoke all on function public.reserve_crm_operations_checkout(text,text,text[],text),public.set_crm_operations_next(text,text,text[]) from public,anon;
grant execute on function public.reserve_crm_operations_checkout(text,text,text[],text),public.set_crm_operations_next(text,text,text[]) to authenticated;
revoke all on function public.crm_operations_binding(text,uuid),public.apply_crm_operations_billing(text,text,uuid,uuid,text,text,text,text[],timestamptz,timestamptz,text,bigint,text) from public,anon,authenticated;
grant execute on function public.crm_operations_binding(text,uuid),public.apply_crm_operations_billing(text,text,uuid,uuid,text,text,text,text[],timestamptz,timestamptz,text,bigint,text) to service_role;
revoke all on function public.bind_crm_operations_migration(text,text,text[],text) from public,anon,authenticated;
grant execute on function public.bind_crm_operations_migration(text,text,text[],text) to service_role;
revoke all on function public.provision_crm_operations_migration(text,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.provision_crm_operations_migration(text,uuid,uuid,text,text) to service_role;
revoke all on function public.record_crm_operations_checkout_session(uuid,text) from public,anon,authenticated;
grant execute on function public.record_crm_operations_checkout_session(uuid,text) to service_role;
revoke all on function public.crm_operations_initial_state(text),public.configure_crm_operations_initial(text,text[]) from public,anon;
grant execute on function public.crm_operations_initial_state(text),public.configure_crm_operations_initial(text,text[]) to authenticated;
revoke update on akibusiness_private.operations_billing_events from service_role;
revoke all on function public.reserve_crm_operations_downgrade(text,text,text[]) from public,anon;
grant execute on function public.reserve_crm_operations_downgrade(text,text,text[]) to authenticated;
revoke all on function public.record_crm_operations_schedule(uuid,text,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.record_crm_operations_schedule(uuid,text,boolean,timestamptz) to service_role;
revoke all on function public.crm_operations_scheduled_change(text) from public,anon;
grant execute on function public.crm_operations_scheduled_change(text) to authenticated;
commit;
