begin;

-- Provider-neutral foundation only. No provider callback or rollout is enabled.
create schema age_assurance_private;
revoke all on schema age_assurance_private from public, anon, authenticated;
grant usage on schema age_assurance_private to service_role;

create table age_assurance_private.rollout (
 singleton boolean primary key default true check (singleton),
 enabled boolean not null default false
);
insert into age_assurance_private.rollout(singleton) values(true);
alter table age_assurance_private.rollout enable row level security;
revoke all on age_assurance_private.rollout from public, anon, authenticated, service_role;
grant select, update on age_assurance_private.rollout to service_role;
create policy age_rollout_service on age_assurance_private.rollout to service_role using(true) with check(true);

create table age_assurance_private.attestations (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 provider text not null check(char_length(provider) between 1 and 80),
 proof_reference text not null check(char_length(proof_reference) between 1 and 200),
 verified_at timestamptz not null,
 expires_at timestamptz not null check(expires_at > verified_at),
 revoked_at timestamptz,
 unique(provider,proof_reference)
);
alter table age_assurance_private.attestations enable row level security;
revoke all on age_assurance_private.attestations from public, anon, authenticated, service_role;
grant select, insert, update, delete on age_assurance_private.attestations to service_role;
create policy age_attestation_service on age_assurance_private.attestations to service_role using(true) with check(true);

create function age_assurance_private.adult_verified(p_profile uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from age_assurance_private.attestations a
  join public.profiles p on p.id=a.profile_id
  cross join age_assurance_private.rollout r
  where r.singleton and r.enabled and a.profile_id=p_profile
   and a.revoked_at is null and a.verified_at<=now() and a.expires_at>now()
 );
$$;
revoke all on function age_assurance_private.adult_verified(uuid) from public, anon, authenticated, service_role;

-- Caller-only minimum disclosure, also usable for own-data privacy export.
create function public.my_age_assurance() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 return jsonb_build_object('adult_verified',age_assurance_private.adult_verified(auth.uid()));
end;
$$;
revoke all on function public.my_age_assurance() from public, anon, authenticated, service_role;
grant execute on function public.my_age_assurance() to authenticated;

-- Existing geofence, credentials, cooldown, idempotency and rewards stay authoritative.
-- Disabled by default; operator activation requires a real provider and all adapters.
create function age_assurance_private.check_in_guard() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from age_assurance_private.rollout where singleton and enabled) then
  if auth.uid() is null or new.profile_id<>auth.uid()
    or not age_assurance_private.adult_verified(new.profile_id)
    or not public.account_features_allowed() then
   raise exception 'adult verification required' using errcode='42501';
  end if;
 end if;
 return new;
end;
$$;
revoke all on function age_assurance_private.check_in_guard() from public, anon, authenticated, service_role;
create trigger age_assurance_check_in before insert or update of profile_id,state on public.check_ins
for each row execute function age_assurance_private.check_in_guard();

commit;
