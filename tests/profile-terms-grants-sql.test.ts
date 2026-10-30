// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";

// Scoped real PostgreSQL semantics, not a complete Supabase/production replay.
const source = (path: string) => readFileSync(path, "utf8");
const foundation = source("database/migrations/0002_identity_and_business.sql");
const profileContract = source(
  "database/migrations/0069_product_contract_loyalty_profiles.sql",
);
const filename = "20261029232451_protect_profile_terms_acceptance_columns.sql";
const migration = source(`database/migrations/${filename}`);
const owner = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
let db: PGlite;

function extract(sql: string, pattern: RegExp) {
  const match = sql.match(pattern);
  if (!match) throw new Error(`Missing canonical source fragment: ${pattern}`);
  return match[0];
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create role terms_delegate; create role terms_edit_group;",
  );
}, 30000);
afterAll(async () => db?.close());
beforeEach(async () => {
  await db.exec(`reset role;
    revoke terms_edit_group from authenticated, anon;
    drop schema if exists public cascade;
    drop schema if exists auth cascade;
    create schema public;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('test.actor', true), '')::uuid
    $$;
    grant usage on schema public,auth to anon,authenticated,terms_delegate;
  `);
  await db.exec(extract(foundation, /create type app_role[^;]+;/));
  await db.exec(extract(foundation, /create table profiles \([\s\S]*?\n\);/));
  await db.exec(extract(profileContract, /alter table profiles[\s\S]*?;/));
  for (const name of ["current_app_role", "has_platform_role"])
    await db.exec(
      extract(
        foundation,
        new RegExp(`create or replace function ${name}\\([\\s\\S]*?\\$\\$;`),
      ),
    );
  await db.exec(`alter table profiles enable row level security;
    grant select,update on profiles to anon,authenticated;
    insert into auth.users values ('${owner}'),('${other}');
    insert into profiles(id,display_name,app_role,terms_version,terms_accepted_at)
    values ('${owner}','Original owner','consumer',null,null),
           ('${other}','Original other','consumer','2000-01-01','2000-01-01T00:00:00Z');`);
  for (const name of ["profiles_read_self", "profiles_update_self"])
    await db.exec(
      extract(foundation, new RegExp(`create policy ${name}[^;]+;`)),
    );
  // Execute the complete original acceptance RPC, consistency constraint and ACL.
  await db.exec(
    source("database/migrations/0022_terms_acceptance_versioning.sql"),
  );
  await db.exec(
    extract(
      source("database/migrations/0033_premium_entitlements.sql"),
      /revoke update on profiles[\s\S]*?grant update[^;]+;/,
    ),
  );
  // Reproduce observed existing editor privileges and terms drift only inside
  // this fixture. No dependency on the separate source-replay grant repair.
  await db.exec(`grant update(
    username,avatar_url,banner_url,bio,public_email,phone,website_url,
    instagram_url,locality,province,birth_year,gender,profile_visibility,
    contact_visibility,attendance_visibility,terms_version,terms_accepted_at
  ) on profiles to authenticated`);
});

async function actor(role: "anon" | "authenticated", id: string, sql: string) {
  await db.query("select set_config('test.actor',$1,false)", [id]);
  await db.exec(`set role ${role}`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role");
  }
}
async function rows() {
  return (
    await db.query("select to_jsonb(p) as profile from profiles p order by id")
  ).rows;
}
async function acl() {
  return (
    await db.query<{ attname: string; attacl: string | null }>(
      `select attname,attacl::text from pg_attribute where attrelid='public.profiles'::regclass and attnum>0 and not attisdropped order by attnum`,
    )
  ).rows;
}

it("keeps the mirrored migration bytes identical", () => {
  expect(source(`supabase/migrations/${filename}`)).toBe(migration);
});

it("preserves the original acceptance RPC definition, owner, execution ACL and owner policy", async () => {
  const metadata = async () =>
    (
      await db.query(`
    select p.proowner,p.prosecdef,p.proacl::text,
      pg_get_functiondef(p.oid) as definition,
      (select jsonb_agg(jsonb_build_object('name',polname,'roles',polroles,
        'using',pg_get_expr(polqual,polrelid),'check',pg_get_expr(polwithcheck,polrelid)) order by polname)
        from pg_policy where polrelid='public.profiles'::regclass) as policies
    from pg_proc p where p.oid='public.accept_current_terms(text,text)'::regprocedure
  `)
    ).rows;
  const before = await metadata();
  await db.exec(migration);
  expect(await metadata()).toEqual(before);
});

