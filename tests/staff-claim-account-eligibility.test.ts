// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";

// Scoped PostgreSQL authorization proof, not a complete production/Supabase replay.
// Eligibility, cohort enrollment/completion, role assignment and RPCs are actual
// committed SQL. Only auth.uid's authenticated JWT transport and base rows are
// synthetic. No network, live Auth, claim decisions, FCM or provider services.
const source = (file: string) => readFileSync(file, "utf8");
const migrationName =
  "20261030114106_protect_staff_claim_account_eligibility.sql";
const migration = source(`database/migrations/${migrationName}`);
const identityFoundation = source(
  "database/migrations/0002_identity_and_business.sql",
);
const moderation = source(
  "database/migrations/0003_community_and_moderation.sql",
);
const roleAssignment = source("database/migrations/0027_admin_user_crm.sql");
const founder = source(
  "database/migrations/20261027001500_founder_push_claims.sql",
);
const onboarding = source(
  "database/migrations/20261020170448_account_completion_age_declaration.sql",
);
const identityGuard = source(
  "database/migrations/20261020190818_account_identity_existence_guard.sql",
);
const coverage = source(
  "database/migrations/20261020180946_account_completion_database_coverage.sql",
);
const claimList = source(
  "database/migrations/20261010231500_venue_claim_details.sql",
);
function block(sql: string, start: string, end = "$$;") {
  const from = sql.indexOf(start);
  const to = sql.indexOf(end, from);
  if (from < 0 || to < from)
    throw new Error(`Missing actual SQL block: ${start}`);
  return sql.slice(from, to + end.length);
}
const originalLookup = founder.slice(
  founder.indexOf(
    "create or replace function public.staff_pending_venue_claim_by_id(",
  ),
  founder.lastIndexOf("commit;"),
);
const platformPredicate = block(
  identityFoundation,
  "create or replace function has_platform_role(",
);
const canonicalRoleAssignment = block(
  roleAssignment,
  "create or replace function set_platform_role(",
);
const moderationTable = block(
  moderation,
  "create table moderation_actions (",
  ");",
);
const uid = (n: number) =>
  `97000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const pendingClaim = uid(40);
const approvedClaim = uid(41);
const rejectedClaim = uid(42);
const lookup = "public.staff_pending_venue_claim_by_id(uuid)";
const helper = "public.account_features_allowed()";
const list = "public.staff_pending_venue_claims(integer)";
let db: PGlite;

async function actor(
  id: number | null,
  sql: string,
  params: unknown[] = [],
  role: "authenticated" | "anon" = "authenticated",
) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id === null ? "" : uid(id),
  ]);
  await db.exec(`set role ${role}`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role");
  }
}
function readClaim(id: number | null, claim = pendingClaim) {
  return actor(id, "select * from public.staff_pending_venue_claim_by_id($1)", [
    claim,
  ]);
}
type FunctionMetadata = {
  oid: number;
  proowner: number;
  prosecdef: boolean;
  provolatile: "i" | "s" | "v";
  proconfig: string[] | null;
  acl: string | null;
  prorettype: number;
  proretset: boolean;
  proallargtypes: number[] | null;
  proargmodes: string[] | null;
  proargnames: string[] | null;
  prosrc: string;
  definition: string;
  body_md5: string;
  definition_md5: string;
};
async function metadata(signature: string) {
  return (
    await db.query<FunctionMetadata>(
      `select p.oid,p.proowner,p.prosecdef,p.provolatile,p.proconfig,
        p.proacl::text acl,p.prorettype,p.proretset,p.proallargtypes,
        p.proargmodes,p.proargnames,p.prosrc,
        pg_get_functiondef(p.oid) definition,
        md5(p.prosrc) body_md5,md5(pg_get_functiondef(p.oid)) definition_md5
       from pg_proc p where p.oid=to_regprocedure($1)`,
      [signature],
    )
  ).rows;
}
async function records() {
  const tables = [
    "auth.users",
    "public.profiles",
    "public.cities",
    "public.venues",
    "public.venue_claims",
    "public.moderation_actions",
    "account_private.onboarding",
    "account_private.onboarding_rollout",
  ];
  return Object.fromEntries(
    await Promise.all(
      tables.map(async (table) => [
        table,
        (
          await db.query(
            `select to_jsonb(r) data from ${table} r order by to_jsonb(r)::text`,
          )
        ).rows,
      ]),
    ),
  );
}
async function snapshot() {
  return {
    records: await records(),
    functions: (
      await db.query(`select n.nspname,p.proname,p.oid,p.proowner,
        p.proacl::text acl,pg_get_functiondef(p.oid) definition
        from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname in('public','account_private','auth')
        order by n.nspname,p.proname,p.oid`)
    ).rows,
    tableGrants: (
      await db.query(`select n.nspname,c.relname,c.relowner,c.relacl::text acl,
        c.relrowsecurity,c.relforcerowsecurity
        from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname in('public','account_private','auth') and c.relkind='r'
        order by n.nspname,c.relname`)
    ).rows,
    policies: (
      await db.query(`select schemaname,tablename,policyname,permissive,roles,
        cmd,qual,with_check from pg_policies
        where schemaname in('public','account_private','auth')
        order by schemaname,tablename,policyname`)
    ).rows,
  };
}
async function migrate() {
  // A failed explicit SQL transaction needs rollback before invariant inspection.
  try {
    return await db.exec(migration);
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create role lookup_delegate;`);
}, 30_000);
afterAll(async () => db?.close());
beforeEach(async () => {
  await db.exec(`reset role;
    select set_config('request.jwt.claim.sub','',false);
    drop schema if exists account_private cascade;
    drop schema if exists public cascade;
    drop schema if exists auth cascade;
    create schema public;create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    grant usage on schema auth,public to authenticated,anon,service_role,lookup_delegate;
    create type public.app_role as enum('consumer','organiser','moderator','administrator');
    create type public.venue_member_role as enum('editor','manager','owner');
    create type public.content_status as enum('draft','published','archived');
    create type public.promotion_state as enum('pending','approved','rejected');
    create table auth.users(id uuid primary key,email text,deleted_at timestamptz,banned_until timestamptz);
    create table public.profiles(id uuid primary key references auth.users(id),
      app_role public.app_role not null default 'consumer',display_name text,phone text,
      created_at timestamptz not null default now(),username text unique,bio text,
      preferred_locale text,terms_version text,terms_accepted_at timestamptz,
      updated_at timestamptz default now());
    create table public.cities(id uuid primary key,timezone text);
    create table public.venues(id uuid primary key,city_id uuid,name text,address text,
      slug text,discovery_vertical text,contact_phone text,website_url text);
    create table public.venue_claims(id uuid primary key,venue_id uuid,claimant_id uuid,
      evidence text,status text,created_at timestamptz default now());
    alter table public.profiles enable row level security;
    alter table public.venues enable row level security;
    alter table public.venue_claims enable row level security;
    revoke all on public.profiles,public.venues,public.venue_claims from public,anon,authenticated;`);
  await db.exec(moderationTable);
  await db.exec(platformPredicate);
  await db.exec(canonicalRoleAssignment);
  await db.exec(`revoke all on function public.set_platform_role(uuid,public.app_role,text)
      from public,anon;
    grant execute on function public.set_platform_role(uuid,public.app_role,text)
      to authenticated;`);
  // Grandfathered staff exist before trusted cohort activation, as in the contract.
  for (const [n, role] of [
    [1, "administrator"],
    [2, "moderator"],
    [20, "consumer"],
  ] as const) {
    await db.query("insert into auth.users(id,email) values($1,$2)", [
      uid(n),
      `synthetic-${n}@example.test`,
    ]);
    await db.query(
      "insert into profiles(id,app_role,display_name,phone) values($1,$2,$3,$4)",
      [uid(n), role, `Synthetic profile ${n}`, "Synthetic phone"],
    );
  }
  // Entire real migrations, not replacements of their eligibility decisions.
  await db.exec(onboarding);
  await db.exec(identityGuard);
  await db.exec(claimList);
  await db.exec(coverage);
  await db.exec(originalLookup);
  await db.exec(`update account_private.onboarding_rollout
    set starts_at=now()-interval '1 hour',approved_terms_version='2026-07-23'`);
  for (const n of [3, 4, 5, 6, 7, 8, 9]) {
    await db.query("insert into auth.users(id,email) values($1,$2)", [
      uid(n),
      `synthetic-${n}@example.test`,
    ]);
    await db.query("insert into profiles(id,display_name) values($1,$2)", [
      uid(n),
      `Synthetic profile ${n}`,
    ]);
  }
  for (const n of [5, 6]) {
    const result = await actor(
      n,
      "select public.complete_account_onboarding(false) status",
    );
    expect(result.rows[0]).toMatchObject({ status: "underage" });
  }
  for (const n of [7, 8]) {
    const result = await actor(
      n,
      "select public.complete_account_onboarding(true,$1,'Synthetic biography','2026-07-23','en') status",
      [`complete_user_${n}`],
    );
    expect(result.rows[0]).toMatchObject({ status: "complete" });
  }
  for (const [n, role] of [
    [3, "moderator"],
    [4, "administrator"],
    [5, "moderator"],
    [6, "administrator"],
    [7, "moderator"],
    [8, "administrator"],
  ] as const) {
    // Reach restricted staff through the actual supported RPC, never role UPDATE.
    await actor(
      1,
      "select public.set_platform_role($1,$2::public.app_role,$3)",
      [uid(n), role, "Synthetic permitted staff assignment"],
    );
  }
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  await db.query("insert into cities(id,timezone) values($1,'Europe/Madrid')", [
    uid(30),
  ]);
  await db.query(
    `insert into venues(id,city_id,name,address,slug,discovery_vertical,
    contact_phone,website_url) values($1,$2,'Synthetic venue','Synthetic address',
    'synthetic-venue','activities','Synthetic venue phone','https://example.test')`,
    [uid(31), uid(30)],
  );
  for (const [n, status] of [
    [40, "pending"],
    [41, "approved"],
    [42, "rejected"],
  ] as const)
    await db.query(
      `insert into venue_claims(id,venue_id,claimant_id,evidence,status,claim_details)
       values($1,$2,$3,'Synthetic evidence for local proof only',$4,
        '{"contact":"Synthetic submitted details"}'::jsonb)`,
      [uid(n), uid(31), uid(20), status],
    );
}, 30_000);

