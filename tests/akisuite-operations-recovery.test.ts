import { operationsReleaseVars } from "./helpers/operations-release-config";
import { describe, it, expect, vi } from "vitest";
import {
  recoverOperationsBilling,
  recoverOperationsBillingWithNotifications,
} from "../src/lib/operations-recovery";
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
          amount: 1999,
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
    detached?: boolean;
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
        result = {
          ...binding,
          profileId: options.detached ? null : binding.profileId,
          token: options.checkout ? "token" : null,
        };
      return Response.json(result);
    },
  );
  return { fetcher, calls };
}
describe("central operations recovery", () => {
  it("in-flight detached identity is acknowledged without applying or rotating tools", async () => {
    const { fetcher, calls } = setup({ detached: true });
    expect(await recoverOperationsBilling(env, fetcher)).toMatchObject({
      applied: 0,
      failed: 0,
      deferred: 1,
    });
    expect(
      calls.some(
        (c) =>
          c.url.endsWith("apply_crm_operations_billing") ||
          c.url.endsWith("crm_toolbox_rotate"),
      ),
    ).toBe(false);
    expect(calls.at(-1)?.body?.p_ok).toBe(true);
  });

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
    expect(
      (
        await recoverOperationsBilling(
          {
            ...env,
            ...operationsReleaseVars,
            NEXT_PUBLIC_SUPABASE_URL: "https://supabase.test",
          },
          fetcher,
        )
      ).deferred,
    ).toBe(1);
    expect(
      calls
        .filter((c) => c.url.startsWith("https://api.stripe.com/"))
        .every((c) => c.method === "GET"),
    ).toBe(true);
    expect(
      calls.some((c) => c.url.endsWith("apply_crm_operations_billing")),
    ).toBe(false);
  });
});

describe("central billing cron owner notification retry", () => {
  it.each([200, 503])(
    "bounded delivery is isolated from committed billing and rotation (HTTP %s)",
    async (status) => {
      const t = setup();
      const notificationCalls: Array<{ url: string; init?: RequestInit }> = [];
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const fetcher: typeof fetch = async (input, init) => {
          const url = String(input);
          if (url.endsWith("/rpc/crm_toolbox_deliver_notifications")) {
            notificationCalls.push({ url, init });
            return new Response(null, { status });
          }
          return t.fetcher(input, init);
        };
        expect(
          await recoverOperationsBillingWithNotifications(
            {
              ...env,
              ...operationsReleaseVars,
              NEXT_PUBLIC_SUPABASE_URL: "https://supabase.test",
            },
            fetcher,
          ),
        ).toMatchObject({ enabled: true, applied: 1, failed: 0 });
        expect(notificationCalls).toHaveLength(1);
        expect(notificationCalls[0].url).toBe(
          "https://supabase.test/rest/v1/rpc/crm_toolbox_deliver_notifications",
        );
        expect(notificationCalls[0].init?.method).toBe("POST");
        expect(notificationCalls[0].init?.signal).toBeInstanceOf(AbortSignal);
        expect(JSON.parse(String(notificationCalls[0].init?.body))).toEqual({
          p_limit: 100,
        });
        expect(notificationCalls[0].init?.headers).toMatchObject({
          apikey: "private-service",
          Authorization: "Bearer private-service",
        });
        expect(
          t.calls.some((c) => c.url.endsWith("/apply_crm_operations_billing")),
        ).toBe(true);
        expect(t.calls.some((c) => c.url.endsWith("/crm_toolbox_rotate"))).toBe(
          true,
        );
        expect(t.calls.at(-1)?.body?.p_ok).toBe(true);
        if (status === 503)
          expect(log).toHaveBeenCalledWith(
            "operations_toolbox_notifications_retry",
          );
        else expect(log).not.toHaveBeenCalled();
      } finally {
        log.mockRestore();
      }
    },
  );
  it("a closed billing gate performs neither recovery nor notification access", async () => {
    const fetcher = vi.fn();
    expect(
      await recoverOperationsBillingWithNotifications(
        { ...env, AKIBUSINESS_OPERATIONS_BILLING_READY: "false" },
        fetcher,
      ),
    ).toEqual({ enabled: false, applied: 0, failed: 0, deferred: 0 });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
