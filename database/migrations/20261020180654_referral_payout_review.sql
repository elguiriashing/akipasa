-- Review bookkeeping only. Existing monetary/payout CHECK=false constraints remain.
begin;
create schema akisuite_referral_private;
create index referral_review_billing_hold_customer on public.suite_referral_billing_events(stripe_customer_id) where event_kind in ('refund_hold','dispute_hold');
create index referral_review_paid_queue on public.suite_referral_billing_events(recorded_at desc,stripe_event_id) where event_kind='paid';
create index referral_review_open_cases on public.suite_referral_cases(code) where state in ('open','reviewing');
revoke all on schema akisuite_referral_private from public,anon,authenticated,service_role;
create table akisuite_referral_private.review_settings (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false
);
alter table akisuite_referral_private.review_settings enable row level security;
revoke all on akisuite_referral_private.review_settings from public,anon,authenticated,service_role;
insert into akisuite_referral_private.review_settings(singleton) values(true);
create table public.suite_referral_payout_reviews (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 revision bigint generated always as identity unique,
 stripe_event_id text not null references public.suite_referral_billing_events(stripe_event_id),
 state text not null check(state in ('eligible','approved','held','rejected')),
 reason text not null check(length(reason) between 5 and 2000),
 approval_reference text check(length(approval_reference) between 5 and 200),
 actor_id uuid not null references public.profiles(id),
 evidence_snapshot jsonb not null,
 reviewed_at timestamptz not null default now(),
 check(state<>'approved' or approval_reference is not null)
);
create index referral_payout_review_event on public.suite_referral_payout_reviews(stripe_event_id,revision desc);
alter table public.suite_referral_payout_reviews enable row level security;
revoke all on public.suite_referral_payout_reviews from public,anon,authenticated,service_role;
revoke all on sequence public.suite_referral_payout_reviews_revision_seq from public,anon,authenticated,service_role;
grant select on public.suite_referral_payout_reviews to authenticated;
create policy referral_payout_review_admin_read on public.suite_referral_payout_reviews for select to authenticated
 using(public.current_app_role()='administrator');
create trigger referral_payout_review_audit after insert on public.suite_referral_payout_reviews
 for each row execute function public.suite_referral_config_audit();