it("keeps the reviewed migration and its mirror byte-identical", () => {
  expect(source(`supabase/migrations/${migrationName}`)).toBe(migration);
  expect(createHash("sha256").update(migration).digest("hex")).toBe(
    "154fe91bf7a8a80d433a0a6c5827f22a90bac1ac3e2de99e95063afea24fa160",
  );
});

it.each([
  [3, "pending", "moderator"],
  [4, "pending", "administrator"],
  [5, "underage", "moderator"],
  [6, "underage", "administrator"],
] as const)(
  "closes the actual old by-ID gap for actor %i (%s %s)",
  async (id, state, role) => {
    expect(
      (await actor(id, "select public.account_features_allowed() allowed"))
        .rows,
    ).toEqual([{ allowed: false }]);
    expect(
      (await actor(id, "select public.my_account_onboarding() state")).rows[0],
    ).toMatchObject({ state: { status: state } });
    const profile = await db.query(
      "select app_role from profiles where id=$1",
      [uid(id)],
    );
    expect(profile.rows).toEqual([{ app_role: role }]);
    await expect(
      actor(id, "select * from public.staff_pending_venue_claims(0)"),
    ).rejects.toMatchObject({ code: "42501" });
    const original = await readClaim(id);
    expect(original.rows).toHaveLength(1);
    expect(original.rows[0]).toMatchObject({
      id: pendingClaim,
      evidence: "Synthetic evidence for local proof only",
      claimant: {
        email: "synthetic-20@example.test",
        phone: "Synthetic phone",
        submission: { contact: "Synthetic submitted details" },
      },
    });
    await migrate();
    await expect(readClaim(id)).rejects.toMatchObject({
      code: "42501",
      message: "account completion required",
    });
    await expect(
      actor(id, "select * from public.staff_pending_venue_claims(0)"),
    ).rejects.toMatchObject({ code: "42501" });
  },
);

