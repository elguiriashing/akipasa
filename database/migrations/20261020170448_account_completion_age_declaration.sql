begin;

-- Disabled until every app consumes the shared contract and legal wording is approved.
-- Neither user_metadata nor client timestamps authorize a cohort exemption.
create schema if not exists account_private;
revoke all on schema account_private from public, anon, authenticated;
grant usage on schema account_private to service_role;
create table account_private.onboarding_rollout (
 singleton boolean primary key default true check(singleton), starts_at timestamptz,
 approved_terms_version text check(approved_terms_version is null or approved_terms_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
);
insert into account_private.onboarding_rollout(singleton) values(true);
create table account_private.onboarding (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','complete','underage')),
 enrolled_at timestamptz not null default now(), declared_at timestamptz, completed_at timestamptz, terms_version text,
 check((status='pending' and declared_at is null and completed_at is null)
   or (status='underage' and declared_at is not null and completed_at is null)
   or (status='complete' and declared_at is not null and completed_at is not null and terms_version is not null))
);
alter table account_private.onboarding_rollout enable row level security;
alter table account_private.onboarding enable row level security;
revoke all on account_private.onboarding_rollout, account_private.onboarding from public, anon, authenticated;
grant select, update on account_private.onboarding_rollout to service_role;
grant select on account_private.onboarding to service_role;
create policy onboarding_rollout_service on account_private.onboarding_rollout to service_role using(true) with check(true);
create policy onboarding_service_read on account_private.onboarding for select to service_role using(true);

create function account_private.enrol_account() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.app_role::text='consumer' and exists(select 1 from account_private.onboarding_rollout r
   where r.singleton and r.starts_at is not null and r.approved_terms_version is not null and new.created_at>=r.starts_at) then
   insert into account_private.onboarding(profile_id) values(new.id) on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function account_private.enrol_account() from public,anon,authenticated;
create trigger profiles_enrol_account after insert on public.profiles for each row execute function account_private.enrol_account();

create function public.my_account_onboarding() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 select jsonb_build_object('status',o.status,'enrolled_at',o.enrolled_at,'declared_at',o.declared_at,'completed_at',o.completed_at,'terms_version',o.terms_version) into result from account_private.onboarding o where o.profile_id=auth.uid();
 return coalesce(result,jsonb_build_object('status','exempt'));
end $$;
revoke all on function public.my_account_onboarding() from public,anon;
grant execute on function public.my_account_onboarding() to authenticated;

create function public.complete_account_onboarding(p_adult boolean,p_username text default null,p_bio text default null,
 p_terms_version text default null,p_locale text default 'es') returns text
language plpgsql security definer set search_path='' as $$
declare state text; approved_version text;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 select o.status into state from account_private.onboarding o where o.profile_id=auth.uid() for update;
 if state is null then return 'exempt'; end if;
 -- Terminal declarations prevent retrying on another client or session.
 if state in ('underage','complete') then return state; end if;
 if p_adult is false then
   update account_private.onboarding set status='underage',declared_at=now() where profile_id=auth.uid();
   return 'underage';
 end if;
 select approved_terms_version into approved_version from account_private.onboarding_rollout where singleton;
 if p_adult is distinct from true or p_username is null or trim(p_username) !~ '^[a-zA-Z0-9_]{3,30}$'
   or coalesce(char_length(p_bio),0)>2000 or p_locale not in ('es','en')
   or approved_version is null or p_terms_version is distinct from approved_version then
   raise exception 'invalid account completion' using errcode='22023';
 end if;
 update public.profiles set username=trim(p_username),bio=nullif(trim(p_bio),''),preferred_locale=p_locale,
   terms_version=approved_version,terms_accepted_at=now(),updated_at=now() where id=auth.uid();
 update account_private.onboarding set status='complete',declared_at=now(),completed_at=now(),terms_version=approved_version where profile_id=auth.uid();
 return 'complete';
end $$;
revoke all on function public.complete_account_onboarding(boolean,text,text,text,text) from public,anon;
grant execute on function public.complete_account_onboarding(boolean,text,text,text,text) to authenticated;

-- Shared SQL guard takes no arbitrary profile ID and retains existing accounts.
create function public.account_features_allowed() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not exists(select 1 from account_private.onboarding o where o.profile_id=auth.uid() and o.status<>'complete')
$$;
revoke all on function public.account_features_allowed() from public,anon;
grant execute on function public.account_features_allowed() to authenticated;
create function account_private.guard_account_mutation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and not public.account_features_allowed() then
   raise exception 'account completion required' using errcode='42501';
 end if;
 return null;
end $$;
revoke all on function account_private.guard_account_mutation() from public,anon,authenticated;

-- These guards cover legacy SECURITY DEFINER writes as well as direct API writes.
-- Terms, privacy withdrawal, deletion requests and profile completion stay usable.
do $$
declare table_name text;
begin
 foreach table_name in array array['saved_events','saved_event_refs','followed_venues','followed_venue_refs',
   'recent_event_views','recent_event_view_refs','user_event_preferences','event_submissions','venue_claims',
   'check_ins','loyalty_ledger','xp_ledger','passport_progress','reward_redemptions','booking_requests',
   'accommodation_reservations','car_rental_bookings'] loop
   if to_regclass('public.'||table_name) is not null then
     execute format('create trigger account_completion_guard before insert or update or delete on public.%I for each statement execute function account_private.guard_account_mutation()',table_name);
   end if;
 end loop;
end $$;
commit;
