-- Privacy-only caller projections. Never grant product access or rewrite retained audits.
begin;
do $prerequisites$
declare relation text;
begin
 foreach relation in array array['public.suite_referral_codes','public.suite_referral_attributions','public.suite_referral_representatives','public.suite_referral_leads','public.suite_referral_cases','public.suite_referral_billing_events','public.suite_referral_audit','public.suite_referral_payout_reviews','private.prestige_awards','private.prestige_shipping_addresses','private.prestige_physical_requests','private.prestige_audit'] loop
  if to_regclass(relation) is null then raise exception 'Privacy export prerequisite missing: %',relation; end if;
 end loop;
end $prerequisites$;
-- Match existing append-only audit retention: keep historical reviewer UUIDs while
-- allowing deletion of their login/profile; do not rewrite/delete financial evidence.
alter table public.suite_referral_payout_reviews drop constraint suite_referral_payout_reviews_actor_id_fkey;
create index referral_privacy_billing_subject on public.suite_referral_billing_events(profile_id,stripe_event_id);
create index referral_privacy_audit_actor on public.suite_referral_audit(actor_id,id);
create index referral_privacy_review_actor on public.suite_referral_payout_reviews(actor_id,id);
create index prestige_privacy_audit_actor on private.prestige_audit(actor_id,id);
create index prestige_privacy_audit_award on private.prestige_audit(award_id,id);

