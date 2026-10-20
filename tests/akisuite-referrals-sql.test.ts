import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
const migration = readFileSync(
  "database/migrations/20261020170421_shared_referral_foundation.sql",
  "utf8",
);
let db: PGlite;
const owner = "00000000-0000-4000-8000-000000000001",
  rep = "00000000-0000-4000-8000-000000000002",
  customer = "00000000-0000-4000-8000-000000000003",
  other = "00000000-0000-4000-8000-000000000004",
  admin = "00000000-0000-4000-8000-000000000005",
  programme = "00000000-0000-4000-8000-000000000011";
async function as(role: string, id: string, sql: string) {
  await db.exec(
    `set role ${role};select set_config('test.uid','${id}',false);`,
  );
  try {
    return await db.query<Record<string, unknown>>(sql);
  } finally {
    await db.exec("reset role");
  }
}
const capture = (code = "AKIREFER01") =>
  `select public.suite_capture_referral('${code}','akipasa') as ok`;
const invoice = (
  event = "evt_paid1",
  invoice = "in_one",
  amount = 1000,
  kind = "paid",
) =>
  `select public.suite_record_referral_billing('${event}','${kind}','${customer}','cus_test','sub_test',${kind === "paid" ? `'${invoice}'` : "null"},'business',${amount},'eur',now()+interval '1 minute') as ok`;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated;create role service_role;create schema auth;grant usage on schema public,auth to anon,authenticated,service_role;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table public.profiles(id uuid primary key,app_role text default 'consumer');
 create function public.current_app_role() returns text language sql security definer stable as $$select app_role from public.profiles where id=auth.uid()$$;
 create table public.billing_subscriptions(profile_id uuid);create table public.billing_customers(profile_id uuid,stripe_customer_id text);
 insert into profiles(id) values('${owner}'),('${rep}'),('${customer}'),('${other}');insert into profiles values('${admin}','administrator');
 insert into billing_customers values('${customer}','cus_test');`);
  await db.exec(migration);
  await db.exec(`insert into suite_referral_programmes(id,name,programme_type,state,eligible_products) values('${programme}','Public test','public','active',array['business']);
 insert into suite_referral_codes(code,programme_id,owner_profile_id,usage_limit) values('AKIREFER01','${programme}','${owner}',1),('AKIREFER02','${programme}','${rep}',null);
 insert into suite_referral_representatives(profile_id,state) values('${rep}','approved');`);
}, 30000);
afterAll(async () => db?.close());
describe("shared referral RLS and evidence", () => {
  it("denies anonymous and self attribution", async () => {
    await expect(as("anon", "", capture())).rejects.toThrow(
      /permission denied/,
    );
    expect((await as("authenticated", owner, capture())).rows).toEqual([
      { ok: false },
    ]);
  });
  it("captures once, prevents reassignment and enforces serialized usage cap", async () => {
    expect((await as("authenticated", customer, capture())).rows).toEqual([
      { ok: true },
    ]);
    expect(
      (await as("authenticated", customer, capture("AKIREFER02"))).rows,
    ).toEqual([{ ok: false }]);
    expect((await as("authenticated", other, capture())).rows).toEqual([
      { ok: false },
    ]);
  });
  it("cannot forge conversions or edit attribution via browser roles", async () => {
    await expect(as("authenticated", customer, invoice())).rejects.toThrow(
      /permission denied/,
    );
    expect(
      (
        await as(
          "authenticated",
          owner,
          "select * from suite_referral_attributions",
        )
      ).rows,
    ).toEqual([]);
    await expect(
      as(
        "authenticated",
        customer,
        `update suite_referral_attributions set code='AKIREFER02'`,
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("deduplicates by event AND invoice; failed/zero invoices never convert", async () => {
    expect(
      (await as("service_role", "", invoice("evt_zero", "in_zero", 0))).rows,
    ).toEqual([{ ok: false }]);
    expect((await as("service_role", "", invoice())).rows).toEqual([
      { ok: true },
    ]);
    expect((await as("service_role", "", invoice())).rows).toEqual([
      { ok: false },
    ]);
    expect(
      (await as("service_role", "", invoice("evt_duplicate"))).rows,
    ).toEqual([{ ok: false }]);
  });
  it("retains refund and dispute holds without exposing customer identities", async () => {
    expect(
      (
        await as(
          "service_role",
          "",
          invoice("evt_refund", "", 0, "refund_hold"),
        )
      ).rows,
    ).toEqual([{ ok: true }]);
    expect(
      (
        await as(
          "service_role",
          "",
          invoice("evt_dispute", "", 0, "dispute_hold"),
        )
      ).rows,
    ).toEqual([{ ok: true }]);
    expect(
      (
        await as(
          "authenticated",
          owner,
          "select * from suite_referral_billing_events",
        )
      ).rows,
    ).toEqual([]);
    const data = (
      await as(
        "authenticated",
        owner,
        "select suite_referral_dashboard() as data",
      )
    ).rows[0].data as {
      referrals: number;
      conversions: number;
      payouts_enabled: boolean;
    };
    expect(data).toMatchObject({
      referrals: 1,
      conversions: 1,
      payouts_enabled: false,
    });
    expect(JSON.stringify(data)).not.toContain(customer);
  });
  it("isolates representative leads and immediately removes suspended access", async () => {
    await as(
      "authenticated",
      rep,
      `insert into suite_referral_leads(representative_id,business_name) values('${rep}','Own lead')`,
    );
    expect(
      (await as("authenticated", other, "select * from suite_referral_leads"))
        .rows,
    ).toEqual([]);
    await expect(
      as(
        "authenticated",
        other,
        `insert into suite_referral_leads(representative_id,business_name) values('${rep}','Stolen lead')`,
      ),
    ).rejects.toThrow(/row-level security/);
    await db.exec(
      `update suite_referral_representatives set state='suspended' where profile_id='${rep}'`,
    );
    expect(
      (await as("authenticated", rep, "select * from suite_referral_leads"))
        .rows,
    ).toEqual([]);
  });
  it("rejects config changes by non-admins, code reassignment and money activation even by admins", async () => {
    expect(
      (
        await as(
          "authenticated",
          owner,
          `update suite_referral_programmes set state='suspended' where id='${programme}' returning id`,
        )
      ).rows,
    ).toEqual([]);
    await expect(
      as(
        "authenticated",
        admin,
        `update suite_referral_codes set owner_profile_id='${rep}' where code='AKIREFER01'`,
      ),
    ).rejects.toThrow(/immutable/);
    await expect(
      as(
        "authenticated",
        admin,
        `update suite_referral_programmes set payouts_enabled=true where id='${programme}'`,
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it("calculates only explicitly configured prospective rules and freezes the invoice snapshot", async () => {
    expect(
      (
        await db.query(
          "select proposed_commission_cents from suite_referral_billing_events where stripe_event_id='evt_paid1'",
        )
      ).rows,
    ).toEqual([{ proposed_commission_cents: null }]);
    await db.exec(
      `update suite_referral_programmes set commission_percent=10,commission_basis='each_invoice',terms_version='draft-v1' where id='${programme}'`,
    );
    expect(
      (await as("service_role", "", invoice("evt_rule", "in_rule", 1234))).rows,
    ).toEqual([{ ok: true }]);
    expect(
      (
        await db.query(
          "select proposed_commission_cents,eligibility from suite_referral_billing_events where stripe_event_id='evt_rule'",
        )
      ).rows,
    ).toEqual([
      { proposed_commission_cents: 123, eligibility: "held_unapproved" },
    ]);
    await db.exec(
      `update suite_referral_programmes set commission_percent=20 where id='${programme}'`,
    );
    expect(
      (
        await db.query(
          "select rule_snapshot->>'percent' as percent from suite_referral_billing_events where stripe_event_id='evt_rule'",
        )
      ).rows,
    ).toEqual([{ percent: "10.00" }]);
  });
  it("allows eligible public enrolment idempotently and exposes no programme financial settings", async () => {
    const first = (
      await as(
        "authenticated",
        other,
        `select suite_join_referral_programme('${programme}') as code`,
      )
    ).rows[0].code;
    const second = (
      await as(
        "authenticated",
        other,
        `select suite_join_referral_programme('${programme}') as code`,
      )
    ).rows[0].code;
    expect(first).toBe(second);
    expect(first).toMatch(/^[A-Z0-9]{16}$/);
    expect(
      (
        await as(
          "authenticated",
          other,
          "select * from suite_referral_programmes",
        )
      ).rows,
    ).toEqual([]);
    await expect(
      as("anon", "", `select suite_join_referral_programme('${programme}')`),
    ).rejects.toThrow(/permission denied/);
  });
  it("prevents existing subscribers from retroactive attribution and rejects wrong customer mappings", async () => {
    await db.exec(`insert into billing_subscriptions values('${other}')`);
    expect(
      (await as("authenticated", other, capture("AKIREFER02"))).rows,
    ).toEqual([{ ok: false }]);
    await expect(
      as(
        "service_role",
        "",
        invoice("evt_bad", "in_bad").replace("cus_test", "cus_other"),
      ),
    ).rejects.toThrow(/Customer mismatch/);
  });
  it("audit and billing evidence have no browser mutation grants; mirror matches", async () => {
    await expect(
      as("authenticated", admin, "delete from suite_referral_audit"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as(
        "service_role",
        "",
        `update suite_referral_billing_events set amount_paid_cents=999`,
      ),
    ).rejects.toThrow(/permission denied/);
    expect(
      readFileSync(
        "supabase/migrations/20261020170421_shared_referral_foundation.sql",
        "utf8",
      ),
    ).toBe(migration);
  });
});
