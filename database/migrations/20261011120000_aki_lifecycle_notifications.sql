begin;

-- Private, durable event-driven mail queue. Never backfill legacy users or claims.
create table if not exists public.aki_lifecycle_email_jobs(
 id uuid primary key default gen_random_uuid(),
 event_key text not null unique,
 kind text not null check(kind in(
  'claim_received','welcome_akipasa','welcome_akiduermo','welcome_akibusiness','welcome_akihq',
  'booking_cancelled','stay_cancelled','event_saved_reminder','stay_saved_reminder'
 )),
 profile_id uuid not null references public.profiles(id) on delete cascade,
 recipient text not null,
 locale text not null check(locale in('en','es')),
 payload jsonb not null default '{}'::jsonb,
 status text not null default 'pending' check(status in('pending','sending','sent','failed','blocked','review','cancelled')),
 attempts int not null default 0 check(attempts between 0 and 12),
 delivery_uncertain boolean not null default false,
 available_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 first_attempt_at timestamptz,
 attempted_at timestamptz,
 lease_id uuid,
 sent_at timestamptz,
 provider_message_id text,
 last_error text,
 constraint aki_lifecycle_event_key_size check(length(event_key) between 5 and 300),
 constraint aki_lifecycle_payload_size check(octet_length(payload::text)<8192)
);
create index if not exists aki_lifecycle_jobs_due
 on public.aki_lifecycle_email_jobs(status,available_at,created_at);
alter table public.aki_lifecycle_email_jobs enable row level security;
revoke all on public.aki_lifecycle_email_jobs from PUBLIC,anon,authenticated;
grant select,insert,update,delete on public.aki_lifecycle_email_jobs to service_role;

