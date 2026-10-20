import { describe, it, expect, vi } from "vitest";
import { recoverOperationsBilling } from "../src/lib/operations-recovery";
import { OPERATION_PRICES } from "../src/lib/operations-billing/operations-contract.mjs";
const env = {
  AKIBUSINESS_OPERATIONS_BILLING_READY: "true",
  NEXT_PUBLIC_SUPABASE_URL: "https://supabase.test",
  SUPABASE_SERVICE_ROLE_KEY: "private-service",
  STRIPE_SECRET_KEY: "private-stripe",
};
const queue = {
  kind: "subscription",
  id: "sub_test",
  subscription_id: "sub_test",
  workspace_id: "private-test",
  customer_id: "cus_test",
  lease: "lease",
};
const now = Math.floor(Date.now() / 1000),
  tools = ["crm", "tasks", "calendar", "employees"];
const binding = {
  subscriptionId: "sub_test",
  customerId: "cus_test",
  workspaceId: "private-test",
  profileId: "profile",
  tier: null,
  tools: null,
  anchor: null,
  paidUntil: null,
  nextTier: "basico",
  nextTools: tools,
  token: null,
};
const subscription = {
  id: "sub_test",
  customer: "cus_test",
  status: "active",
  billing_cycle_anchor: now - 86400,
  metadata: { workspace_id: "private-test", profile_id: "profile" },
  items: {
    data: [
      {
        id: "si_test",
        quantity: 1,
        current_period_end: now + 86400,
        price: {
          id: OPERATION_PRICES.basico.id,
          currency: "eur",
          recurring: { interval: "month", interval_count: 1 },
        },
      },
    ],
  },
  latest_invoice: {
    id: "in_paid",
    customer: "cus_test",
    status: "paid",
    subscription: "sub_test",
    lines: {
      data: [
        {
          subscription_item: "si_test",
          price: OPERATION_PRICES.basico.id,
          amount: 2499,
          period: { start: now - 86400, end: now + 86400 },
        },
      ],
    },
  },
};
function setup(
  options: {
    checkout?: boolean;
    unpaid?: boolean;
    badCustomer?: boolean;
    providerFailure?: boolean;
    legacy?: boolean;
  } = {},
) {
  const calls: Array<{
    url: string;
    method: string;
    body: Record<string, unknown> | null;
  }> = [];
  const row = options.checkout
    ? {
        ...queue,
        kind: "checkout",
        id: "token",
        session_id: "cs_test_paid",
        subscription_id: undefined,
      }
    : queue;
  const fetcher = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ url, method: init?.method || "GET", body });
      let result: unknown = null;
      if (url.endsWith("/account")) result = { id: "acct_1SVLH2GfzDhsgsQZ" };
      else if (url.endsWith("claim_crm_operations_recovery")) result = [row];
      else if (url.includes("/checkout/sessions/"))
        result = {
          customer: options.badCustomer ? "cus_other" : "cus_test",
          subscription: "sub_test",
        };
      else if (url.includes("/subscriptions/")) {
        if (options.providerFailure) return new Response("{}", { status: 500 });
        result = structuredClone(subscription);
        const s = result as typeof subscription;
        if (options.checkout)
          (s.metadata as Record<string, string>).operations_checkout_token =
            "token";
        if (options.unpaid) s.latest_invoice.status = "open";
        if (options.legacy) s.items.data[0].price.id = "legacy";
      } else if (url.endsWith("crm_operations_binding"))
        result = { ...binding, token: options.checkout ? "token" : null };
      return Response.json(result);
    },
  );
  return { fetcher, calls };
}
describe("central operations recovery", () => {
  it("gate off has no outbound traffic", async () => {
    const f = vi.fn();
    expect((await recoverOperationsBilling({}, f)).enabled).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
  it("recovers paid first invoice without a pre-existing toolbox", async () => {
    const { fetcher, calls } = setup();
    expect(await recoverOperationsBilling(env, fetcher)).toMatchObject({
      applied: 1,
      failed: 0,
    });
    expect(
      calls.find((c) => c.url.endsWith("apply_crm_operations_billing"))?.body,
    ).toMatchObject({
      p_tier: "basico",
      p_tools: tools,
      p_evidence: "stripe-invoice:in_paid",
    });
    expect(
      calls
        .filter((c) => c.url.startsWith("https://api.stripe.com"))
        .every((c) => c.method === "GET"),
    ).toBe(true);
    expect(calls.at(-1)?.body?.p_ok).toBe(true);
  });
  it("recovers hosted checkout before subscription binding was created", async () => {
    const { fetcher, calls } = setup({ checkout: true });
    expect((await recoverOperationsBilling(env, fetcher)).applied).toBe(1);
    expect(
      calls.find((c) => c.url.endsWith("crm_operations_binding"))?.body
        ?.p_token,
    ).toBe("token");
  });
  it("open first invoice waits without granting access", async () => {
    const { fetcher, calls } = setup({ unpaid: true });
    expect((await recoverOperationsBilling(env, fetcher)).deferred).toBe(1);
    expect(
      calls.some((c) => c.url.endsWith("apply_crm_operations_billing")),
    ).toBe(false);
  });
  it("foreign checkout cannot bind and another item is not silently granted", async () => {
    const { fetcher, calls } = setup({ checkout: true, badCustomer: true });
    expect((await recoverOperationsBilling(env, fetcher)).failed).toBe(1);
    expect(calls.at(-1)?.body?.p_ok).toBe(false);
    expect(
      calls.some((c) => c.url.endsWith("apply_crm_operations_billing")),
    ).toBe(false);
  });
  it("provider failure records retry outcome and does not abort queue finalisation", async () => {
    const { fetcher, calls } = setup({ providerFailure: true });
    expect((await recoverOperationsBilling(env, fetcher)).failed).toBe(1);
    expect(calls.at(-1)?.body?.p_ok).toBe(false);
  });
  it("bound legacy price waits for reviewed future migration rather than enrolling early", async () => {
    const { fetcher, calls } = setup({ legacy: true });
    expect((await recoverOperationsBilling(env, fetcher)).deferred).toBe(1);
    expect(
      calls.some((c) => c.url.endsWith("apply_crm_operations_billing")),
    ).toBe(false);
  });
});
