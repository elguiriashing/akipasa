-- Limit the first-venue-owner programme to AkiPasa activities listings only.
-- Neither the free AkiHQ management hub nor paid AkiBusiness operations is a gift.
-- No retrospective claim decision, Stripe, or paid customer change.
begin;

create or replace function public.queue_claim_partner_reward() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.claim_partner_rewards(claim_id,venue_id)
  select new.claim_id,c.venue_id from public.venue_claims c
  join public.venues v on v.id=c.venue_id and v.discovery_vertical='activities'
  where c.id=new.claim_id and c.claimant_id=new.claimant_id and c.status::text='approved'
  on conflict(claim_id) do nothing;
  return new;
end; $$;
revoke all on function public.queue_claim_partner_reward()
 from public,anon,authenticated,service_role;

create or replace function akisuite_listing_private.activate_partner_reward(p_claim uuid)
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
  if not exists(select 1 from public.venues v where v.id=c.venue_id and v.discovery_vertical='activities')
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
   join public.venues v on v.id=r.venue_id and v.discovery_vertical='activities'
   join public.venue_members m on m.venue_id=r.venue_id and m.profile_id=c.claimant_id and m.role='owner'
   where r.venue_id=p_venue and r.state='granted' and r.granted_at<=now()
     and r.expires_at>now() and c.status::text='approved'
 );
end; $$;
revoke all on function akisuite_listing_private.listing_premium(uuid)
 from public,anon,authenticated;

commit;
