-- 2026-10-28: private, verified launch waitlist for AkiDuermo and AkiCoches.
-- Apply only after independent staging review; neither browser nor anon role may read emails.
create table if not exists public.launch_waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  product text not null check (product in ('duermo', 'coches')),
  email text not null check (email = lower(btrim(email)) and char_length(email) <= 254),
  full_name text not null check (char_length(full_name) between 1 and 100),
  city text not null check (char_length(city) between 1 and 120),
  audience text not null check (audience in ('person', 'business')),
  interests text not null default '' check (char_length(interests) <= 180),
  locale text not null check (locale in ('es', 'en')),
  launch_consent_at timestamptz not null default now(),
  marketing_consent_at timestamptz,
  verification_hash text check (verification_hash is null or char_length(verification_hash) = 64),
  verification_expires_at timestamptz,
  verification_sent_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product, email)
);
create index if not exists launch_waitlist_pending_idx
  on public.launch_waitlist_entries (verification_expires_at)
  where verified_at is null;
alter table public.launch_waitlist_entries enable row level security;
revoke all on public.launch_waitlist_entries from public, anon, authenticated;
grant select, insert, update, delete on public.launch_waitlist_entries to service_role;

create table if not exists public.launch_waitlist_rate_limits (
  key_hash text primary key check (char_length(key_hash) = 64),
  window_start timestamptz not null default clock_timestamp(),
  attempt_count integer not null default 1 check (attempt_count >= 1)
);
alter table public.launch_waitlist_rate_limits enable row level security;
revoke all on public.launch_waitlist_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.launch_waitlist_rate_limits to service_role;

-- Atomic fixed-window limiting: avoids the select/insert race on concurrent submissions.
create or replace function public.reserve_launch_waitlist_rate(
  p_key_hash text, p_limit integer, p_window_seconds integer
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_count integer;
begin
  if char_length(coalesce(p_key_hash,'')) <> 64
    or p_key_hash !~ '^[0-9a-f]{64}$'
    or p_limit < 1 or p_limit > 100 or p_window_seconds < 60 or p_window_seconds > 86400 then
    return false;
  end if;
  insert into public.launch_waitlist_rate_limits as limits
    (key_hash, window_start, attempt_count)
  values (p_key_hash, clock_timestamp(), 1)
  on conflict (key_hash) do update set
    attempt_count = case
      when limits.window_start < clock_timestamp() - make_interval(secs => p_window_seconds)
        then 1 else limits.attempt_count + 1 end,
    window_start = case
      when limits.window_start < clock_timestamp() - make_interval(secs => p_window_seconds)
        then clock_timestamp() else limits.window_start end
  returning attempt_count into v_count;
  return v_count <= p_limit;
end;
$$;
revoke all on function public.reserve_launch_waitlist_rate(text,integer,integer)
  from public, anon, authenticated;
grant execute on function public.reserve_launch_waitlist_rate(text,integer,integer)
  to service_role;

-- Returning an empty result is intentional for already confirmed or recently emailed
-- addresses. Callers MUST return the same generic message and MUST NOT send mail.
create or replace function public.reserve_launch_waitlist_verification(
  p_product text, p_email text, p_full_name text, p_city text,
  p_audience text, p_interests text, p_locale text,
  p_marketing_consent boolean, p_token_hash text
) returns table (entry_id uuid)
language plpgsql security definer set search_path = ''
as $$
begin
  if p_product not in ('duermo','coches')
    or p_audience not in ('person','business')
    or p_locale not in ('en','es')
    or char_length(p_email) > 254 or p_email <> lower(btrim(p_email))
    or char_length(p_full_name) not between 1 and 100
    or char_length(p_city) not between 1 and 120
    or char_length(p_interests) > 180
    or p_token_hash !~ '^[0-9a-f]{64}$' then
    return;
  end if;
  return query
  insert into public.launch_waitlist_entries as entries (
    product, email, full_name, city, audience, interests, locale,
    marketing_consent_at, verification_hash, verification_expires_at,
    verification_sent_at, updated_at
  ) values (
    p_product, p_email, p_full_name, p_city, p_audience, p_interests,
    p_locale, case when p_marketing_consent then now() else null end,
    p_token_hash, now() + interval '24 hours', now(), now()
  )
  on conflict (product,email) do update set
    full_name = excluded.full_name,
    city = excluded.city,
    audience = excluded.audience,
    interests = excluded.interests,
    locale = excluded.locale,
    marketing_consent_at = excluded.marketing_consent_at,
    verification_hash = excluded.verification_hash,
    verification_expires_at = excluded.verification_expires_at,
    verification_sent_at = excluded.verification_sent_at,
    updated_at = now()
  where entries.verified_at is null
    and (entries.verification_sent_at is null
      or entries.verification_sent_at < now() - interval '20 minutes')
  returning id;
end;
$$;
revoke all on function public.reserve_launch_waitlist_verification(
 text,text,text,text,text,text,text,boolean,text
) from public,anon,authenticated;
grant execute on function public.reserve_launch_waitlist_verification(
 text,text,text,text,text,text,text,boolean,text
) to service_role;

-- Retention maintenance must be scheduled and operationally reviewed before activation.
-- Unverified: 30 days; confirmed: 12 months maximum, unless a shorter
-- documented purpose-specific retention window is needed.
create or replace function public.purge_expired_launch_waitlist()
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_deleted integer;
begin
  delete from public.launch_waitlist_entries
  where (verified_at is null and created_at < now() - interval '30 days')
     or (verified_at is not null and verified_at < now() - interval '12 months');
  get diagnostics v_deleted = row_count;
  delete from public.launch_waitlist_rate_limits
   where window_start < now() - interval '2 days';
  return v_deleted;
end;
$$;
revoke all on function public.purge_expired_launch_waitlist()
 from public,anon,authenticated;
grant execute on function public.purge_expired_launch_waitlist()
 to service_role;
