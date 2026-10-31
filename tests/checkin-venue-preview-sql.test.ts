// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";

// Real new SQL + committed eligibility helper and original credential policy in
// disposable PostgreSQL. Minimal schema/JWT transport/old-RPC sentinel only:
// not a canonical migration replay, Supabase Auth/RLS network or physical GPS test.
const name = "20261030163000_add_checkin_venue_preview.sql";
const source = (p: string) => readFileSync(p, "utf8");
const migration = source(`database/migrations/${name}`);
const foundation = source("database/migrations/0002_identity_and_business.sql");
const loyalty = source(
  "database/migrations/0069_product_contract_loyalty_profiles.sql",
);
const helper = source(
  "database/migrations/20261020190818_account_identity_existence_guard.sql",
);
const uid = (n: number) =>
  `98000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const signature = "public.checkin_venue_preview(uuid)";
let db: PGlite;
function fragment(sql: string, start: string, end: string) {
  const a = sql.indexOf(start),
    b = sql.indexOf(end, a);
  if (a < 0 || b < a) throw Error(`Missing committed fragment: ${start}`);
  return sql.slice(a, b + end.length);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create role service_role; create role preview_delegate;",
  );
}, 30000);
afterAll(async () => db?.close());
beforeEach(async () => {
  await db.exec(`reset role; alter default privileges revoke execute on functions from preview_delegate,service_role,anon,authenticated; drop schema if exists public cascade; drop schema if exists auth cascade; drop schema if exists account_private cascade;
    create schema public;create schema auth;create schema account_private;
    grant usage on schema public,auth to anon,authenticated;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
    create type public.app_role as enum('consumer','moderator','administrator');
    create type public.venue_member_role as enum('editor','manager','owner');
    create table public.profiles(id uuid primary key,app_role public.app_role not null default 'consumer');
    create table account_private.onboarding(profile_id uuid primary key,status text not null);
    create table public.venues(id uuid primary key,name text not null,status text not null,private_note text);
    create table public.venue_members(venue_id uuid,profile_id uuid,role public.venue_member_role);
    create table public.check_ins(id int primary key,profile_id uuid);
    create table public.xp_ledger(id int primary key,delta int);
    create table public.loyalty_ledger(id int primary key,delta int);
    create table public.passport_progress(id int primary key);
    insert into profiles(id) values('${uid(1)}'),('${uid(2)}'),('${uid(3)}');
    insert into account_private.onboarding values('${uid(1)}','complete'),('${uid(2)}','pending');
    insert into venues values('${uid(10)}','Published fixture','published','private'),('${uid(11)}','Unpublished fixture','draft','secret');
    insert into check_ins values(1,'${uid(1)}');insert into xp_ledger values(1,10);insert into loyalty_ledger values(1,1);insert into passport_progress values(1);
    create function public.check_in_by_token(uuid,uuid,double precision,double precision,integer) returns jsonb language sql as $$select '{"sentinel":"unchanged"}'::jsonb$$;
  `);
  for (const fn of ["is_venue_member", "has_platform_role"])
    await db.exec(
      fragment(foundation, `create or replace function ${fn}(`, "$$;"),
    );
  await db.exec(
    fragment(loyalty, "create table venue_checkin_credentials(", ");"),
  );
  await db.exec(
    "alter table venue_checkin_credentials enable row level security; grant select,insert,update on venue_checkin_credentials to authenticated;",
  );
  await db.exec(
    fragment(loyalty, "create policy venue_checkin_credentials_manage", ";"),
  );
  await db.exec(`insert into venue_checkin_credentials(id,venue_id,token,active) values
    ('${uid(20)}','${uid(10)}','${uid(30)}',true),('${uid(21)}','${uid(10)}','${uid(31)}',false),('${uid(22)}','${uid(11)}','${uid(32)}',true);`);
  await db.exec(helper);
});
async function actor(id: number | null, sql: string, role = "authenticated") {
  await db.query("select set_config('test.actor',$1,false)", [
    id === null ? "" : uid(id),
  ]);
  await db.exec(`set role ${role}`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role");
  }
}
async function preview(
  id: number | null,
  token = uid(30),
  role = "authenticated",
) {
  return actor(
    id,
    `select * from public.checkin_venue_preview('${token}')`,
    role,
  );
}
async function snapshot() {
  return (
    await db.query(`select jsonb_build_object(
    'credentials',(select jsonb_agg(to_jsonb(c) order by id) from venue_checkin_credentials c),
    'profiles',(select jsonb_agg(to_jsonb(p) order by id) from profiles p),
    'onboarding',(select jsonb_agg(to_jsonb(o) order by profile_id) from account_private.onboarding o),
    'check_ins',(select jsonb_agg(to_jsonb(c)) from check_ins c),
    'xp',(select jsonb_agg(to_jsonb(x)) from xp_ledger x),
    'loyalty',(select jsonb_agg(to_jsonb(x)) from loyalty_ledger x),
    'progress',(select jsonb_agg(to_jsonb(x)) from passport_progress x),
    'policy',(select jsonb_agg(to_jsonb(p)) from pg_policies p where tablename='venue_checkin_credentials'),
    'acl',(select relacl::text from pg_class where oid='public.venue_checkin_credentials'::regclass),
    'old_rpc',pg_get_functiondef('public.check_in_by_token(uuid,uuid,double precision,double precision,integer)'::regprocedure),
    'helper',pg_get_functiondef('public.account_features_allowed()'::regprocedure)) state`)
  ).rows;
}
async function refused() {
  try {
    await db.exec(migration);
    throw Error("Expected migration refusal");
  } catch (error) {
    await db.exec("rollback");
    return error;
  }
}
it("mirrors byte-identical SQL", () =>
  expect(source(`supabase/migrations/${name}`)).toBe(migration));
it("allows eligible and intentionally legacy consumers only the public venue pair", async () => {
  await db.exec(migration);
  for (const id of [1, 3])
    expect((await preview(id)).rows).toEqual([
      { venue_id: uid(10), venue_name: "Published fixture" },
    ]);
  expect(
    (
      await db.query(
        `select p.prosecdef,p.provolatile,p.proconfig from pg_proc p where oid='${signature}'::regprocedure`,
      )
    ).rows,
  ).toEqual([
    { prosecdef: true, provolatile: "s", proconfig: ['search_path=""'] },
  ]);
});
it("denies anon, missing auth, incomplete, deleted identity and NULL guard results", async () => {
  await db.exec(migration);
  await expect(preview(null, uid(30), "anon")).rejects.toThrow(
    /permission denied/,
  );
  for (const id of [null, 2, 99])
    await expect(preview(id)).rejects.toThrow(
      /authentication required|account completion required/,
    );
  await db.exec(
    "create or replace function public.account_features_allowed() returns boolean language sql stable security definer set search_path='' as $$select null::boolean$$;",
  );
  await expect(preview(1)).rejects.toThrow(/account completion required/);
});
it("returns no private credential fields, inactive/unpublished/missing tokens or null tokens", async () => {
  await db.exec(migration);
  for (const token of [uid(31), uid(32), uid(99)])
    expect((await preview(1, token)).rows).toEqual([]);
  expect(
    (await actor(1, "select * from public.checkin_venue_preview(null)")).rows,
  ).toEqual([]);
  expect((await preview(1)).fields.map((x) => x.name)).toEqual([
    "venue_id",
    "venue_name",
  ]);
});
it("keeps ordinary cross-profile credential-table reads denied while preview works", async () => {
  await db.exec(migration);
  for (const id of [1, 3]) {
    expect(
      (await actor(id, "select * from public.venue_checkin_credentials")).rows,
    ).toEqual([]);
    expect((await preview(id)).rows).toHaveLength(1);
  }
});
it("does not mutate attendance, XP, private state, old RPC, policy or table grants; reruns safely", async () => {
  const before = await snapshot();
  await db.exec(migration);
  await preview(1);
  await preview(3);
  await db.exec(migration);
  expect(await snapshot()).toEqual(before);
});
it("refuses missing helper atomically", async () => {
  await db.exec("drop function public.account_features_allowed();");
  expect(String(await refused())).toMatch(/canonical account guard required/);
  expect(
    (
      await db.query(
        "select to_regprocedure('public.checkin_venue_preview(uuid)') result",
      )
    ).rows,
  ).toEqual([{ result: null }]);
});
it("refuses changed helper definition rather than silently trusting permissive eligibility", async () => {
  await db.exec(
    "create or replace function public.account_features_allowed() returns boolean language sql stable security definer set search_path='' as $$select true$$;",
  );
  expect(String(await refused())).toMatch(
    /Known canonical authenticated account guard required/,
  );
});
it("refuses disabled RLS and preserves unsafe preexisting preview atomically", async () => {
  await db.exec(
    "alter table venue_checkin_credentials disable row level security;",
  );
  expect(String(await refused())).toMatch(/credential RLS/);
  await db.exec(
    "alter table venue_checkin_credentials enable row level security; create function public.checkin_venue_preview(uuid) returns table(venue_id uuid,venue_name text) language sql as $$select id,name from public.venues$$;",
  );
  const before = (
    await db.query(
      `select pg_get_functiondef('${signature}'::regprocedure) definition`,
    )
  ).rows;
  expect(String(await refused())).toMatch(/Unknown existing preview/);
  expect(
    (
      await db.query(
        `select pg_get_functiondef('${signature}'::regprocedure) definition`,
      )
    ).rows,
  ).toEqual(before);
});

it("fails atomically when hostile default EXECUTE grants widen the new RPC", async () => {
  await db.exec(
    "alter default privileges grant execute on functions to preview_delegate;",
  );
  const before = await snapshot();
  expect(String(await refused())).toMatch(
    /Safe check-in preview verification failed/,
  );
  expect(
    (
      await db.query(
        "select to_regprocedure('public.checkin_venue_preview(uuid)') result",
      )
    ).rows,
  ).toEqual([{ result: null }]);
  expect(await snapshot()).toEqual(before);
});

it("narrows Supabase-style default anon/auth/service EXECUTE to authenticated and reruns safely", async () => {
  await db.exec(
    "alter default privileges grant execute on functions to anon,authenticated,service_role; alter default privileges grant execute on functions to authenticated with grant option;",
  );
  const before = await snapshot();
  await db.exec(migration);
  expect(
    (
      await db.query(
        "select has_function_privilege('authenticated','public.checkin_venue_preview(uuid)','EXECUTE') auth,has_function_privilege('anon','public.checkin_venue_preview(uuid)','EXECUTE') anon,has_function_privilege('service_role','public.checkin_venue_preview(uuid)','EXECUTE') service",
      )
    ).rows,
  ).toEqual([{ auth: true, anon: false, service: false }]);
  expect(
    (
      await db.query(
        "select is_grantable from aclexplode((select proacl from pg_proc where oid='public.checkin_venue_preview(uuid)'::regprocedure)) where grantee='authenticated'::regrole",
      )
    ).rows,
  ).toEqual([{ is_grantable: false }]);
  await db.exec(migration);
  expect(await snapshot()).toEqual(before);
});
