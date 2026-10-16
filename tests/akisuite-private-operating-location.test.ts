import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";

let db: PGlite;
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
        "create or replace function public.crm_can_manage_workspace",
      ),
      foundation.indexOf(
        "alter table public.crm_workspaces enable row level security",
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
}, 30000);
afterAll(async () => {
  await db?.close();
});

it("denies anonymous, missing identity, unverified and deleted accounts", async () => {
  await actor(null, "anon");
  await expect(create(10)).rejects.toThrow("permission denied");
  await expect(
    db.query("select * from list_managed_operating_locations()"),
  ).rejects.toThrow("permission denied");
  for (const id of [null, 3]) {
    await actor(id);
    await expect(create(10)).rejects.toThrow("verified account required");
    await expect(
      db.query("select * from list_managed_operating_locations()"),
    ).rejects.toThrow("verified account required");
  }
  await db.exec(
    `reset role; update auth.users set deleted_at=now() where id='${uid(3)}'; update auth.users set email_confirmed_at=now() where id='${uid(3)}'`,
  );
  await actor(3);
  await expect(create(10)).rejects.toThrow("verified account required");
  await expect(
    db.query("select * from list_managed_operating_locations()"),
  ).rejects.toThrow("verified account required");
});

it("validates name and request before making rows", async () => {
  await actor(1);
  for (const name of ["", "x", "x".repeat(121), "Bad\nname"]) {
    await expect(create(11, name)).rejects.toThrow("invalid location request");
  }
  await expect(
    db.query("select create_private_operating_location(null,'Valid')"),
  ).rejects.toThrow("invalid location request");
});

it("creates distinct private locations and retries only the exact caller request", async () => {
  await actor(1);
  const first = (await create(20, "  First private  ")).rows[0].id;
  expect((await create(20, "First private")).rows[0].id).toBe(first);
  await expect(create(20, "Changed name")).rejects.toThrow(
    "request already used",
  );
  const second = (await create(21, "Second private")).rows[0].id;
  expect(second).not.toBe(first);
  const owned = await db.query(
    "select source_venue_id,plan,status from crm_workspaces where id=$1",
    [first],
  );
  expect(owned.rows).toHaveLength(0); // Actual operations RLS remains closed.
  const managed = await db.query(
    "select * from list_managed_operating_locations()",
  );
  expect(managed.rows).toContainEqual({
    id: first,
    name: "First private",
    role: "owner",
  });
  expect(
    (
      await db.query(
        "select * from crm_workspace_members where workspace_id=$1",
        [first],
      )
    ).rows,
  ).toHaveLength(0);
  await db.exec("reset role");
  expect(
    (
      await db.query(
        "select source_venue_id,plan,status from crm_workspaces where id=$1",
        [first],
      )
    ).rows,
  ).toEqual([{ source_venue_id: null, plan: "starter", status: "active" }]);
  await actor(2);
  expect(
    (await db.query("select * from crm_workspaces where id=$1", [first])).rows,
  ).toHaveLength(0);
  const other = (await create(20, "First private")).rows[0].id;
  expect(other).not.toBe(first);
  expect(
    (await db.query("select * from list_managed_operating_locations()")).rows,
  ).toEqual([{ id: other, name: "First private", role: "owner" }]);
  await expect(
    db.query("select * from private_operating_location_requests"),
  ).rejects.toThrow("permission denied");
  await expect(
    db.query("update crm_workspaces set owner_profile_id=$1 where id=$2", [
      uid(2),
      first,
    ]),
  ).rejects.toThrow("permission denied");
});

it("does not restore revoked membership or reactivate suspended locations on retry", async () => {
  await actor(1);
  const removed = (await create(30)).rows[0].id;
  await db.exec("reset role");
  await db.query("delete from crm_workspace_members where workspace_id=$1", [
    removed,
  ]);
  await actor(1);
  await expect(create(30)).rejects.toThrow(
    "location ownership no longer available",
  );
  const suspended = (await create(31)).rows[0].id;
  await db.exec("reset role");
  await db.query("update crm_workspaces set status='suspended' where id=$1", [
    suspended,
  ]);
  await actor(1);
  await expect(create(31)).rejects.toThrow(
    "location ownership no longer available",
  );
  const visible = (
    await db.query<{ id: string }>(
      "select * from list_managed_operating_locations()",
    )
  ).rows.map((row) => row.id);
  expect(visible).not.toContain(removed);
  expect(visible).not.toContain(suspended);
});

