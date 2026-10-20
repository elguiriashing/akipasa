import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
export const suiteOwner = "10000000-0000-4000-8000-000000000001";
export const suiteOther = "10000000-0000-4000-8000-000000000002";
export const suiteVenue = "20000000-0000-4000-8000-000000000001";
export const suiteVenueTwo = "20000000-0000-4000-8000-000000000002";
export const suiteEvent = "30000000-0000-4000-8000-000000000001";
export async function premiumDatabase(includeSuite = true) {
  const db = new PGlite();
  await db.exec(`
 create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema storage;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 grant usage on schema auth to authenticated,service_role;
 create table profiles(id uuid primary key,app_role text,membership_tier text default 'free');
 create table venues(id uuid primary key,name text,discovery_vertical text default 'venue',status text default 'published',verified boolean default true);
 create table venue_members(venue_id uuid,profile_id uuid,role text);
 create table crm_workspaces(id text primary key,name text,slug text,owner_profile_id uuid,source_venue_id uuid,plan text,status text,seat_limit integer);
 create table crm_workspace_members(workspace_id text,profile_id uuid,role text,status text,role_template_id uuid,primary key(workspace_id,profile_id));
 create table crm_workspace_venues(workspace_id text,venue_id uuid,primary key(workspace_id,venue_id));
 create table crm_workspace_entitlements(workspace_id text,tool_key text,active boolean,source text,starts_at timestamptz default now(),ends_at timestamptz);
 create table crm_tool_catalog(tool_key text primary key,active boolean default true);
 create table crm_role_templates(id uuid,workspace_id text);
 create table crm_role_template_tools(template_id uuid,tool_key text);
 create table billing_customers(profile_id uuid,stripe_customer_id text);
 create table billing_subscriptions(profile_id uuid,plan_code text,status text,current_period_end timestamptz);
 create table staff_billing_grants(profile_id uuid,plan_code text,active boolean,starts_at timestamptz,expires_at timestamptz);
 create table events(id uuid primary key,venue_id uuid,slug text unique,title_es text,title_en text,description_es text,description_en text,category_id uuid,price_cents integer default 0,currency text default 'EUR',source text default 'verified_venue',sponsored boolean default false,booking_url text,status text,created_at timestamptz default now(),updated_at timestamptz default now());
 create table event_occurrences(id uuid primary key,event_id uuid,starts_at timestamptz,ends_at timestamptz,status text,booking_url text);
 create table recurrence_rules(event_id uuid primary key,rrule text,timezone text,generation_horizon_days integer);
 create table venue_media(id uuid primary key,venue_id uuid,storage_path text,alt_es text,alt_en text,mime_type text,size_bytes integer,sort_order integer);
 create table venue_media_placements(venue_id uuid,media_id uuid,placement text default 'event_bin',target_key text default '');
 create table analytics_events(venue_id uuid,occurred_at timestamptz,action text default 'venue_view',event_id uuid);
 create table accommodation_reservations(venue_id uuid,check_in date,check_out date,status text,created_at timestamptz,quoted_total_cents integer);
 create table storage.objects(bucket_id text,name text,metadata jsonb,primary key(bucket_id,name));
 create function public.is_venue_member(target_venue uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from venue_members where venue_id=target_venue and profile_id=auth.uid()) $$;
 create function public.has_free_business_access(p_profile uuid) returns boolean language sql stable set search_path=public as $$ select exists(select 1 from venue_members where profile_id=p_profile) $$;
 alter table storage.objects enable row level security;
 grant usage on schema storage to anon,authenticated;
 grant select,insert,update,delete on storage.objects to authenticated;
 grant select on storage.objects to anon;
 create policy fixture_storage_authenticated on storage.objects to authenticated using(true) with check(true);
 create policy fixture_storage_public_read on storage.objects for select to anon using(true);
 create function public.reconcile_profile_entitlements(p_profile uuid) returns void language plpgsql as $$ begin return; end $$;
 insert into profiles(id,app_role) values('${suiteOwner}','consumer'),('${suiteOther}','consumer');
 insert into venues(id,name) values('${suiteVenue}','Venue one'),('${suiteVenueTwo}','Venue two');
 insert into venue_members values('${suiteVenue}','${suiteOwner}','owner'),('${suiteVenueTwo}','${suiteOwner}','owner');
 insert into crm_workspaces values('ws_one','Workspace one','one','${suiteOwner}','${suiteVenue}','growth','active',4),('ws_two','Workspace two','two','${suiteOther}',null,'growth','active',4);
 insert into crm_workspace_members values('ws_one','${suiteOwner}','owner','active',null),('ws_two','${suiteOther}','owner','active',null);
 insert into crm_workspace_venues values('ws_one','${suiteVenue}'),('ws_one','${suiteVenueTwo}');
 insert into billing_customers values('${suiteOwner}','cus_owner');
 insert into events(id,venue_id,slug,title_es,title_en,description_es,description_en,category_id,status) values('${suiteEvent}','${suiteVenue}','event-one','Poesía en Málaga','Poetry in Malaga','Descripción aprobada','Approved description','40000000-0000-4000-8000-000000000001','published');
 insert into crm_tool_catalog(tool_key) values('dashboard'),('crm'),('tasks'),('calendar'),('employees'),('integrations'),('pos'),('inventory'),('ai-team');
 `);
  const operations = readFileSync(
    "database/migrations/0008_business_operations.sql",
    "utf8",
  );
  const duplicate = operations.match(
    /create or replace function duplicate_owned_event[\s\S]*?\$\$;/,
  )?.[0];
  if (!duplicate) throw new Error("Legacy duplicate RPC not found");
  await db.exec(duplicate);
  await db.exec(
    readFileSync("database/migrations/0014_owned_event_recurrence.sql", "utf8"),
  );
  if (!includeSuite) {
    await db.exec(`select set_config('test.uid','${suiteOwner}',false)`);
    return db;
  }
  await db.exec(
    readFileSync(
      "database/migrations/20261012180000_akisuite_subscription_entitlements.sql",
      "utf8",
    ),
  );
  const premiumSQL = readFileSync(
    "database/migrations/20261012201529_akisuite_premium_workspaces.sql",
    "utf8",
  );
  try {
    await db.exec(premiumSQL);
  } catch (error) {
    const e = error as {
      message: string;
      position?: string;
      internalPosition?: string;
      internalQuery?: string;
    };
    const sql = e.internalQuery || premiumSQL;
    const pos = Number(e.internalPosition || e.position || 0);
    throw new Error(
      `${e.message} at ${pos}: ${sql.slice(Math.max(0, pos - 180), pos + 180)}`,
    );
  }
  await db.exec(`select set_config('test.uid','${suiteOwner}',false)`);
  return db;
}
export async function grantPremium(
  db: PGlite,
  plan: string,
  id = "sub_premium",
) {
  await db.query(
    "select public.sync_akisuite_subscription($1,$2,'cus_owner',$3,'month','active','2040-01-01',false,'2030-01-01','ws_one')",
    [id, suiteOwner, plan],
  );
}