-- Reminder opt-in starts OFF, ensuring a saved item doesn't automatically mean
-- consent to receive commercial follow-ups.
create table if not exists public.aki_email_preferences(
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 saved_event_reminders boolean not null default false,
 saved_stay_reminders boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.aki_email_preferences enable row level security;
revoke all on public.aki_email_preferences from PUBLIC,anon,authenticated;
grant select,insert,update,delete on public.aki_email_preferences to service_role;

create or replace function public.aki_update_email_preferences(p_events boolean,p_stays boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 insert into public.aki_email_preferences(profile_id,saved_event_reminders,saved_stay_reminders)
 values(uid,coalesce(p_events,false),coalesce(p_stays,false))
 on conflict(profile_id) do update set
 saved_event_reminders=excluded.saved_event_reminders,
 saved_stay_reminders=excluded.saved_stay_reminders,
 updated_at=now();
 return jsonb_build_object('saved_event_reminders',coalesce(p_events,false),
                          'saved_stay_reminders',coalesce(p_stays,false));
end $$;
revoke all on function public.aki_update_email_preferences(boolean,boolean) from PUBLIC,anon;
grant execute on function public.aki_update_email_preferences(boolean,boolean) to authenticated;

create or replace function public.aki_my_email_preferences()
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 return coalesce((select jsonb_build_object(
 'saved_event_reminders',p.saved_event_reminders,
 'saved_stay_reminders',p.saved_stay_reminders)
 from public.aki_email_preferences p where p.profile_id=uid),
 '{"saved_event_reminders":false,"saved_stay_reminders":false}'::jsonb);
end $$;
revoke all on function public.aki_my_email_preferences() from PUBLIC,anon;
grant execute on function public.aki_my_email_preferences() to authenticated;

-- Existing AkiDuermo saves are in localStorage and are NOT migrated implicitly.
-- Only saves of logged-in users after this feature is enabled can be emailed.
create table if not exists public.aki_saved_stays(
 profile_id uuid not null references public.profiles(id) on delete cascade,
 venue_id uuid not null references public.venues(id) on delete cascade,
 locale text not null check(locale in('es','en')),
 saved_at timestamptz not null default now(),
 primary key(profile_id,venue_id)
);
alter table public.aki_saved_stays enable row level security;
revoke all on public.aki_saved_stays from PUBLIC,anon,authenticated;
create policy aki_saved_stays_own_select on public.aki_saved_stays for select to authenticated using(profile_id=auth.uid());
create policy aki_saved_stays_own_insert on public.aki_saved_stays for insert to authenticated with check(profile_id=auth.uid());
create policy aki_saved_stays_own_delete on public.aki_saved_stays for delete to authenticated using(profile_id=auth.uid());
grant select,insert,delete on public.aki_saved_stays to authenticated,service_role;

-- Transactional job enqueuer is not callable over the public API.
create or replace function public.aki_enqueue_email(
 p_key text,p_kind text,p_profile uuid,p_locale text,p_payload jsonb default '{}'::jsonb
) returns boolean language plpgsql security definer set search_path='' as $$
declare email_address text;
begin
 select u.email into email_address
 from auth.users u where u.id=p_profile and u.deleted_at is null
 and u.email_confirmed_at is not null;
 if email_address is null or btrim(email_address)='' then return false; end if;
 insert into public.aki_lifecycle_email_jobs(event_key,kind,profile_id,recipient,locale,payload)
 values(p_key,p_kind,p_profile,email_address,
   case when p_locale='es' then 'es' else 'en' end,coalesce(p_payload,'{}'::jsonb))
 on conflict(event_key) do nothing;
 return found;
end $$;
revoke all on function public.aki_enqueue_email(text,text,uuid,text,jsonb)
 from PUBLIC,anon,authenticated;
grant execute on function public.aki_enqueue_email(text,text,uuid,text,jsonb) to service_role;

-- Registration is permitted ONLY for the currently authenticated and verified
-- account. The unique job key makes callbacks, OAuth and repeated logins safe.
create or replace function public.aki_register_portal_welcome(p_portal text,p_locale text)
returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); kind text;
declare created timestamptz;
begin
 if uid is null or p_portal not in('akipasa','akiduermo','akibusiness','akihq') then
   raise exception 'Unauthorised portal welcome' using errcode='42501';
 end if;
 select u.created_at into created from auth.users u where u.id=uid
  and u.deleted_at is null and u.email_confirmed_at is not null;
 if created is null then return false; end if;
 -- Don't send a generic "new registration" greeting to old AkiPasa accounts.
 if p_portal='akipasa' and created<'2026-10-11T00:00:00Z'::timestamptz then
   return false;
 end if;
 kind:='welcome_'||p_portal;
 return public.aki_enqueue_email('welcome:'||p_portal||':'||uid,kind,uid,p_locale,'{}'::jsonb);
end $$;
revoke all on function public.aki_register_portal_welcome(text,text) from PUBLIC,anon;
grant execute on function public.aki_register_portal_welcome(text,text) to authenticated;

-- New claim receipt is queued atomically, whether submission is made from
-- venue or accommodation claiming. The old staff-alert trigger is untouched.
create or replace function public.aki_claim_received()
returns trigger language plpgsql security definer set search_path='' as $$
declare venue_name text; loc text;
begin
 if new.status::text<>'pending' then return new; end if;
 select v.name into venue_name from public.venues v where v.id=new.venue_id;
 select coalesce(nullif(new.claim_details->>'submission_locale',''),p.preferred_locale,'es')
 into loc from public.profiles p where p.id=new.claimant_id;
 perform public.aki_enqueue_email('claim-received:'||new.id,'claim_received',
  new.claimant_id,loc,jsonb_build_object('venueName',coalesce(venue_name,'Venue'),
                                       'reference',new.id::text,
                                       'venueId',new.venue_id::text));
 return new;
end $$;
drop trigger if exists aki_claim_received_trigger on public.venue_claims;
create trigger aki_claim_received_trigger after insert on public.venue_claims
for each row execute function public.aki_claim_received();
revoke all on function public.aki_claim_received() from PUBLIC,anon,authenticated;

-- Cancellation emails queue only on an actual cancellation transition.
-- Never claim a refund has already been paid.
create or replace function public.aki_booking_cancelled()
returns trigger language plpgsql security definer set search_path='' as $$
declare venue_name text;
begin
 if new.status='cancelled' and old.status is distinct from 'cancelled'
    and new.profile_id is not null then
  select v.name into venue_name from public.venues v where v.id=new.venue_id;
  perform public.aki_enqueue_email('booking-cancelled:'||new.id,
     'booking_cancelled',new.profile_id,
     coalesce(new.booking_locale,'es'),
     jsonb_build_object('venueName',coalesce(venue_name,'Venue'),'reference',new.id::text));
 end if;
 return new;
end $$;
drop trigger if exists aki_booking_cancelled_trigger on public.booking_requests;
create trigger aki_booking_cancelled_trigger after update of status
on public.booking_requests for each row execute function public.aki_booking_cancelled();
revoke all on function public.aki_booking_cancelled() from PUBLIC,anon,authenticated;

create or replace function public.aki_stay_cancelled()
returns trigger language plpgsql security definer set search_path='' as $$
declare venue_name text;
begin
 if new.status='cancelled' and old.status is distinct from 'cancelled'
    and new.profile_id is not null then
  select v.name into venue_name from public.venues v where v.id=new.venue_id;
  perform public.aki_enqueue_email('stay-cancelled:'||new.id,'stay_cancelled',
     new.profile_id,coalesce(new.locale,'es'),
     jsonb_build_object('venueName',coalesce(venue_name,'Accommodation'),
                        'reference',new.id::text));
 end if;
 return new;
end $$;
drop trigger if exists aki_stay_cancelled_trigger on public.accommodation_reservations;
create trigger aki_stay_cancelled_trigger after update of status
on public.accommodation_reservations for each row execute function public.aki_stay_cancelled();
revoke all on function public.aki_stay_cancelled() from PUBLIC,anon,authenticated;

-- Only verified, opted-in favourites receive reminders. Saved-event keys
-- without a provable event record/occurrence are intentionally skipped.
create or replace function public.aki_queue_due_reminders()
returns integer language plpgsql security definer set search_path='' as $$
declare n integer:=0; item record; accepted boolean;
begin
 for item in
 select s.profile_id,e.id as event_id,occ.id as occurrence_id,
        e.title_en,e.title_es,e.slug,s.event_key,
        p.preferred_locale,occ.starts_at
 from public.saved_event_refs s
 join public.events e on (s.event_key=e.id::text or s.event_key=e.slug)
 join public.event_occurrences occ on occ.event_id=e.id
 join public.aki_email_preferences pref on pref.profile_id=s.profile_id
      and pref.saved_event_reminders
 join public.profiles p on p.id=s.profile_id
 where e.status::text='published'
   and occ.starts_at>=now()+interval '47 hours'
   and occ.starts_at<=now()+interval '49 hours'
   and not exists(
     select 1 from public.booking_requests b
     where b.profile_id=s.profile_id and b.event_id=e.id
       and b.status in('requested','confirmed')
   )
 loop
   accepted:=public.aki_enqueue_email(
     'saved-event:'||item.profile_id||':'||item.occurrence_id,
     'event_saved_reminder',item.profile_id,item.preferred_locale,
     jsonb_build_object('eventId',item.event_id,'occurrenceId',item.occurrence_id,
       'venueName',coalesce(item.title_en,item.title_es,'Event'),'startsAt',item.starts_at,
       'reference',item.event_key));
   if accepted then n:=n+1;end if;
 end loop;
 for item in
 select s.profile_id,s.venue_id,s.saved_at,s.locale,v.name
 from public.aki_saved_stays s
 join public.aki_email_preferences pref on pref.profile_id=s.profile_id
     and pref.saved_stay_reminders
 join public.venues v on v.id=s.venue_id
 where s.saved_at<=now()-interval '5 days'
   and v.status::text='published'
   and v.discovery_vertical='accommodation'
   and not exists(
      select 1 from public.accommodation_reservations b
      where b.profile_id=s.profile_id and b.venue_id=s.venue_id
      and b.status in('requested','confirmed','checked_in')
   )
 loop
  accepted:=public.aki_enqueue_email(
    'saved-stay:'||item.profile_id||':'||item.venue_id||':'||item.saved_at,
    'stay_saved_reminder',item.profile_id,item.locale,
    jsonb_build_object('venueId',item.venue_id,'venueName',item.name,
                       'savedAt',item.saved_at));
  if accepted then n:=n+1;end if;
 end loop;
 return n;
end $$;
revoke all on function public.aki_queue_due_reminders() from PUBLIC,anon,authenticated;
grant execute on function public.aki_queue_due_reminders() to service_role;

create or replace function public.aki_lease_email_jobs()
returns setof public.aki_lifecycle_email_jobs language plpgsql
security definer set search_path='' as $$
begin
 update public.aki_lifecycle_email_jobs
   set status='review',lease_id=null,last_error='manual_delivery_review_required'
 where status in('sending','failed') and first_attempt_at<now()-interval '23 hours';
 return query
 with due as(
  select id from public.aki_lifecycle_email_jobs
  where attempts<12 and available_at<=now()
   and (status in('pending','failed') or
        (status='sending' and attempted_at<now()-interval '10 minutes'))
  order by created_at,id limit 15 for update skip locked
 )
 update public.aki_lifecycle_email_jobs j
 set status='sending',attempts=j.attempts+1,lease_id=gen_random_uuid(),
     attempted_at=now(),first_attempt_at=coalesce(j.first_attempt_at,now()),
     delivery_uncertain=j.delivery_uncertain or j.status='sending'
 from due where j.id=due.id returning j.*;
end $$;
revoke all on function public.aki_lease_email_jobs() from PUBLIC,anon,authenticated;
grant execute on function public.aki_lease_email_jobs() to service_role;

create or replace function public.aki_finish_email_job(
 p_id uuid,p_lease uuid,p_ok boolean,p_message text default null,
 p_error text default null,p_ambiguous boolean default true,p_retryable boolean default true
)returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_ok and nullif(btrim(p_message),'') is null then
  raise exception 'Missing provider acceptance id';
 end if;
 update public.aki_lifecycle_email_jobs
 set status=case when p_ok then 'sent'
    when not p_retryable then 'blocked'
    when attempts>=12 then 'review'
    else 'failed' end,
 sent_at=case when p_ok then now() else null end,
 provider_message_id=case when p_ok then p_message else null end,
 last_error=case when p_ok then null else left(p_error,100) end,
 delivery_uncertain=delivery_uncertain or (not p_ok and p_ambiguous),
 available_at=now()+make_interval(secs=>least(3600,60*power(2,least(attempts,6)))::integer),
 lease_id=null
 where id=p_id and status='sending' and lease_id=p_lease;
 return found;
end $$;
revoke all on function public.aki_finish_email_job(uuid,uuid,boolean,text,text,boolean,boolean)
 from PUBLIC,anon,authenticated;
grant execute on function public.aki_finish_email_job(uuid,uuid,boolean,text,text,boolean,boolean) to service_role;


-- Cancel reminders that no longer qualify at delivery time. This operation
-- is service-role-only and requires the active lease, preventing races.
create or replace function public.aki_cancel_email_job(p_id uuid,p_lease uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.aki_lifecycle_email_jobs
 set status='cancelled',lease_id=null,last_error='reminder_no_longer_eligible'
 where id=p_id and lease_id=p_lease and status='sending'
 and kind in('event_saved_reminder','stay_saved_reminder');
 return found;
end $$;
revoke all on function public.aki_cancel_email_job(uuid,uuid) from PUBLIC,anon,authenticated;
grant execute on function public.aki_cancel_email_job(uuid,uuid) to service_role;

commit;