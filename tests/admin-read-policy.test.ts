import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
let db: PGlite;
const migration = "20261024013730_admin_read_policy_initplans.sql";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role authenticated; create role anon; create schema auth;
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema auth,public to authenticated,anon;
  create type app_role as enum('user','moderator','administrator');
  create table profiles(id uuid primary key,app_role app_role,allowed boolean);
  insert into profiles values ('00000000-0000-4000-8000-000000000001','administrator',true),
  ('00000000-0000-4000-8000-000000000002','moderator',true),
  ('00000000-0000-4000-8000-000000000003','user',true),
  ('00000000-0000-4000-8000-000000000004','administrator',false);
  create function account_features_allowed() returns boolean language sql stable security definer as $$select coalesce((select allowed from profiles where id=auth.uid()),false)$$;
  create function has_platform_role(allowed_roles app_role[]) returns boolean language sql stable security definer set search_path=public as $$select (auth.uid() is null or public.account_features_allowed()) and coalesce((select exists(select 1 from profiles where id=auth.uid() and app_role=any(allowed_roles))),false)$$;
  create table moderation_actions(id uuid primary key,created_at timestamptz,reason text);
  insert into moderation_actions select ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'2026-10-24'::timestamptz,'fixture' from generate_series(1,20)n;
  alter table moderation_actions enable row level security;
  grant select on moderation_actions to authenticated;
  create policy moderation_actions_operator_read on moderation_actions for select to authenticated using(has_platform_role(array['administrator']::app_role[]));`);
  await db.exec(readFileSync(`database/migrations/${migration}`, "utf8"));
});
afterAll(async () => db?.close());
describe("bounded admin audit reads", () => {
  it.each([
    [1, 5],
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
  ])("preserves identity and eligibility for caller %s", async (n, count) => {
    await db.exec(
      `begin;set local role authenticated;set local request.jwt.claim.sub='00000000-0000-4000-8000-${String(n).padStart(12, "0")}';`,
    );
    try {
      const r = await db.query(
        "select id from moderation_actions order by created_at desc,id desc limit 5",
      );
      expect(r.rows).toHaveLength(count);
    } finally {
      await db.exec("rollback");
    }
  });
  it("uses the recent index and a statement-level role check", async () => {
    const r = await db.query<{ qual: string }>(
      "select qual from pg_policies where policyname='moderation_actions_operator_read'",
    );
    expect(r.rows[0].qual).toMatch(/SELECT has_platform_role/);
    const indexes = await db.query(
      "select 1 from pg_indexes where indexname='moderation_actions_recent_idx'",
    );
    expect(indexes.rows).toHaveLength(1);
  });
  it("keeps anonymous reads and authenticated writes denied", async () => {
    for (const [role, sql] of [
      ["anon", "select * from moderation_actions"],
      ["authenticated", "delete from moderation_actions"],
    ]) {
      await db.exec(`begin;set local role ${role};`);
      try {
        await expect(db.exec(sql)).rejects.toThrow(/permission denied/);
      } finally {
        await db.exec("rollback");
      }
    }
  });
  it("refuses an unexpected policy instead of widening access", async () => {
    await db.exec(
      "begin;alter policy moderation_actions_operator_read on moderation_actions using(false)",
    );
    try {
      await expect(
        db.exec(readFileSync(`database/migrations/${migration}`, "utf8")),
      ).rejects.toThrow(/Unexpected moderation/);
    } finally {
      await db.exec("rollback");
    }
  });
  it("keeps the two migration copies identical", () => {
    expect(readFileSync(`database/migrations/${migration}`, "utf8")).toBe(
      readFileSync(`supabase/migrations/${migration}`, "utf8"),
    );
  });
});
