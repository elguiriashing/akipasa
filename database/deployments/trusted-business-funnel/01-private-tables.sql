-- Generated from canonical migrations. DO NOT edit; run node scripts/build-funnel-deployment.mjs.
-- Phase 01: private-tables. No collection activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $funnel_dependency$ begin if not (exists(select 1 from pg_catalog.pg_enum e join pg_catalog.pg_type t on t.oid=e.enumtypid join pg_catalog.pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='analytics_action' and e.enumlabel='suite_business_stage')) then raise exception 'Missing prerequisite for funnel phase 01';end if;end $funnel_dependency$;
create schema suite_funnel_private;
revoke all on schema suite_funnel_private from public,anon,authenticated;
grant usage on schema suite_funnel_private to service_role;
create table suite_funnel_private.settings(singleton boolean primary key default true check(singleton),enabled boolean not null default false,retention_days integer check(retention_days between 1 and 3650),retention_approval_ref text check(length(retention_approval_ref) between 1 and 200),enabled_since timestamptz,capture_failures bigint not null default 0,last_error text check(last_error is null or last_error ~ '^[A-Z0-9]{5}$'),check(not enabled or (retention_days is not null and retention_approval_ref is not null)));
insert into suite_funnel_private.settings(singleton,enabled) values(true,false);
create table suite_funnel_private.stages(
 analytics_id bigint primary key references public.analytics_events(id) on delete cascade deferrable initially deferred,
 stage text not null check(stage in('claim_completed','hq_activated','checkout_started','payment_verified','subscription_upgraded','subscription_cancelled')),
 proof_key text not null check(length(proof_key) between 1 and 512),
 profile_id uuid not null references public.profiles(id) on delete cascade,
 workspace_id text references public.crm_workspaces(id) on delete cascade,
 venue_id uuid references public.venues(id) on delete cascade,
 occurred_at timestamptz not null default now(),consented_at timestamptz not null,
 unique(stage,proof_key),check(workspace_id is not null or venue_id is not null)
);
alter table suite_funnel_private.settings enable row level security;
alter table suite_funnel_private.stages enable row level security;
revoke all on suite_funnel_private.settings,suite_funnel_private.stages from public,anon,authenticated,service_role;
grant select,update on suite_funnel_private.settings to service_role;
grant select on suite_funnel_private.stages to service_role;
create policy suite_funnel_settings_service on suite_funnel_private.settings to service_role using(true) with check(true);
create policy suite_funnel_stages_service on suite_funnel_private.stages for select to service_role using(true);
-- The existing generic analytics RPC must not be able to invent trusted stage rows.
create function suite_funnel_private.protect_analytics() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.action::text='suite_business_stage' and not exists(select 1 from suite_funnel_private.stages s
 where s.analytics_id=new.id and s.venue_id is not distinct from new.venue_id and s.profile_id=new.profile_id
 and new.metadata=jsonb_strip_nulls(jsonb_build_object('stage',s.stage,'workspace_id',s.workspace_id,'product',case when s.stage in('claim_completed','hq_activated') then 'hq' else 'business' end)))
 then raise exception 'Trusted funnel evidence required' using errcode='42501';end if;
 return new;
end $$;
revoke all on function suite_funnel_private.protect_analytics() from public,anon,authenticated,service_role;
create trigger trusted_funnel_analytics before insert or update of action,venue_id,metadata on public.analytics_events for each row execute function suite_funnel_private.protect_analytics();
do $funnel_gate$ begin
 if not exists(select 1 from suite_funnel_private.settings where singleton and not enabled and retention_days is null and retention_approval_ref is null and enabled_since is null)
 then raise exception 'Funnel install requires disabled collection and NULL approval settings';end if;
 if exists(select 1 from suite_funnel_private.stages limit 1) then raise exception 'Funnel install requires an empty optional ledger';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and
  (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute')))
 then raise exception 'Private funnel function permissions are not closed';end if;
end $funnel_gate$;
commit;
