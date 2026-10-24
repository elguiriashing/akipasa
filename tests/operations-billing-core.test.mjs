import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { buildMigrationManifest } from "../src/lib/operations-billing/migration-manifest.mjs";
import { evaluateOperationsSubscription } from "../src/lib/operations-billing/operations-lifecycle.mjs";
import {
  OPERATION_PRICES,
  TOOL_KEYS,
} from "../src/lib/operations-billing/operations-contract.mjs";
const profiles = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
];
const basic = ["crm", "pos", "inventory", "calendar"];
function fixture() {
  const legacy = profiles.map((profileId, i) => ({
    profileId,
    subscriptionId: `sub_test${i}`,
    customerId: `cus_test${i}`,
    plan: i === 2 ? "business_pro" : "business",
  }));
  const subscriptions = legacy.map((row, i) => ({
    id: row.subscriptionId,
    customer: row.customerId,
    status: "active",
    billing_cycle_anchor: 1000,
    items: {
      data: [
        {
          id: `si_test${i}`,
          quantity: 1,
          current_period_start: 1000,
          current_period_end: i === 2 ? 40000000 : 3000000,
          price: {
            id: "price_old",
            recurring: { interval: i === 2 ? "year" : "month" },
          },
        },
      ],
    },
    latest_invoice: {
      id: `in_test${i}`,
      status: "paid",
      customer: row.customerId,
      subscription: row.subscriptionId,
      lines: {
        data: [
          {
            subscription_item: `si_test${i}`,
            amount: 1000,
            price: { id: "price_old" },
            period: { start: 1000, end: i === 2 ? 40000000 : 3000000 },
          },
        ],
      },
    },
  }));
  return {
    version: 1,
    complete: true,
    snapshotAt: "1970-01-02T00:00:00Z",
    legacy,
    subscriptions,
    legacyPriceIds: ["price_old"],
    scopes: legacy.map((row) => ({
      profileId: row.profileId,
      subscriptionId: row.subscriptionId,
      approved: true,
      locationName: "Private operating location",
      tools: basic,
    })),
    workspaces: [],
  };
}
test("three legacy business plans become Basico monthly only at paid-through; personal Premium unchanged", () => {
  const f = fixture();
  f.legacy.push({ subscriptionId: "sub_personal", plan: "premium" });
  const m = buildMigrationManifest(f);
  assert.equal(m.rows.length, 4);
  assert.deepEqual(m.rows[3], {
    subscriptionId: "sub_personal",
    action: "preserve_personal_premium",
    changes: [],
  });
  for (const row of m.rows.slice(0, 3)) {
    assert.equal(row.target.priceId, OPERATION_PRICES.basico.id);
    assert.equal(row.schedule.chargeNow, false);
    assert.equal(row.schedule.createSubscription, false);
    assert.equal(row.target.listing, "free");
    assert.equal(row.scope.provision.rpc, "provision_crm_operations_migration");
    assert.equal(row.status, "requires_private_location_provision");
  }
  assert.equal(m.rows[2].schedule.annualToMonthlyAtExistingExpiry, true);
  assert.equal(m.rows[2].effectiveAt, new Date(40000000 * 1000).toISOString());
  assert.equal(buildMigrationManifest(f).manifestSha256, m.manifestSha256);
});
test("missing scope, failed invoice, pending change and duplicate customers never silently migrate", () => {
  const f = fixture();
  f.scopes = [];
  f.subscriptions[0].latest_invoice.status = "open";
  f.subscriptions[1].schedule = "sub_sched";
  const m = buildMigrationManifest(f);
  assert.ok(m.rows[0].blockers.includes("paid_through_evidence_required"));
  assert.ok(
    m.rows[1].blockers.includes("existing_lifecycle_change_requires_review"),
  );
  assert.ok(m.rows.every((row) => row.status === "blocked"));
});
test("partial snapshots and duplicate legacy subscriptions are refused", () => {
  assert.throws(() =>
    buildMigrationManifest({ ...fixture(), complete: false }),
  );
  const f = fixture();
  f.legacy.push(f.legacy[0]);
  assert.throws(() => buildMigrationManifest(f));
});
const binding = {
  subscriptionId: "sub_ops",
  customerId: "cus_ops",
  profileId: profiles[0],
  workspaceId: "private-test",
  tier: "basico",
  tools: basic,
  anchor: new Date(1000 * 1000).toISOString(),
  paidUntil: new Date(2000 * 1000).toISOString(),
  nextTier: "pro",
  nextTools: TOOL_KEYS,
};
function sub() {
  return {
    id: "sub_ops",
    customer: "cus_ops",
    status: "active",
    billing_cycle_anchor: 1000,
    metadata: { workspace_id: "private-test", profile_id: profiles[0] },
    items: {
      data: [
        {
          id: "si_ops",
          quantity: 1,
          price: {
            id: OPERATION_PRICES.pro.id,
            currency: "eur",
            recurring: { interval: "month" },
          },
        },
      ],
    },
    latest_invoice: {
      id: "in_ops",
      subscription: "sub_ops",
      customer: "cus_ops",
      status: "paid",
      lines: {
        data: [
          {
            subscription_item: "si_ops",
            price: { id: OPERATION_PRICES.pro.id },
            amount: 9799,
            period: { start: 2000, end: 3000 },
          },
        ],
      },
    },
  };
}
test("upgrade activates all12 only after current matching paid invoice; removed paid boolean supported", () => {
  const value = evaluateOperationsSubscription(sub(), binding, { now: 2500 });
  assert.equal(value.tier, "pro");
  assert.equal(value.tools.length, 12);
  assert.equal(value.paidUntil, new Date(3000 * 1000).toISOString());
});
test("failed renewal cannot extend expiry or activate upgrade", () => {
  const s = sub();
  s.latest_invoice.status = "open";
  s.status = "past_due";
  const v = evaluateOperationsSubscription(s, binding, { now: 2500 });
  assert.equal(v.tier, "basico");
  assert.equal(v.paidUntil, binding.paidUntil);
});
test("first unpaid checkout never enrolls tools", () => {
  const s = sub();
  s.latest_invoice.status = "open";
  assert.equal(
    evaluateOperationsSubscription(
      s,
      { ...binding, tier: null, paidUntil: null },
      { now: 2500 },
    ).action,
    "awaiting_payment",
  );
});
for (const [name, change] of [
  ["customer", (s) => (s.customer = "cus_other")],
  ["workspace", (s) => (s.metadata.workspace_id = "foreign")],
  ["quantity", (s) => (s.items.data[0].quantity = 2)],
  ["unknown price", (s) => (s.items.data[0].price.id = "price_foreign")],
  ["anniversary", (s) => (s.billing_cycle_anchor = 999)],
])
  test(`${name} mismatch blocks mutation`, () => {
    const s = sub();
    change(s);
    assert.throws(() =>
      evaluateOperationsSubscription(s, binding, { now: 2500 }),
    );
  });
