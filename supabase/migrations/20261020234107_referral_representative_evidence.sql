-- Read-only representative evidence; no incentive/commission/payout activation.
begin;
-- Install after final account coverage: never replace a deployed guarded capture body.
do $capture$
declare definition text; anchor text:=' if exists(select 1 from public.billing_subscriptions where profile_id=u) then return false; end if;';
begin
 select pg_get_functiondef('public.suite_capture_referral(text,text)'::regprocedure) into definition;
 if position('account completion required [coverage-v1]' in definition)=0 then raise exception 'Final account coverage must be installed first'; end if;
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'Unexpected capture eligibility source'; end if;
 execute replace(definition,anchor,$replacement$
 -- This optional adapter uses the authoritative bound operating customer ledger.
 -- Any historical binding excludes a late new-customer claim, just like legacy billing.
 if to_regclass('akibusiness_private.operations_subscriptions') is not null then
   execute 'select count(*) from akibusiness_private.operations_subscriptions where profile_id=$1' into n using u;
   if n>0 then return false; end if;
 end if;
$replacement$||anchor);
end $capture$;

-- One internal rule evaluator is shared by administrator and representative projections.
create function akisuite_referral_private.invoice_eligibility(p_event text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare e public.suite_referral_billing_events; c public.suite_referral_codes; p public.suite_referral_programmes;
 r public.suite_referral_payout_reviews; blockers text[]:='{}';
begin
 if auth.uid() is null or not public.account_features_allowed() then raise exception 'account completion required [coverage-v1]' using errcode='42501'; end if;
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

revoke all on function akisuite_referral_private.invoice_eligibility(text) from public,anon,authenticated,service_role;
create or replace function public.suite_referral_payout_eligibility(p_event text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.account_features_allowed() then raise exception 'account completion required [coverage-v1]' using errcode='42501'; end if;
 if coalesce(public.current_app_role(),'')<>'administrator' then raise exception 'Administrator required' using errcode='42501'; end if;
 return akisuite_referral_private.invoice_eligibility(p_event);
end $$;
-- CREATE OR REPLACE preserves the existing owner and explicit public RPC ACL.

create function public.suite_referral_representative_evidence(p_days integer default 90) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); subscription record; invoice record; evidence jsonb; invoices jsonb; result jsonb:='[]'; n integer:=0; invoice_count integer; cutoff timestamptz;
begin
 if u is null or not public.account_features_allowed() then raise exception 'account completion required [coverage-v1]' using errcode='42501'; end if;
 if not exists(select 1 from public.suite_referral_representatives where profile_id=u and state='approved') then raise exception 'Approved representative required' using errcode='42501'; end if;
 if p_days is null or p_days not in (30,90,365) then raise exception 'Invalid period'; end if;
 cutoff:=now()-make_interval(days=>p_days);
 for subscription in
  select e.stripe_subscription_id,max(e.recorded_at) as latest
  from public.suite_referral_billing_events e join public.suite_referral_codes c on c.code=e.code
  where c.owner_profile_id=u and e.event_kind='paid' and e.recorded_at>=cutoff and e.stripe_subscription_id is not null
  group by e.stripe_subscription_id order by max(e.recorded_at) desc,e.stripe_subscription_id limit 51
 loop
  n:=n+1; exit when n>50; invoices:='[]';
  select count(*) into invoice_count from public.suite_referral_billing_events e join public.suite_referral_codes c on c.code=e.code
   where c.owner_profile_id=u and e.stripe_subscription_id=subscription.stripe_subscription_id and e.event_kind='paid' and e.recorded_at>=cutoff;
  for invoice in
   select e.* from public.suite_referral_billing_events e join public.suite_referral_codes c on c.code=e.code
   where c.owner_profile_id=u and e.stripe_subscription_id=subscription.stripe_subscription_id and e.event_kind='paid' and e.recorded_at>=cutoff
   order by e.recorded_at desc,e.stripe_event_id limit 10
  loop
   evidence:=akisuite_referral_private.invoice_eligibility(invoice.stripe_event_id);
   invoices:=invoices||jsonb_build_array(jsonb_build_object(
    'reference',md5('referral-invoice:'||invoice.stripe_event_id),'code',invoice.code,'product',invoice.product_code,
    'recorded_at',invoice.recorded_at,'currency',invoice.currency,'proposed_cents',invoice.proposed_commission_cents,
    'terms_version',evidence->'terms_version','blockers',evidence->'blockers',
    'review_state',evidence->'latest_state','effective_approval',evidence->'effective_approval',
    'status',case when not (evidence->>'eligible')::boolean then 'held' when evidence->>'latest_state'='approved' then 'approved' when evidence->>'latest_state' in ('held','rejected') then evidence->>'latest_state' else 'pending' end,
    -- Review reason/reference, administrator identity and raw snapshots stay private.
    'reviews',coalesce((select jsonb_agg(jsonb_build_object('state',q.state,'reviewed_at',q.reviewed_at) order by q.revision desc) from
     (select state,reviewed_at,revision from public.suite_referral_payout_reviews where stripe_event_id=invoice.stripe_event_id order by revision desc limit 10) q),'[]'::jsonb),
    'reviews_truncated',(select count(*)>10 from public.suite_referral_payout_reviews where stripe_event_id=invoice.stripe_event_id),
    'payable',false,'payouts_enabled',false));
  end loop;
  result:=result||jsonb_build_array(jsonb_build_object('reference',md5('referral-subscription:'||subscription.stripe_subscription_id),
    'latest_evidence_at',subscription.latest,'invoice_count',invoice_count,'invoices_truncated',invoice_count>10,'invoices',invoices));
 end loop;
 return jsonb_build_object('days',p_days,'since',cutoff,'subscriptions',result,'subscriptions_truncated',n>50,'payable',false,'payouts_enabled',false);
end $$;
revoke all on function public.suite_referral_representative_evidence(integer) from public,anon,authenticated,service_role;
grant execute on function public.suite_referral_representative_evidence(integer) to authenticated;
notify pgrst,'reload schema';
commit;
