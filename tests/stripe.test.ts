import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCalendar } from "../src/lib/calendar";
import { readBoundedText } from "../src/lib/request-security";
import {
  stripeBillingPlanForPrice,
  stripeValidatedPriceId,
  stripeEventSubscriptionId,
  billingAmounts,
  verifyStripeSignature,
} from "../src/lib/stripe";

async function sign(payload: string, timestamp: number, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const signature = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  return `t=${timestamp},v1=${signature}`;
}

describe("Stripe webhook signatures", () => {
  it("bounds raw webhook bodies while preserving their exact text", async () => {
    const payload = '{"id":"evt_test","unicode":"Málaga"}';
    await expect(
      readBoundedText(
        new Request("https://akipasa.com/api/stripe/webhook", {
          method: "POST",
          body: payload,
        }),
        256_000,
      ),
    ).resolves.toBe(payload);
    await expect(
      readBoundedText(
        new Request("https://akipasa.com/api/stripe/webhook", {
          method: "POST",
          body: "x".repeat(33),
        }),
        32,
      ),
    ).rejects.toMatchObject({
      status: 413,
      code: "payload_too_large",
    });
  });

  it("accepts a current valid signature", async () => {
    const payload = '{"id":"evt_test"}';
    const timestamp = 1_800_000_000;
    const header = await sign(payload, timestamp, "whsec_test");
    await expect(
      verifyStripeSignature(payload, header, "whsec_test", timestamp),
    ).resolves.toBe(true);
  });

  it("rejects tampering and stale signatures", async () => {
    const timestamp = 1_800_000_000;
    const header = await sign("original", timestamp, "whsec_test");
    await expect(
      verifyStripeSignature("tampered", header, "whsec_test", timestamp),
    ).resolves.toBe(false);
    await expect(
      verifyStripeSignature("original", header, "whsec_test", timestamp + 301),
    ).resolves.toBe(false);
  });
});

describe("paid entitlement contracts", () => {
  it("builds a standards-compatible calendar without allowing field injection", () => {
    const calendar = buildCalendar(
      [
        {
          uid: "event-1@akipasa.com",
          title: "Live, local; music",
          description: ["First line", "Second line"].join("\n"),
          location: "Venue, Málaga",
          startsAt: "2026-08-12T18:00:00.000Z",
          endsAt: "2026-08-12T20:00:00.000Z",
          url: "https://akipasa.com/en/events/live-local",
        },
      ],
      new Date("2026-08-10T00:00:00.000Z"),
    );

    expect(calendar).toContain("BEGIN:VCALENDAR\r\nVERSION:2.0");
    expect(calendar).toContain("DTSTART:20260812T180000Z");
    expect(calendar).toContain("SUMMARY:Live\\, local\\; music");
    expect(calendar).toContain("DESCRIPTION:First line\\nSecond line");
    expect(calendar).toMatch(/END:VCALENDAR\r\n$/);
  });

  it("keeps Stripe state webhook-owned and protects against old events", () => {
    const migration = readFileSync(
      "database/migrations/0033_premium_entitlements.sql",
      "utf8",
    );
    expect(migration).toContain("stripe_event_created_at");
    expect(migration).toContain("sync_stripe_subscription");
    expect(migration).toContain(
      "excluded.stripe_event_created_at >= billing_subscriptions.stripe_event_created_at",
    );
    expect(migration).toContain("membership_tier");
    expect(migration).toContain("business_plan_active");
    expect(migration).toContain("then 20 else 10");
  });

  it("models Business Pro as its own paid plan without per-module billing", () => {
    const stripe = readFileSync("src/lib/stripe.ts", "utf8");
    const webhook = readFileSync("src/app/api/stripe/webhook/route.ts", "utf8");
    const migration = readFileSync(
      "database/migrations/0074_crm_multi_tenant_workspaces.sql",
      "utf8",
    );

    expect(stripe).toContain('"business_pro"');
    expect(stripe).toContain("STRIPE_BUSINESS_PRO_MONTHLY_PRICE_ID");
    expect(stripe).toContain("STRIPE_BUSINESS_PRO_YEARLY_PRICE_ID");
    expect(webhook).toContain('["premium", "business", "business_pro"]');
    expect(migration).toContain("crm_workspace_entitlements");
    expect(migration).toContain("crm_staff_set_workspace_tool");
    expect(migration).not.toContain("module_price");
  });

  it("updates an existing Business subscription without creating a second one", () => {
    const actions = readFileSync(
      "src/app/[locale]/account/subscription/actions.ts",
      "utf8",
    );

    expect(actions).toContain('subscription.plan_code === "business"');
    expect(actions).toContain('parsed.data.plan === "business_pro"');
    expect(actions).toContain('payment_behavior: "pending_if_incomplete"');
    expect(actions).toContain('proration_behavior: "always_invoice"');
    expect(actions).toContain("business-pro-upgrade:");
    expect(actions).toContain("/subscriptions/${subscriptionId}");
  });

  it("recognizes portal upgrades from the subscription price instead of stale metadata", () => {
    const previous = process.env.STRIPE_BUSINESS_PRO_MONTHLY_PRICE_ID;
    process.env.STRIPE_BUSINESS_PRO_MONTHLY_PRICE_ID = "price_business_pro";
    expect(stripeBillingPlanForPrice("price_business_pro")).toEqual({
      plan: "business_pro",
      interval: "month",
    });
    if (previous === undefined)
      delete process.env.STRIPE_BUSINESS_PRO_MONTHLY_PRICE_ID;
    else process.env.STRIPE_BUSINESS_PRO_MONTHLY_PRICE_ID = previous;
  });
});

