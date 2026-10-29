-- Early-adopter automation, campaign-limited, venue-scoped, no Stripe/customer-plan writes.
-- Depends on 20261027031500_claim_early_partner_feedback.sql.
begin;

create table public.claim_partner_campaign (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default true,
  max_grants integer not null default 25 check (max_grants between 0 and 10000),
  updated_at timestamptz not null default now()
);
insert into public.claim_partner_campaign(singleton,enabled,max_grants) values(true,true,25);
alter table public.claim_partner_campaign enable row level security;
revoke all on public.claim_partner_campaign from public,anon,authenticated;
grant select,update on public.claim_partner_campaign to service_role;

-- One lifetime trial per physical venue, even if it expires or the same venue is re-claimed.
create unique index claim_partner_rewards_one_granted_per_venue
on public.claim_partner_rewards(venue_id) where state='granted';
alter table public.claim_partner_rewards
  add constraint claim_partner_rewards_granted_has_dates
  check (state <> 'granted' or (granted_at is not null and expires_at > granted_at));

create function akisuite_listing_private.activate_partner_reward(p_claim uuid)
returns void language plpgsql security definer set search_path='' as $$
declare c record; r public.claim_partner_rewards; v_cap integer;
begin
  -- Trigger-only. Never treat a link, manually entered email, Google submission,
  -- pending claim or marketing consent as proof of entitlement.
  if auth.uid() is null or not public.account_features_allowed() then return; end if;
  select id,claimant_id,venue_id,status into c
    from public.venue_claims where id=p_claim;
  if not found or c.claimant_id is distinct from auth.uid() or c.status::text <> 'approved'
     or not exists(select 1 from auth.users u where u.id=c.claimant_id
                   and u.email_confirmed_at is not null and u.deleted_at is null)
     or not exists(select 1 from public.venue_members m
                   where m.venue_id=c.venue_id and m.profile_id=c.claimant_id and m.role='owner')
     or not exists(select 1 from public.claim_owner_feedback f
                   where f.claim_id=p_claim and f.claimant_id=c.claimant_id)
  then return; end if;
  -- Serialize campaign cap and one-per-venue across concurrent claims.
  perform pg_advisory_xact_lock(hashtextextended('akipasa_early_partner_v1',71));
  select * into r from public.claim_partner_rewards where claim_id=p_claim for update;
  if not found or r.state <> 'pending' or r.venue_id <> c.venue_id then return; end if;
  select max_grants into v_cap from public.claim_partner_campaign
    where singleton and enabled;
  if v_cap is null or
     (select count(*) from public.claim_partner_rewards where state='granted') >= v_cap
     or exists(select 1 from public.claim_partner_rewards
               where venue_id=c.venue_id and state='granted')
  then return; end if;
  -- An existing listing entitlement may be paid or grandfathered; never overwrite it.
  if akisuite_listing_private.listing_premium(c.venue_id) then return; end if;
  update public.claim_partner_rewards
    set state='granted', granted_at=now(), expires_at=now() + interval '3 months'
    where claim_id=p_claim and state='pending';
end; $$;
revoke all on function akisuite_listing_private.activate_partner_reward(uuid)
  from public,anon,authenticated,service_role;

create function public.claim_partner_activation_after_reward()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform akisuite_listing_private.activate_partner_reward(new.claim_id);
  return new;
end; $$;
revoke all on function public.claim_partner_activation_after_reward()
 from public,anon,authenticated,service_role;
create trigger claim_partner_reward_auto_activate
after insert on public.claim_partner_rewards
for each row execute function public.claim_partner_activation_after_reward();

-- Retrying an existing feedback submission also re-checks a pending grant.
create function public.claim_partner_activation_after_feedback()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform akisuite_listing_private.activate_partner_reward(new.claim_id);
  return new;
end; $$;
revoke all on function public.claim_partner_activation_after_feedback()
 from public,anon,authenticated,service_role;
create trigger claim_partner_feedback_auto_activate
after update of discovery_source,priority_need,comments,contact_permission
on public.claim_owner_feedback
for each row execute function public.claim_partner_activation_after_feedback();

-- Exact existing listing entitlement contract, extended by venue-scoped partner
-- grants only. No grant of account-wide Business or operating-plan access.
create or replace function akisuite_listing_private.listing_premium(p_venue uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_workspace text; v_active boolean:=false; v_plan text;
begin
 if exists(select 1 from public.profiles where id=(select auth.uid()) and app_role='administrator') then return true; end if;
 select l.workspace_id into v_workspace from public.crm_workspace_venues l join public.crm_workspaces w on w.id=l.workspace_id
 where l.venue_id=p_venue and w.id<>'ws_akipasa' and w.status in ('active','trial') and exists(
 select 1 from public.venue_members m where m.venue_id=p_venue and m.profile_id=w.owner_profile_id and m.role='owner') order by (w.source_venue_id=p_venue) desc,w.id limit 1;
 if to_regprocedure('akisuite_private.plan_active(uuid,text,text)') is not null then
  select case when discovery_vertical='accommodation' then 'akiduermo_premium' else 'akibusiness_premium' end into v_plan from public.venues where id=p_venue;
  execute 'select akisuite_private.plan_active(null::uuid,$1,$2)' into v_active using v_workspace,v_plan;
  if v_active then return true; end if;
 end if;
 return exists(select 1 from public.venue_members m join public.billing_subscriptions b on b.profile_id=m.profile_id
 where m.venue_id=p_venue and m.role='owner' and b.plan_code in ('business','business_pro') and b.status in ('active','trialing') and (b.current_period_end is null or b.current_period_end>now()))
 or exists(select 1 from public.venue_members m join public.staff_billing_grants g on g.profile_id=m.profile_id
 where m.venue_id=p_venue and m.role='owner' and g.plan_code in ('business','business_pro') and g.active and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now()))
 or exists(
   select 1 from public.claim_partner_rewards r
   join public.venue_claims c on c.id=r.claim_id and c.venue_id=r.venue_id
   join public.venue_members m on m.venue_id=r.venue_id and m.profile_id=c.claimant_id and m.role='owner'
   where r.venue_id=p_venue and r.state='granted' and r.granted_at<=now()
     and r.expires_at>now() and c.status::text='approved'
 );
end; $$;
revoke all on function akisuite_listing_private.listing_premium(uuid) from public,anon,authenticated;

-- The applicant may inspect only their own claim's reward status, never the
-- raw service-only reward table, grants for other businesses, or staff metadata.
create function public.claim_partner_reward_status(p_claim uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('state',r.state,'months',r.months,'expires_at',r.expires_at)
 from public.claim_partner_rewards r
 join public.venue_claims c on c.id=r.claim_id
 where r.claim_id=p_claim and c.claimant_id=auth.uid() and c.status::text='approved'
   and exists(select 1 from public.venue_members m
              where m.venue_id=c.venue_id and m.profile_id=c.claimant_id and m.role='owner')
$$;
revoke all on function public.claim_partner_reward_status(uuid) from public,anon;
grant execute on function public.claim_partner_reward_status(uuid) to authenticated,service_role;
commit;
