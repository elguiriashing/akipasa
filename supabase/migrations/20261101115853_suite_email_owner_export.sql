begin;
-- Caller-only portability for the private transactional mail outbox.
-- Keep all direct client table grants revoked; no recipient or arbitrary owner argument.
create or replace function public.my_suite_email_export_page(p_after uuid default null,p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path='' as $function$
declare v_user uuid:=auth.uid(); v_result jsonb;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'Invalid export page limit' using errcode='22023'; end if;
 -- No eligibility/onboarding guard: owners retain portability after suspension.
 -- Rental audience is immutable server-authored provenance: queue_rental_booking_email
 -- assigns customer iff profile_id is the renter. It remains usable after booking
 -- deletion; operator copies must never export the renter's contacts or private note.
 with owned as materialized (
  select q.* from public.suite_email_outbox q
  where q.profile_id=v_user and (p_after is null or q.id>p_after)
  order by q.id limit p_limit+1
 ), page as (select * from owned order by id limit p_limit), projected as (
  select q.*,p.safe_payload from page q cross join lateral (
   select coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb) safe_payload
   from jsonb_each(q.payload) e
   where e.key=any(case
      when q.kind='welcome_akipasa' then array['product','displayName']::text[]
      when q.kind='welcome_akiduermo' then array['product','displayName']::text[]
      when q.kind='welcome_akibusiness' then array['product','displayName']::text[]
      when q.kind='welcome_akihq' then array['product','displayName']::text[]
      when q.kind='claim_received' then array['claimId','venueId','venueName']::text[]
      when q.kind='event_booking_requested' then array['bookingId','eventId','venueName','bookingStart','guestCount']::text[]
      when q.kind='event_booking_cancelled' then array['bookingId','eventId','venueName','bookingStart','guestCount']::text[]
      when q.kind='stay_booking_requested' then array['bookingId','venueName','checkIn','checkOut','guests','totalCents','venueId']::text[]
      when q.kind='stay_booking_cancelled' then array['bookingId','venueName','checkIn','checkOut','guests','totalCents','venueId']::text[]
      when q.kind='event_saved_reminder' then array['eventId','occurrenceId','eventName','startsAt','slug']::text[]
      when q.kind='stay_saved_reminder' then array['venueId','venueName','venueSlug','savedAt']::text[]
      when q.kind='rental_booking_update' then array['bookingId','companyId','companyName','vehicleName','status','start','end','totalCents','audience']::text[] || case when q.payload->>'audience'='customer' then array['customerName','customerEmail','customerPhone','note']::text[] else '{}'::text[] end
      else '{}'::text[] end)
    and jsonb_typeof(e.value) in('string','number','boolean','null')
  ) p
 )
 select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object(
  'id',q.id,'kind',q.kind,'recipient',q.recipient,'locale',q.locale,'status',q.status,
  'created_at',q.created_at,'available_at',q.available_at,'first_attempt_at',q.first_attempt_at,
  'attempted_at',q.attempted_at,'sent_at',q.sent_at,'attempts',q.attempts,'delivery_uncertain',q.delivery_uncertain,
  'payload',q.safe_payload,'projection_version','personal-mail-v1',
  'payload_excluded_field_count',(select count(*) from jsonb_each(q.payload))-(select count(*) from jsonb_each(q.safe_payload))
 ) order by q.id) from projected q),'[]'::jsonb),
 'truncated',(select count(*)>p_limit from owned),
 'nextCursor',case when (select count(*)>p_limit from owned) then (select id from page order by id desc limit 1) else null end)
 into v_result;
 return v_result;
end $function$;
revoke all on function public.my_suite_email_export_page(uuid,integer) from public,anon;
grant execute on function public.my_suite_email_export_page(uuid,integer) to authenticated;
comment on function public.my_suite_email_export_page(uuid,integer) is 'Caller-only retained personal transactional-mail export. Known scalar payload fields only; provider capabilities and operator third-party contacts excluded. No eligibility gate.';
commit;