create function public.suite_private_identity_export_page(p_section text,p_after text default null,p_limit integer default 500) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare member uuid:=auth.uid(); source text; predicate text; cursor_expression text; projection text; total bigint; page jsonb; next_cursor text;
begin
 -- Deliberate privacy exception: pending/underage, suspended representatives and
 -- paused programmes can retrieve their own data. No caller-supplied identity.
 if member is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_limit is null or p_limit not between 1 and 500 or (p_after is not null and (length(p_after)>128 or p_after !~ '^[A-Za-z0-9_-]+$')) then raise exception 'Invalid privacy page'; end if;
 case p_section
 when 'suite_referral_codes' then
  source:='public.suite_referral_codes c'; predicate:='c.owner_profile_id=$1'; cursor_expression:='c.code';
  projection:='jsonb_build_object(''code'',c.code,''programme_id'',c.programme_id,''revoked_at'',c.revoked_at,''expires_at'',c.expires_at,''usage_limit'',c.usage_limit,''created_at'',c.created_at)';
 when 'suite_referral_attributions' then
  source:='public.suite_referral_attributions a'; predicate:='a.profile_id=$1'; cursor_expression:='a.profile_id::text';
  projection:='jsonb_build_object(''code'',a.code,''source_product'',a.source_product,''captured_at'',a.captured_at,''expires_at'',a.expires_at)';
 when 'suite_referral_representatives' then
  source:='public.suite_referral_representatives r'; predicate:='r.profile_id=$1'; cursor_expression:='r.profile_id::text';
  projection:='jsonb_build_object(''state'',r.state,''approved_at'',r.approved_at,''approved_by_you'',r.approved_by=$1)';
 when 'suite_referral_leads' then
  source:='public.suite_referral_leads l'; predicate:='l.representative_id=$1'; cursor_expression:='l.id::text';
  projection:='jsonb_build_object(''id'',l.id,''stage'',l.stage,''created_at'',l.created_at,''updated_at'',l.updated_at)';
 when 'suite_referral_cases' then
  source:='public.suite_referral_cases c'; predicate:='c.reporter_id=$1'; cursor_expression:='c.id::text';
  projection:='jsonb_build_object(''id'',c.id,''code'',c.code,''case_type'',c.case_type,''state'',c.state,''created_at'',c.created_at,''updated_at'',c.updated_at,''reviewed_by_you'',c.reviewed_by=$1)';
 when 'suite_referral_billing_events' then
  source:='public.suite_referral_billing_events e join public.suite_referral_codes c on c.code=e.code'; predicate:='(e.profile_id=$1 or c.owner_profile_id=$1)'; cursor_expression:='md5(''privacy-invoice:''||e.stripe_event_id)';
  projection:='jsonb_build_object(''reference'',md5(''privacy-invoice:''||e.stripe_event_id),''relationship'',case when e.profile_id=$1 then ''payer'' else ''referrer'' end,''event_kind'',e.event_kind,''code'',e.code,''product_code'',e.product_code,''recorded_at'',e.recorded_at,''stripe_created_at'',e.stripe_created_at,''currency'',e.currency,''amount_paid_cents'',case when e.profile_id=$1 then e.amount_paid_cents end,''proposed_commission_cents'',case when c.owner_profile_id=$1 then e.proposed_commission_cents end,''terms_version'',case when c.owner_profile_id=$1 then e.rule_snapshot->>''terms_version'' end,''stripe_customer_id'',case when e.profile_id=$1 then e.stripe_customer_id end,''stripe_subscription_id'',case when e.profile_id=$1 then e.stripe_subscription_id end,''stripe_invoice_id'',case when e.profile_id=$1 then e.stripe_invoice_id end,''payable'',false)';
 when 'suite_referral_audit' then
  source:='public.suite_referral_audit a'; predicate:='(a.actor_id=$1 or (a.entity_type=''attribution'' and a.entity_id=$1::text) or (a.entity_type=''suite_referral_representatives'' and a.entity_id=$1::text) or (a.entity_type=''suite_referral_codes'' and exists(select 1 from public.suite_referral_codes c where c.code=a.entity_id and c.owner_profile_id=$1)) or (a.entity_type=''suite_referral_cases'' and exists(select 1 from public.suite_referral_cases c where c.id::text=a.entity_id and c.reporter_id=$1)))'; cursor_expression:='lpad(a.id::text,20,''0'')';
  projection:='jsonb_build_object(''id'',a.id,''action'',a.action,''entity_type'',a.entity_type,''occurred_at'',a.occurred_at,''actor_is_you'',a.actor_id=$1)';
 when 'suite_referral_payout_reviews' then
  source:='public.suite_referral_payout_reviews r join public.suite_referral_billing_events e on e.stripe_event_id=r.stripe_event_id join public.suite_referral_codes c on c.code=e.code'; predicate:='(e.profile_id=$1 or c.owner_profile_id=$1 or r.actor_id=$1)'; cursor_expression:='r.id::text';
  projection:='jsonb_build_object(''id'',r.id,''revision'',r.revision,''state'',r.state,''reviewed_at'',r.reviewed_at,''reviewed_by_you'',r.actor_id=$1,''related_invoice_reference'',case when e.profile_id=$1 or c.owner_profile_id=$1 then md5(''privacy-invoice:''||e.stripe_event_id) end,''payable'',false)';
 when 'passport_prestige_awards' then
  source:='private.prestige_awards a'; predicate:='a.profile_id=$1'; cursor_expression:='a.id::text';
  projection:='jsonb_build_object(''id'',a.id,''programme_key'',a.programme_key,''serial'',a.serial,''awarded_at'',a.awarded_at,''evidence'',a.evidence,''title_es'',a.title_es,''title_en'',a.title_en,''public_id'',a.public_id,''public_alias'',a.public_alias,''shared'',a.shared,''hall_of_fame'',a.hall_of_fame,''revoked_at'',a.revoked_at)';
 when 'passport_prestige_shipping_addresses' then
  source:='private.prestige_shipping_addresses s join private.prestige_awards a on a.id=s.award_id'; predicate:='a.profile_id=$1'; cursor_expression:='s.award_id::text';
  projection:='jsonb_build_object(''award_id'',s.award_id,''recipient_name'',s.recipient_name,''address_line1'',s.address_line1,''address_line2'',s.address_line2,''postal_code'',s.postal_code,''city'',s.city,''region'',s.region,''country_code'',s.country_code,''phone'',s.phone,''submitted_at'',s.submitted_at,''delete_after'',s.delete_after)';
 when 'passport_prestige_physical_requests' then
  source:='private.prestige_physical_requests r join private.prestige_awards a on a.id=r.award_id'; predicate:='a.profile_id=$1'; cursor_expression:='r.award_id::text';
  projection:='jsonb_build_object(''award_id'',r.award_id,''status'',r.status,''delivery_status'',r.delivery_status,''tracking_reference'',r.tracking_reference,''requested_at'',r.requested_at,''reviewed_at'',r.reviewed_at,''reviewed_by_you'',r.reviewed_by=$1)';
 when 'passport_prestige_audit' then
  source:='private.prestige_audit r'; predicate:='(r.actor_id=$1 or exists(select 1 from private.prestige_awards a where a.id=r.award_id and a.profile_id=$1))'; cursor_expression:='lpad(r.id::text,20,''0'')';
  projection:='jsonb_build_object(''id'',r.id,''action'',r.action,''programme_key'',r.programme_key,''created_at'',r.created_at,''actor_is_you'',r.actor_id=$1,''own_award_id'',(select a.id from private.prestige_awards a where a.id=r.award_id and a.profile_id=$1))';
 else raise exception 'Unknown privacy section';
 end case;
 execute 'select count(*) from '||source||' where '||predicate into total using member;
 -- Build JSON only for the bounded page, not for the entire subject history.
 execute 'select coalesce(jsonb_agg(jsonb_build_object(''key'',q.export_key,''data'',q.item) order by q.export_key collate "C"),''[]''::jsonb) from (select '||cursor_expression||' as export_key,'||projection||' as item from '||source||' where '||predicate||' and ($2::text is null or ('||cursor_expression||') collate "C">$2 collate "C") order by ('||cursor_expression||') collate "C" limit $3) q'
 into page using member,p_after,p_limit+1;
 if jsonb_array_length(page)>p_limit then
  next_cursor:=page->(p_limit-1)->>'key';
  page:=page-(jsonb_array_length(page)-1);
 end if;
 return jsonb_build_object('section',p_section,'total',total,'rows',page,'next_cursor',next_cursor);
end $$;
revoke all on function public.suite_private_identity_export_page(text,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.suite_private_identity_export_page(text,text,integer) to authenticated;
notify pgrst,'reload schema';
commit;