it("bounds management pagination and exposes metadata only without paid capabilities", async () => {
  await actor(1);
  for (const [limit, offset] of [
    [0, 0],
    [101, 0],
    [1, -1],
    [1, 10001],
  ]) {
    await expect(
      db.query("select * from list_managed_operating_locations($1,$2)", [
        limit,
        offset,
      ]),
    ).rejects.toThrow("invalid location page");
  }
  const first = (
    await db.query<{ id: string; name: string; role: string }>(
      "select * from list_managed_operating_locations(1,0)",
    )
  ).rows;
  const second = (
    await db.query("select * from list_managed_operating_locations(1,1)")
  ).rows;
  expect(first).toHaveLength(1);
  expect(second).toHaveLength(1);
  expect(first).not.toEqual(second);
  expect(Object.keys(first[0]).sort()).toEqual(["id", "name", "role"]);
  expect(
    (await db.query("select * from crm_workspace_entitlements")).rows,
  ).toHaveLength(0);
});

it("preserves legacy venue linkage and grants no tools or listing access", async () => {
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
        "select role,status from crm_workspace_members where workspace_id='legacy-location'",
      )
    ).rows,
  ).toEqual([{ role: "owner", status: "active" }]);
  expect(
    (await db.query("select * from crm_workspace_venues")).rows,
  ).toHaveLength(0);
  expect(
    (await db.query("select * from crm_workspace_entitlements")).rows,
  ).toHaveLength(0);
  expect((await db.query("select * from venues")).rows).toHaveLength(1);
  expect(
    (await db.query("select * from crm_team_channels")).rows.length,
  ).toBeGreaterThan(0);
});

it("does not return a location after its canonical owner changes", async () => {
  await actor(1);
  const changed = (await create(40)).rows[0].id;
  await db.exec("reset role");
  await db.query("update crm_workspaces set owner_profile_id=$1 where id=$2", [
    uid(2),
    changed,
  ]);
  await actor(1);
  await expect(create(40)).rejects.toThrow(
    "location ownership no longer available",
  );
});

it("rolls back the workspace and request if membership creation fails", async () => {
  await db.exec(`reset role;
    create function test_reject_member() returns trigger language plpgsql as $$begin raise exception 'injected membership failure'; end$$;
    create trigger test_reject_member before insert on crm_workspace_members for each row execute function test_reject_member();`);
  const before = (
    await db.query("select count(*)::int as n from crm_workspaces")
  ).rows;
  await actor(1);
  await expect(create(50)).rejects.toThrow("injected membership failure");
  await db.exec(
    "reset role; drop trigger test_reject_member on crm_workspace_members; drop function test_reject_member()",
  );
  expect(
    (await db.query("select count(*)::int as n from crm_workspaces")).rows,
  ).toEqual(before);
  expect(
    (
      await db.query(
        "select * from private_operating_location_requests where request_id=$1",
        [uid(50)],
      )
    ).rows,
  ).toHaveLength(0);
  await actor(1);
  expect((await create(50)).rows[0].id).toMatch(/^private-/);
});

it("preserves historical Pro access without granting operations to a newly private location", async () => {
  await db.exec("reset role");
  await db.query(
    "insert into billing_subscriptions(profile_id,plan_code,status) values($1,'business_pro','active')",
    [uid(1)],
  );
  await db.query("insert into venue_members values($1,$2,'owner')", [
    uid(9),
    uid(1),
  ]);
  await db.exec(
    "insert into crm_tool_catalog(tool_key,name) values('pos','POS'); insert into crm_workspace_entitlements(workspace_id,tool_key) values('legacy-location','pos')",
  );
  await actor(1);
  const privateId = (await create(60)).rows[0].id;
  expect(
    (
      await db.query(
        "select crm_can_access_workspace($1) as access,crm_has_tool($1,'pos') as pos",
        [privateId],
      )
    ).rows,
  ).toEqual([{ access: false, pos: false }]);
  expect(
    (
      await db.query(
        "select crm_can_access_workspace('legacy-location') as access,crm_has_tool('legacy-location','pos') as pos",
      )
    ).rows,
  ).toEqual([{ access: true, pos: true }]);
});
