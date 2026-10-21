import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
const read = (name: string) =>
  readFileSync(
    new URL("../database/migrations/" + name, import.meta.url),
    "utf8",
  );
const coverage = read(
  "20261020180946_account_completion_database_coverage.sql",
);
const pending = "11111111-1111-4111-8111-111111111111";
const old = "22222222-2222-4222-8222-222222222222";
it("compiles complete deployed referral and venue routine bodies with LF/CRLF tails, retains ACLs and enforces the guard", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated,service_role;
 create type public.venue_member_role as enum('owner','manager','staff');
 create table auth.users(id uuid primary key,email text,deleted_at timestamptz,email_confirmed_at timestamptz);
 create table public.profiles(id uuid primary key,app_role text default 'consumer',created_at timestamptz default now(),username text unique,bio text,preferred_locale text,terms_version text,terms_accepted_at timestamptz,updated_at timestamptz);
 create function public.current_app_role() returns text language sql stable security definer as $$select app_role from public.profiles where id=auth.uid()$$;
 create table public.billing_subscriptions(profile_id uuid);create table public.billing_customers(profile_id uuid,stripe_customer_id text);
 create function public.is_venue_member(uuid,public.venue_member_role[]) returns boolean language sql as $$select false$$;
 create function public.add_venue_member(uuid,uuid,public.venue_member_role) returns void language plpgsql as $$begin return;end$$;
 insert into public.profiles(id,app_role)values('${old}','administrator');`);
    await db.exec(
      read("20261020170448_account_completion_age_declaration.sql"),
    );
    await db.exec(
      `update account_private.onboarding_rollout set starts_at=now()-interval '1 hour',approved_terms_version='2026-07-23';insert into public.profiles(id)values('${pending}');`,
    );
    // These are the entire real migrations, including actual rowtype declarations and bodies.
    await db.exec(read("20261020170421_shared_referral_foundation.sql"));
    await db.exec(read("20261020180654_referral_payout_review.sql"));
    await db.exec(
      read("0087_venue_member_email_invites.sql").replace(/\r?\n/g, "\r\n"),
    );
    const before = (
      await db.query<{
        signature: string;
        prosrc: string;
        proacl: unknown;
        proowner: number;
        prosecdef: boolean;
        provolatile: string;
        proconfig: unknown;
      }>(
        `select p.oid::regprocedure::text signature,p.prosrc,p.proacl,p.proowner,p.prosecdef,p.provolatile,p.proconfig from pg_proc p where p.oid in(to_regprocedure('public.suite_referral_payout_eligibility(text)'),to_regprocedure('public.suite_referral_payout_review_queue()'),to_regprocedure('public.suite_capture_referral(text,text)'),to_regprocedure('public.add_venue_member_by_email(uuid,text,public.venue_member_role)'))`,
      )
    ).rows;
    expect(before).toHaveLength(4);
    expect(
      before.find((r) =>
        r.signature.startsWith("suite_referral_payout_eligibility"),
      )?.prosrc,
    ).toMatch(/end;\n$/);
    expect(
      before.find((r) => r.signature.startsWith("add_venue_member_by_email"))
        ?.prosrc,
    ).toMatch(/end;\r\n$/);
    // Restore the exact old expression to reproduce the hosted 42601 failure first.
    const broken = coverage.replace(
      "'||body||case when body ~ ';[[:space:]]*$' then '' else E'\\n;' end||'",
      "'||rtrim(body)||case when right(rtrim(body),1)=';' then '' else ';' end||'",
    );
    expect(broken).not.toBe(coverage);
    await expect(db.exec(broken)).rejects.toMatchObject({ code: "42601" });
    await db.exec("rollback");
    await db.exec(coverage);
    for (const original of before) {
      const after = (
        await db.query<typeof original>(
          "select p.oid::regprocedure::text signature,p.prosrc,p.proacl,p.proowner,p.prosecdef,p.provolatile,p.proconfig from pg_proc p where p.oid=to_regprocedure($1)",
          [original.signature],
        )
      ).rows[0];
      expect(after.prosrc).toContain(original.prosrc);
      expect({ ...after, prosrc: undefined }).toEqual({
        ...original,
        prosrc: undefined,
      });
    }
    await db.exec(
      `select set_config('test.uid','${pending}',false);set role authenticated`,
    );
    for (const sql of [
      "select suite_referral_payout_eligibility('missing')",
      "select suite_referral_payout_review_queue()",
      `select add_venue_member_by_email('${old}','staff@example.test','staff')`,
    ])
      await expect(db.query(sql)).rejects.toThrow(
        "account completion required",
      );
    await db.exec(
      `reset role;select set_config('test.uid','${old}',false);set role authenticated`,
    );
    expect(
      (await db.query("select suite_referral_payout_review_queue() as queue"))
        .rows[0],
    ).toEqual({ queue: [] });
    await expect(
      db.query("select suite_referral_payout_eligibility('missing')"),
    ).rejects.toThrow("Verified paid invoice evidence required");
    await expect(
      db.query(
        `select add_venue_member_by_email('${old}','staff@example.test','staff')`,
      ),
    ).rejects.toThrow("venue owner required");
  } finally {
    await db.close();
  }
}, 30000);
