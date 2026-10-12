import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyAction, initialState } from "../src/lib/pals/engine";

const alice = "00000000-0000-4000-8000-000000000021";
const bob = "00000000-0000-4000-8000-000000000022";
const command = "00000000-0000-4000-8000-000000000023";
const db = new PGlite();
const now = Date.UTC(2026, 9, 12, 12);
const context = { now, random: () => 0.2, id: () => crypto.randomUUID() };
const legacy = applyAction(
  initialState(now),
  { type: "adopt", family: "moka", name: "Test Pal" },
  context,
);
delete legacy.journey;
const extended = applyAction(
  legacy,
  { type: "care", activity: "snack" },
  context,
);

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
  `);
  await db.exec(
    readFileSync(
      new URL(
        "../database/migrations/20261003213755_akipals_restricted_preview.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.query(
    "insert into public.pals_states(user_id,state) values ($1,$3),($2,$3)",
    [alice, bob, JSON.stringify(legacy)],
  );
}, 20_000);

afterAll(async () => {
  await db.close();
});

describe("AkiPals SQL persistence compatibility", () => {
  it("lets an authenticated user read only their own save", async () => {
    await db.exec(`begin; set local role authenticated;
      set local request.jwt.claim.sub = '${alice}';`);
    try {
      const result = await db.query<{ user_id: string }>(
        "select user_id from public.pals_states",
      );
      expect(result.rows).toEqual([{ user_id: alice }]);
    } finally {
      await db.exec("rollback");
    }
  });

  it("denies direct authenticated state and reward edits", async () => {
    await db.exec(`begin; set local role authenticated;
      set local request.jwt.claim.sub = '${alice}';`);
    try {
      await expect(
        db.query("update public.pals_states set state=$2 where user_id=$1", [
          alice,
          JSON.stringify(extended),
        ]),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("rollback");
    }
  });

  it("denies direct commit execution to anonymous and authenticated users", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`begin; set local role ${role};`);
      try {
        await expect(
          db.query("select public.pals_commit($1,$2,0,$3)", [
            alice,
            command,
            JSON.stringify(extended),
          ]),
        ).rejects.toThrow(/permission denied/);
      } finally {
        await db.exec("rollback");
      }
    }
  });

  it("persists schema-1 journey progress atomically and replays without a second reward", async () => {
    await db.exec("begin; set local role service_role;");
    try {
      const result = await db.query<{
        saved: { state: typeof extended; version: number; duplicate: boolean };
      }>("select public.pals_commit($1,$2,0,$3) as saved", [
        alice,
        command,
        JSON.stringify(extended),
      ]);
      expect(result.rows[0].saved).toEqual({
        state: extended,
        version: 1,
        duplicate: false,
      });
      const replay = await db.query<{
        saved: { state: typeof extended; version: number; duplicate: boolean };
      }>("select public.pals_commit($1,$2,0,$3) as saved", [
        alice,
        command,
        JSON.stringify({ ...extended, xp: 999999 }),
      ]);
      expect(replay.rows[0].saved).toEqual({
        state: extended,
        version: 1,
        duplicate: true,
      });
      const stale = await db.query<{ saved: null }>(
        "select public.pals_commit($1,$2,0,$3) as saved",
        [alice, crypto.randomUUID(), JSON.stringify(legacy)],
      );
      expect(stale.rows[0].saved).toBeNull();
      const count = await db.query<{ count: number }>(
        "select count(*)::int as count from public.pals_commands where user_id=$1",
        [alice],
      );
      expect(count.rows[0].count).toBe(1);
    } finally {
      await db.exec("rollback");
    }
    const untouched = await db.query<{ version: number }>(
      "select version from public.pals_states where user_id=$1",
      [alice],
    );
    expect(untouched.rows[0].version).toBe(0);
  });
});
