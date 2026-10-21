import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
const member = "10000000-0000-0000-0000-000000000002",
  other = "10000000-0000-0000-0000-000000000003",
  admin = "10000000-0000-0000-0000-000000000001",
  programme = "10000000-0000-0000-0000-000000000011",
  award = "10000000-0000-0000-0000-000000000021",
  otherAward = "10000000-0000-0000-0000-000000000022";
const migration = "20261021001138_own_referral_prestige_export.sql";
const read = (p: string) => readFileSync(p, "utf8");
async function as(
  role: string,
  id: string,
  sql: string,
  params: unknown[] = [],
) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec(`set role ${role}`);
  try {
    return await db.query<Record<string, unknown>>(sql, params);
  } finally {
    await db.exec("reset role");
  }
}
type Page = {
  total: number;
  rows: Array<{ key: string; data: Record<string, unknown> }>;
  next_cursor: string | null;
};
async function page(
  section: string,
  id = member,
  after: string | null = null,
  limit = 500,
) {
  return (
    await as(
      "authenticated",
      id,
      "select suite_private_identity_export_page($1,$2,$3) as page",
      [section, after, limit],
    )
  ).rows[0].page as Page;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(read("tests/passport-db-fixture.sql"));
  await db.exec(`create function public.current_app_role() returns text language sql stable security definer as $$select app_role::text from profiles where id=auth.uid()$$;
 create function public.account_features_allowed() returns boolean language sql as $$select false$$;
 create table public.billing_subscriptions(profile_id uuid);create table public.billing_customers(profile_id uuid,stripe_customer_id text);
 insert into profiles values('${admin}','Admin','administrator'),('${member}','Member','consumer'),('${other}','Other','consumer');grant usage on schema public,auth to authenticated,anon,service_role;`);
  for (const p of [
    "database/migrations/20260916103318_managed_achievements.sql",
    "database/migrations/20260916115126_activity_achievements.sql",
    "supabase/migrations/20261003193908_passport_city_collection.sql",
    "supabase/migrations/20261003203205_passport_award_replacement_history.sql",
    "database/migrations/20261020170436_passport_prestige.sql",
    "database/migrations/20261020170421_shared_referral_foundation.sql",
    "database/migrations/20261020180654_referral_payout_review.sql",
    `database/migrations/${migration}`,
  ])
    await db.exec(read(p));
  await db.exec(`insert into suite_referral_programmes(id,name,programme_type) values('${programme}','Synthetic privacy fixture','representative');
 insert into suite_referral_representatives(profile_id,state,approved_by) values('${member}','suspended','${admin}'),('${other}','approved','${admin}');
 insert into suite_referral_codes(code,programme_id,owner_profile_id) values('AKIPRIV01','${programme}','${member}'),('AKIPRIV02','${programme}','${other}');
 insert into suite_referral_attributions(profile_id,code,source_product,expires_at) values('${member}','AKIPRIV02','akipasa',now()+interval '1 day'),('${other}','AKIPRIV01','akipasa',now()+interval '1 day');
 insert into suite_referral_leads(representative_id,business_name,contact_email,notes) values('${member}','PRIVATE_OTHER_NAME','other@example.test','PRIVATE_OTHER_NOTES'),('${other}','PRIVATE_FOREIGN','foreign@example.test','PRIVATE_FOREIGN_NOTES');
 insert into suite_referral_cases(code,reporter_id,case_type,detail,resolution,reviewed_by) values('AKIPRIV02','${member}','other','PRIVATE_OTHER_DETAIL','PRIVATE_ADMIN_RESOLUTION','${admin}');
 insert into suite_referral_billing_events(stripe_event_id,event_kind,profile_id,code,stripe_customer_id,stripe_subscription_id,stripe_invoice_id,amount_paid_cents,proposed_commission_cents,currency,rule_snapshot,stripe_created_at) values('evt_privMember','paid','${member}','AKIPRIV02','cus_member','sub_member','in_member',1000,123,'eur','{"other_person":"PRIVATE_OTHER_SNAPSHOT"}',now()),('evt_privOther','paid','${other}','AKIPRIV01','cus_other','sub_other','in_other',2000,246,'eur','{"terms_version":"fixture-only","other_person":"PRIVATE_OTHER_SNAPSHOT"}',now());
 insert into suite_referral_payout_reviews(request_id,stripe_event_id,state,reason,actor_id,evidence_snapshot) values(gen_random_uuid(),'evt_privOther','held','PRIVATE_ADMIN_REASON','${admin}','{"private":"PRIVATE_REVIEW_SNAPSHOT"}');
 insert into suite_referral_audit(actor_id,action,entity_type,entity_id,before_value,after_value) values('${member}','UPDATE','suite_referral_codes','AKIPRIV01','{"private":"PRIVATE_BEFORE"}','{"private":"PRIVATE_AFTER"}'),('${other}','UPDATE','suite_referral_codes','AKIPRIV02','{}','{}');
 insert into private.prestige_programmes(key,title_es,title_en,achievement_keys,definition_snapshot,created_by) values('fixture_prestige','Trofeo de prueba','Fixture trophy',array['fixture_achievement'],'{}','${admin}');
 insert into private.prestige_awards(id,profile_id,programme_key,evidence,title_es,title_en) values('${award}','${member}','fixture_prestige','[]','Trofeo','Trophy'),('${otherAward}','${other}','fixture_prestige','[]','Otro','Other');
 insert into private.prestige_shipping_addresses(award_id,recipient_name,address_line1,postal_code,city,country_code,delete_after) values('${award}','Member','1 Example Street','12345','Test City','ES',now()-interval '1 day'),('${otherAward}','PRIVATE_OTHER_SHIPPING','2 Foreign Street','54321','Foreign City','ES',now()+interval '1 day');
 insert into private.prestige_physical_requests(award_id,reviewed_by,review_note) values('${award}','${admin}','PRIVATE_ADMIN_NOTE'),('${otherAward}','${admin}','PRIVATE_FOREIGN_NOTE');
 insert into private.prestige_audit(actor_id,action,award_id,detail) values('${admin}','address_read_admin','${award}','{"reason":"PRIVATE_ADMIN_REASON"}'),('${member}','visibility_changed','${award}','{}'),('${other}','visibility_changed','${otherAward}','{}');`);
}, 30000);
afterAll(async () => db?.close());
it("exports every own section for restricted/suspended accounts with programme/fulfilment off", async () => {
  const sections = [
    "suite_referral_codes",
    "suite_referral_attributions",
    "suite_referral_representatives",
    "suite_referral_leads",
    "suite_referral_cases",
    "suite_referral_billing_events",
    "suite_referral_audit",
    "suite_referral_payout_reviews",
    "passport_prestige_awards",
    "passport_prestige_shipping_addresses",
    "passport_prestige_physical_requests",
    "passport_prestige_audit",
  ];
  for (const section of sections) {
    const result = await page(section);
    expect(result.total, section).toBeGreaterThan(0);
    expect(result.rows.length, section).toBe(result.total);
    expect(result.next_cursor).toBeNull();
  }
  expect(
    (await as("authenticated", member, "select * from suite_referral_leads"))
      .rows,
  ).toEqual([]);
  expect(
    (await page("suite_referral_representatives")).rows[0].data,
  ).toMatchObject({ state: "suspended" });
  expect(
    (
      await db.query(
        "select enabled,shipping_intake_enabled,delivery_enabled from private.prestige_settings",
      )
    ).rows,
  ).toEqual([
    { enabled: false, shipping_intake_enabled: false, delivery_enabled: false },
  ]);
});
it("omits other customer/rep/admin identifiers, notes and raw snapshots while including own payer data", async () => {
  for (const section of [
    "suite_referral_representatives",
    "suite_referral_leads",
    "suite_referral_cases",
    "suite_referral_billing_events",
    "suite_referral_audit",
    "suite_referral_payout_reviews",
    "passport_prestige_awards",
    "passport_prestige_shipping_addresses",
    "passport_prestige_physical_requests",
    "passport_prestige_audit",
  ]) {
    const text = JSON.stringify((await page(section)).rows);
    for (const forbidden of [
      admin,
      other,
      "PRIVATE_",
      "cus_other",
      "sub_other",
      "in_other",
      "actor_id",
      'reviewed_by"',
      'approved_by"',
    ])
      expect(text, section).not.toContain(forbidden);
  }
  const billing = (await page("suite_referral_billing_events")).rows.map(
    (r) => r.data,
  );
  expect(billing.find((r) => r.relationship === "payer")).toMatchObject({
    stripe_customer_id: "cus_member",
    amount_paid_cents: 1000,
    proposed_commission_cents: null,
  });
  expect(billing.find((r) => r.relationship === "referrer")).toMatchObject({
    stripe_customer_id: null,
    amount_paid_cents: null,
    proposed_commission_cents: 246,
    payable: false,
  });
});
it("includes expired-but-retained own shipping until actual purge, without changing deletion timers", async () => {
  const retained = await page("passport_prestige_shipping_addresses");
  expect(retained.rows).toHaveLength(1);
  expect(retained.rows[0].data).toMatchObject({
    award_id: award,
    recipient_name: "Member",
  });
  const legacy = (
    await as(
      "authenticated",
      member,
      "select prestige_member('export') as data",
    )
  ).rows[0].data as { shipping_addresses: unknown[] };
  expect(legacy.shipping_addresses).toEqual([]);
  expect(
    (
      await db.query(
        "select count(*)::int as n from private.prestige_shipping_addresses",
      )
    ).rows,
  ).toEqual([{ n: 2 }]);
});
it("is caller-only even for administrators and rejects forged sections/cursors/limits and anonymous/service invocation", async () => {
  expect((await page("passport_prestige_awards", admin)).rows).toEqual([]);
  expect((await page("suite_referral_billing_events", admin)).rows).toEqual([]);
  for (const section of [
    "profiles",
    "private.prestige_settings",
    `suite_referral_leads;drop table profiles`,
  ])
    await expect(page(section)).rejects.toThrow(/Unknown privacy section/);
  for (const limit of [0, 501])
    await expect(
      page("suite_referral_codes", member, null, limit),
    ).rejects.toThrow(/Invalid privacy page/);
  await expect(
    page("suite_referral_codes", member, "' OR true --"),
  ).rejects.toThrow(/Invalid privacy page/);
  for (const role of ["anon", "service_role"])
    await expect(
      as(
        role,
        "",
        "select suite_private_identity_export_page('suite_referral_codes')",
      ),
    ).rejects.toThrow(/permission denied/);
  await expect(
    as(
      "authenticated",
      "",
      "select suite_private_identity_export_page('suite_referral_codes')",
    ),
  ).rejects.toThrow(/Authentication/);
  await expect(
    as(
      "authenticated",
      member,
      "select * from private.prestige_shipping_addresses",
    ),
  ).rejects.toThrow(/permission denied/);
});
it("returns complete deterministic keyset pages beyond REST default row caps, without duplicates", async () => {
  await db.exec(
    `insert into suite_referral_leads(representative_id,business_name) select '${member}','Synthetic fixture '||i from generate_series(1,1201)i`,
  );
  const rows: Record<string, unknown>[] = [];
  const keys = new Set<string>();
  let after: string | null = null;
  let calls = 0;
  do {
    const result = await page("suite_referral_leads", member, after);
    expect(result.total).toBe(1202);
    for (const row of result.rows) {
      expect(keys.has(row.key)).toBe(false);
      keys.add(row.key);
      rows.push(row.data);
    }
    after = result.next_cursor;
    calls += 1;
  } while (after);
  expect(rows).toHaveLength(1202);
  expect(calls).toBe(3);
  expect((await page("suite_referral_leads", other)).rows).toHaveLength(1);
});
it("preserves financial audit when reviewer identity is deleted and cascades only existing own prestige relations", async () => {
  const count = (
    await db.query(
      "select count(*)::int as n from suite_referral_payout_reviews",
    )
  ).rows;
  await db.exec(`delete from profiles where id='${admin}'`);
  expect(
    (
      await db.query(
        "select count(*)::int as n from suite_referral_payout_reviews",
      )
    ).rows,
  ).toEqual(count);
  expect(
    (await db.query("select actor_id from suite_referral_payout_reviews")).rows,
  ).toEqual([{ actor_id: admin }]);
  await db.exec(`delete from profiles where id='${member}'`);
  expect(
    (
      await db.query(
        `select count(*)::int as n from private.prestige_shipping_addresses where award_id='${award}'`,
      )
    ).rows,
  ).toEqual([{ n: 0 }]);
  expect(
    (
      await db.query(
        `select count(*)::int as n from private.prestige_physical_requests where award_id='${award}'`,
      )
    ).rows,
  ).toEqual([{ n: 0 }]);
  expect(
    (
      await db.query(
        "select count(*)::int as n from suite_referral_payout_reviews",
      )
    ).rows,
  ).toEqual(count);
  expect(
    (
      await db.query(
        `select count(*)::int as n from private.prestige_shipping_addresses where award_id='${otherAward}'`,
      )
    ).rows,
  ).toEqual([{ n: 1 }]);
});
it("keeps canonical SQL mirrors byte identical and grants no raw table privileges", async () => {
  expect(read(`database/migrations/${migration}`)).toBe(
    read(`supabase/migrations/${migration}`),
  );
  const result = (
    await db.query(
      "select has_table_privilege('authenticated','private.prestige_shipping_addresses','SELECT') as shipping,has_table_privilege('authenticated','suite_referral_audit','UPDATE') as audit,has_function_privilege('anon','suite_private_identity_export_page(text,text,integer)','EXECUTE') as anonymous",
    )
  ).rows;
  expect(result).toEqual([{ shipping: false, audit: false, anonymous: false }]);
});
