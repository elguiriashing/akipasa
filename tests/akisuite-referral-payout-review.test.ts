import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
const admin = "00000000-0000-4000-8000-000000000001",
  rep = "00000000-0000-4000-8000-000000000002",
  customer = "00000000-0000-4000-8000-000000000003",
  other = "00000000-0000-4000-8000-000000000004",
  programme = "00000000-0000-4000-8000-000000000011";
const amendment = "20261020180654_referral_payout_review.sql";
const request = (n: number) =>
  `00000000-0000-4000-9000-${String(n).padStart(12, "0")}`;
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
const review = (state: string, n: number, event = "evt_review") =>
  `select suite_review_referral_payout('${event}','${state}','Administrator evidence review','Approved document reference','${request(n)}') as id`;
const eligibility = (event = "evt_review") =>
  `select suite_referral_payout_eligibility('${event}') as info`;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;grant usage on schema public,auth to anon,authenticated,service_role;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table profiles(id uuid primary key,app_role text default 'consumer');
 create function current_app_role() returns text language sql stable security definer as $$select app_role from public.profiles where id=auth.uid()$$;
 create table billing_subscriptions(profile_id uuid);create table billing_customers(profile_id uuid,stripe_customer_id text);
 insert into profiles values('${admin}','administrator'),('${rep}','consumer'),('${customer}','consumer'),('${other}','consumer');
 insert into billing_customers values('${customer}','cus_review');`);
  await db.exec(
    readFileSync(
      "database/migrations/20261020170421_shared_referral_foundation.sql",
      "utf8",
    ),
  );
  await db.exec(readFileSync(`database/migrations/${amendment}`, "utf8"));
  await db.exec(`insert into suite_referral_programmes(id,name,programme_type,state,eligible_products,commission_fixed_cents,commission_basis,terms_version) values('${programme}','Review fixture','representative','active',array['business'],123,'each_invoice','test-only-unapproved-v1');
 insert into suite_referral_representatives(profile_id,state) values('${rep}','approved');
 insert into suite_referral_codes(code,programme_id,owner_profile_id) values('AKIREVIEW01','${programme}','${rep}');`);
  await as(
    "authenticated",
    customer,
    `select suite_capture_referral('AKIREVIEW01','akipasa')`,
  );
  await as(
    "service_role",
    "",
    `select suite_record_referral_billing('evt_review','paid','${customer}','cus_review','sub_review','in_review','business',1000,'eur',now()+interval '1 minute');`,
  );
}, 30000);
afterAll(async () => db?.close());
it("defaults review gate closed and cannot enable actual monetary flags even as administrator", async () => {
  await expect(
    as("authenticated", admin, review("eligible", 1)),
  ).rejects.toThrow(/not activated/);
  await expect(
    as(
      "authenticated",
      admin,
      `update suite_referral_programmes set payouts_enabled=true where id='${programme}'`,
    ),
  ).rejects.toThrow(/check constraint/);
  await expect(
    as(
      "authenticated",
      admin,
      `update suite_referral_programmes set monetary_enabled=true where id='${programme}'`,
    ),
  ).rejects.toThrow(/check constraint/);
  await db.exec(
    "update akisuite_referral_private.review_settings set enabled=true",
  );
});
it("requires admin for eligibility, queue and decisions and isolates raw review reads from representatives", async () => {
  for (const actor of [
    rep,
    other,
    customer,
    "00000000-0000-4000-8000-000000000099",
  ]) {
    await expect(as("authenticated", actor, eligibility())).rejects.toThrow(
      /Administrator/,
    );
    await expect(
      as("authenticated", actor, review("eligible", 2)),
    ).rejects.toThrow(/Administrator/);
    await expect(
      as("authenticated", actor, "select suite_referral_payout_review_queue()"),
    ).rejects.toThrow(/Administrator/);
  }
  await expect(
    as(
      "authenticated",
      rep,
      "select nextval('suite_referral_payout_reviews_revision_seq')",
    ),
  ).rejects.toThrow(/permission denied/);
  await expect(as("anon", "", review("eligible", 2))).rejects.toThrow(
    /permission denied/,
  );
  await expect(as("service_role", "", review("eligible", 2))).rejects.toThrow(
    /permission denied/,
  );
});
it("requires verified paid invoice and prospective snapshot; no amount or attribution can be supplied", async () => {
  await expect(
    as("authenticated", admin, eligibility("evt_forged")),
  ).rejects.toThrow(/Verified paid/);
  await db.exec(
    `update suite_referral_programmes set commission_fixed_cents=null where id='${programme}'`,
  );
  await as(
    "service_role",
    "",
    `select suite_record_referral_billing('evt_norule','paid','${customer}','cus_review','sub_review','in_norule','business',1000,'eur',now()+interval '1 minute')`,
  );
  await expect(
    as("authenticated", admin, review("eligible", 3, "evt_norule")),
  ).rejects.toThrow(/blockers/);
  await db.exec(
    `update suite_referral_programmes set commission_fixed_cents=123 where id='${programme}'`,
  );
});
it("requires eligibility then document-backed approval; retries append once and snapshots remain immutable", async () => {
  await expect(
    as("authenticated", admin, review("approved", 4)),
  ).rejects.toThrow(/eligibility review/);
  const first = await as("authenticated", admin, review("eligible", 5));
  expect(
    (await as("authenticated", admin, review("eligible", 5))).rows,
  ).toEqual(first.rows);
  await expect(as("authenticated", admin, review("held", 5))).rejects.toThrow(
    /cannot be reused/,
  );
  await expect(
    as(
      "authenticated",
      admin,
      review("approved", 6).replace("Approved document reference", ""),
    ),
  ).rejects.toThrow(/Invalid review/);
  await as("authenticated", admin, review("approved", 6));
  const info = (await as("authenticated", admin, eligibility())).rows[0].info;
  expect(info).toMatchObject({
    eligible: true,
    effective_approval: true,
    payable: false,
    payouts_enabled: false,
    proposed_cents: 123,
    latest_state: "approved",
  });
  expect(
    (
      await db.query(
        "select count(*)::int as n from suite_referral_payout_reviews",
      )
    ).rows,
  ).toEqual([{ n: 2 }]);
  for (const role of ["authenticated", "service_role"])
    for (const sql of [
      "update suite_referral_payout_reviews set state='held'",
      "delete from suite_referral_payout_reviews",
      "truncate suite_referral_payout_reviews",
    ])
      await expect(as(role, admin, sql)).rejects.toThrow(/permission denied/);
  expect(
    (
      await as(
        "authenticated",
        other,
        "select * from suite_referral_payout_reviews",
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
  expect(
    (
      await as(
        "authenticated",
        admin,
        "select * from suite_referral_audit where entity_type='suite_referral_payout_reviews'",
      )
    ).rows,
  ).toHaveLength(2);
});
it("new fraud/dispute cases invalidate approval immediately; closing case cannot erase Stripe holds", async () => {
  await as(
    "authenticated",
    rep,
    `insert into suite_referral_cases(code,reporter_id,case_type,detail) values('AKIREVIEW01','${rep}','fraud','Review possible abuse')`,
  );
  expect(
    (await as("authenticated", admin, eligibility())).rows[0].info,
  ).toMatchObject({
    eligible: false,
    effective_approval: false,
    blockers: ["open_review_case"],
    payable: false,
  });
  await expect(
    as("authenticated", admin, review("approved", 7)),
  ).rejects.toThrow(/blockers/);
  await as(
    "authenticated",
    admin,
    `update suite_referral_cases set state='resolved',resolution='Investigated and resolved'`,
  );
  await as(
    "service_role",
    "",
    `select suite_record_referral_billing('evt_hold','refund_hold','${customer}','cus_review','sub_review',null,'business',0,'eur',now()+interval '2 minutes')`,
  );
  await as(
    "authenticated",
    admin,
    `update suite_referral_cases set state='resolved',resolution='Resolved case, hold retained'`,
  );
  expect(
    (await as("authenticated", admin, eligibility())).rows[0].info,
  ).toMatchObject({
    eligible: false,
    effective_approval: false,
    blockers: ["billing_hold"],
    payable: false,
  });
  await expect(
    as("authenticated", admin, review("eligible", 8)),
  ).rejects.toThrow(/blockers/);
  await as("authenticated", admin, review("held", 9));
  expect(
    (await as("authenticated", admin, eligibility())).rows[0].info,
  ).toMatchObject({ latest_state: "held", effective_approval: false });
});
it("suspension and revoked code add blockers, preserves evidence, mirror equals", async () => {
  await db.exec(
    `update suite_referral_representatives set state='suspended' where profile_id='${rep}';update suite_referral_codes set revoked_at=now() where code='AKIREVIEW01';`,
  );
  const info = (await as("authenticated", admin, eligibility())).rows[0]
    .info as { blockers: string[] };
  expect(info.blockers).toContain("representative_not_approved");
  expect(info.blockers).toContain("inactive_programme_or_code");
  expect(
    (
      await as(
        "authenticated",
        admin,
        "select suite_referral_payout_review_queue() as queue",
      )
    ).rows[0].queue,
  ).toBeInstanceOf(Array);
  expect(readFileSync(`database/migrations/${amendment}`, "utf8")).toBe(
    readFileSync(`supabase/migrations/${amendment}`, "utf8"),
  );
});