it.each([
  [1, "legacy administrator"],
  [2, "legacy moderator"],
  [7, "completed moderator"],
  [8, "completed administrator"],
] as const)("preserves full claim results for %i (%s)", async (id, label) => {
  expect(
    (await actor(id, "select public.account_features_allowed() allowed")).rows,
  ).toEqual([{ allowed: true }]);
  const original = await readClaim(id);
  expect(original.rows, label).toHaveLength(1);
  expect(original.rows[0]).toMatchObject({
    id: pendingClaim,
    claimant_id: uid(20),
    status: "pending",
    total_count: 1,
    venues: {
      name: "Synthetic venue",
      address: "Synthetic address",
      slug: "synthetic-venue",
      discovery_vertical: "activities",
      contact_phone: "Synthetic venue phone",
      website_url: "https://example.test",
      timezone: "Europe/Madrid",
    },
    claimant: {
      display_name: "Synthetic profile 20",
      email: "synthetic-20@example.test",
      phone: "Synthetic phone",
      submission: { contact: "Synthetic submitted details" },
    },
  });
  await migrate();
  expect((await readClaim(id)).rows).toEqual(original.rows);
  expect(
    (await actor(id, "select * from public.staff_pending_venue_claims(0)"))
      .rows,
  ).toHaveLength(1);
});

