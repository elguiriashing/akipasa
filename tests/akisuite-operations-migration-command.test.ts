import { describe, it, expect, vi } from "vitest";
import {
  operationsMigrationSnapshot,
  processOperationsMigrationCommand,
} from "../src/lib/operations-migration-command";
import { OPERATION_PRICES } from "../src/lib/operations-billing/operations-contract.mjs";
const now = Math.floor(Date.now() / 1000),
  end = now + 25 * 86400;
const env = {
  AKIBUSINESS_OPERATIONS_BILLING_READY: "true",
  AKIBUSINESS_OPERATIONS_MIGRATIONS_READY: "true",
  NEXT_PUBLIC_SUPABASE_URL: "https://supabase.test",
  SUPABASE_SERVICE_ROLE_KEY: "private-service",
  STRIPE_SECRET_KEY: "private-stripe",
};
const source = {
  id: "sub_legacy",
  customer: "cus_owner",
  status: "active",
  currency: "eur",
  billing_cycle_anchor: now - 5 * 86400,
  metadata: {
    profile_id: "11111111-1111-4111-8111-111111111111",
    plan_code: "business",
    billing_interval: "month",
  },
  items: {
    has_more: false,
    data: [
      {
        id: "si_same",
        quantity: 1,
        current_period_start: now - 5 * 86400,
        current_period_end: end,
        tax_rates: [],
        price: { id: "price_legacy", recurring: { interval: "month" } },
      },
    ],
  },
  latest_invoice: {
    id: "in_paid",
    status: "paid",
    amount_due: 0,
    amount_paid: 0,
  },
  automatic_tax: { enabled: false },
  default_tax_rates: [],
  discounts: [{ id: "di_free" }],
  collection_method: "charge_automatically",
  default_payment_method: "pm_same",
  default_source: null,
  billing_mode: { type: "classic" },
  cancel_at: null,
  cancel_at_period_end: false,
  pause_collection: null,
  pending_update: null,
  next_pending_invoice_item_invoice: null,
  schedule: null as string | null,
};
type Obj = Record<string, unknown>;
function setup(
  options: {
    sourceChanged?: boolean;
    sourceChangedAfterPreview?: boolean;
    scheduleChangedAfterPreview?: boolean;
    foreignBinding?: boolean;
    nonzero?: boolean;
    wrongDate?: boolean;
    unknownSetting?: boolean;
    postTimeout?: boolean;
    createTimeout?: boolean;
    retry?: boolean;
    foreignFuture?: boolean;
    annual?: boolean;
    taxChanged?: boolean;
  } = {},
) {
  const s = structuredClone(source);
  if (options.annual) {
    s.items.data[0].price.recurring.interval = "year";
    s.items.data[0].current_period_end = now + 365 * 86400;
  }
  const command = {
    command_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    lease: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    subscription_id: s.id,
    workspace_id: "private-owner",
    manifest_sha256: "f".repeat(64),
    source_snapshot: operationsMigrationSnapshot(s),
    schedule_id: options.retry ? "sub_sched_test" : null,
    first_attempt_at: new Date().toISOString(),
    attempts: 0,
    planned_parameters: null as Obj | null,
  };
  const initial = {
    id: "sub_sched_test",
    subscription: s.id,
    status: "active",
    end_behavior: "release",
    phases: [
      {
        start_date: s.items.data[0].current_period_start,
        end_date: s.items.data[0].current_period_end,
        items: [{ price: "price_legacy", quantity: 1, tax_rates: [] }],
        automatic_tax: { enabled: false },
        metadata: s.metadata,
        discounts: [{ discount: "di_free" }],
        collection_method: s.collection_method,
        currency: "eur",
        default_payment_method: "pm_same",
        default_tax_rates: [],
        billing_cycle_anchor: "automatic",
      },
    ],
  };
  let schedule: Obj = structuredClone(initial);
  let previewed = false;
  let createTimedOut = false;
  const calls: Array<{
    url: string;
    method: string;
    body: Obj | URLSearchParams | null;
  }> = [];
  const fetcher = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input),
        method = init?.method || "GET";
      const isProvider = url.startsWith("https://api.stripe.com");
      const body = init?.body
        ? isProvider
          ? new URLSearchParams(String(init.body))
          : JSON.parse(String(init.body))
        : null;
      calls.push({ url, method, body });
      let result: unknown = null;
      if (url.endsWith("/account")) result = { id: "acct_1SVLH2GfzDhsgsQZ" };
      else if (url.endsWith("claim_crm_operations_migration")) {
        command.attempts++;
        result = command;
      } else if (url.endsWith("crm_operations_migration_scope"))
        result = {
          workspaceId: options.foreignBinding
            ? "private-other"
            : "private-owner",
          customerId: "cus_owner",
          profileId: s.metadata.profile_id,
          tier: null,
          token: null,
        };
      else if (url.includes("/subscriptions/")) {
        const copy = structuredClone(s);
        if (options.sourceChanged) copy.items.data[0].quantity = 2;
        if (options.sourceChangedAfterPreview && previewed)
          copy.default_payment_method = "pm_changed";
        result = copy;
      } else if (url.endsWith("/subscription_schedules") && method === "POST") {
        expect((body as URLSearchParams).get("from_subscription")).toBe(s.id);
        expect([...(body as URLSearchParams).keys()]).toEqual([
          "from_subscription",
        ]);
        s.schedule = "sub_sched_test";
        if (options.createTimeout && !createTimedOut) {
          createTimedOut = true;
          throw Error("fetch failed");
        }
        result = initial;
      } else if (url.endsWith("prepare_crm_operations_migration")) {
        const b = body as Obj;
        command.schedule_id = String(b.p_schedule);
        if (b.p_parameters)
          command.planned_parameters = structuredClone(b.p_parameters as Obj);
      } else if (url.endsWith("/invoices/create_preview")) {
        previewed = true;
        const p = command.planned_parameters as {
          phases: Array<{ start_date: number; end_date: number }>;
        };
        result = {
          id: "upcoming_in_preview",
          currency: "eur",
          amount_due: options.nonzero ? 1999 : 0,
          total: options.nonzero ? 1999 : 0,
          automatic_tax: { enabled: false },
          total_discount_amounts: [{ amount: 1999, discount: "di_free" }],
          lines: {
            has_more: false,
            data: [
              {
                amount: 1999,
                pricing: {
                  price_details: { price: OPERATION_PRICES.basico.id },
                },
                period: {
                  start: options.wrongDate ? now : p.phases[1].start_date,
                  end: p.phases[1].end_date,
                },
              },
            ],
          },
        };
      } else if (
        url.endsWith("/subscription_schedules/sub_sched_test") &&
        method === "POST"
      ) {
        expect(previewed).toBe(true);
        expect((body as URLSearchParams).get("proration_behavior")).toBe(
          "none",
        );
        schedule = {
          ...initial,
          ...structuredClone(command.planned_parameters),
        };
        if (options.taxChanged)
          (schedule.phases as Array<Obj>)[1].automatic_tax = { enabled: true };
        if (options.postTimeout) throw Error("fetch failed");
        result = schedule;
      } else if (url.endsWith("/subscription_schedules/sub_sched_test")) {
        result = structuredClone(schedule);
        if (options.scheduleChangedAfterPreview && previewed)
          (result as { phases: Obj[] }).phases[0].default_payment_method =
            "pm_changed";
        if (
          options.unknownSetting &&
          (result as { phases: Obj[] }).phases.length === 1
        )
          (result as { phases: Obj[] }).phases[0].unexpected_financial_setting =
            true;
      }
      return Response.json(result);
    },
  );
  return {
    fetcher,
    calls,
    command,
    source: s,
    setRetry() {
      command.schedule_id = "sub_sched_test";
      s.schedule = "sub_sched_test";
      const next = new Date(s.items.data[0].current_period_end * 1000);
      next.setUTCMonth(next.getUTCMonth() + 1);
      command.planned_parameters = {
        end_behavior: "release",
        proration_behavior: "none",
        phases: [
          { ...initial.phases[0], proration_behavior: "none" },
          {
            ...initial.phases[0],
            start_date: s.items.data[0].current_period_end,
            end_date: Math.floor(+next / 1000),
            items: [{ price: OPERATION_PRICES.basico.id, quantity: 1 }],
            proration_behavior: "none",
            metadata: {
              ...s.metadata,
              profile_id: s.metadata.profile_id,
              workspace_id: "private-owner",
              operations_migration_command: options.foreignFuture
                ? "another"
                : command.command_id,
            },
          },
        ],
      };
      schedule = { ...initial, ...structuredClone(command.planned_parameters) };
    },
  };
}
describe("reviewed same-subscription renewal migration commands", () => {
  it.each(["missing", "old-catalogue", "old-price"])(
    "blocks a queued %s approval before any Stripe write",
    async (kind) => {
      const t = setup();
      if (kind === "missing") {
        delete t.command.source_snapshot.approvedCatalogue;
        delete t.command.source_snapshot.targetPriceId;
      } else if (kind === "old-catalogue") {
        t.command.source_snapshot.approvedCatalogue = "2026-10-20";
      } else {
        t.command.source_snapshot.targetPriceId =
          "price_1USgZRGfzDhsgsQZaZYnAjZC";
      }
      expect(
        (await processOperationsMigrationCommand(env, t.fetcher)).outcome,
      ).toBe("blocked");
      expect(
        t.calls.some(
          (call) =>
            call.url.startsWith("https://api.stripe.com/") &&
            call.method !== "GET",
        ),
      ).toBe(false);
      expect(
        (t.calls.at(-1)?.body as { p_evidence: { reason: string } }).p_evidence
          .reason,
      ).toBe("migration_catalogue_review_required");
    },
  );
  it("explicitly enabled engine with an empty command queue performs no Stripe writes or grants", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input),
          method = init?.method || "GET";
        calls.push({ url, method });
        if (url === "https://api.stripe.com/v1/account" && method === "GET")
          return Response.json({ id: "acct_1SVLH2GfzDhsgsQZ" });
        if (
          url ===
            "https://supabase.test/rest/v1/rpc/claim_crm_operations_migration" &&
          method === "POST"
        )
          return Response.json(null);
        throw Error("Unexpected empty-queue operation");
      },
    );
    expect(
      await processOperationsMigrationCommand(
        {
          ...env,
          NEXT_PUBLIC_SUPABASE_URL: "https://supabase.test",
        },
        fetcher,
      ),
    ).toEqual({ enabled: true, scheduled: 0 });
    expect(calls).toEqual([
      { url: "https://api.stripe.com/v1/account", method: "GET" },
      {
        url: "https://supabase.test/rest/v1/rpc/claim_crm_operations_migration",
        method: "POST",
      },
    ]);
  });

  it("both gates are required before any provider or database access", async () => {
    const f = vi.fn();
    expect((await processOperationsMigrationCommand({}, f)).enabled).toBe(
      false,
    );
    expect(f).not.toHaveBeenCalled();
  });
  it("preserves current subscription, coupon, tax and paid expiry; previews before scheduling", async () => {
    const t = setup();
    const result = await processOperationsMigrationCommand(env, t.fetcher);
    expect(
      (t.calls.at(-1)?.body as { p_evidence?: { reason?: string } }).p_evidence
        ?.reason,
    ).toBe(undefined);
    expect(result).toMatchObject({ scheduled: 1, outcome: "scheduled" });
    const writes = t.calls.filter(
      (c) => c.url.startsWith("https://api.stripe.com") && c.method === "POST",
    );
    expect(writes.map((c) => c.url.split("/v1")[1])).toEqual([
      "/subscription_schedules",
      "/invoices/create_preview",
      "/subscription_schedules/sub_sched_test",
    ]);
    const phases = t.command.planned_parameters?.phases as Obj[];
    expect(phases[0].end_date).toBe(end);
    expect((phases[0].items as Obj[])[0].price).toBe("price_legacy");
    expect(phases[1].start_date).toBe(end);
    expect(phases[1].discounts).toEqual([{ discount: "di_free" }]);
    expect((t.calls.at(-1)?.body as Obj).p_result).toBe("scheduled");
  });
  it("annual paid-through is preserved until actual annual expiry before monthly phase", async () => {
    const t = setup({ annual: true });
    expect(
      (await processOperationsMigrationCommand(env, t.fetcher)).scheduled,
    ).toBe(1);
    expect((t.command.planned_parameters?.phases as Obj[])[1].start_date).toBe(
      now + 365 * 86400,
    );
  });
  for (const option of [
    "sourceChanged",
    "sourceChangedAfterPreview",
    "scheduleChangedAfterPreview",
    "foreignBinding",
    "nonzero",
    "wrongDate",
    "unknownSetting",
  ] as const)
    it(`fails closed before writing future phases: ${option}`, async () => {
      const t = setup({ [option]: true });
      expect(
        (await processOperationsMigrationCommand(env, t.fetcher)).outcome,
      ).toBe("blocked");
      expect(
        t.calls.some(
          (c) =>
            c.url.endsWith("/subscription_schedules/sub_sched_test") &&
            c.method === "POST",
        ),
      ).toBe(false);
    });
  it("ambiguous post response retries from persisted schedule and immutable planned phases", async () => {
    const t = setup({ postTimeout: true });
    expect(
      (await processOperationsMigrationCommand(env, t.fetcher)).outcome,
    ).toBe("retry");
    expect(t.command.planned_parameters).not.toBeNull();
    t.calls.length = 0;
    expect(
      (await processOperationsMigrationCommand(env, t.fetcher)).outcome,
    ).toBe("scheduled");
    expect(
      t.calls.some(
        (c) => c.url.endsWith("/subscription_schedules") && c.method === "POST",
      ),
    ).toBe(false);
    expect(
      t.calls.some(
        (c) =>
          c.url.endsWith("/subscription_schedules/sub_sched_test") &&
          c.method === "POST",
      ),
    ).toBe(false);
  });
  it("ambiguous create retries the same idempotency command and binds only its returned schedule", async () => {
    const t = setup({ createTimeout: true });
    expect(
      (await processOperationsMigrationCommand(env, t.fetcher)).outcome,
    ).toBe("retry");
    expect(
      (await processOperationsMigrationCommand(env, t.fetcher)).outcome,
    ).toBe("scheduled");
    expect(
      t.calls.filter(
        (c) => c.url.endsWith("/subscription_schedules") && c.method === "POST",
      ),
    ).toHaveLength(2);
    expect(
      t.calls.filter(
        (c) =>
          c.url.endsWith("/subscription_schedules/sub_sched_test") &&
          c.method === "POST",
      ),
    ).toHaveLength(1);
  });
  it("expired ambiguous create is held for review", async () => {
    const t = setup();
    t.command.first_attempt_at = new Date(
      Date.now() - 24 * 3600000,
    ).toISOString();
    expect(
      (await processOperationsMigrationCommand(env, t.fetcher)).outcome,
    ).toBe("blocked");
    expect(
      t.calls.some(
        (c) => c.url.endsWith("/subscription_schedules") && c.method === "POST",
      ),
    ).toBe(false);
  });
  it("never accepts a foreign pre-existing future phase as its own work", async () => {
    const t = setup({ retry: true, foreignFuture: true });
    t.setRetry();
    expect(
      (await processOperationsMigrationCommand(env, t.fetcher)).outcome,
    ).toBe("blocked");
  });
  it("post-write tax changes fail readback and never mark command complete", async () => {
    const t = setup({ taxChanged: true });
    expect(
      (await processOperationsMigrationCommand(env, t.fetcher)).outcome,
    ).toBe("blocked");
    expect((t.calls.at(-1)?.body as Obj).p_result).toBe("blocked");
  });
});