describe("live catalogue validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  const selections = [
    ["premium", "month", "STRIPE_PREMIUM_MONTHLY_PRICE_ID"],
    ["premium", "year", "STRIPE_PREMIUM_YEARLY_PRICE_ID"],
    ["business", "month", "STRIPE_BUSINESS_MONTHLY_PRICE_ID"],
    ["business", "year", "STRIPE_BUSINESS_YEARLY_PRICE_ID"],
    ["business_pro", "month", "STRIPE_BUSINESS_PRO_MONTHLY_PRICE_ID"],
    ["business_pro", "year", "STRIPE_BUSINESS_PRO_YEARLY_PRICE_ID"],
  ] as const;
  it.each(selections)(
    "validates and maps %s %s",
    async (plan, interval, env) => {
      vi.stubEnv(env, "price_selected");
      vi.stubEnv("STRIPE_SECRET_KEY", "test-key");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          Response.json({
            id: "price_selected",
            active: true,
            currency: "eur",
            unit_amount: billingAmounts[`${plan}:${interval}`],
            recurring: { interval, interval_count: 1 },
          }),
        ),
      );
      expect(await stripeValidatedPriceId({ plan, interval })).toBe(
        "price_selected",
      );
      expect(stripeBillingPlanForPrice("price_selected")).toEqual({
        plan,
        interval,
      });
    },
  );
  it.each([
    { unit_amount: 500 },
    { active: false },
    { currency: "usd" },
    { recurring: { interval: "year", interval_count: 1 } },
    { recurring: { interval: "month", interval_count: 3 } },
  ])("blocks an incorrect catalogue price: %j", async (override) => {
    vi.stubEnv("STRIPE_PREMIUM_MONTHLY_PRICE_ID", "price_selected");
    vi.stubEnv("STRIPE_SECRET_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          id: "price_selected",
          active: true,
          currency: "eur",
          unit_amount: 199,
          recurring: { interval: "month", interval_count: 1 },
          ...override,
        }),
      ),
    );
    await expect(
      stripeValidatedPriceId({ plan: "premium", interval: "month" }),
    ).rejects.toThrow("advertised package");
  });
  it("resolves both invoice API shapes and expanded Stripe objects", () => {
    expect(
      stripeEventSubscriptionId("invoice.paid", {
        parent: { subscription_details: { subscription: "sub_new" } },
      }),
    ).toBe("sub_new");
    expect(
      stripeEventSubscriptionId("invoice.payment_failed", {
        subscription: "sub_legacy",
      }),
    ).toBe("sub_legacy");
    expect(
      stripeEventSubscriptionId("checkout.session.async_payment_succeeded", {
        subscription: { id: "sub_expanded" },
      }),
    ).toBe("sub_expanded");
    expect(stripeEventSubscriptionId("invoice.paid", {})).toBeNull();
    expect(stripeBillingPlanForPrice("price_unrelated")).toBeNull();
  });
});