it.each([
  [null, "missing identity"],
  [9, "pending ordinary consumer"],
  [20, "eligible grandfathered consumer"],
] as const)("retains denial for %s (%s)", async (id, label) => {
  await expect(readClaim(id), label).rejects.toMatchObject({
    code: "42501",
    message: "staff role required",
  });
  await migrate();
  await expect(readClaim(id)).rejects.toMatchObject({
    code: "42501",
    message: "staff role required",
  });
});

it("retains anonymous execute denial", async () => {
  await expect(
    actor(
      null,
      "select * from public.staff_pending_venue_claim_by_id($1)",
      [pendingClaim],
      "anon",
    ),
  ).rejects.toMatchObject({ code: "42501" });
  await migrate();
  await expect(
    actor(
      null,
      "select * from public.staff_pending_venue_claim_by_id($1)",
      [pendingClaim],
      "anon",
    ),
  ).rejects.toMatchObject({ code: "42501" });
});

it("retains denial when a valid synthetic JWT no longer has a Profile", async () => {
  await db.query("delete from profiles where id=$1", [uid(3)]);
  expect(
    (await actor(3, "select public.account_features_allowed() allowed")).rows,
  ).toEqual([{ allowed: false }]);
  await expect(readClaim(3)).rejects.toMatchObject({ code: "42501" });
  await migrate();
  await expect(readClaim(3)).rejects.toMatchObject({ code: "42501" });
});

it.each([approvedClaim, rejectedClaim, uid(99)])(
  "retains the exact pending-claim filter for %s",
  async (claim) => {
    expect((await readClaim(1, claim)).rows).toEqual([]);
    await migrate();
    expect((await readClaim(1, claim)).rows).toEqual([]);
  },
);

it("changes only the target body, retaining owner, stable definer attributes, ACL, shape and all data", async () => {
  const before = (await metadata(lookup))[0];
  expect(before).toMatchObject({
    body_md5: "154545dcdaf45d679cc35adeaf1677b7",
    definition_md5: "c49199892edff53e68364f05507f953d",
  });
  const otherFunctions = [await metadata(helper), await metadata(list)];
  const data = await records();
  await migrate();
  const after = (await metadata(lookup))[0];
  expect(after).toMatchObject({ body_md5: "085d3d37194bf241cb0fd23f92ca2478" });
  for (const key of [
    "oid",
    "proowner",
    "prosecdef",
    "provolatile",
    "proconfig",
    "acl",
    "prorettype",
    "proretset",
    "proallargtypes",
    "proargmodes",
    "proargnames",
  ] as const)
    expect(after[key]).toEqual(before[key]);
  const guard = `  if public.account_features_allowed() is not true then\n    raise exception 'account completion required' using errcode='42501';\n  end if;\n`;
  expect(after.prosrc.replace(guard, "")).toBe(before.prosrc);
  expect([await metadata(helper), await metadata(list)]).toEqual(
    otherFunctions,
  );
  expect(await records()).toEqual(data);
});

