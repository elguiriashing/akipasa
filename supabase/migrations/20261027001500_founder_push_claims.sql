begin;

-- Founder-only native push. Entire storage and queue are server-only. No client
-- can select FCM device tokens or mutate queued deliveries.
create table if not exists public.admin_push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique check (length(token) between 20 and 4096),
  session_id uuid not null references auth.sessions(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists admin_push_devices_user on public.admin_push_devices (user_id,expires_at);
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

create or replace function public.queue_claim_push_deliveries()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status::text <> 'pending' then return new; end if;
  insert into public.claim_push_deliveries(claim_id,device_id)
  select new.id,d.id from public.admin_push_devices d where d.expires_at > now()
  on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists venue_claim_founder_push on public.venue_claims;
create trigger venue_claim_founder_push after insert on public.venue_claims
for each row execute function public.queue_claim_push_deliveries();
revoke all on function public.queue_claim_push_deliveries() from public,anon,authenticated;

create or replace function public.claim_due_push_deliveries()
returns setof public.claim_push_deliveries language plpgsql security definer set search_path = '' as $$
begin
  -- In-flight jobs whose provider response is unknown are blocked, not
  -- silently resent (FCM has no idempotency-key support).
  update public.claim_push_deliveries set status='blocked',lease_id=null,
    last_error='unconfirmed_delivery'
  where status='sending' and attempted_at < now()-interval '10 minutes';
  return query
  with due as (
    select q.claim_id,q.device_id from public.claim_push_deliveries q
    where q.status in ('pending','failed') and q.available_at <= now()
      and q.attempts < 6
    order by q.created_at,q.claim_id limit 10 for update of q skip locked
  )
  update public.claim_push_deliveries q
  set status='sending',attempts=q.attempts+1,lease_id=gen_random_uuid(),attempted_at=now()
  from due where q.claim_id=due.claim_id and q.device_id=due.device_id
  returning q.*;
end;
$$;
revoke all on function public.claim_due_push_deliveries() from public,anon,authenticated;
grant execute on function public.claim_due_push_deliveries() to service_role;

create or replace function public.finish_claim_push_delivery(
  p_claim uuid,p_device uuid,p_lease uuid,p_status text,p_error text default null
)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('sent','failed','blocked') then raise exception 'invalid delivery status'; end if;
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
returns table(token text,user_id uuid,expires_at timestamptz)
language sql stable security definer set search_path='' as $
  select d.token,d.user_id,d.expires_at
  from public.admin_push_devices d
  join auth.sessions s on s.id=d.session_id and s.user_id=d.user_id
  where d.id=p_device and d.expires_at>now();
$;
revoke all on function public.active_founder_push_device(uuid) from public,anon,authenticated;
grant execute on function public.active_founder_push_device(uuid) to service_role;

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
