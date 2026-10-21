import type { PGlite } from "@electric-sql/pglite";
const owner = "11111111-1111-4111-8111-111111111111",
  admin = "22222222-2222-4222-8222-222222222222",
  other = "33333333-3333-4333-8333-333333333333",
  venue = "44444444-4444-4444-8444-444444444444",
  claim = "55555555-5555-4555-8555-555555555555";

export async function createBusinessFunnelFixture(db: PGlite) {
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema account_private;create schema akibusiness_private;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated,service_role;grant usage on schema akibusiness_private to service_role;
 create table profiles(id uuid primary key,app_role text,birth_year int);
 create table personalisation_settings(profile_id uuid primary key references profiles on delete cascade,analytics_enabled boolean,marketing_enabled boolean,updated_at timestamptz default now());
 create table account_private.onboarding(profile_id uuid primary key references profiles on delete cascade,status text);
 create table venues(id uuid primary key);
 create type analytics_action as enum('venue_view','promotion_requested');
 create table analytics_events(id bigint generated always as identity primary key,action analytics_action,venue_id uuid references venues on delete cascade,profile_id uuid references profiles on delete set null,metadata jsonb default '{}',occurred_at timestamptz default now());
 create table venue_members(venue_id uuid,profile_id uuid,role text);
 create table venue_claims(id uuid primary key,venue_id uuid,claimant_id uuid,status text,decided_by uuid,decided_at timestamptz);
 create table crm_workspaces(id text primary key,owner_profile_id uuid references profiles on delete set null,status text,source_venue_id uuid);
 create table crm_workspace_members(workspace_id text,profile_id uuid references profiles on delete cascade,role text,status text);
 create function account_features_allowed() returns boolean language sql stable security definer as $$select auth.uid() is not null and not exists(select 1 from account_private.onboarding where profile_id=auth.uid() and status<>'complete')$$;
 create function crm_can_access_workspace(w text) returns boolean language sql stable security definer as $$select exists(select 1 from public.crm_workspace_members where workspace_id=w and profile_id=auth.uid() and status='active')$$;
 create function is_venue_member(v uuid) returns boolean language sql stable security definer as $$select exists(select 1 from public.venue_members where venue_id=v and profile_id=auth.uid())$$;
 create table akibusiness_private.operations_checkouts(workspace_id text,profile_id uuid references profiles on delete set null,token uuid,session_id text,state text);
 create table akibusiness_private.operations_subscriptions(subscription_id text,workspace_id text,profile_id uuid references profiles on delete set null);
 create table akibusiness_private.toolboxes(workspace_id text primary key,tier text,billing_status text,paid_until timestamptz,source text,subscription_id text,billing_revision bigint);
 create table akibusiness_private.operations_billing_events(event_id text primary key,subscription_id text,evidence text,processed_at timestamptz default now());
 revoke all on all tables in schema akibusiness_private from public,anon,authenticated;grant all on all tables in schema akibusiness_private to service_role;
 grant insert on crm_workspaces,crm_workspace_members to authenticated;
 create function public.record_fixture_analytics(a analytics_action) returns void language plpgsql security definer set search_path='' as $$begin insert into public.analytics_events(action,profile_id)values(a,auth.uid());end;$$;
 insert into profiles values('${owner}','consumer',1990),('${admin}','administrator',1990),('${other}','consumer',1990);
 insert into personalisation_settings(profile_id,analytics_enabled,marketing_enabled)values('${owner}',true,true),('${other}',true,true);
 insert into venues values('${venue}');
 insert into venue_claims values('${claim}','${venue}','${owner}','pending',null,null);`);
}
