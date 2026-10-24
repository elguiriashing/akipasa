import { beforeEach, afterEach, it, expect, vi } from "vitest";
const fixture = vi.hoisted(() => ({
  identity: "owner-a",
  allowed: true,
  terms: "2026-07-23",
  failed: "",
  suite: [] as { status: string }[],
  stripe: vi.fn(),
  client: vi.fn(),
  checks: [] as unknown[],
  authToken: "",
}));
vi.mock("@/lib/config", () => ({
  config: { currentTermsVersion: "2026-07-23" },
}));
vi.mock("@/lib/stripe", () => ({
  stripeRequest: (...args: unknown[]) => fixture.stripe(...args),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => {
    fixture.client(...args);
    return {
      auth: {
        getUser: async (token: string) => {
          fixture.authToken = token;
          return {
            data: { user: fixture.identity ? { id: fixture.identity } : null },
            error: null,
          };
        },
      },
      rpc: async () => ({ data: fixture.allowed, error: null }),
      from: (table: string) => {
        const result = () => ({
          data:
            table === "profiles"
              ? { terms_version: fixture.terms }
              : table === "billing_customers"
                ? { stripe_customer_id: "cus_verified_owner" }
                : table === "akisuite_billing_subscriptions"
                  ? fixture.suite
                  : [{ plan_code: "premium", status: "active" }],
          error: fixture.failed === table ? { code: "unavailable" } : null,
        });
        const query = {
          select: () => query,
          eq: (key: string, value: string) => {
            fixture.checks.push({ table, key, value });
            return query;
          },
          maybeSingle: async () => result(),
          then: (resolve: (v: ReturnType<typeof result>) => unknown) =>
            Promise.resolve(result()).then(resolve),
        };
        return query;
      },
    };
  },
}));
import { POST, OPTIONS } from "../src/app/api/account/portal/route";
beforeEach(() => {
  vi.clearAllMocks();
  fixture.identity = "owner-a";
  fixture.allowed = true;
  fixture.terms = "2026-07-23";
  fixture.failed = "";
  fixture.suite = [];
  fixture.checks = [];
  fixture.stripe.mockResolvedValue({
    url: "https://billing.stripe.com/p/session",
  });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fixture-public");
  vi.stubEnv("AKISUITE_SUBSCRIPTIONS_READY", "false");
  vi.stubEnv("STRIPE_AKIPASA_PORTAL_CONFIGURATION_ID", "bpc_legacy");
  vi.stubEnv("STRIPE_AKISUITE_MANAGEMENT_CONFIGURATION_ID", "");
});
afterEach(() => vi.unstubAllEnvs());
const request = (
  body: unknown = { action: "summary", product: "business", locale: "en" },
  origin = "https://akibusiness.com",
  authorization = "Bearer fixture-identity",
) =>
  new Request("https://akipasa.com/api/account/portal", {
    method: "POST",
    headers: { origin, authorization, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
it("denies cookie-only identity, forged origins and unapproved fields before any provider call", async () => {
  for (const r of [
    request(undefined, undefined, ""),
    request(undefined, "https://evil.test"),
    request({
      action: "portal",
      product: "business",
      locale: "en",
      customer: "cus_foreign",
    }),
  ])
    expect((await POST(r)).status).toBeGreaterThanOrEqual(400);
  expect(fixture.client).not.toHaveBeenCalled();
  expect(fixture.stripe).not.toHaveBeenCalled();
});
it("validates bearer identity and scopes every read to it, without returning customer IDs", async () => {
  const r = await POST(request());
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({
    subscriptions: [{ plan_code: "premium", status: "active" }],
    hasCustomer: true,
  });
  expect(fixture.authToken).toBe("fixture-identity");
  expect(fixture.checks).toEqual(
    expect.arrayContaining([
      { table: "billing_customers", key: "profile_id", value: "owner-a" },
    ]),
  );
  expect(r.headers.get("Cache-Control")).toContain("no-store");
  expect(r.headers.get("Access-Control-Allow-Origin")).toBe(
    "https://akibusiness.com",
  );
  expect(fixture.stripe).not.toHaveBeenCalled();
});
it.each(["duermo", "coches", "hq", "business", "pasa"])(
  "returns %s portal sessions only to that product",
  async (product) => {
    const origins = {
      duermo: "https://akiduermo.com",
      coches: "https://akicoches.com",
      hq: "https://akihq.app",
      business: "https://akibusiness.com",
      pasa: "https://akipasa.com",
    };
    const origin = origins[product as keyof typeof origins];
    const r = await POST(
      request({ action: "portal", product, locale: "es" }, origin),
    );
    expect(r.status).toBe(200);
    const parameters = fixture.stripe.mock.calls[0][1] as URLSearchParams;
    expect(parameters.get("customer")).toBe("cus_verified_owner");
    expect(new URL(parameters.get("return_url")!).origin).toBe(origin);
    expect(parameters.get("return_url")).toContain(
      product === "business"
        ? "locale=es"
        : product === "hq" || product === "pasa"
          ? "/es/"
          : "lang=es",
    );
    expect(parameters.get("configuration")).toBe("bpc_legacy");
  },
);
it("fails closed on shared eligibility and terms", async () => {
  fixture.allowed = false;
  expect((await POST(request())).status).toBe(403);
  fixture.allowed = true;
  fixture.terms = "outdated";
  expect((await POST(request())).status).toBe(403);
  expect(fixture.stripe).not.toHaveBeenCalled();
});
it("does not open a portal after partial billing failure", async () => {
  fixture.failed = "billing_subscriptions";
  expect(
    (
      await POST(
        request({ action: "portal", product: "business", locale: "en" }),
      )
    ).status,
  ).toBe(503);
  expect(fixture.stripe).not.toHaveBeenCalled();
});
it("retains suite management-only portal configuration instead of default plan changing", async () => {
  vi.stubEnv("AKISUITE_SUBSCRIPTIONS_READY", "true");
  fixture.suite = [{ status: "active" }];
  expect(
    (
      await POST(
        request({ action: "portal", product: "business", locale: "en" }),
      )
    ).status,
  ).toBe(503);
  expect(fixture.stripe).not.toHaveBeenCalled();
  vi.stubEnv("STRIPE_AKISUITE_MANAGEMENT_CONFIGURATION_ID", "bpc_management");
  expect(
    (
      await POST(
        request({ action: "portal", product: "business", locale: "en" }),
      )
    ).status,
  ).toBe(200);
  expect(
    (fixture.stripe.mock.calls[0][1] as URLSearchParams).get("configuration"),
  ).toBe("bpc_management");
});
it("rejects provider redirects outside Stripe", async () => {
  fixture.stripe.mockResolvedValue({ url: "https://evil.test" });
  expect(
    (
      await POST(
        request({ action: "portal", product: "business", locale: "en" }),
      )
    ).status,
  ).toBe(503);
});
it("preflights only canonical first-party origins", () => {
  expect(
    OPTIONS(
      new Request("https://akipasa.com/api/account/portal", {
        headers: { origin: "https://evil.test" },
      }),
    ).status,
  ).toBe(403);
  expect(
    OPTIONS(
      new Request("https://akipasa.com/api/account/portal", {
        headers: { origin: "https://akicoches.com" },
      }),
    ).headers.get("Access-Control-Allow-Origin"),
  ).toBe("https://akicoches.com");
});
it("bounds malformed and oversized bodies before creating a Supabase client", async () => {
  for (const body of [
    "{",
    JSON.stringify({
      action: "summary",
      product: "business",
      locale: "en",
      padding: "x".repeat(2000),
    }),
  ]) {
    const response = await POST(
      new Request("https://akipasa.com/api/account/portal", {
        method: "POST",
        headers: {
          origin: "https://akibusiness.com",
          authorization: "Bearer fixture",
          "content-type": "application/json",
        },
        body,
      }),
    );
    expect(response.status).toBe(400);
  }
  expect(fixture.client).not.toHaveBeenCalled();
  expect(fixture.stripe).not.toHaveBeenCalled();
});
