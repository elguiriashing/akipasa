import { createBusinessFunnelFixture } from "./helpers/business-funnel-fixture";
import { readBusinessFunnelInstallation } from "./helpers/business-funnel-installation";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, afterEach, it, expect, vi } from "vitest";
import { purgeBusinessFunnel } from "../src/lib/business-funnel-maintenance";
const migration = "20261020234414_trusted_business_funnel.sql";
const owner = "11111111-1111-4111-8111-111111111111",
  admin = "22222222-2222-4222-8222-222222222222",
  other = "33333333-3333-4333-8333-333333333333",
  venue = "44444444-4444-4444-8444-444444444444",
  claim = "55555555-5555-4555-8555-555555555555";
let db: PGlite;
const as = async (id: string, role = "authenticated") => {
  await db.exec(
    `reset role;select set_config('test.uid','${id}',false);set role ${role}`,
  );
};
const count = async () =>
  Number(
    (
      await db.query<{ n: number }>(
        "select count(*) n from suite_funnel_private.stages",
      )
    ).rows[0].n,
  );
const billing = async (
  invoice: string,
  tier = "basico",
  status = "active",
  revision = 1,
) => {
  await as("", "service_role");
  await db.exec(`begin;
 insert into akibusiness_private.toolboxes values('workspace','${tier}','${status}',now()+interval '30 days','stripe','sub_one',${revision}) on conflict(workspace_id) do update set tier=excluded.tier,billing_status=excluded.billing_status,billing_revision=excluded.billing_revision;
 insert into akibusiness_private.operations_billing_events values('event_${revision}','sub_one','${invoice}',now());commit;`);
  await db.exec("reset role");
};
beforeAll(async () => {
  db = new PGlite();
  await createBusinessFunnelFixture(db);
  await db.exec(readBusinessFunnelInstallation());
}, 30000);
afterAll(() => db.close());
afterEach(() => db.exec("reset role"));
it("mirrors source and defaults off without backfill", async () => {
  expect(readFileSync("supabase/migrations/" + migration, "utf8")).toBe(
    readFileSync("database/migrations/" + migration, "utf8"),
  );
  await as(owner);
  await db.exec(
    `begin;insert into crm_workspaces values('workspace','${owner}','active','${venue}');insert into crm_workspace_members values('workspace','${owner}','owner','active');commit`,
  );
  await db.exec("reset role");
  expect(await count()).toBe(0);
  await expect(
    db.exec("update suite_funnel_private.settings set enabled=true"),
  ).rejects.toThrow(/check constraint/);
  await db.exec(
    "update suite_funnel_private.settings set retention_days=90,retention_approval_ref='TEST-ONLY-RETENTION-APPROVAL',enabled=true",
  );
  expect(await count()).toBe(0);
});
it("records only real deferred approval plus actual owner grant, not forged completion", async () => {
  await as(owner);
  await db.exec("reset role");
  await db.exec(
    `begin;select set_config('test.uid','${owner}',true);update venue_claims set status='approved',decided_by='${admin}',decided_at=now() where id='${claim}';insert into venue_members values('${venue}','${owner}','owner');commit;`,
  );
  expect(await count()).toBe(0);
  await db.exec(
    `update venue_claims set status='pending';begin;select set_config('test.uid','${admin}',true);update venue_claims set status='approved',decided_by='${admin}',decided_at=now();commit;`,
  );
  expect(await count()).toBe(1);
});
it("owner-created management activation is distinct from service provisioning and never a fabricated first visit", async () => {
  await as(owner);
  await db.exec(
    `begin;insert into crm_workspaces values('activated','${owner}','active',null);insert into crm_workspace_members values('activated','${owner}','owner','active');commit`,
  );
  await db.exec("reset role");
  expect(await count()).toBe(2);
  await as("");
  await db.exec("reset role");
  await db.exec(
    `begin;insert into crm_workspaces values('provisioned','${owner}','active',null);insert into crm_workspace_members values('provisioned','${owner}','owner','active');commit`,
  );
  expect(await count()).toBe(2);
});
it("checkout requires a server-recorded provider session and deduplicates retries", async () => {
  await as(owner);
  await expect(
    db.exec(
      "insert into akibusiness_private.operations_checkouts values('workspace',null,null,'cs_fake','reserved')",
    ),
  ).rejects.toThrow(/permission denied/);
  await as("", "service_role");
  await db.exec(
    `insert into akibusiness_private.operations_checkouts values('workspace','${owner}','${claim}',null,'reserved')`,
  );
  await db.exec("reset role");
  expect(await count()).toBe(2);
  await as("", "service_role");
  await db.exec(
    "update akibusiness_private.operations_checkouts set session_id='cs_created'",
  );
  await db.exec(
    "update akibusiness_private.operations_checkouts set session_id='cs_created'",
  );
  await db.exec("reset role");
  expect(await count()).toBe(3);
  await db.exec(
    `insert into akibusiness_private.operations_subscriptions values('sub_one','workspace','${owner}')`,
  );
});
it("paid invoices, paid upgrades and effective cancellations use trusted atomic billing facts, without failed-payment grants or duplicate observations", async () => {
  await billing("stripe-current:sub_one:unpaid");
  expect(await count()).toBe(3);
  await billing("stripe-invoice:in_first", "basico", "active", 2);
  expect(await count()).toBe(4);
  await billing("stripe-invoice:in_first", "basico", "active", 3);
  expect(await count()).toBe(4);
  await billing("stripe-invoice:in_upgrade", "standard", "active", 4);
  expect(await count()).toBe(6);
  await billing("stripe-current:sub_one:unpaid", "standard", "canceled", 5);
  expect(await count()).toBe(7);
  await billing("stripe-current:sub_one:unpaid", "standard", "canceled", 6);
  expect(await count()).toBe(7);
});
it("generic analytics and direct RPC calls cannot fabricate stage evidence; scoped aggregates require current manager membership", async () => {
  await as(owner);
  await expect(
    db.query("select record_fixture_analytics('suite_business_stage')"),
  ).rejects.toThrow("Trusted funnel evidence required");
  await expect(
    db.query(
      "select suite_funnel_private.emit('payment_verified','fake',null,null,null)",
    ),
  ).rejects.toThrow(/permission denied/);
  const value = (
    await db.query<{ v: Record<string, unknown> }>(
      "select suite_business_funnel('workspace',30) v",
    )
  ).rows[0].v;
  expect(value).toMatchObject({
    available: true,
    conversion_rate_available: false,
    stages: {
      claim_completed: 1,
      checkout_started: 1,
      payment_verified: 2,
      subscription_upgraded: 1,
      subscription_cancelled: 1,
    },
  });
  await expect(
    db.query("select suite_business_funnel('workspace',91)"),
  ).rejects.toThrow(/Period/);
  await as(other);
  await expect(
    db.query("select suite_business_funnel('workspace',30)"),
  ).rejects.toThrow("Workspace manager required");
  await db.exec("reset role");
  await db.exec(
    `update crm_workspace_members set status='removed' where workspace_id='workspace' and profile_id='${owner}'`,
  );
  await as(owner);
  await expect(
    db.query("select suite_business_funnel('workspace',30)"),
  ).rejects.toThrow("Workspace manager required");
  await db.exec("reset role");
  await db.exec("update crm_workspace_members set status='active'");
});
it("withdrawal erases linked optional attribution, no retroactive consent, known-minor and pending-account suppression", async () => {
  await db.exec(
    `update personalisation_settings set marketing_enabled=false where profile_id='${owner}'`,
  );
  expect(await count()).toBe(0);
  expect((await db.query("select * from analytics_events")).rows).toHaveLength(
    0,
  );
  await billing("stripe-invoice:in_without_consent", "standard", "active", 7);
  expect(await count()).toBe(0);
  await db.exec(
    `update personalisation_settings set marketing_enabled=true where profile_id='${owner}'`,
  );
  expect(await count()).toBe(0);
  await db.exec(
    `update profiles set birth_year=extract(year from now())::int-16 where id='${owner}'`,
  );
  await billing("stripe-invoice:in_minor", "standard", "active", 8);
  expect(await count()).toBe(0);
  await db.exec(
    `update profiles set birth_year=1990 where id='${owner}';insert into account_private.onboarding values('${owner}','pending')`,
  );
  await billing("stripe-invoice:in_pending", "standard", "active", 9);
  expect(await count()).toBe(0);
  await db.exec("update account_private.onboarding set status='complete'");
  await billing("stripe-invoice:in_complete", "standard", "active", 10);
  expect(await count()).toBe(1);
  await db.exec(
    `delete from personalisation_settings where profile_id='${owner}'`,
  );
  expect(await count()).toBe(0);
});
it("identity deletion clears optional records without deleting business data; bounded retention cleans linked analytics", async () => {
  await db.exec(
    `insert into personalisation_settings(profile_id,analytics_enabled,marketing_enabled)values('${owner}',true,true)`,
  );
  await billing("stripe-invoice:in_retained", "standard", "active", 11);
  expect(await count()).toBe(1);
  await db.exec(`begin;delete from profiles where id='${owner}'`);
  expect(await count()).toBe(0);
  expect((await db.query("select * from analytics_events")).rows).toHaveLength(
    0,
  );
  expect(
    (await db.query("select * from crm_workspaces where id='workspace'")).rows,
  ).toHaveLength(1);
  await db.exec("rollback");
  expect(await count()).toBe(1);
  await db.exec(
    "update suite_funnel_private.stages set occurred_at=now()-interval '91 days'",
  );
  await db.exec(
    "insert into analytics_events(action,occurred_at)values('venue_view',now()-interval '300 days')",
  );
  await db.exec(
    "update suite_funnel_private.settings set enabled=false,retention_days=null,retention_approval_ref=null",
  );
  await as("", "service_role");
  expect(
    (await db.query("select purge_suite_business_funnel(1) n")).rows[0],
  ).toEqual({ n: 0 });
  await db.exec(
    "reset role;update suite_funnel_private.settings set retention_days=90,retention_approval_ref='TEST-ONLY-RETENTION-APPROVAL'",
  );
  await as("", "service_role");
  expect(
    (await db.query("select purge_suite_business_funnel(1) n")).rows[0],
  ).toEqual({ n: 1 });
  await db.exec("reset role");
  expect(await count()).toBe(0);
  expect((await db.query("select * from analytics_events")).rows).toHaveLength(
    1,
  );
});
it("retention adapter is gated, bounded, server-only and surfaces failures", async () => {
  const f = vi.fn();
  expect(await purgeBusinessFunnel({}, f)).toEqual({
    enabled: false,
    removed: 0,
  });
  expect(f).not.toHaveBeenCalled();
  f.mockResolvedValue(Response.json(3));
  expect(
    await purgeBusinessFunnel(
      {
        AKISUITE_FUNNEL_READY: "true",
        NEXT_PUBLIC_SUPABASE_URL: "https://db.test",
        SUPABASE_SERVICE_ROLE_KEY: "private",
      },
      f,
    ),
  ).toEqual({ enabled: true, removed: 3 });
  expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ p_limit: 500 });
  f.mockResolvedValue(Response.json(1001));
  await expect(
    purgeBusinessFunnel(
      {
        AKISUITE_FUNNEL_READY: "true",
        NEXT_PUBLIC_SUPABASE_URL: "https://db.test",
        SUPABASE_SERVICE_ROLE_KEY: "private",
      },
      f,
    ),
  ).rejects.toThrow("Invalid funnel maintenance result");
});