create function public.suite_referral_payout_eligibility(p_event text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare e public.suite_referral_billing_events; c public.suite_referral_codes; p public.suite_referral_programmes;
 r public.suite_referral_payout_reviews; blockers text[]:='{}';
begin
 if auth.uid() is null or coalesce(public.current_app_role(),'')<>'administrator' then raise exception 'Administrator required' using errcode='42501'; end if;
 select * into e from public.suite_referral_billing_events where stripe_event_id=p_event;
 if not found or e.event_kind<>'paid' then raise exception 'Verified paid invoice evidence required'; end if;
 select * into c from public.suite_referral_codes where code=e.code;
 select * into p from public.suite_referral_programmes where id=c.programme_id;
 select * into r from public.suite_referral_payout_reviews where stripe_event_id=p_event order by revision desc limit 1;
 if e.proposed_commission_cents is null or e.proposed_commission_cents<=0 or nullif(btrim(e.rule_snapshot->>'terms_version'),'') is null or e.currency is null or e.currency !~ '^[a-z]{3}$'
  or coalesce(e.rule_snapshot->>'commission_basis','') not in ('initial_invoice','each_invoice') then blockers:=array_append(blockers,'unapproved_or_missing_rule'); end if;
 if c.owner_profile_id is null or c.owner_profile_id=e.profile_id or e.profile_id is null then blockers:=array_append(blockers,'invalid_recipient'); end if;
 if c.revoked_at is not null or (c.expires_at is not null and c.expires_at<=now()) or p.state<>'active' then blockers:=array_append(blockers,'inactive_programme_or_code'); end if;
 if p.programme_type='representative' and not exists(select 1 from public.suite_referral_representatives where profile_id=c.owner_profile_id and state='approved') then blockers:=array_append(blockers,'representative_not_approved'); end if;
 -- Conservative customer-wide holds cannot be overridden by closing a case.
 if exists(select 1 from public.suite_referral_billing_events h where h.stripe_customer_id=e.stripe_customer_id and h.event_kind in ('refund_hold','dispute_hold')) then blockers:=array_append(blockers,'billing_hold'); end if;
 if exists(select 1 from public.suite_referral_cases where code=e.code and state in ('open','reviewing')) then blockers:=array_append(blockers,'open_review_case'); end if;
 return jsonb_build_object('event_id',e.stripe_event_id,'code',e.code,'currency',e.currency,'proposed_cents',e.proposed_commission_cents,
  'terms_version',e.rule_snapshot->>'terms_version','blockers',to_jsonb(blockers),'eligible',cardinality(blockers)=0,
  'latest_state',r.state,'latest_review_id',r.id,'effective_approval',coalesce(cardinality(blockers)=0 and r.state='approved',false),
  'reviews_enabled',coalesce((select enabled from akisuite_referral_private.review_settings where singleton),false),
  'payouts_enabled',false,'payable',false);
end;
$$;
revoke all on function public.suite_referral_payout_eligibility(text) from public,anon,service_role;
grant execute on function public.suite_referral_payout_eligibility(text) to authenticated;

create function public.suite_review_referral_payout(p_event text,p_state text,p_reason text,p_reference text,p_request uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare evidence jsonb; existing public.suite_referral_payout_reviews; result uuid;
begin
 if auth.uid() is null or coalesce(public.current_app_role(),'')<>'administrator' then raise exception 'Administrator required' using errcode='42501'; end if;
 if not coalesce((select enabled from akisuite_referral_private.review_settings where singleton),false) then raise exception 'Review workflow not activated'; end if;
 if p_request is null or p_state is null or p_state not in ('eligible','approved','held','rejected') or p_reason is null or length(trim(p_reason)) not between 5 and 2000
  or (p_state='approved' and (p_reference is null or length(trim(p_reference)) not between 5 and 200)) then raise exception 'Invalid review'; end if;
 perform pg_advisory_xact_lock(hashtextextended('referral-review:'||p_event,0));
 select * into existing from public.suite_referral_payout_reviews where request_id=p_request;
 if found then
  if existing.stripe_event_id=p_event and existing.state=p_state and existing.reason=trim(p_reason) and existing.approval_reference is not distinct from nullif(trim(p_reference),'') and existing.actor_id=auth.uid() then return existing.id; end if;
  raise exception 'Review request cannot be reused';
 end if;
 evidence:=public.suite_referral_payout_eligibility(p_event);
 if p_state in ('eligible','approved') and not (evidence->>'eligible')::boolean then raise exception 'Evidence has eligibility blockers'; end if;
 if p_state='approved' and evidence->>'latest_state' is distinct from 'eligible' then raise exception 'Record eligibility review before approval'; end if;
 insert into public.suite_referral_payout_reviews(request_id,stripe_event_id,state,reason,approval_reference,actor_id,evidence_snapshot)
 values(p_request,p_event,p_state,trim(p_reason),nullif(trim(p_reference),''),auth.uid(),evidence) returning id into result;
 return result;
end;
$$;
revoke all on function public.suite_review_referral_payout(text,text,text,text,uuid) from public,anon,service_role;
grant execute on function public.suite_review_referral_payout(text,text,text,text,uuid) to authenticated;

create function public.suite_referral_payout_review_queue() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or coalesce(public.current_app_role(),'')<>'administrator' then raise exception 'Administrator required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(public.suite_referral_payout_eligibility(stripe_event_id)) from
  (select stripe_event_id from public.suite_referral_billing_events where event_kind='paid' order by recorded_at desc,stripe_event_id limit 50) q),'[]'::jsonb);
end;
$$;
revoke all on function public.suite_referral_payout_review_queue() from public,anon,service_role;
grant execute on function public.suite_referral_payout_review_queue() to authenticated;
notify pgrst,'reload schema';
commit;
