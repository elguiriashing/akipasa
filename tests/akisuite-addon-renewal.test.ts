import { afterEach, describe, expect, it, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc }) }));
import { stopIneligibleAkiSuiteAddonRenewals } from "../src/lib/akisuite-addon-renewal";
const env = {
  AKISUITE_SUBSCRIPTIONS_READY: "true",
  AKISUITE_BILLING_VERIFIED: "true",
  AKISUITE_STRIPE_ACCOUNT_ID: "acct_1SVLH2GfzDhsgsQZ",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "isolated-test-service",
  STRIPE_SECRET_KEY: "sk_test_isolated",
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("conditional add-on renewal", () => {
  it("does nothing until the isolated billing lifecycle has been verified", async () => {
    await expect(
      stopIneligibleAkiSuiteAddonRenewals({
        ...env,
        AKISUITE_BILLING_VERIFIED: "false",
      }),
    ).resolves.toMatchObject({ enabled: false, stopped: 0 });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("only stops renewal on the allowlisted add-on owned by the known customer", async () => {
    vi.stubEnv(
      "STRIPE_AKISUITE_AKIHQ_BUSINESS_ADDON_MONTH_PRICE_ID",
      "price_addon",
    );
    rpc.mockResolvedValue({
      data: [{ subscription_id: "sub_addon", customer_id: "cus_owner" }],
      error: null,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: env.AKISUITE_STRIPE_ACCOUNT_ID })),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            customer: "cus_owner",
            status: "active",
            cancel_at_period_end: false,
            items: { data: [{ price: { id: "price_addon" } }] },
          }),
        ),
      )
      .mockResolvedValueOnce(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      stopIneligibleAkiSuiteAddonRenewals(env),
    ).resolves.toMatchObject({ stopped: 1 });
    expect(fetchMock.mock.calls[2][1].method).toBe("POST");
    expect(fetchMock.mock.calls[2][1].body.toString()).toBe(
      "cancel_at_period_end=true",
    );
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE"),
    ).toBe(false);
  });
  it("refuses to mutate a mismatched customer or unrelated product", async () => {
    rpc.mockResolvedValue({
      data: [{ subscription_id: "sub_addon", customer_id: "cus_owner" }],
      error: null,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: env.AKISUITE_STRIPE_ACCOUNT_ID })),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            customer: "cus_other",
            items: { data: [{ price: { id: "unrelated" } }] },
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(stopIneligibleAkiSuiteAddonRenewals(env)).rejects.toThrow(
      "ownership or price mismatch",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
