-- Staged AkiSuite subscriptions: additive; existing billing_subscriptions stay untouched.
-- Apply only alongside a deployed new-price webhook and confirmed Stripe merchant account.
begin;

create table if not exists public.akisuite_billing_subscriptions (
  stripe_subscription_id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id text not null,
  plan_code text not null check (plan_code in (
    'akipasa_premium','akibusiness_premium','akiduermo_premium',
    'akihq_standard','akihq_pro','akihq_business_addon','aki_enterprise'
  )),
  billing_interval text not null check (billing_interval in ('month','year')),
  status text not null check (status in (
    'active','trialing','incomplete','incomplete_expired',
    'past_due','canceled','unpaid','paused'
  )),
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  stripe_event_created_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists akisuite_billing_subscriptions_profile_idx
  on public.akisuite_billing_subscriptions(profile_id,plan_code,status);
alter table public.akisuite_billing_subscriptions enable row level security;
create policy akisuite_billing_subscriptions_read on public.akisuite_billing_subscriptions
  for select to authenticated using (profile_id = (select auth.uid()));

-- A subscription is valid only while paid/trialling and within its Stripe period.
-- The discounted add-on loses its benefit if AkiHQ Pro is cancelled.
create or replace function public.has_akisuite_plan(p_profile uuid, p_plan text)
returns boolean language sql stable security definer set search_path = ''
as $$
  with paid as (
    select s.plan_code from public.akisuite_billing_subscriptions s
    where s.profile_id = p_profile and s.status in ('active','trialing')
      and s.current_period_end > now()
  ), legacy_pro as (
    select exists(
      select 1 from public.billing_subscriptions s
      where s.profile_id = p_profile and s.plan_code = 'business_pro'
        and s.status in ('active','trialing')
        and (s.current_period_end is null or s.current_period_end > now())
    ) as active
  )
  select
    (p_plan = 'aki_enterprise' and exists(select 1 from paid where plan_code='aki_enterprise'))
    or (p_plan = 'akipasa_premium' and (
      exists(select 1 from paid where plan_code in ('akipasa_premium','aki_enterprise'))
      or exists(select 1 from public.billing_subscriptions s where s.profile_id = p_profile
        and s.plan_code='premium' and s.status in ('active','trialing')
        and (s.current_period_end is null or s.current_period_end > now()))
    ))
    or (p_plan = 'akiduermo_premium' and exists(select 1 from paid where plan_code in ('akiduermo_premium','aki_enterprise')))
    or (p_plan = 'akihq_pro' and (
      exists(select 1 from paid where plan_code in ('akihq_pro','aki_enterprise'))
      or (select active from legacy_pro)
    ))
    or (p_plan = 'akihq_standard' and (
      exists(select 1 from paid where plan_code in ('akihq_standard','akihq_pro','aki_enterprise'))
      or exists(select 1 from public.billing_subscriptions s where s.profile_id = p_profile
        and s.plan_code in ('business','business_pro') and s.status in ('active','trialing')
        and (s.current_period_end is null or s.current_period_end > now()))
    ))
    or (p_plan = 'akibusiness_premium' and (
      exists(select 1 from paid where plan_code in ('akibusiness_premium','aki_enterprise'))
      or (
        exists(select 1 from paid where plan_code='akihq_business_addon')
        and (
          exists(select 1 from paid where plan_code in ('akihq_pro','aki_enterprise'))
          or (select active from legacy_pro)
        )
      )
    ))
    or (p_plan = 'akihq_business_addon' and (
      exists(select 1 from paid where plan_code='akihq_business_addon')
      and (
        exists(select 1 from paid where plan_code in ('akihq_pro','aki_enterprise'))
        or (select active from legacy_pro)
      )
    ));
$$;
revoke all on function public.has_akisuite_plan(uuid,text) from public,anon;
grant execute on function public.has_akisuite_plan(uuid,text) to authenticated,service_role;

-- Preserve free verified venue ownership and all legacy grants.
-- New AkiHQ Pro and Enterprise must satisfy existing CRM access guards.
create or replace function public.has_active_entitlement(p_profile uuid,p_plan text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_plan in ('premium','business','business_pro') and (
    exists(select 1 from public.profiles p where p.id=p_profile and p.app_role='administrator')
    or (p_plan='business' and public.has_free_business_access(p_profile))
    or (p_plan='premium' and public.has_akisuite_plan(p_profile,'akipasa_premium'))
    or (p_plan='business_pro' and public.has_akisuite_plan(p_profile,'akihq_pro'))
    or (p_plan='business' and public.has_akisuite_plan(p_profile,'akihq_standard'))
    or exists(select 1 from public.billing_subscriptions s where s.profile_id=p_profile
      and (s.plan_code=p_plan or (p_plan='business' and s.plan_code='business_pro'))
      and s.status in ('active','trialing')
      and (s.current_period_end is null or s.current_period_end>now()))
    or exists(select 1 from public.staff_billing_grants g where g.profile_id=p_profile
      and (g.plan_code=p_plan or (p_plan='business' and g.plan_code='business_pro'))
      and g.active and (g.expires_at is null or g.expires_at>now()))
  );
$$;

create or replace function public.sync_akisuite_subscription(
  p_subscription_id text,
  p_profile uuid,
  p_customer_id text,
  p_plan text,
  p_interval text,
  p_status text,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_event_created_at timestamptz
) returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_changed integer := 0;
begin
  if length(trim(coalesce(p_subscription_id,''))) < 3
    or length(trim(coalesce(p_customer_id,''))) < 3
    or p_profile is null
    or p_plan not in ('akipasa_premium','akibusiness_premium','akiduermo_premium','akihq_standard','akihq_pro','akihq_business_addon','aki_enterprise')
    or p_interval not in ('month','year')
    or p_status not in ('active','trialing','incomplete','incomplete_expired','past_due','canceled','unpaid','paused')
    or p_current_period_end is null or p_event_created_at is null then
    raise exception 'invalid AkiSuite subscription';
  end if;
  if exists(
    select 1 from public.akisuite_billing_subscriptions s
    where s.stripe_subscription_id = p_subscription_id
      and (s.profile_id <> p_profile or s.stripe_customer_id <> p_customer_id)
  ) then raise exception 'AkiSuite subscription ownership mismatch'; end if;

  insert into public.akisuite_billing_subscriptions(
    stripe_subscription_id,profile_id,stripe_customer_id,plan_code,billing_interval,
    status,current_period_end,cancel_at_period_end,stripe_event_created_at,updated_at
  ) values (
    trim(p_subscription_id),p_profile,trim(p_customer_id),p_plan,p_interval,
    p_status,p_current_period_end,coalesce(p_cancel_at_period_end,false),p_event_created_at,now()
  )
  on conflict(stripe_subscription_id) do update set
    plan_code=excluded.plan_code,billing_interval=excluded.billing_interval,
    status=excluded.status,current_period_end=excluded.current_period_end,
    cancel_at_period_end=excluded.cancel_at_period_end,
    stripe_event_created_at=excluded.stripe_event_created_at,updated_at=now()
  where excluded.stripe_event_created_at >= public.akisuite_billing_subscriptions.stripe_event_created_at;

  get diagnostics v_changed = row_count;
  return v_changed > 0;
end;
$$;
revoke all on function public.sync_akisuite_subscription(
  text,uuid,text,text,text,text,timestamptz,boolean,timestamptz
) from public,anon,authenticated;
grant execute on function public.sync_akisuite_subscription(
  text,uuid,text,text,text,text,timestamptz,boolean,timestamptz
) to service_role;

create or replace function public.akisuite_subscription_reconcile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.reconcile_profile_entitlements(old.profile_id);
    return old;
  end if;
  if tg_op = 'UPDATE' and old.profile_id is distinct from new.profile_id then
    perform public.reconcile_profile_entitlements(old.profile_id);
  end if;
  perform public.reconcile_profile_entitlements(new.profile_id);
  return new;
end;
$$;
create trigger akisuite_billing_reconcile after insert or update or delete
  on public.akisuite_billing_subscriptions for each row
  execute function public.akisuite_subscription_reconcile();

commit;
