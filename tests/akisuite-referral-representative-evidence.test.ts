import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, beforeEach, afterEach, it, expect } from "vitest";
let db: PGlite;
let inTransaction = false;
const admin = "00000000-0000-4000-8000-000000000001",
  rep = "00000000-0000-4000-8000-000000000002",
  customer = "00000000-0000-4000-8000-000000000003",
  other = "00000000-0000-4000-8000-000000000004",
  fresh = "00000000-0000-4000-8000-000000000005",
  programme = "00000000-0000-4000-8000-000000000011";
const migration = "20261020234107_referral_representative_evidence.sql";
async function as(role: string, id: string, sql: string) {
  if (inTransaction) await db.exec("savepoint caller_test");
  await db.exec(
    `set role ${role};select set_config('test.uid','${id}',false);`,
  );
  try {
    return await db.query<Record<string, unknown>>(sql);
  } catch (error) {
    if (inTransaction) await db.exec("rollback to savepoint caller_test");
    throw error;
  } finally {
    await db.exec("reset role");
    if (inTransaction) await db.exec("release savepoint caller_test");
  }
}
async function projection(id = rep, days = 90) {
  return (
    await as(
      "authenticated",
      id,
      `select suite_referral_representative_evidence(${days}) as result`,
    )
  ).rows[0].result as {
    subscriptions: Array<{
      invoices: Array<Record<string, unknown>>;
      invoice_count: number;
      invoices_truncated: boolean;
    }>;
    subscriptions_truncated: boolean;
  };
}
const capture = (id = fresh) =>
  as(
    "authenticated",
    id,
    "select suite_capture_referral('AKIREVIEW01','akibusiness') as captured",
  );
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema account_private;grant usage on schema public,auth to anon,authenticated,service_role;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table profiles(id uuid primary key,app_role text default 'consumer');
 create function current_app_role() returns text language sql stable security definer as $$select app_role from public.profiles where id=auth.uid()$$;
 create function account_features_allowed() returns boolean language sql stable as $$select coalesce(current_setting('test.account_allowed',true),'true')<>'false'$$;
 create table billing_subscriptions(profile_id uuid);create table billing_customers(profile_id uuid,stripe_customer_id text);
 insert into profiles values('${admin}','administrator'),('${rep}','consumer'),('${customer}','consumer'),('${other}','consumer'),('${fresh}','consumer');
 insert into billing_customers values('${customer}','cus_private');`);
  for (const name of [
    "20261020170421_shared_referral_foundation.sql",
    "20261020180654_referral_payout_review.sql",
  ])
    await db.exec(readFileSync(`database/migrations/${name}`, "utf8"));
  // Execute the actual deployed RPC-wrapper coverage block; unrelated absent functions safely skip.
  const coverage = readFileSync(
    "database/migrations/20261020180946_account_completion_database_coverage.sql",
    "utf8",
  );
  await db.exec(
    coverage.slice(0, coverage.indexOf("-- SQL permission predicates")) +
      "commit;",
  );
  await db.exec(readFileSync(`database/migrations/${migration}`, "utf8"));
  await db.exec(`insert into suite_referral_programmes(id,name,programme_type,state,eligible_products,commission_fixed_cents,commission_basis,terms_version) values('${programme}','Synthetic rule fixture','representative','active',array['business'],123,'each_invoice','synthetic-test-only');
 insert into suite_referral_representatives(profile_id,state) values('${rep}','approved'),('${other}','approved');
 insert into suite_referral_codes(code,programme_id,owner_profile_id) values('AKIREVIEW01','${programme}','${rep}'),('AKIREVIEW02','${programme}','${other}');`);
  await capture(customer);
  await as(
    "service_role",
    "",
    `select suite_record_referral_billing('evt_private','paid','${customer}','cus_private','sub_private','in_private','business',1000,'eur',now()+interval '1 minute')`,
  );
}, 30000);
afterAll(async () => db?.close());
beforeEach(async () => {
  await db.exec("begin;");
  inTransaction = true;
});
afterEach(async () => {
  inTransaction = false;
  await db.exec(
    "rollback;reset role;select set_config('test.account_allowed','true',false);",
  );
});
it("works without the optional operating schema and retains first attribution immutably", async () => {
  expect((await capture()).rows).toEqual([{ captured: true }]);
  expect(
    (
      await as(
        "authenticated",
        fresh,
        "select suite_capture_referral('AKIREVIEW02','akihq') as captured",
      )
    ).rows,
  ).toEqual([{ captured: false }]);
  expect(
    (
      await db.query(
        `select code from suite_referral_attributions where profile_id='${fresh}'`,
      )
    ).rows,
  ).toEqual([{ code: "AKIREVIEW01" }]);
});
it("excludes any actual bound operating customer without exposing private schema access", async () => {
  await db.exec(
    `create schema akibusiness_private;revoke all on schema akibusiness_private from public,anon,authenticated,service_role;create table akibusiness_private.operations_subscriptions(profile_id uuid,status text);insert into akibusiness_private.operations_subscriptions values('${fresh}','canceled')`,
  );
  expect((await capture()).rows).toEqual([{ captured: false }]);
  await expect(
    as(
      "authenticated",
      fresh,
      "select * from akibusiness_private.operations_subscriptions",
    ),
  ).rejects.toThrow(/permission denied/);
  expect((await capture(customer)).rows).toEqual([{ captured: false }]);
  expect(
    (
      await db.query(
        `select count(*)::int as n from suite_referral_attributions where profile_id='${fresh}'`,
      )
    ).rows,
  ).toEqual([{ n: 0 }]);
});
it("retains legacy and optional public-ledger exclusions", async () => {
  await db.exec(`insert into billing_subscriptions values('${fresh}')`);
  expect((await capture()).rows).toEqual([{ captured: false }]);
  await db.exec(
    `delete from billing_subscriptions;create table akisuite_billing_subscriptions(profile_id uuid);insert into akisuite_billing_subscriptions values('${fresh}')`,
  );
  expect((await capture()).rows).toEqual([{ captured: false }]);
});
it("preserves deployed capture guard and blocks restricted accounts before source reads", async () => {
  await db.exec("select set_config('test.account_allowed','false',false)");
  await expect(capture()).rejects.toThrow(/account completion required/);
  await expect(projection()).rejects.toThrow(/account completion required/);
  await expect(
    as(
      "authenticated",
      admin,
      "select suite_referral_payout_eligibility('evt_private')",
    ),
  ).rejects.toThrow(/account completion required/);
  const source = (
    await db.query<{ prosrc: string }>(
      "select prosrc from pg_proc where oid='suite_capture_referral(text,text)'::regprocedure",
    )
  ).rows[0].prosrc;
  expect(source).toContain("account completion required [coverage-v1]");
  expect(source).toContain("akibusiness_private.operations_subscriptions");
});
it("isolates approved representatives, suspended/pending users and anonymous/service callers", async () => {
  expect((await projection()).subscriptions).toHaveLength(1);
  expect((await projection(other)).subscriptions).toEqual([]);
  await expect(projection(customer)).rejects.toThrow(/Approved representative/);
  for (const state of ["pending", "suspended"]) {
    await db.exec(
      `update suite_referral_representatives set state='${state}' where profile_id='${rep}'`,
    );
    await expect(projection()).rejects.toThrow(/Approved representative/);
  }
  for (const role of ["anon", "service_role"])
    await expect(
      as(role, "", "select suite_referral_representative_evidence()"),
    ).rejects.toThrow(/permission denied/);
  await expect(
    as(
      "authenticated",
      rep,
      "select akisuite_referral_private.invoice_eligibility('evt_private')",
    ),
  ).rejects.toThrow(/permission denied/);
  expect(
    (
      await as(
        "authenticated",
        rep,
        "select * from suite_referral_billing_events",
      )
    ).rows,
  ).toEqual([]);
  expect(
    (
      await as(
        "authenticated",
        rep,
        "select * from suite_referral_payout_reviews",
      )
    ).rows,
  ).toEqual([]);
});
it("returns actual pending commission evidence without customer/provider/review PII or a payable balance", async () => {
  const result = await projection();
  const invoice = result.subscriptions[0].invoices[0];
  expect(invoice).toMatchObject({
    status: "pending",
    review_state: null,
    proposed_cents: 123,
    currency: "eur",
    effective_approval: false,
    payable: false,
    payouts_enabled: false,
    reviews: [],
  });
  const text = JSON.stringify(result);
  for (const value of [
    customer,
    admin,
    "cus_private",
    "sub_private",
    "in_private",
    "evt_private",
    "profile_id",
    "stripe_",
    "approval_reference",
    "reason",
    "evidence_snapshot",
  ])
    expect(text).not.toContain(value);
  expect(invoice.reference).toMatch(/^[a-f0-9]{32}$/);
});
it("shares admin eligibility logic and projects review history, never a paid status", async () => {
  await db.exec(
    "update akisuite_referral_private.review_settings set enabled=true",
  );
  for (const [n, state] of [
    [1, "eligible"],
    [2, "approved"],
  ] as const)
    await as(
      "authenticated",
      admin,
      `select suite_review_referral_payout('evt_private','${state}','Private legal review note','Private approval reference','00000000-0000-4000-9000-00000000000${n}')`,
    );
  const invoice = (await projection()).subscriptions[0].invoices[0];
  expect(invoice).toMatchObject({
    status: "approved",
    review_state: "approved",
    effective_approval: true,
    payable: false,
    payouts_enabled: false,
    reviews: [{ state: "approved" }, { state: "eligible" }],
  });
  expect(JSON.stringify(invoice)).not.toContain("Private");
  const adminInfo = (
    await as(
      "authenticated",
      admin,
      "select suite_referral_payout_eligibility('evt_private') as info",
    )
  ).rows[0].info as Record<string, unknown>;
  expect(invoice.blockers).toEqual(adminInfo.blockers);
  expect(invoice.effective_approval).toEqual(adminInfo.effective_approval);
  await expect(
    as(
      "authenticated",
      rep,
      "select suite_referral_payout_eligibility('evt_private')",
    ),
  ).rejects.toThrow(/Administrator/);
  await expect(
    as(
      "authenticated",
      rep,
      "select suite_review_referral_payout('evt_private','approved','Forged review','Forged reference',gen_random_uuid())",
    ),
  ).rejects.toThrow(/Administrator/);
});
it("reconciles refund and dispute holds dynamically without rewriting historical reviews", async () => {
  await db.exec(
    `insert into suite_referral_payout_reviews(request_id,stripe_event_id,state,reason,approval_reference,actor_id,evidence_snapshot) values(gen_random_uuid(),'evt_private','approved','Synthetic private approval','Synthetic private reference','${admin}','{}');`,
  );
  for (const [n, kind] of [
    [1, "refund_hold"],
    [2, "dispute_hold"],
  ] as const) {
    await as(
      "service_role",
      "",
      `select suite_record_referral_billing('evt_hold${n}','${kind}','${customer}','cus_private','sub_private','in_private','business',0,'eur',now())`,
    );
    const invoice = (await projection()).subscriptions[0].invoices[0];
    expect(invoice).toMatchObject({
      status: "held",
      review_state: "approved",
      effective_approval: false,
      payable: false,
    });
    expect(invoice.blockers).toContain("billing_hold");
  }
  expect(
    (
      await db.query(
        "select count(*)::int as n from suite_referral_payout_reviews",
      )
    ).rows,
  ).toEqual([{ n: 1 }]);
});
it("handles missing rules, suspended codes and unresolved cases as current holds", async () => {
  await db.exec(
    "insert into suite_referral_cases(code,case_type,detail) values('AKIREVIEW01','fraud','Synthetic test case')",
  );
  expect((await projection()).subscriptions[0].invoices[0].blockers).toContain(
    "open_review_case",
  );
  await db.exec(
    "update suite_referral_codes set revoked_at=now() where code='AKIREVIEW01'",
  );
  expect((await projection()).subscriptions[0].invoices[0].blockers).toContain(
    "inactive_programme_or_code",
  );
});
it("bounds periods, subscriptions, invoices and review history with explicit truncation", async () => {
  for (const days of [0, 31, 366])
    await expect(projection(rep, days)).rejects.toThrow(/Invalid period/);
  await db.exec(
    `insert into suite_referral_billing_events(stripe_event_id,event_kind,profile_id,code,stripe_customer_id,stripe_subscription_id,stripe_invoice_id,amount_paid_cents,stripe_created_at) select 'evt_many'||i,'paid','${customer}','AKIREVIEW01','cus_private','sub_many'||i,'in_many'||i,1000,now() from generate_series(1,51)i;`,
  );
  const result = await projection();
  expect(result.subscriptions).toHaveLength(50);
  expect(result.subscriptions_truncated).toBe(true);
  await db.exec(
    `delete from suite_referral_billing_events where stripe_event_id like 'evt_many%';insert into suite_referral_billing_events(stripe_event_id,event_kind,profile_id,code,stripe_customer_id,stripe_subscription_id,stripe_invoice_id,amount_paid_cents,stripe_created_at) select 'evt_many'||i,'paid','${customer}','AKIREVIEW01','cus_private','sub_private','in_many'||i,1000,now() from generate_series(1,12)i;`,
  );
  const item = (await projection()).subscriptions[0];
  expect(item.invoice_count).toBe(13);
  expect(item.invoices).toHaveLength(10);
  expect(item.invoices_truncated).toBe(true);
});
it("retains false financial CHECK constraints, explicit ACLs and byte-identical mirrors", async () => {
  await expect(
    as(
      "authenticated",
      admin,
      `update suite_referral_programmes set payouts_enabled=true where id='${programme}'`,
    ),
  ).rejects.toThrow(/check constraint/);
  expect(readFileSync(`database/migrations/${migration}`, "utf8")).toEqual(
    readFileSync(`supabase/migrations/${migration}`, "utf8"),
  );
  const flags = (
    await db.query(
      "select monetary_enabled,payouts_enabled from suite_referral_programmes",
    )
  ).rows;
  expect(flags).toEqual([{ monetary_enabled: false, payouts_enabled: false }]);
});
