begin;

-- Deliberately empty until an operator confirms the exact founder identities
-- and that each is an adult. This does not grant an application role. Keep the
-- confirmation reference free of personal details; do not seed real UUIDs here.
create table public.admin_push_founders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default false,
  adult_confirmed_at timestamptz,
  confirmation_reference text check(length(confirmation_reference) between 1 and 160),
  updated_at timestamptz not null default now(),
  check(adult_confirmed_at is null or confirmation_reference is not null)
);
alter table public.admin_push_founders enable row level security;
revoke all on public.admin_push_founders from public,anon,authenticated;
grant select,insert,update,delete on public.admin_push_founders to service_role;

create table public.admin_push_founder_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  operation text not null,
  active boolean not null,
  adult_confirmed_at timestamptz,
  confirmation_reference text,
  recorded_at timestamptz not null default now()
);
alter table public.admin_push_founder_audit enable row level security;
revoke all on public.admin_push_founder_audit from public,anon,authenticated,service_role;
grant select on public.admin_push_founder_audit to service_role;
create or replace function public.audit_founder_push_authorization()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' then
    insert into public.admin_push_founder_audit(user_id,operation,active,adult_confirmed_at,confirmation_reference)
    values(old.user_id,tg_op,false,old.adult_confirmed_at,old.confirmation_reference);
    return old;
  end if;
  insert into public.admin_push_founder_audit(user_id,operation,active,adult_confirmed_at,confirmation_reference)
  values(new.user_id,tg_op,new.active,new.adult_confirmed_at,new.confirmation_reference);
  return new;
end;
$$;
revoke all on function public.audit_founder_push_authorization() from public,anon,authenticated;
create trigger admin_push_founder_authorization_audit after insert or update or delete on public.admin_push_founders
for each row execute function public.audit_founder_push_authorization();

create or replace function public.active_founder_push_eligible(p_user uuid,p_session uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.admin_push_founders f
    join public.profiles p on p.id=f.user_id
    join auth.users u on u.id=f.user_id
    join auth.sessions s on s.user_id=f.user_id and s.id=p_session
    where f.user_id=p_user and f.active and f.adult_confirmed_at<=now()
      and p.app_role::text='administrator'
      and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())
      and (s.not_after is null or s.not_after>now())
      -- An explicit underage/pending record always overrides an operator grant.
      and not exists(select 1 from account_private.onboarding o
        where o.profile_id=f.user_id and o.status<>'complete')
      and (p.birth_year is null or p.birth_year<=extract(year from now())::integer-18)
  );
$$;
revoke all on function public.active_founder_push_eligible(uuid,uuid) from public,anon,authenticated;
grant execute on function public.active_founder_push_eligible(uuid,uuid) to service_role;

-- Founder-only native push. Entire storage and queue are server-only. No client
-- can select FCM device tokens or mutate queued deliveries.
create table if not exists public.admin_push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique check (length(token) between 20 and 4096),
  session_id uuid not null references auth.sessions(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_test_at timestamptz
);
create index if not exists admin_push_devices_user on public.admin_push_devices (user_id,expires_at);
create index if not exists admin_push_devices_session on public.admin_push_devices (session_id);
alter table public.admin_push_devices enable row level security;
revoke all on public.admin_push_devices from public,anon,authenticated;
grant select,insert,update,delete on public.admin_push_devices to service_role;

create table if not exists public.claim_push_deliveries (
  claim_id uuid not null references public.venue_claims(id) on delete cascade,
  device_id uuid not null references public.admin_push_devices(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','sending','sent','failed','blocked')),
  attempts smallint not null default 0 check (attempts between 0 and 6),
  lease_id uuid,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  attempted_at timestamptz,
  sent_at timestamptz,
  last_error text,
  primary key (claim_id, device_id)
);
create index if not exists claim_push_due on public.claim_push_deliveries(status,available_at);
alter table public.claim_push_deliveries enable row level security;
revoke all on public.claim_push_deliveries from public,anon,authenticated;
grant select,insert,update,delete on public.claim_push_deliveries to service_role;
create index if not exists claim_push_device on public.claim_push_deliveries(device_id);

-- Only the authenticated server may supply the already verified user/session.
-- Token reassignment gets a NEW device id, cancelling the former account's
-- pending and in-flight jobs instead of sending them to the new account.
create or replace function public.register_founder_push_device(p_user uuid,p_session uuid,p_token text)
returns uuid language plpgsql security definer set search_path='' as $$
declare device uuid;
begin
  if p_token is null or length(p_token) not between 20 and 4096 then
    raise exception 'invalid push token' using errcode='22023';
  end if;
  if not public.active_founder_push_eligible(p_user,p_session) then
    raise exception 'founder push unavailable' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_token,0));
  delete from public.admin_push_devices where token=p_token
    and (user_id<>p_user or session_id<>p_session);
  if not exists(select 1 from public.admin_push_devices where token=p_token)
    and (select count(*) from public.admin_push_devices where user_id=p_user and expires_at>now())>=10 then
    raise exception 'push device limit reached' using errcode='54000';
  end if;
  insert into public.admin_push_devices(user_id,session_id,token,expires_at)
  values(p_user,p_session,p_token,now()+interval '30 days')
  on conflict(token) do update set expires_at=excluded.expires_at,last_seen_at=now()
  returning id into device;
  return device;
