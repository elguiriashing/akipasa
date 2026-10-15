import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";

let db: PGlite;
let privateA: string, privateB: string;
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
  await actor(2);
  privateB = (await create(102, "Second private")).rows[0].id;
  await db.exec("reset role");
  const rental = sql("20261014223000_akiconduzco_rentals.sql");
  await db.exec(
    rental.slice(
      rental.indexOf("create table if not exists public.car_rental_companies"),
      rental.indexOf(
        "create unique index if not exists car_rental_companies_one_per_owner_idx",
      ),
    ),
  );
  const members = sql("20261015220302_independent_rental_branches.sql");
  await db.exec(
    members.slice(
      members.indexOf("create table public.car_rental_company_members"),
      members.indexOf("-- Preserve existing explicit management grants"),
    ),
  );
  await db.exec(`insert into car_rental_companies(id,slug,name,city,address,latitude,longitude,submitted_by) values
    ('${uid(401)}','test-first','Test first','Madrid','Test address',40,-3,'${uid(1)}'),
    ('${uid(402)}','test-second','Test second','Madrid','Test address',40,-3,'${uid(2)}'),
    ('${uid(403)}','test-third','Test third','Madrid','Test address',40,-3,'${uid(2)}');
    insert into car_rental_company_members(company_id,profile_id,role) values('${uid(402)}','${uid(1)}','manager'),('${uid(403)}','${uid(1)}','owner');`);
  await db.exec(sql("20261016040000_rental_operating_location.sql"));
  await actor(1);
}, 30000);
afterAll(async () => {
  await db?.close();
});

async function link(branch: number, workspace: string) {
  return db.query("select attach_rental_operating_location($1,$2) id", [
    uid(branch),
    workspace,
  ]);
}
it("rental migration mirror matches and no automatic branch mapping occurs", async () => {
  expect(sql("20261016040000_rental_operating_location.sql")).toBe(
    readFileSync(
      "supabase/migrations/20261016040000_rental_operating_location.sql",
      "utf8",
    ),
  );
  await actor(1);
  expect(
    (await db.query("select * from rental_operating_location_links")).rows,
  ).toEqual([]);
});
it("only a verified branch owner and explicit workspace owner may link", async () => {
  await actor(null, "anon");
  await expect(link(401, privateA)).rejects.toThrow("permission denied");
  await actor(3);
  await expect(link(401, privateA)).rejects.toThrow(
    "verified account required",
  );
  await actor(2);
  await expect(link(401, privateB)).rejects.toThrow(
    "rental branch ownership required",
  );
  await actor(1);
  await expect(link(402, privateA)).rejects.toThrow(
    "rental branch ownership required",
  ); // manager only
  await expect(link(401, privateB)).rejects.toThrow(
    "explicit location ownership required",
  );
  expect((await link(401, privateA)).rows).toEqual([{ id: privateA }]);
  expect((await link(403, privateA)).rows).toEqual([{ id: privateA }]); // explicit independent branch owner
});
it("attachment retries preserve exact IDs and forbid reassignment", async () => {
  await actor(1);
  expect((await link(401, privateA)).rows).toEqual([{ id: privateA }]);
  await expect(link(401, "legacy-location")).rejects.toMatchObject({
    code: "PT409",
  });
  await db.exec("reset role");
  expect(
    (
      await db.query(
        "select count(*)::int n from rental_operating_location_links where company_id=$1",
        [uid(401)],
      )
    ).rows,
  ).toEqual([{ n: 1 }]);
  expect(
    (await db.query("select count(*)::int n from crm_workspace_entitlements"))
      .rows,
  ).toEqual([{ n: 0 }]);
  expect(
    (
      await db.query(
        "select source_venue_id,status from crm_workspaces where id='legacy-location'",
      )
    ).rows,
  ).toEqual([{ source_venue_id: uid(9), status: "active" }]);
});
it("private relation RLS excludes other tenants and all direct writes", async () => {
  await actor(2);
  expect(
    (await db.query("select * from rental_operating_location_links")).rows,
  ).toEqual([]);
  await actor(1);
  expect(
    (
      await db.query(
        "select company_id from rental_operating_location_links order by company_id",
      )
    ).rows,
  ).toEqual([{ company_id: uid(401) }, { company_id: uid(403) }]);
  await expect(
    db.query(
      "update rental_operating_location_links set workspace_id='legacy-location'",
    ),
  ).rejects.toThrow("permission denied");
  await expect(
    db.query("delete from rental_operating_location_links"),
  ).rejects.toThrow("permission denied");
  await actor(null, "anon");
  await expect(
    db.query("select * from rental_operating_location_links"),
  ).rejects.toThrow("permission denied");
});
it("a legacy nullable submitter never bypasses explicit branch ownership", async () => {
  await db.exec(`reset role;
    alter table car_rental_companies alter column submitted_by drop not null;
    insert into car_rental_companies(id,slug,name,city,address,latitude,longitude,submitted_by)
      values('${uid(404)}','test-orphan','Test orphan','Madrid','Test address',40,-3,null);`);
  await actor(1);
  await expect(link(404, privateA)).rejects.toThrow(
    "rental branch ownership required",
  );
  expect(
    (
      await db.query(
        "select * from rental_operating_location_links where company_id=$1",
        [uid(404)],
      )
    ).rows,
  ).toEqual([]);
  await db.exec(
    `reset role; insert into car_rental_company_members(company_id,profile_id,role) values('${uid(404)}','${uid(1)}','owner')`,
  );
  await actor(1);
  expect((await link(404, privateA)).rows).toEqual([{ id: privateA }]);
});

it("removed branch-owner and location membership revoke private association reads and retries", async () => {
  await db.exec(
    `reset role; delete from car_rental_company_members where company_id='${uid(403)}' and profile_id='${uid(1)}'`,
  );
  await actor(1);
  await expect(link(403, privateA)).rejects.toThrow(
    "rental branch ownership required",
  );
  expect(
    (
      await db.query(
        "select * from rental_operating_location_links where company_id=$1",
        [uid(403)],
      )
    ).rows,
  ).toEqual([]);
  await db.exec("reset role");
  await db.query(
    "delete from crm_workspace_members where workspace_id=$1 and profile_id=$2",
    [privateA, uid(1)],
  );
  await actor(1);
  await expect(link(401, privateA)).rejects.toThrow(
    "explicit location ownership required",
  );
  expect(
    (await db.query("select * from rental_operating_location_links")).rows,
  ).toEqual([]);
});