it("demonstrates the old direct-forgery path and removes it without rewriting stored acceptance", async () => {
  await actor(
    "authenticated",
    owner,
    `update profiles set terms_version='2026-07-23',terms_accepted_at='1999-01-01' where id='${owner}'`,
  );
  const before = await rows();
  await db.exec(migration);
  expect(await rows()).toEqual(before);
  await expect(
    actor(
      "authenticated",
      owner,
      `update profiles set terms_version='2099-01-01',terms_accepted_at='2099-01-01' where id='${owner}'`,
    ),
  ).rejects.toMatchObject({ code: "42501" });
  expect(await rows()).toEqual(before);
});

it.each(["terms_version", "terms_accepted_at"])(
  "denies direct authenticated and anonymous changes to %s",
  async (column) => {
    await db.exec(migration);
    for (const role of ["anon", "authenticated"] as const)
      await expect(
        actor(
          role,
          role === "anon" ? "" : owner,
          `update profiles set ${column}=null where id='${owner}'`,
        ),
      ).rejects.toMatchObject({ code: "42501" });
  },
);

it("preserves every unrelated column grant, owner editing and idempotence", async () => {
  const before = await acl();
  await db.exec(migration);
  const after = await acl();
  expect(
    after.filter(
      (column) =>
        !["terms_version", "terms_accepted_at"].includes(
          String(column.attname),
        ),
    ),
  ).toEqual(
    before.filter(
      (column) =>
        !["terms_version", "terms_accepted_at"].includes(
          String(column.attname),
        ),
    ),
  );
  expect(
    (
      await actor(
        "authenticated",
        owner,
        `update profiles set avatar_url='https://example.test/synthetic',display_name='Edited',preferred_locale='en' where id='${owner}' returning id`,
      )
    ).rows,
  ).toEqual([{ id: owner }]);
  await db.exec(migration);
  expect(await acl()).toEqual(after);
});

it("retains authenticated own acceptance with a server timestamp and does not change another member", async () => {
  const otherBefore = (await rows())[1];
  await db.exec(migration);
  await actor(
    "authenticated",
    owner,
    "select public.accept_current_terms('2026-07-23','en')",
  );
  expect(
    (
      await db.query(
        `select terms_version,preferred_locale,terms_accepted_at >= now()-interval '10 seconds' and terms_accepted_at <= now() as server_stamped from profiles where id='${owner}'`,
      )
    ).rows,
  ).toEqual([
    {
      terms_version: "2026-07-23",
      preferred_locale: "en",
      server_stamped: true,
    },
  ]);
  expect((await rows())[1]).toEqual(otherBefore);
});

it("keeps guest RPC execution denied and rejects a missing identity inside the RPC", async () => {
  await db.exec(migration);
  const before = await rows();
  await expect(
    actor("anon", "", "select public.accept_current_terms('2026-07-23','en')"),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(
    actor(
      "authenticated",
      "",
      "select public.accept_current_terms('2026-07-23','en')",
    ),
  ).rejects.toThrow("authentication required");
  expect(await rows()).toEqual(before);
});

it.each([
  ["missing RPC", "drop function public.accept_current_terms(text,text)"],
  [
    "invoker RPC",
    "alter function public.accept_current_terms(text,text) security invoker",
  ],
  [
    "unprivileged RPC owner",
    "alter function public.accept_current_terms(text,text) owner to terms_delegate",
  ],
  [
    "RPC owner lacking required non-terms privileges",
    "grant update(terms_version,terms_accepted_at),select(id) on profiles to terms_delegate; alter function public.accept_current_terms(text,text) owner to terms_delegate",
  ],
  [
    "missing authenticated execution",
    "revoke execute on function public.accept_current_terms(text,text) from authenticated",
  ],
  [
    "broad authenticated table UPDATE",
    "grant update on profiles to authenticated",
  ],
  ["broad anonymous table UPDATE", "grant update on profiles to anon"],
  [
    "inherited authenticated terms UPDATE",
    "grant update(terms_version,terms_accepted_at) on profiles to terms_edit_group; grant terms_edit_group to authenticated",
  ],
  [
    "inherited anonymous terms UPDATE",
    "grant update(terms_version,terms_accepted_at) on profiles to terms_edit_group; grant terms_edit_group to anon",
  ],
  ["disabled RLS", "alter table profiles disable row level security"],
  [
    "forced RLS without privileged owner bypass",
    "alter table profiles owner to terms_delegate; alter function public.accept_current_terms(text,text) owner to terms_delegate; alter table profiles force row level security",
  ],
])("fails closed without partial revocation for %s", async (_name, setup) => {
  await db.exec(setup);
  const before = await acl();
  const dataBefore = await rows();
  await expect(db.exec(migration)).rejects.toThrow();
  await db.exec("rollback");
  expect(await acl()).toEqual(before);
  expect(await rows()).toEqual(dataBefore);
});