end;
$$;
revoke all on function public.register_founder_push_device(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.register_founder_push_device(uuid,uuid,text) to service_role;

-- Withdrawal still works after demotion or founder removal. Null token revokes
-- only this auth session, preserving the founder's other signed-in devices.
create or replace function public.revoke_founder_push_device(p_user uuid,p_session uuid,p_token text default null)
returns integer language plpgsql security definer set search_path='' as $$
declare affected integer;
begin
  delete from public.admin_push_devices where user_id=p_user and session_id=p_session
    and (p_token is null or token=p_token);
  get diagnostics affected=row_count;
  return affected;
end;
$$;
revoke all on function public.revoke_founder_push_device(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.revoke_founder_push_device(uuid,uuid,text) to service_role;

create or replace function public.queue_claim_push_deliveries()
returns trigger language plpgsql security definer set search_path = '' as $$
declare wake_secret text;
begin
  if new.status::text <> 'pending' then return new; end if;
  insert into public.claim_push_deliveries(claim_id,device_id)
  select new.id,d.id from public.admin_push_devices d where d.expires_at > now()
    and public.active_founder_push_eligible(d.user_id,d.session_id)
  on conflict do nothing;
  -- pg_net performs HTTP after commit. A vault secret is the opt-in; no raw
  -- credentials are persisted in function text. Missing extensions/config or
  -- wake failure must never break claim submission or its independent email.
  if exists(select 1 from public.claim_push_deliveries where claim_id=new.id)
    and to_regclass('vault.decrypted_secrets') is not null
    and to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is not null then
    begin
      execute 'select decrypted_secret from vault.decrypted_secrets where name=$1'
        into wake_secret using 'akipasa_push_webhook_secret';
      if length(wake_secret)>=32 then
        perform net.http_post(
          url:='https://akipasa.com/api/internal/founder-push/wake',
          body:=jsonb_build_object('claim_id',new.id),
          headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||wake_secret),
          timeout_milliseconds:=5000);
      end if;
    exception when others then
      -- The durable delivery remains pending for scheduled recovery. Never log
      -- a provider error string here: it can contain a request credential.
      null;
    end;
  end if;
  return new;
end;
$$;
drop trigger if exists venue_claim_founder_push on public.venue_claims;
create trigger venue_claim_founder_push after insert on public.venue_claims
for each row execute function public.queue_claim_push_deliveries();
revoke all on function public.queue_claim_push_deliveries() from public,anon,authenticated;

create or replace function public.claim_due_push_deliveries(
  p_claim uuid default null,p_started_at timestamptz default null
)
returns setof public.claim_push_deliveries language plpgsql security definer set search_path = '' as $$
begin
  -- The worker supplies its validated production activation time. Fail closed
  -- when unset or invalid, including old callers that omit this argument.
  if p_started_at is null or not isfinite(p_started_at) or p_started_at>now() then
    return;
  end if;
  -- In-flight jobs whose provider response is unknown are blocked, not
  -- silently resent (FCM has no idempotency-key support).
  update public.claim_push_deliveries set status='blocked',lease_id=null,
    last_error='unconfirmed_delivery'
  where status='sending' and attempted_at < now()-interval '10 minutes';
  update public.claim_push_deliveries q set status='blocked',lease_id=null,last_error='recipient_or_claim_ineligible'
  where q.status in ('pending','failed') and (
    q.created_at<now()-interval '1 hour' or q.created_at<p_started_at
    -- Enrollment can collect jobs while production delivery is disabled.
    -- Neither those jobs nor an old claim enqueued later may replay at launch.
    or not exists(select 1 from public.venue_claims c where c.id=q.claim_id
      and c.status::text='pending' and c.created_at>=p_started_at)
    or not exists(select 1 from public.admin_push_devices d where d.id=q.device_id
      and d.expires_at>now() and public.active_founder_push_eligible(d.user_id,d.session_id))
  );
  return query
  with due as (
    select q.claim_id,q.device_id from public.claim_push_deliveries q
    where q.status in ('pending','failed') and q.available_at <= now()
      and q.attempts < 6
      -- Recheck at selection too: another transaction may have enqueued a
      -- claim after the cleanup statement's snapshot.
      and q.created_at>=p_started_at
      and exists(select 1 from public.venue_claims c where c.id=q.claim_id
        and c.status::text='pending' and c.created_at>=p_started_at)
      and (p_claim is null or q.claim_id=p_claim)
    order by q.created_at,q.claim_id limit 10 for update of q skip locked
  )
  update public.claim_push_deliveries q
  set status='sending',attempts=q.attempts+1,lease_id=gen_random_uuid(),attempted_at=now()
  from due where q.claim_id=due.claim_id and q.device_id=due.device_id
  returning q.*;
end;
$$;
revoke all on function public.claim_due_push_deliveries(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.claim_due_push_deliveries(uuid,timestamptz) to service_role;

create or replace function public.finish_claim_push_delivery(
  p_claim uuid,p_device uuid,p_lease uuid,p_status text,p_error text default null
)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_status is null or p_status not in ('sent','failed','blocked') then raise exception 'invalid delivery status'; end if;
  if p_error is not null and p_error !~ '^[a-z0-9_]{1,90}$' then
    raise exception 'invalid delivery error' using errcode='22023';
  end if;
  update public.claim_push_deliveries
    set status=case when p_status='failed' and attempts>=6 then 'blocked' else p_status end,
      sent_at=case when p_status='sent' then now() else null end,
      last_error=case when p_status='sent' then null else left(p_error,90) end,
      available_at=now()+make_interval(secs=>least(3600,60*power(2,least(attempts,5)))::integer),
      lease_id=null
  where claim_id=p_claim and device_id=p_device and lease_id=p_lease and status='sending';
  return found;
end;
$$;
revoke all on function public.finish_claim_push_delivery(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.finish_claim_push_delivery(uuid,uuid,uuid,text,text) to service_role;

-- Caller is the private service role only. The session row must still
-- exist; logout/revocation immediately disqualifies its FCM registration.
create or replace function public.active_founder_push_device(p_device uuid)
returns table(token text,user_id uuid,expires_at timestamptz,session_id uuid,locale text)
language sql stable security definer set search_path='' as $$
  select d.token,d.user_id,d.expires_at,d.session_id,
    case when p.preferred_locale='es' then 'es' else 'en' end
  from public.admin_push_devices d
  join public.profiles p on p.id=d.user_id
  where d.id=p_device and d.expires_at>now()
    and public.active_founder_push_eligible(d.user_id,d.session_id);
$$;
revoke all on function public.active_founder_push_device(uuid) from public,anon,authenticated;
grant execute on function public.active_founder_push_device(uuid) to service_role;

-- A founder may request a real transport test without inserting a customer
-- claim. Only this account/session's registered device is returned; reserve the
-- cooldown before contacting FCM, including failed or uncertain responses.
create or replace function public.reserve_founder_push_test(p_user uuid,p_session uuid,p_device uuid)
returns table(token text,user_id uuid,expires_at timestamptz,session_id uuid,locale text,test_id uuid)
language plpgsql security definer set search_path='' as $$
begin
  if not public.active_founder_push_eligible(p_user,p_session) then
    raise exception 'founder push unavailable' using errcode='42501';
  end if;
  return query
  with reserved as (
    update public.admin_push_devices d set last_test_at=now()
    where d.id=p_device and d.user_id=p_user and d.session_id=p_session
      and d.expires_at>now() and (d.last_test_at is null or d.last_test_at<now()-interval '60 seconds')
    returning d.*
  )
  select r.token,r.user_id,r.expires_at,r.session_id,
    case when p.preferred_locale='es' then 'es' else 'en' end,gen_random_uuid()
  from reserved r join public.profiles p on p.id=r.user_id;
end;
$$;
revoke all on function public.reserve_founder_push_test(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_founder_push_test(uuid,uuid,uuid) to service_role;

-- Open one exact requested claim rather than incorrectly selecting page one's
-- first claim when a notification deep-link contains a later claim.
create or replace function public.staff_pending_venue_claim_by_id(p_claim uuid)
returns table(id uuid, created_at timestamptz, evidence text, status text,
  claimant_id uuid, venues jsonb, claimant jsonb, total_count bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p where p.id=auth.uid()
      and p.app_role::text in ('moderator','administrator')
  ) then raise exception 'staff role required' using errcode='42501'; end if;
  return query
  select c.id,c.created_at,c.evidence,c.status::text,c.claimant_id,
    jsonb_build_object('name',v.name,'address',v.address,'slug',v.slug,
      'discovery_vertical',v.discovery_vertical,'contact_phone',v.contact_phone,
      'website_url',v.website_url,'timezone',coalesce(city.timezone,'Europe/Madrid')),
    jsonb_build_object('display_name',p.display_name,'email',u.email::text,
      'phone',p.phone,'created_at',p.created_at,'submission',c.claim_details),
    1::bigint
  from public.venue_claims c
  join public.venues v on v.id=c.venue_id
  join public.profiles p on p.id=c.claimant_id
  left join auth.users u on u.id=p.id and u.deleted_at is null
  left join public.cities city on city.id=v.city_id
  where c.status::text='pending' and c.id=p_claim;
end;
$$;
revoke all on function public.staff_pending_venue_claim_by_id(uuid) from public,anon,authenticated;
grant execute on function public.staff_pending_venue_claim_by_id(uuid) to authenticated;

commit;
