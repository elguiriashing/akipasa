import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_APPEARANCE } from "@/lib/pals/avatar-v2";

const alice = "00000000-0000-4000-8000-000000000021";
const bob = "00000000-0000-4000-8000-000000000022";
const db = new PGlite();
const migrationPath = "20261028235830_pals_human_avatar_profiles.sql";
const migration = readFileSync(`database/migrations/${migrationPath}`, "utf8");

beforeAll(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    insert into auth.users(id) values ('${alice}'), ('${bob}');
    create table public.pals_states (user_id uuid primary key, state jsonb);
    insert into public.pals_states values ('${alice}', '{"schema":1,"legacy":"retained"}');
  `);
  // Execute the checked-in SQL, including its DO block, twice. Text assertions
  // alone missed a broken dollar quote while the live migration had different SQL.
  await db.exec(migration);
  await db.exec(migration);
  await db.query(
    "insert into public.pals_avatar_profiles(user_id, appearance) values ($1,$3),($2,$3)",
    [alice, bob, JSON.stringify(DEFAULT_APPEARANCE)],
  );
}, 20_000);
afterAll(async () => {
  await db.close();
});

async function asRole<T>(
  role: "anon" | "authenticated" | "service_role",
  user: string,
  action: () => Promise<T>,
): Promise<T> {
  await db.exec(
    `begin; set local role ${role}; set local request.jwt.claim.sub = '${user}';`,
  );
  try {
    return await action();
  } finally {
    await db.exec("rollback");
  }
}

describe("AkiPals avatar migration and actual RLS", () => {
  it("keeps database/Supabase SQL byte-identical and preserves legacy saves", async () => {
    expect(readFileSync(`supabase/migrations/${migrationPath}`, "utf8")).toBe(
      migration,
    );
    expect(
      (await db.query("select state from public.pals_states")).rows,
    ).toEqual([{ state: { schema: 1, legacy: "retained" } }]);
  });
  it("allows owner read/update while hiding every other account", async () => {
    await asRole("authenticated", alice, async () => {
      expect(
        (await db.query("select user_id from public.pals_avatar_profiles"))
          .rows,
      ).toEqual([{ user_id: alice }]);
      expect(
        (
          await db.query(
            "update public.pals_avatar_profiles set appearance=$2 where user_id=$1 returning user_id",
            [alice, JSON.stringify({ ...DEFAULT_APPEARANCE, hair: "bun" })],
          )
        ).rows,
      ).toEqual([{ user_id: alice }]);
      expect(
        (
          await db.query(
            "update public.pals_avatar_profiles set appearance=$2 where user_id=$1 returning user_id",
            [bob, JSON.stringify(DEFAULT_APPEARANCE)],
          )
        ).rows,
      ).toEqual([]);
    });
  });
  it("denies anonymous avatar reads and writes", async () => {
    for (const query of [
      "select * from public.pals_avatar_profiles",
      "insert into public.pals_avatar_profiles(user_id,appearance) values ('" +
        alice +
        "','{}')",
    ]) {
      await asRole("anon", alice, async () => {
        await expect(db.exec(query)).rejects.toThrow(/permission denied/);
      });
    }
  });
  it("prevents transferring the owner key to another user", async () => {
    await asRole("authenticated", alice, async () => {
      await expect(
        db.query(
          "update public.pals_avatar_profiles set user_id=$1 where user_id=$2",
          [crypto.randomUUID(), alice],
        ),
      ).rejects.toThrow(/row-level security/);
    });
  });
  it("does not allow browser roles to delete avatar rows", async () => {
    await asRole("authenticated", alice, async () => {
      await expect(
        db.exec("delete from public.pals_avatar_profiles"),
      ).rejects.toThrow(/permission denied/);
    });
  });
  it("rejects oversized and non-object storage payloads", async () => {
    for (const appearance of [[], { data: "x".repeat(5000) }]) {
      await asRole("authenticated", alice, async () => {
        await expect(
          db.query(
            "update public.pals_avatar_profiles set appearance=$2 where user_id=$1",
            [alice, JSON.stringify(appearance)],
          ),
        ).rejects.toThrow(/check constraint/);
      });
    }
  });
  it("allows service-only maintenance and cascades deleted account appearance", async () => {
    await asRole("service_role", alice, async () => {
      expect(
        (await db.query("select user_id from public.pals_avatar_profiles"))
          .rows,
      ).toHaveLength(2);
    });
    await db.exec("begin");
    try {
      await db.query("delete from auth.users where id=$1", [alice]);
      expect(
        (await db.query("select user_id from public.pals_avatar_profiles"))
          .rows,
      ).toEqual([{ user_id: bob }]);
    } finally {
      await db.exec("rollback");
    }
  });
});
