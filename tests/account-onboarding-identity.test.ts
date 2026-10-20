import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
const name = "20261020190818_account_identity_existence_guard.sql";
const migration = readFileSync(
  new URL("../supabase/migrations/" + name, import.meta.url),
  "utf8",
);
it("mirrors the immutable additive SQL", () =>
  expect(migration).toBe(
    readFileSync(
      new URL("../database/migrations/" + name, import.meta.url),
      "utf8",
    ),
  ));
it("deleted identity JWT loses account eligibility while legitimate legacy and completed profiles retain it", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema account_private;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
 create table auth.users(id uuid primary key);
 create table public.profiles(id uuid primary key references auth.users(id) on delete cascade);
 create table account_private.onboarding(profile_id uuid primary key references public.profiles(id) on delete cascade,status text);
 insert into auth.users values('11111111-1111-4111-8111-111111111111');insert into public.profiles select id from auth.users;
 create function public.account_features_allowed() returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and not exists(select 1 from account_private.onboarding where profile_id=auth.uid() and status<>'complete')$$;
 select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);`);
    const allowed = async () =>
      (
        await db.query<{ allowed: boolean }>(
          "select public.account_features_allowed() as allowed",
        )
      ).rows[0].allowed;
    await db.exec("begin;delete from auth.users");
    expect(await allowed()).toBe(true); // Reproduce the pre-fix stale-JWT hole.
    await db.exec("rollback");
    await db.exec(migration);
    await db.exec("set role authenticated");
    expect(await allowed()).toBe(true); // Legitimate legacy profile, no enrollment.
    await db.exec(
      "reset role;insert into account_private.onboarding select id,'pending' from public.profiles;set role authenticated",
    );
    expect(await allowed()).toBe(false);
    await db.exec(
      "reset role;update account_private.onboarding set status='complete';set role authenticated",
    );
    expect(await allowed()).toBe(true);
    await db.exec(
      "reset role;begin;delete from auth.users;set local role authenticated",
    );
    expect(await allowed()).toBe(false);
    await db.exec("rollback;set role authenticated");
    expect(await allowed()).toBe(true);
    await db.exec(
      "reset role;select set_config('request.jwt.claim.sub','',false);set role authenticated",
    );
    expect(await allowed()).toBe(false);
    await db.exec("reset role");
    const grants = (
      await db.query(
        "select has_function_privilege('anon','public.account_features_allowed()','execute') as anon,has_function_privilege('authenticated','public.account_features_allowed()','execute') as member",
      )
    ).rows[0];
    expect(grants).toEqual({ anon: false, member: true });
  } finally {
    await db.close();
  }
}, 15000);
