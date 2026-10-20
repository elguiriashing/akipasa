-- Detach deleted identities without deleting retained business/billing records.
-- No Stripe action, ownership transfer, retention period or customer access grant.
begin;
alter table akibusiness_private.operations_checkouts
 alter column profile_id drop not null,
 drop constraint operations_checkouts_profile_id_fkey,
 add constraint operations_checkouts_profile_id_fkey foreign key(profile_id) references public.profiles(id) on delete set null;
alter table akibusiness_private.operations_subscriptions
 alter column profile_id drop not null,
 drop constraint operations_subscriptions_profile_id_fkey,
 add constraint operations_subscriptions_profile_id_fkey foreign key(profile_id) references public.profiles(id) on delete set null;
-- Delegation restrictions have no purpose after their membership is removed.
alter table akibusiness_private.member_tool_limits
 drop constraint member_tool_limits_workspace_id_profile_id_fkey,
 add constraint member_tool_limits_workspace_id_profile_id_fkey foreign key(workspace_id,profile_id)
 references public.crm_workspace_members(workspace_id,profile_id) on delete cascade;
create or replace function public.claim_crm_operations_recovery(p_limit integer default 5) returns jsonb
language plpgsql security definer set search_path='' as $$
declare candidate record; lease uuid; claimed jsonb; result jsonb:='[]'::jsonb;
begin
 for candidate in
  select * from (
   select 'subscription'::text kind,subscription_id id,recovery_after due from akibusiness_private.operations_subscriptions
    where profile_id is not null and recovery_after<=now() and (recovery_leased_until is null or recovery_leased_until<=now())
   union all
   select 'checkout',token::text,recovery_after from akibusiness_private.operations_checkouts
    where profile_id is not null and state='reserved' and session_id is not null and recovery_after<=now() and (recovery_leased_until is null or recovery_leased_until<=now())
  ) candidates order by due,kind,id limit greatest(1,least(coalesce(p_limit,5),10))
 loop
  lease:=gen_random_uuid(); claimed:=null;
  if candidate.kind='subscription' then
   update akibusiness_private.operations_subscriptions set recovery_lease=lease,recovery_leased_until=now()+interval '5 minutes'
    where profile_id is not null and subscription_id=candidate.id and recovery_after<=now() and (recovery_leased_until is null or recovery_leased_until<=now())
    returning jsonb_build_object('kind','subscription','id',subscription_id,'subscription_id',subscription_id,'workspace_id',workspace_id,'customer_id',customer_id,'lease',lease) into claimed;
  else
   update akibusiness_private.operations_checkouts set recovery_lease=lease,recovery_leased_until=now()+interval '5 minutes'
    where profile_id is not null and token=candidate.id::uuid and state='reserved' and recovery_after<=now() and (recovery_leased_until is null or recovery_leased_until<=now())
    returning jsonb_build_object('kind','checkout','id',token::text,'session_id',session_id,'workspace_id',workspace_id,'customer_id',customer_id,'lease',lease) into claimed;
  end if;
  if claimed is not null then result:=result||jsonb_build_array(claimed); end if;
 end loop;
 return result;
end $$;
create or replace function public.apply_crm_operations_billing(p_event text,p_subscription text,p_token uuid,p_profile uuid,p_customer text,p_workspace text,
 p_tier text,p_tools text[],p_anchor timestamptz,p_paid_until timestamptz,p_status text,p_revision bigint,p_evidence text) returns void
language plpgsql security definer set search_path='' as $$
declare b akibusiness_private.operations_subscriptions; c akibusiness_private.operations_checkouts;
begin
 if p_profile is null then raise exception 'Detached operating identity' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace,7723));
 if exists(select 1 from akibusiness_private.operations_billing_events where event_id=p_event) then return; end if;
 if not exists(select 1 from public.crm_workspaces w where w.id=p_workspace and w.owner_profile_id=p_profile) then raise exception 'Subscription location ownership mismatch'; end if;
 select * into b from akibusiness_private.operations_subscriptions where subscription_id=p_subscription for update;
 if found then
  if b.workspace_id<>p_workspace or b.profile_id is distinct from p_profile or b.customer_id<>p_customer then raise exception 'Subscription binding mismatch'; end if;
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
-- Ephemeral upload reservations are neither published media nor a financial ledger.
alter table akisuite_listing_private.upload_reservations
 drop constraint upload_reservations_actor_fkey,
 add constraint upload_reservations_actor_fkey foreign key(actor) references public.profiles(id) on delete cascade;
commit;
