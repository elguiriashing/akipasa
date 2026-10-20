-- Additive central-billing recovery; no enrolment or provider mutation.
begin;
alter table akibusiness_private.operations_subscriptions
 add column recovery_after timestamptz not null default now(),
 add column recovery_lease uuid,
 add column recovery_leased_until timestamptz,
 add column recovery_failures integer not null default 0;
alter table akibusiness_private.operations_checkouts
 add column recovery_after timestamptz not null default now(),
 add column recovery_lease uuid,
 add column recovery_leased_until timestamptz,
 add column recovery_failures integer not null default 0;
create index operations_checkout_profile on akibusiness_private.operations_checkouts(profile_id);
create index operations_subscription_profile on akibusiness_private.operations_subscriptions(profile_id);
create index operations_bound_recovery on akibusiness_private.operations_subscriptions(recovery_after);
create index operations_checkout_recovery on akibusiness_private.operations_checkouts(recovery_after) where state='reserved' and session_id is not null;
create function public.claim_crm_operations_recovery(p_limit integer default 5) returns jsonb
language plpgsql security definer set search_path='' as $$
declare candidate record; lease uuid; claimed jsonb; result jsonb:='[]'::jsonb;
begin
 for candidate in
  select * from (
   select 'subscription'::text kind,subscription_id id,recovery_after due from akibusiness_private.operations_subscriptions
    where recovery_after<=now() and (recovery_leased_until is null or recovery_leased_until<=now())
   union all
   select 'checkout',token::text,recovery_after from akibusiness_private.operations_checkouts
    where state='reserved' and session_id is not null and recovery_after<=now() and (recovery_leased_until is null or recovery_leased_until<=now())
  ) candidates order by due,kind,id limit greatest(1,least(coalesce(p_limit,5),10))
 loop
  lease:=gen_random_uuid(); claimed:=null;
  if candidate.kind='subscription' then
   update akibusiness_private.operations_subscriptions set recovery_lease=lease,recovery_leased_until=now()+interval '5 minutes'
    where subscription_id=candidate.id and recovery_after<=now() and (recovery_leased_until is null or recovery_leased_until<=now())
    returning jsonb_build_object('kind','subscription','id',subscription_id,'subscription_id',subscription_id,'workspace_id',workspace_id,'customer_id',customer_id,'lease',lease) into claimed;
  else
   update akibusiness_private.operations_checkouts set recovery_lease=lease,recovery_leased_until=now()+interval '5 minutes'
    where token=candidate.id::uuid and state='reserved' and recovery_after<=now() and (recovery_leased_until is null or recovery_leased_until<=now())
    returning jsonb_build_object('kind','checkout','id',token::text,'session_id',session_id,'workspace_id',workspace_id,'customer_id',customer_id,'lease',lease) into claimed;
  end if;
  if claimed is not null then result:=result||jsonb_build_array(claimed); end if;
 end loop;
 return result;
end $$;
create function public.finish_crm_operations_recovery(p_kind text,p_id text,p_lease uuid,p_ok boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_ok is null then raise exception 'Explicit recovery outcome required'; end if;
 if p_kind='subscription' then
  update akibusiness_private.operations_subscriptions set recovery_lease=null,recovery_leased_until=null,
   recovery_after=now()+case when p_ok then interval '30 minutes' else least(interval '6 hours',interval '5 minutes'*power(2,least(recovery_failures,6))) end,
   recovery_failures=case when p_ok then 0 else least(recovery_failures+1,100) end
   where subscription_id=p_id and recovery_lease=p_lease;
 elsif p_kind='checkout' then
  update akibusiness_private.operations_checkouts set recovery_lease=null,recovery_leased_until=null,
   recovery_after=now()+case when p_ok then interval '30 minutes' else least(interval '6 hours',interval '5 minutes'*power(2,least(recovery_failures,6))) end,
   recovery_failures=case when p_ok then 0 else least(recovery_failures+1,100) end
   where token=p_id::uuid and recovery_lease=p_lease;
 else raise exception 'Unknown recovery queue'; end if;
 if not found then raise exception 'Recovery lease changed'; end if;
end $$;
revoke all on function public.claim_crm_operations_recovery(integer),public.finish_crm_operations_recovery(text,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.claim_crm_operations_recovery(integer),public.finish_crm_operations_recovery(text,text,uuid,boolean) to service_role;
commit;