it("is idempotent without changing retained definitions, grants, policies or data", async () => {
  await migrate();
  const before = await snapshot();
  await migrate();
  expect(await snapshot()).toEqual(before);
});

it("fails closed on an unexpected NULL from a trusted helper without touching claim records", async () => {
  // Deliberate fault injection only: all normal eligibility tests use actual policy.
  // A trusted future helper fault must never turn SQL NULL into claimant access.
  await db.exec(`create or replace function public.account_features_allowed()
    returns boolean language sql stable security definer set search_path='' as $$
      select null::boolean
    $$;`);
  const data = await records();
  const injected = await metadata(helper);
  await migrate();
  expect(await metadata(helper)).toEqual(injected);
  await expect(readClaim(1)).rejects.toMatchObject({
    code: "42501",
    message: "account completion required",
  });
  expect(await records()).toEqual(data);
});

const driftCases = [
  {
    name: "unknown original body",
    alter: () =>
      db.exec(
        originalLookup.replace(
          "begin\n",
          "begin\n  -- Unreviewed source variant.\n",
        ),
      ),
  },
  { name: "missing target", alter: () => db.exec(`drop function ${lookup}`) },
  {
    name: "missing canonical helper",
    alter: () => db.exec(`drop function ${helper}`),
  },
  {
    name: "untrusted target owner",
    alter: () => db.exec(`alter function ${lookup} owner to lookup_delegate`),
  },
  {
    name: "target loses SECURITY DEFINER",
    alter: () => db.exec(`alter function ${lookup} security invoker`),
  },
  {
    name: "target loses STABLE",
    alter: () => db.exec(`alter function ${lookup} volatile`),
  },
  {
    name: "target loses empty search path",
    alter: () => db.exec(`alter function ${lookup} set search_path=public`),
  },
  {
    name: "target exposes anonymous execution",
    alter: () => db.exec(`grant execute on function ${lookup} to anon`),
  },
  {
    name: "target loses authenticated execution",
    alter: () =>
      db.exec(`revoke execute on function ${lookup} from authenticated`),
  },
  {
    name: "untrusted canonical helper owner",
    alter: () => db.exec(`alter function ${helper} owner to lookup_delegate`),
  },
  {
    name: "canonical helper loses STABLE",
    alter: () => db.exec(`alter function ${helper} volatile`),
  },
  {
    name: "canonical helper has the wrong return type",
    alter: () =>
      db.exec(`drop function ${helper};
      create function public.account_features_allowed() returns integer
      language sql stable security definer set search_path='' as $$select 1$$;
      revoke all on function ${helper} from public,anon;
      grant execute on function ${helper} to authenticated;`),
  },
  {
    name: "canonical helper is set-returning",
    alter: () =>
      db.exec(`drop function ${helper};
      create function public.account_features_allowed() returns setof boolean
      language sql stable security definer set search_path='' as $$select true$$;
      revoke all on function ${helper} from public,anon;
      grant execute on function ${helper} to authenticated;`),
  },
  {
    name: "canonical helper loses SECURITY DEFINER",
    alter: () => db.exec(`alter function ${helper} security invoker`),
  },
  {
    name: "canonical helper loses empty search path",
    alter: () => db.exec(`alter function ${helper} set search_path=public`),
  },
  {
    name: "canonical helper exposes anonymous execution",
    alter: () => db.exec(`grant execute on function ${helper} to anon`),
  },
  {
    name: "canonical helper loses authenticated execution",
    alter: () =>
      db.exec(`revoke execute on function ${helper} from authenticated`),
  },
];
it.each(driftCases)(
  "fails atomically on $name without overwriting the drift",
  async ({ alter }) => {
    await alter();
    const before = await snapshot();
    await expect(migrate()).rejects.toThrow(
      /reconcil|must.*exist|must.*available/,
    );
    expect(await snapshot()).toEqual(before);
  },
);
