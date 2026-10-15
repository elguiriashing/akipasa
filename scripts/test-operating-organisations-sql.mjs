import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postgres from "postgres";

const connection = process.env.TEST_OPERATING_ORGANISATIONS_DATABASE_URL;
if (!connection)
  throw new Error("TEST_OPERATING_ORGANISATIONS_DATABASE_URL required");
const target = new URL(connection);
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
  target.pathname !== "/operating_organisations_test"
) {
  throw new Error(
    "Only a disposable local operating_organisations_test database is allowed",
  );
}
const sql = postgres(connection, { max: 6, onnotice() {} });
const migrator = postgres(connection, { max: 1, onnotice() {} });
const uid = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const read = (name) => readFileSync(name, "utf8");
const actor = (n, action) =>
  sql.begin(async (tx) => {
    await tx`set local role authenticated`;
    await tx`select set_config('test.uid',${uid(n)},true)`;
    return action(tx);
  });
try {
  const tables =
    await sql`select tablename from pg_tables where schemaname='public'`;
  assert.equal(
    tables.length,
    0,
    "Use a new empty disposable database; existing data is never reset.",
  );
  await sql.unsafe(`do $$ begin
    if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
    if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
    if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
  end $$;
  create schema auth;
  create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
  create type public.app_role as enum ('consumer','organiser','moderator','administrator');
  create table profiles(id uuid primary key,app_role public.app_role default 'consumer');
  create table auth.users(id uuid primary key,email_confirmed_at timestamptz,deleted_at timestamptz);
  create table venues(id uuid primary key);
  create table venue_members(venue_id uuid,profile_id uuid,role text);
  create table billing_subscriptions(profile_id uuid,plan_code text,status text,current_period_end timestamptz);
  create table staff_billing_grants(profile_id uuid,plan_code text,active boolean,expires_at timestamptz);
  insert into profiles(id) values('${uid(1)}'),('${uid(2)}');
  insert into auth.users values('${uid(1)}',now(),null),('${uid(2)}',now(),null);
  insert into venues values('${uid(9)}');
  grant usage on schema public,auth to anon,authenticated;`);
  const foundation = read(
    "supabase/migrations/20260902120000_crm_multi_tenant_workspaces.sql",
  );
  const part = (text, start, end) =>
    text.slice(text.indexOf(start), text.indexOf(end));
  await sql.unsafe(
    part(
      foundation,
      "create table if not exists public.crm_workspaces",
      "create index if not exists crm_workspace_members_profile_idx",
    ),
  );
  await sql.unsafe(
    part(
      foundation,
      "create or replace function public.has_active_entitlement",
      "create or replace function public.reconcile_profile_entitlements",
    ),
  );
  const access = read(
    "supabase/migrations/20260903120000_sync_venue_crm_membership.sql",
  );
  await sql.unsafe(
    part(
      access,
      "create or replace function public.crm_can_access_workspace",
      "create or replace function public.crm_sync_venue_workspace_membership",
    ),
  );
  await sql.unsafe(
    part(
      foundation,
      "alter table public.crm_workspaces enable row level security",
      "insert into public.crm_tool_catalog (tool_key,name,description,category,billable,sort_order)",
    ),
  );
  await migrator.unsafe(
    read("database/migrations/20261016003000_private_operating_location.sql"),
  );
  await migrator.unsafe(
    read("database/migrations/20261016030000_operating_organisations.sql"),
  );

  const retries = await Promise.all(
    Array.from({ length: 4 }, () =>
      actor(
        1,
        (tx) =>
          tx`select create_operating_organisation(${uid(101)},'Concurrent company') id`,
      ),
    ),
  );
  assert.equal(new Set(retries.map((rows) => rows[0].id)).size, 1);
  const organisation = retries[0][0].id;
  const [{ id: otherOrganisation }] = await actor(
    1,
    (tx) =>
      tx`select create_operating_organisation(${uid(102)},'Second company') id`,
  );
  const changed = await Promise.allSettled(
    ["First name", "Second name"].map((name) =>
      actor(
        1,
        (tx) =>
          tx`select create_operating_organisation(${uid(103)},${name}) id`,
      ),
    ),
  );
  assert.equal(changed.filter((row) => row.status === "fulfilled").length, 1);
  assert.equal(
    changed.find((row) => row.status === "rejected").reason.code,
    "PT409",
  );
  console.log("PASS concurrent creation retries and conflicting payloads");

  const [{ id: workspace }] = await actor(
    1,
    (tx) =>
      tx`select create_private_operating_location(${uid(201)},'Concurrent location') id`,
  );
  const attached = await Promise.allSettled(
    [organisation, otherOrganisation].map((org) =>
      actor(
        1,
        (tx) => tx`select attach_operating_location(${org},${workspace})`,
      ),
    ),
  );
  assert.equal(attached.filter((row) => row.status === "fulfilled").length, 1);
  assert.equal(
    attached.find((row) => row.status === "rejected").reason.code,
    "PT409",
  );
  const [{ n }] =
    await sql`select count(*)::int n from operating_organisation_locations where workspace_id=${workspace}`;
  assert.equal(n, 1);
  console.log(
    "PASS competing company attachments retain exactly one location association",
  );

  await actor(
    1,
    (tx) =>
      tx`select set_operating_organisation_admin(${organisation},${uid(2)},true)`,
  );
  const [{ id: adminLocation }] = await actor(
    2,
    (tx) =>
      tx`select create_private_operating_location(${uid(202)},'Admin own location') id`,
  );
  let releaseRevocation, signalLocked;
  const locked = new Promise((resolve) => {
    signalLocked = resolve;
  });
  const hold = new Promise((resolve) => {
    releaseRevocation = resolve;
  });
  const revocation = actor(1, async (tx) => {
    await tx`select set_operating_organisation_admin(${organisation},${uid(2)},false)`;
    signalLocked();
    await hold;
  });
  await locked;
  try {
    await assert.rejects(
      actor(2, async (tx) => {
        await tx`set local statement_timeout='500ms'`;
        return tx`select attach_operating_location(${organisation},${adminLocation})`;
      }),
      (error) => error.code === "57014",
    );
  } finally {
    releaseRevocation();
    await revocation;
  }
  await assert.rejects(
    actor(
      2,
      (tx) =>
        tx`select attach_operating_location(${organisation},${adminLocation})`,
    ),
    (error) => error.code === "42501",
  );
  assert.equal(
    (
      await actor(
        2,
        (tx) =>
          tx`select * from operating_organisations where id=${organisation}`,
      )
    ).length,
    0,
  );
  assert.equal(
    (
      await sql`select * from operating_organisation_locations where workspace_id=${adminLocation}`
    ).length,
    0,
  );
  console.log(
    "PASS in-flight administrator revocation serializes attachment and removes metadata authority",
  );
  assert.equal((await sql`select * from crm_workspace_entitlements`).length, 0);
  assert.equal((await sql`select * from billing_subscriptions`).length, 0);
  console.log("PASS no operational entitlement or subscription grant");
  const rental = read(
    "database/migrations/20261014223000_akiconduzco_rentals.sql",
  );
  await sql.unsafe(
    part(
      rental,
      "create table if not exists public.car_rental_companies",
      "create unique index if not exists car_rental_companies_one_per_owner_idx",
    ),
  );
  const rentalMembers = read(
    "database/migrations/20261015220302_independent_rental_branches.sql",
  );
  await sql.unsafe(
    part(
      rentalMembers,
      "create table public.car_rental_company_members",
      "-- Preserve existing explicit management grants",
    ),
  );
  await sql.unsafe(`insert into car_rental_companies(id,slug,name,city,address,latitude,longitude,submitted_by)
    values('${uid(401)}','test-concurrent','Test branch','Madrid','Test address',40,-3,'${uid(1)}');`);
  await migrator.unsafe(
    read("database/migrations/20261016040000_rental_operating_location.sql"),
  );
  const [{ id: secondWorkspace }] = await actor(
    1,
    (tx) =>
      tx`select create_private_operating_location(${uid(203)},'Second own location') id`,
  );
  const rentalLinks = await Promise.allSettled(
    [workspace, secondWorkspace].map((location) =>
      actor(
        1,
        (tx) =>
          tx`select attach_rental_operating_location(${uid(401)},${location})`,
      ),
    ),
  );
  assert.equal(
    rentalLinks.filter((row) => row.status === "fulfilled").length,
    1,
  );
  assert.equal(
    rentalLinks.find((row) => row.status === "rejected").reason.code,
    "PT409",
  );
  assert.equal(
    (await sql`select * from rental_operating_location_links`).length,
    1,
  );
  assert.equal(
    (await actor(2, (tx) => tx`select * from rental_operating_location_links`))
      .length,
    0,
  );
  console.log(
    "PASS concurrent rental branch attachments retain exactly one private association",
  );
  await sql.unsafe(`alter table car_rental_companies alter column submitted_by drop not null;
    insert into car_rental_companies(id,slug,name,city,address,latitude,longitude,submitted_by)
      values('${uid(404)}','test-orphan','Test orphan','Madrid','Test address',40,-3,null);`);
  await assert.rejects(
    actor(
      1,
      (tx) =>
        tx`select attach_rental_operating_location(${uid(404)},${workspace})`,
    ),
    (error) => error.code === "42501",
  );
  await sql`insert into car_rental_company_members(company_id,profile_id,role) values(${uid(404)},${uid(1)},'owner')`;
  const explicitOwner = await actor(
    1,
    (tx) =>
      tx`select attach_rental_operating_location(${uid(404)},${workspace}) id`,
  );
  assert.equal(explicitOwner[0].id, workspace);
  console.log(
    "PASS nullable legacy submitter requires explicit independent owner membership",
  );
} finally {
  await sql.end();
  await migrator.end();
}