const webhookDb = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => webhookDb,
}));
vi.mock("@/lib/stripe", async () => await import("../src/lib/stripe"));
vi.mock(
  "@/lib/request-security",
  async () => await import("../src/lib/request-security"),
);

describe("payment event fulfillment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });
  async function deliver(
    type: string,
    object: Record<string, unknown>,
    status = "active",
    price = "price_premium",
    duplicate = false,
  ) {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("STRIPE_SECRET_KEY", "test-key");
    vi.stubEnv("STRIPE_PREMIUM_MONTHLY_PRICE_ID", "price_premium");
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        id: "sub_test",
        customer: "cus_test",
        status,
        metadata: { profile_id: "profile_test", plan_code: "business_pro" },
        items: {
          data: [{ price: { id: price }, current_period_end: 2_000_000_000 }],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    webhookDb.rpc.mockImplementation(async (name: string) => ({
      data: name === "claim_stripe_webhook_event" ? !duplicate : true,
      error: null,
    }));
    webhookDb.from.mockImplementation(() => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: null, error: null }),
        upsert: async () => ({ error: null }),
        update: () => ({ eq: async () => ({ error: null }) }),
      };
      return chain;
    });
    const created = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
      id: "evt_test",
      type,
      created,
      data: { object },
    });
    const { POST } = await import("../src/app/api/stripe/webhook/route");
    const response = await POST(
      new Request("https://akipasa.com/api/stripe/webhook", {
        method: "POST",
        body: payload,
        headers: {
          "stripe-signature": await sign(payload, created, "whsec_test"),
        },
      }),
    );
    return {
      response,
      fetchMock,
      sync: webhookDb.rpc.mock.calls.filter(
        ([name]) => name === "sync_stripe_subscription",
      ),
    };
  }
  it.each([
    [
      "checkout.session.completed",
      { subscription: "sub_test", payment_status: "paid" },
      "active",
    ],
    [
      "checkout.session.async_payment_succeeded",
      { subscription: "sub_test", payment_status: "paid" },
      "active",
    ],
    [
      "invoice.paid",
      { parent: { subscription_details: { subscription: "sub_test" } } },
      "active",
    ],
    ["invoice.payment_failed", { subscription: "sub_test" }, "past_due"],
    ["customer.subscription.deleted", { id: "sub_test" }, "canceled"],
    ["customer.subscription.paused", { id: "sub_test" }, "paused"],
    ["customer.subscription.resumed", { id: "sub_test" }, "active"],
  ])(
    "syncs %s from Stripe to the correct access tier",
    async (type, object, status) => {
      const result = await deliver(
        type as string,
        object as Record<string, unknown>,
        status as string,
      );
      expect(result.response.status).toBe(200);
      expect(result.sync).toHaveLength(1);
      expect(result.sync[0][1]).toMatchObject({
        p_plan: "premium",
        p_interval: "month",
        p_status: status,
        p_profile: "profile_test",
      });
    },
  );
  it("does not grant unpaid Checkout or duplicate events", async () => {
    const unpaid = await deliver("checkout.session.completed", {
      subscription: "sub_test",
      payment_status: "unpaid",
    });
    expect(unpaid.sync).toHaveLength(0);
    expect(unpaid.fetchMock).not.toHaveBeenCalled();
    const duplicate = await deliver(
      "invoice.paid",
      { subscription: "sub_test" },
      "active",
      "price_premium",
      true,
    );
    expect(duplicate.sync).toHaveLength(0);
    expect(duplicate.fetchMock).not.toHaveBeenCalled();
  });
  it("does not grant access for unrelated products with misleading metadata", async () => {
    const result = await deliver(
      "customer.subscription.created",
      { id: "sub_test" },
      "active",
      "price_unrelated",
    );
    expect(result.response.status).toBe(200);
    expect(result.sync).toHaveLength(0);
  });
  it("uses current cancellation state when an old paid invoice arrives", async () => {
    const result = await deliver(
      "invoice.paid",
      { subscription: "sub_test" },
      "canceled",
    );
    expect(result.sync[0][1]).toMatchObject({ p_status: "canceled" });
  });
});
