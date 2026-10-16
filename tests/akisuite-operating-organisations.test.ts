import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";

let db: PGlite;
let companyA: string, companyB: string, privateA: string, privateB: string;
const uid = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const sql = (name: string) =>
  readFileSync(`database/migrations/${name}`, "utf8");
async function actor(n: number | null, role = "authenticated") {
  await db.exec(
    `reset role; set role ${role}; select set_config('test.uid','${n === null ? "" : uid(n)}',false)`,
  );
}
async function create(n: number, name = "Private location") {
  return db.query<{ id: string }>(
    "select public.create_private_operating_location($1,$2) as id",
    [uid(n), name],
  );
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
    create type public.app_role as enum ('consumer','organiser','moderator','administrator');
    create table profiles(id uuid primary key,app_role public.app_role default 'consumer');
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz,deleted_at timestamptz);
    create table venues(id uuid primary key);
    create table venue_members(venue_id uuid,profile_id uuid,role text);
    create table billing_subscriptions(profile_id uuid,plan_code text,status text,current_period_end timestamptz);
    create table staff_billing_grants(profile_id uuid,plan_code text,active boolean,expires_at timestamptz);
    insert into profiles(id) values('${uid(1)}'),('${uid(2)}'),('${uid(3)}');
    insert into auth.users values('${uid(1)}',now(),null),('${uid(2)}',now(),null),('${uid(3)}',null,null);
    insert into venues values('${uid(9)}');
    grant usage on schema public,auth to anon,authenticated;`);
  // Execute the actual existing canonical table definitions, including constraints.
  const foundation = readFileSync(
    "supabase/migrations/20260902120000_crm_multi_tenant_workspaces.sql",
    "utf8",
  );
  await db.exec(
    foundation.slice(
      foundation.indexOf("create table if not exists public.crm_workspaces"),
      foundation.indexOf(
        "create index if not exists crm_workspace_members_profile_idx",
      ),
    ),
  );
  await db.exec(
    foundation.slice(
      foundation.indexOf(
        "create or replace function public.has_active_entitlement",
      ),
      foundation.indexOf(
        "create or replace function public.reconcile_profile_entitlements",
      ),
    ),
  );
  const access = readFileSync(
    "supabase/migrations/20260903120000_sync_venue_crm_membership.sql",
    "utf8",
  );
  await db.exec(
    access.slice(
      access.indexOf(
        "create or replace function public.crm_can_access_workspace",
      ),
      access.indexOf(
        "create or replace function public.crm_sync_venue_workspace_membership",
      ),
    ),
  );
  await db.exec(
    foundation.slice(
      foundation.indexOf(
        "alter table public.crm_workspaces enable row level security",
      ),
      foundation.indexOf(
        "insert into public.crm_tool_catalog (tool_key,name,description,category,billable,sort_order)",
      ),
    ),
  );
  await db.exec(`insert into crm_workspaces(id,name,slug,owner_profile_id,source_venue_id) values('legacy-location','Legacy location','legacy-location','${uid(1)}','${uid(9)}');
    insert into crm_workspace_members(workspace_id,profile_id,role) values('legacy-location','${uid(1)}','owner');
    create table crm_team_channels(workspace_id text references crm_workspaces(id),id text,name text,description text,primary key(workspace_id,id));`);
  await db.exec(
    readFileSync(
      "supabase/migrations/20260903123000_close_detached_crm_workspaces.sql",
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/20260904143500_seed_new_workspace_chat_channel.sql",
      "utf8",
    ),
  );
  await db.exec(sql("20261016003000_private_operating_location.sql"));
  await db.exec(sql("20261016030000_operating_organisations.sql"));
  await actor(1);
  privateA = (await create(101, "First private")).rows[0].id;
  companyA = (await company(201, "Company A")).rows[0].id;
  await actor(2);
  privateB = (await create(102, "Second private")).rows[0].id;
  companyB = (await company(202, "Company B")).rows[0].id;
  await actor(1);
}, 30000);
afterAll(async () => {
  await db?.close();
});

async function company(request: number, name = "Company") {
  return db.query<{ id: string }>(
    "select create_operating_organisation($1,$2) as id",
    [uid(request), name],
  );
}
async function attach(organisation: string, workspace: string) {
  return db.query("select attach_operating_location($1,$2) as id", [
    organisation,
    workspace,
  ]);
}
async function admin(organisation: string, profile: number, active: boolean) {
  return db.query("select set_operating_organisation_admin($1,$2,$3)", [
    organisation,
    uid(profile),
    active,
  ]);
}

it("migration mirrors are identical and no historical organisations are inferred", async () => {
  expect(sql("20261016030000_operating_organisations.sql")).toBe(
    readFileSync(
      "supabase/migrations/20261016030000_operating_organisations.sql",
      "utf8",
    ),
  );
  await db.exec("reset role");
  expect(
    (
      await db.query(
        "select count(*)::int n from operating_organisation_locations",
      )
    ).rows,
  ).toEqual([{ n: 0 }]);
  expect(
    (
      await db.query(
        "select source_venue_id,status from crm_workspaces where id='legacy-location'",
      )
    ).rows,
  ).toEqual([{ source_venue_id: uid(9), status: "active" }]);
});
it("anonymous, missing, unverified and deleted accounts cannot create or list companies", async () => {
  await actor(null, "anon");
  await expect(company(301)).rejects.toThrow("permission denied");
  for (const id of [null, 3]) {
    await actor(id);
    await expect(company(301)).rejects.toThrow("verified account required");
    await expect(
      db.query("select * from list_operating_organisations()"),
    ).rejects.toThrow("verified account required");
  }
  await db.exec(
    `reset role; update auth.users set email_confirmed_at=now(),deleted_at=now() where id='${uid(3)}'`,
  );
  await actor(3);
  await expect(company(301)).rejects.toThrow("verified account required");
  await db.exec(
    `reset role; update auth.users set email_confirmed_at=null,deleted_at=null where id='${uid(3)}'`,
  );
});
it("create is bounded, caller-idempotent and produces no workspace or entitlement", async () => {
  await actor(1);
  for (const name of ["", "x", "x".repeat(121), "Bad\nname"])
    await expect(company(302, name)).rejects.toThrow("invalid company request");
  const created = (await company(303, "  Same name  ")).rows[0].id;
  expect((await company(303, "Same name")).rows[0].id).toBe(created);
  await expect(company(303, "Different")).rejects.toMatchObject({
    code: "PT409",
  });
  await actor(2);
  expect((await company(303, "Same name")).rows[0].id).not.toBe(created);
  await db.exec("reset role");
  expect(
    (await db.query("select count(*)::int n from crm_workspaces")).rows,
  ).toEqual([{ n: 3 }]);
  expect(
    (await db.query("select count(*)::int n from billing_subscriptions")).rows,
  ).toEqual([{ n: 0 }]);
  expect(
    (await db.query("select count(*)::int n from crm_workspace_entitlements"))
      .rows,
  ).toEqual([{ n: 0 }]);
});
it("RLS and bounded list isolate companies, memberships, mappings and private audit", async () => {
  await actor(1);
  expect(
    (
      await db.query("select id from operating_organisations where id=$1", [
        companyB,
      ])
    ).rows,
  ).toEqual([]);
  expect(
    (
      await db.query(
        "select * from operating_organisation_members where organisation_id=$1",
        [companyB],
      )
    ).rows,
  ).toEqual([]);
  expect(
    (await db.query("select * from list_operating_organisations(1,0)")).rows,
  ).toHaveLength(1);
  for (const args of [
    [0, 0],
    [101, 0],
    [1, -1],
    [1, 10001],
    [null, 0],
  ])
    await expect(
      db.query("select * from list_operating_organisations($1,$2)", args),
    ).rejects.toThrow("invalid company page");
  await expect(
    db.query("select * from list_operating_organisation_locations($1)", [
      companyB,
    ]),
  ).rejects.toThrow("company management required");
  await expect(
    db.query("select * from operating_org_private.events"),
  ).rejects.toThrow("permission denied");
  await expect(
    db.query(
      "insert into operating_organisations(name,owner_profile_id) values('Forged',$1)",
      [uid(1)],
    ),
  ).rejects.toThrow("permission denied");
  await expect(
    db.query("update operating_organisation_members set role='owner'"),
  ).rejects.toThrow("permission denied");
  await expect(
    db.query("delete from operating_organisation_locations"),
  ).rejects.toThrow("permission denied");
});
it("explicit attachment preserves legacy identity, is idempotent and never reassigns", async () => {
  await actor(1);
  expect((await attach(companyA, "legacy-location")).rows).toEqual([
    { id: "legacy-location" },
  ]);
  expect((await attach(companyA, "legacy-location")).rows).toEqual([
    { id: "legacy-location" },
  ]);
  await attach(companyA, privateA);
  const second = (await company(304, "Another own company")).rows[0].id;
  await expect(attach(second, "legacy-location")).rejects.toMatchObject({
    code: "PT409",
  });
  await expect(attach(companyA, privateB)).rejects.toThrow(
    "explicit location ownership required",
  );
  await expect(attach(companyB, privateA)).rejects.toThrow(
    "company management required",
  );
  await db.exec("reset role");
  expect(
    (
      await db.query(
        "select source_venue_id,status from crm_workspaces where id='legacy-location'",
      )
    ).rows,
  ).toEqual([{ source_venue_id: uid(9), status: "active" }]);
  expect(
    (
      await db.query(
        "select count(*)::int n from operating_org_private.events where action='location_attached' and workspace_id='legacy-location'",
      )
    ).rows,
  ).toEqual([{ n: 1 }]);
});
it("company admin has metadata authority but no inherited location or paid access", async () => {
  await actor(1);
  await admin(companyA, 2, true);
  await admin(companyA, 2, true);
  await actor(2);
  const rows = (
    await db.query("select * from list_operating_organisation_locations($1)", [
      companyA,
    ])
  ).rows;
  expect(rows).toContainEqual({
    id: "legacy-location",
    name: "Legacy location",
    role: null,
  });
  expect(
    (await db.query("select * from crm_workspaces where id='legacy-location'"))
      .rows,
  ).toEqual([]);
  expect(
    (
      await db.query(
        "select crm_can_access_workspace('legacy-location') allowed",
      )
    ).rows,
  ).toEqual([{ allowed: false }]);
  await expect(attach(companyA, "legacy-location")).rejects.toThrow(
    "explicit location ownership required",
  );
  await expect(admin(companyA, 3, true)).rejects.toThrow(
    "company owner required",
  );
  // An admin may explicitly attach their OWN separately-authorized location.
  await attach(companyA, privateB);
  await db.exec("reset role");
  expect(
    (
      await db.query(
        "select count(*)::int n from crm_workspace_members where workspace_id='legacy-location'",
      )
    ).rows,
  ).toEqual([{ n: 1 }]);
});
it("revoked admin loses metadata, attach and delegation immediately but keeps independent location rights", async () => {
  await actor(1);
  await admin(companyA, 2, false);
  await admin(companyA, 2, false);
  await actor(2);
  expect(
    (
      await db.query("select id from operating_organisations where id=$1", [
        companyA,
      ])
    ).rows,
  ).toEqual([]);
  expect(
    (
      await db.query(
        "select * from operating_organisation_locations where organisation_id=$1",
        [companyA],
      )
    ).rows,
  ).toEqual([]);
  await expect(
    db.query("select * from list_operating_organisation_locations($1)", [
      companyA,
    ]),
  ).rejects.toThrow("company management required");
  await expect(attach(companyA, privateB)).rejects.toThrow(
    "company management required",
  );
  await expect(admin(companyA, 1, true)).rejects.toThrow(
    "company owner required",
  );
  expect(
    (await db.query("select * from list_managed_operating_locations()")).rows,
  ).toContainEqual({ id: privateB, name: "Second private", role: "owner" });
});
it("explicit assignment cannot infer identity or replace the owner", async () => {
  await actor(1);
  await expect(admin(companyA, 3, true)).rejects.toThrow(
    "verified target account required",
  );
  await expect(admin(companyA, 1, false)).rejects.toThrow(
    "invalid administrator assignment",
  );
  await expect(admin(companyB, 1, true)).rejects.toThrow(
    "company owner required",
  );
});
it("removed location membership blocks attachment even with matching owner column", async () => {
  await db.exec(
    `reset role; delete from crm_workspace_members where workspace_id='legacy-location' and profile_id='${uid(1)}'`,
  );
  await actor(1);
  await expect(attach(companyA, "legacy-location")).rejects.toThrow(
    "explicit location ownership required",
  );
  await db.exec(
    `reset role; insert into crm_workspace_members(workspace_id,profile_id,role) values('legacy-location','${uid(1)}','owner')`,
  );
});
it("suspended company blocks reads, writes and idempotent creation replay", async () => {
  await db.exec("reset role");
  await db.query(
    "update operating_organisations set status='suspended' where id=$1",
    [companyA],
  );
  await actor(1);
  expect(
    (
      await db.query("select * from operating_organisations where id=$1", [
        companyA,
      ])
    ).rows,
  ).toEqual([]);
  await expect(attach(companyA, privateA)).rejects.toThrow(
    "company management required",
  );
  await expect(company(201, "Company A")).rejects.toThrow(
    "company ownership no longer available",
  );
  await db.exec("reset role");
  await db.query(
    "update operating_organisations set status='active' where id=$1",
    [companyA],
  );
});

it("forward write-grant rollback preserves grouping and existing location rows", async () => {
  await db.exec("reset role; begin");
  const before = (
    await db.query(
      "select count(*)::int n from operating_organisation_locations",
    )
  ).rows;
  await db.exec(
    "revoke execute on function public.create_operating_organisation(uuid,text),public.attach_operating_location(uuid,text),public.set_operating_organisation_admin(uuid,uuid,boolean) from authenticated",
  );
  await actor(1);
  await expect(company(999, "Disabled creation")).rejects.toThrow(
    "permission denied",
  );
  // An expected error aborts a PostgreSQL transaction, so recover to inspect by
  // rolling back the grant rehearsal; no application/customer rows were deleted.
  await db.exec("rollback; reset role");
  expect(
    (
      await db.query(
        "select count(*)::int n from operating_organisation_locations",
      )
    ).rows,
  ).toEqual(before);
  expect(
    (
      await db.query(
        "select source_venue_id,status from crm_workspaces where id='legacy-location'",
      )
    ).rows,
  ).toEqual([{ source_venue_id: uid(9), status: "active" }]);
});
