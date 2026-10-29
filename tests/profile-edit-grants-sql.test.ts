// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";

// Actual PostgreSQL ACL/RLS execution on a scoped source fixture. This does not
// reproduce all Supabase services, migrations or the deployed database.
const source = (path: string) => readFileSync(path, "utf8");
const foundation = source("database/migrations/0002_identity_and_business.sql");
const profileContract = source(
  "database/migrations/0069_product_contract_loyalty_profiles.sql",
);
const billing = source("database/migrations/0033_premium_entitlements.sql");
const filename = "20261029231041_restore_existing_profile_edit_columns.sql";
const migration = source(`database/migrations/${filename}`);
const owner = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
const columns = [
  "username",
  "avatar_url",
  "banner_url",
  "bio",
  "public_email",
  "phone",
  "website_url",
  "instagram_url",
  "locality",
  "province",
  "birth_year",
  "gender",
  "profile_visibility",
  "contact_visibility",
  "attendance_visibility",
] as const;
let db: PGlite;

function extract(sql: string, pattern: RegExp) {
  const match = sql.match(pattern);
  if (!match) throw new Error(`Missing canonical source fragment: ${pattern}`);
  return match[0];
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec("create role anon; create role authenticated;");
}, 30000);
afterAll(async () => db?.close());
beforeEach(async () => {
  await db.exec(`
    reset role;
    drop schema if exists public cascade;
    drop schema if exists auth cascade;
    create schema public;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('test.actor', true), '')::uuid
    $$;
    grant usage on schema public, auth to anon, authenticated;
  `);
  await db.exec(extract(foundation, /create type app_role[^;]+;/));
  await db.exec(extract(foundation, /create table profiles \([\s\S]*?\n\);/));
  await db.exec(extract(profileContract, /alter table profiles[\s\S]*?;/));
  await db.exec(
    extract(
      foundation,
      /create or replace function current_app_role\([\s\S]*?\$\$;/,
    ),
  );
  await db.exec(
    extract(
      foundation,
      /create or replace function has_platform_role\([\s\S]*?\$\$;/,
    ),
  );
  await db.exec(`alter table profiles enable row level security;
    grant select, update on profiles to anon, authenticated;
    insert into auth.users values ('${owner}'),('${other}');
    insert into profiles(id,display_name,app_role,terms_version)
      values ('${owner}','Original owner','consumer','original-terms'),
             ('${other}','Original other','consumer','original-terms');`);
  await db.exec(extract(foundation, /create policy profiles_read_self[^;]+;/));
  await db.exec(
    extract(foundation, /create policy profiles_update_self[^;]+;/),
  );
  await db.exec(
    extract(billing, /revoke update on profiles[\s\S]*?grant update[^;]+;/),
  );
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

async function privileges(role: string) {
  return (
    await db.query<{ column: string; allowed: boolean }>(`
    select a.attname as column,
      has_column_privilege('${role}','public.profiles',a.attname,'UPDATE') as allowed
    from pg_attribute a where a.attrelid='public.profiles'::regclass
      and a.attnum>0 and not a.attisdropped order by a.attnum
  `)
  ).rows;
}

it("keeps both migration trees byte-identical", () => {
  expect(source(`supabase/migrations/${filename}`)).toBe(migration);
});

it.each([
  "avatar_url",
  "banner_url",
  "locality",
  "province",
  "website_url",
  "instagram_url",
])(
  "rejects existing %s writes before the restoration and permits only the owner afterwards",
  async (column) => {
    const update = `update profiles set ${column}='https://example.test/synthetic' where id='${owner}' returning id`;
    await expect(actor("authenticated", owner, update)).rejects.toMatchObject({
      code: "42501",
    });
    await db.exec(migration);
    expect((await actor("authenticated", owner, update)).rows).toEqual([
      { id: owner },
    ]);
    expect((await actor("authenticated", other, update)).rows).toEqual([]);
    expect(
      (
        await db.query(
          `select ${column} as value from profiles where id='${owner}'`,
        )
      ).rows,
    ).toEqual([{ value: "https://example.test/synthetic" }]);
  },
);

it("restores exactly the existing editable columns and preserves name/locale grants idempotently", async () => {
  await db.exec("grant update(avatar_url) on profiles to authenticated");
  await db.exec(migration);
  const first = await privileges("authenticated");
  expect(
    first
      .filter((column) => column.allowed)
      .map((column) => column.column)
      .sort(),
  ).toEqual(["display_name", "preferred_locale", ...columns].sort());
  expect((await privileges("anon")).some((column) => column.allowed)).toBe(
    false,
  );
  await db.exec(migration);
  expect(await privileges("authenticated")).toEqual(first);
  expect(
    (
      await actor(
        "authenticated",
        owner,
        `update profiles set display_name='Renamed',preferred_locale='en' where id='${owner}' returning display_name,preferred_locale`,
      )
    ).rows,
  ).toEqual([{ display_name: "Renamed", preferred_locale: "en" }]);
});

it.each([
  ["app_role", "'administrator'"],
  ["terms_version", "'new-terms'"],
  ["id", `'${other}'::uuid`],
])("still denies changing protected %s", async (column, value) => {
  await db.exec(migration);
  await expect(
    actor(
      "authenticated",
      owner,
      `update profiles set ${column}=${value} where id='${owner}'`,
    ),
  ).rejects.toMatchObject({ code: "42501" });
});

it("denies every anonymous UPDATE and rolls back owner writes normally", async () => {
  await db.exec(migration);
  await expect(
    actor(
      "anon",
      "",
      `update profiles set avatar_url='https://example.test/anon'`,
    ),
  ).rejects.toMatchObject({ code: "42501" });
  await db.exec("begin");
  await actor(
    "authenticated",
    owner,
    `update profiles set avatar_url='https://example.test/temporary' where id='${owner}'`,
  );
  await db.exec("rollback");
  expect(
    (await db.query(`select avatar_url from profiles where id='${owner}'`))
      .rows,
  ).toEqual([{ avatar_url: null }]);
});

it.each([
  ["disabled RLS", "alter table profiles disable row level security"],
  [
    "changed ownership check",
    "drop policy profiles_update_self on profiles; create policy profiles_update_self on profiles for update using(true) with check(true)",
  ],
  [
    "wrong policy role",
    "alter policy profiles_update_self on profiles to anon",
  ],
  [
    "restrictive canonical policy",
    "drop policy profiles_update_self on profiles; " +
      extract(foundation, /create policy profiles_update_self[^;]+;/).replace(
        "for update",
        "as restrictive for update",
      ),
  ],
  [
    "additional permissive writer",
    "create policy unexpected_writer on profiles for update to authenticated using(true) with check(true)",
  ],
  [
    "additional ALL policy",
    "create policy unexpected_all on profiles for all to authenticated using(true) with check(true)",
  ],
  [
    "broad authenticated table ACL",
    "grant update on profiles to authenticated",
  ],
  ["anonymous column ACL", "grant update(avatar_url) on profiles to anon"],
])("fails closed without partial grants for %s", async (_case, setup) => {
  await db.exec(setup);
  const before = await privileges("authenticated");
  await expect(db.exec(migration)).rejects.toThrow();
  await db.exec("rollback");
  expect(await privileges("authenticated")).toEqual(before);
});

it("rolls back the whole migration if a required editable column is absent", async () => {
  await db.exec("alter table profiles drop column attendance_visibility");
  const before = await privileges("authenticated");
  await expect(db.exec(migration)).rejects.toMatchObject({ code: "42703" });
  await db.exec("rollback");
  expect(await privileges("authenticated")).toEqual(before);
});
