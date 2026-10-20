import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

let db: PGlite;
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const old = "33333333-3333-4333-8333-333333333333";
async function asUser(id: string) {
  await db.exec(
    `reset role; set request.jwt.claim.sub='${id}'; set role authenticated;`,
  );
}
async function status() {
  return (
    await db.query<{ s: { status: string } }>(
      "select public.my_account_onboarding() s",
    )
  ).rows[0].s.status;
}
async function complete(adult: boolean, username = "username") {
  return db.query<{ s: string }>(
    "select public.complete_account_onboarding($1::boolean,$2,'bio','2026-07-23','en') s",
    [adult, username],
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated;
    create table public.profiles(id uuid primary key,app_role text default 'consumer',created_at timestamptz default now(),username text unique,bio text,preferred_locale text,terms_version text,terms_accepted_at timestamptz,updated_at timestamptz);
    create table public.saved_events(profile_id uuid, event_id uuid);
    grant select,insert on public.saved_events to authenticated;
    insert into profiles(id) values('${old}');`);
  await db.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/20261020170448_account_completion_age_declaration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  // Trusted activation is a service/operator action, not user-submitted metadata.
  await db.exec(`set role service_role; update account_private.onboarding_rollout set starts_at=now()-interval '1 hour',approved_terms_version='2026-07-23'; reset role;
    insert into profiles(id) values('${alice}'),('${bob}');
    create function public.legacy_save() returns void language sql security definer set search_path='' as $$ insert into public.saved_events(profile_id) values(auth.uid()) $$;
    grant execute on function public.legacy_save() to authenticated;`);
});
afterAll(async () => {
  await db.close();
});
describe.sequential("authoritative onboarding cohort and access", () => {
  it("retains existing accounts without collecting a new age declaration", async () => {
    await asUser(old);
    expect(await status()).toBe("exempt");
    expect(
      (
        await db.query<{ a: boolean }>(
          "select public.account_features_allowed() a",
        )
      ).rows[0].a,
    ).toBe(true);
  });
  it("denies private state reads/configuration and rejects anonymous RPC use", async () => {
    await asUser(alice);
    await expect(
      db.query("select * from account_private.onboarding"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query("update account_private.onboarding_rollout set starts_at=null"),
    ).rejects.toThrow(/permission denied/);
    await db.exec("reset role; set role anon");
    await expect(
      db.query("select public.my_account_onboarding()"),
    ).rejects.toThrow(/permission denied/);
  });
  it("blocks direct writes and legacy SECURITY DEFINER mutation bypasses", async () => {
    await asUser(alice);
    expect(await status()).toBe("pending");
    await expect(
      db.query(
        "insert into public.saved_events(profile_id) values(auth.uid())",
      ),
    ).rejects.toThrow(/account completion required/);
    await expect(db.query("select public.legacy_save()")).rejects.toThrow(
      /account completion required/,
    );
  });
  it("requires username and exact approved terms, then completes atomically", async () => {
    await asUser(alice);
    await expect(complete(true, "bad name")).rejects.toThrow(
      /invalid account completion/,
    );
    await expect(
      db.query(
        "select public.complete_account_onboarding(true,'valid',null,'2099-01-01','en')",
      ),
    ).rejects.toThrow(/invalid account completion/);
    expect(await status()).toBe("pending");
    expect((await complete(true, "alex_test")).rows[0].s).toBe("complete");
    expect(await status()).toBe("complete");
    await db.query("select public.legacy_save()");
  });
  it("persists a negative declaration without profile fields, across retries", async () => {
    await asUser(bob);
    await db.query("select public.complete_account_onboarding(false)");
    expect(await status()).toBe("underage");
    expect((await complete(true, "bob_test")).rows[0].s).toBe("underage");
    await asUser(bob);
    expect(await status()).toBe("underage");
    await expect(db.query("select public.legacy_save()")).rejects.toThrow(
      /account completion required/,
    );
  });
  it("keeps one user's completion isolated from another", async () => {
    await asUser(alice);
    expect(await status()).toBe("complete");
    expect(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from public.saved_events",
        )
      ).rows[0].n,
    ).toBe(1);
  });
});