test("unrelated/old-price paid invoice cannot grant upgraded access", () => {
  const s = sub();
  s.latest_invoice.lines.data[0].price.id = "price_old";
  assert.equal(
    evaluateOperationsSubscription(s, binding, { now: 2500 }).tier,
    "basico",
  );
});
test("canceled subscription denies access via status even when paid-through remains recorded", () => {
  const s = sub();
  s.status = "canceled";
  assert.equal(
    evaluateOperationsSubscription(s, binding, { now: 2500 }).status,
    "canceled",
  );
});

test("verified paid upgrade proration activates purchased tools immediately", () => {
  const s = sub();
  s.latest_invoice.billing_reason = "subscription_update";
  s.latest_invoice.lines.data[0].proration = true;
  assert.equal(
    evaluateOperationsSubscription(s, binding, { now: 2500 }).tier,
    "pro",
  );
});

test("renewal preview replaces the existing item only at expiry and preserves current phase settings", async () => {
  const { buildRenewalSchedulePreview } = await import(
    "../src/lib/operations-billing/migration-manifest.mjs"
  );
  const f = fixture();
  f.scopes[0].workspaceId = "private-test";
  f.workspaces = [
    { id: "private-test", ownerProfileId: profiles[0], status: "active" },
  ];
  const row = buildMigrationManifest(f).rows[0],
    s = f.subscriptions[0];
  const phase = {
    start_date: 1000,
    end_date: 3000000,
    items: [{ price: "price_old", quantity: 1 }],
    automatic_tax: { enabled: false },
    metadata: { preserved: "yes" },
    discounts: [{ coupon: "coupon_existing" }],
  };
  const output = buildRenewalSchedulePreview(
    s,
    { id: "sub_sched", subscription: s.id, status: "active", phases: [phase] },
    row,
  );
  assert.equal(output.parameters.phases[0].items[0].price, "price_old");
  assert.equal(output.parameters.phases[1].start_date, 3000000);
  assert.equal(
    output.parameters.phases[1].items[0].price,
    OPERATION_PRICES.basico.id,
  );
  assert.equal(output.parameters.phases[0].automatic_tax.enabled, false);
  assert.deepEqual(output.parameters.phases[0].discounts, phase.discounts);
  assert.equal(output.immediateCharge, false);
  assert.throws(() =>
    buildRenewalSchedulePreview(
      s,
      {
        id: "sub_sched",
        subscription: s.id,
        status: "active",
        phases: [{ ...phase, unknown_setting: true }],
      },
      row,
    ),
  );
});

for (const tamper of [false, true]) {
  test(`offline command preparation ${tamper ? "rejects modified rows retaining the claimed seal" : "accepts a key-reordered intact seal before enforcing receipt eligibility"}`, () => {
    const dir = mkdtempSync(join(tmpdir(), "operations-command-seal-"));
    try {
      const input = fixture();
      const built = buildMigrationManifest(input);
      const manifest = Object.fromEntries(Object.entries(built).reverse());
      if (tamper) manifest.rows[0].customerId = "cus_altered";
      for (const [name, value] of Object.entries({
        manifest,
        receipts: { manifestSha256: built.manifestSha256, calls: [] },
        snapshots: { input },
      }))
        writeFileSync(join(dir, `${name}.json`), JSON.stringify(value));
      const output = join(dir, "commands.json");
      const result = spawnSync(
        process.execPath,
        [
          "--experimental-strip-types",
          resolve("scripts/prepare-operations-migration-commands.mjs"),
          "--manifest",
          join(dir, "manifest.json"),
          "--receipts",
          join(dir, "receipts.json"),
          "--snapshots",
          join(dir, "snapshots.json"),
          "--output",
          output,
        ],
        { encoding: "utf8" },
      );
      assert.notEqual(result.status, 0);
      assert.match(
        result.stderr,
        tamper
          ? /Sealed review evidence mismatch/
          : /Exactly three approved migrations required/,
      );
      assert.equal(existsSync(output), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
