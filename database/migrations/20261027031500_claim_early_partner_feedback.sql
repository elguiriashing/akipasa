-- Early-owner survey: the gift is queued for human verification, never billed or silently activated.
begin;
create table public.claim_owner_feedback (
  claim_id uuid primary key references public.venue_claims(id) on delete cascade,
  claimant_id uuid not null references public.profiles(id) on delete cascade,
  discovery_source text not null check (discovery_source in ('google_search','google_maps','social_media','recommendation','business_outreach','venue_listing','other')),
  priority_need text not null check (priority_need in ('listing','events','reservations','marketing','operations','other')),
  comments text not null default '' check (char_length(comments) <= 1000),
  contact_permission boolean not null default false,
  submitted_at timestamptz not null default now()
);
create index claim_owner_feedback_claimant on public.claim_owner_feedback(claimant_id);
alter table public.claim_owner_feedback enable row level security;
revoke all on public.claim_owner_feedback from public,anon,authenticated;
grant select,insert,update on public.claim_owner_feedback to authenticated;
grant all on public.claim_owner_feedback to service_role;
create policy claim_owner_feedback_read on public.claim_owner_feedback for select to authenticated
  using (claimant_id = (select auth.uid()));
create policy claim_owner_feedback_insert on public.claim_owner_feedback for insert to authenticated
  with check (
    claimant_id = (select auth.uid()) and exists (
      select 1 from public.venue_claims c
      where c.id = claim_id and c.claimant_id = (select auth.uid()) and c.status::text = 'approved'
    )
  );
create policy claim_owner_feedback_update on public.claim_owner_feedback for update to authenticated
  using (claimant_id = (select auth.uid()))
  with check (
    claimant_id = (select auth.uid()) and exists (
      select 1 from public.venue_claims c
      where c.id = claim_id and c.claimant_id = (select auth.uid()) and c.status::text = 'approved'
    )
  );

-- Not a subscription or an entitlement. The staff team must fulfil it after
-- checking existing paid/trial grants; no free trial becomes a paid renewal.
create table public.claim_partner_rewards (
  claim_id uuid primary key references public.claim_owner_feedback(claim_id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  months integer not null default 3 check (months = 3),
  state text not null default 'pending' check (state in ('pending','granted','ineligible')),
  granted_at timestamptz,
  expires_at timestamptz,
  handled_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index claim_partner_rewards_pending on public.claim_partner_rewards(created_at) where state = 'pending';
alter table public.claim_partner_rewards enable row level security;
revoke all on public.claim_partner_rewards from public,anon,authenticated;
grant all on public.claim_partner_rewards to service_role;

create function public.queue_claim_partner_reward() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.claim_partner_rewards(claim_id,venue_id)
  select new.claim_id,c.venue_id from public.venue_claims c
  where c.id=new.claim_id and c.claimant_id=new.claimant_id and c.status::text='approved'
  on conflict(claim_id) do nothing;
  return new;
end; $$;
create trigger claim_partner_reward_queue after insert on public.claim_owner_feedback
  for each row execute function public.queue_claim_partner_reward();
revoke all on function public.queue_claim_partner_reward() from public,anon,authenticated;
commit;
