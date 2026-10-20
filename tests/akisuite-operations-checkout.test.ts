import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  retrieve: vi.fn(),
  request: vi.fn(),
  rpc: vi.fn(),
  owner: true,
  legacy: false,
  activePrice: true,
  priceTax: "inclusive",
  defaultTax: "inclusive" as string | null,
  mapping: true,
  customer: "cus_test",
  serviceRpc: vi.fn(),
  session: null as null | string,
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/stripe", () => ({
  stripeRetrieve: mocks.retrieve,
  stripeRequest: mocks.request,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(Error(url), { digest: "NEXT_REDIRECT", url });
  },
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({
    rpc: mocks.serviceRpc,
    from: () => ({ upsert: async () => ({ error: null }) }),
  }),
}));
import { startOperationsCheckout } from "../src/app/[locale]/account/subscription/operations-actions";
import { OPERATION_PRICES } from "../src/lib/operations-billing/operations-contract.mjs";
function form() {
  const f = new FormData();
  f.set("locale", "en");
  f.set("tier", "basico");
  f.set("workspace", "private-test");
  for (const tool of ["crm", "tasks", "calendar", "employees"])
    f.append("tools", tool);
  return f;
}
beforeEach(() => {
  mocks.priceTax = "inclusive";
  mocks.defaultTax = "inclusive";
  vi.clearAllMocks();
  mocks.owner = true;
  mocks.legacy = false;
  mocks.activePrice = true;
  mocks.mapping = true;
  mocks.session = null;
  for (const name of [
    "AKIBUSINESS_OPERATIONS_CHECKOUT_READY",
    "AKIBUSINESS_OPERATIONS_BILLING_READY",
    "AKIBUSINESS_OPERATIONS_TAX_READY",
  ])
    vi.stubEnv(name, "true");
  vi.stubEnv("AKISUITE_TAX_REGISTRATION_ID", "taxreg_test");
  vi.stubEnv("STRIPE_BUSINESS_MONTHLY_PRICE_ID", "price_old");
  const db = {
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        in: () => q,
        maybeSingle: async () => ({
          data:
            table === "crm_workspaces"
              ? mocks.owner
                ? { id: "private-test" }
                : null
              : mocks.mapping
                ? { stripe_customer_id: mocks.customer }
                : null,
          error: null,
        }),
      };
      return q;
    },
    rpc: mocks.rpc,
  };
  mocks.requireUser.mockResolvedValue({
    supabase: db,
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      email: "test@example.invalid",
    },
  });
  mocks.retrieve.mockImplementation(async (path: string) => {
    if (path === "/account") return { id: "acct_1SVLH2GfzDhsgsQZ" };
    if (path.startsWith("/prices/"))
      return {
        id: OPERATION_PRICES.basico.id,
        active: mocks.activePrice,
        currency: "eur",
        unit_amount: 2499,
        tax_behavior: mocks.priceTax,
        recurring: { interval: "month", interval_count: 1 },
      };
    if (path === "/tax/settings")
      return { status: "active", defaults: { tax_behavior: mocks.defaultTax } };
    if (path.startsWith("/tax/registrations/"))
      return {
        status: "active",
        country: "ES",
        active_from: 1,
        expires_at: null,
      };
    if (path.startsWith("/subscriptions?"))
      return {
        has_more: false,
        data: mocks.legacy
          ? [
              {
                status: "active",
                items: { data: [{ price: { id: "price_old" } }] },
              },
            ]
          : [],
      };
    if (path.startsWith("/checkout/sessions/"))
      return {
        status: "open",
        customer: "cus_test",
        url: "https://checkout.stripe.com/c/pay/reused",
      };
    throw Error("Unexpected Stripe request");
  });
  mocks.rpc.mockImplementation(async () => ({
    data: {
      token: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      expires_at: new Date(Date.now() + 35 * 60000).toISOString(),
      session_id: mocks.session,
    },
    error: null,
  }));
  mocks.serviceRpc.mockResolvedValue({ error: null });
  mocks.request.mockImplementation(async (path: string) =>
    path === "/customers"
      ? { id: "cus_new" }
      : { id: "cs_test", url: "https://checkout.stripe.com/c/pay/test" },
  );
});
afterEach(() => vi.unstubAllEnvs());
describe("location-owned operating checkout", () => {
  it("is closed before release acceptance and performs no provider action", async () => {
    vi.stubEnv("AKIBUSINESS_OPERATIONS_CHECKOUT_READY", "false");
    await expect(startOperationsCheckout(form())).rejects.toMatchObject({
      url: expect.stringContaining("error=unavailable"),
    });
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("rejects arbitrary location ownership and malformed tool count server-side", async () => {
    mocks.owner = false;
    await expect(startOperationsCheckout(form())).rejects.toMatchObject({
      url: expect.stringContaining("error=owner"),
    });
    expect(mocks.request).not.toHaveBeenCalled();
    const f = form();
    f.delete("tools");
    await expect(startOperationsCheckout(f)).rejects.toMatchObject({
      url: expect.stringContaining("error=selection"),
    });
  });
  it("resolves unspecified price behavior from verified merchant default without changing tax settings", async () => {
    mocks.priceTax = "unspecified";
    await expect(startOperationsCheckout(form())).rejects.toMatchObject({
      url: expect.stringContaining("checkout.stripe.com"),
    });
    expect(
      mocks.request.mock.calls.some(([path]) =>
        String(path).startsWith("/tax/"),
      ),
    ).toBe(false);
  });
  it("keeps checkout closed when neither price nor merchant declares a resolved tax behavior", async () => {
    mocks.priceTax = "unspecified";
    mocks.defaultTax = null;
    await expect(startOperationsCheckout(form())).rejects.toMatchObject({
      url: expect.stringContaining("error=unavailable"),
    });
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("never sells inactive or unverified prices", async () => {
    mocks.activePrice = false;
    await expect(startOperationsCheckout(form())).rejects.toMatchObject({
      url: expect.stringContaining("error=unavailable"),
    });
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("blocks the legacy customer instead of creating a second subscription", async () => {
    mocks.legacy = true;
    await expect(startOperationsCheckout(form())).rejects.toMatchObject({
      url: expect.stringContaining("error=existing_subscription"),
    });
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("creates one idempotent hosted session carrying server-bound location metadata without granting tools", async () => {
    await expect(startOperationsCheckout(form())).rejects.toMatchObject({
      url: "https://checkout.stripe.com/c/pay/test",
    });
    const [path, params, key] = mocks.request.mock.calls[0];
    expect(path).toBe("/checkout/sessions");
    expect(key).toBe(
      "operations-checkout:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(params.get("subscription_data[metadata][workspace_id]")).toBe(
      "private-test",
    );
    expect(params.get("line_items[0][price]")).toBe(OPERATION_PRICES.basico.id);
    expect(params.has("payment_method_types")).toBe(false);
    expect(params.get("success_url")).toContain("checkout=pending");
    expect(mocks.serviceRpc.mock.calls.map((call) => call[0])).toEqual([
      "record_crm_operations_checkout_session",
    ]);
  });
  it("reuses an existing hosted session without making another purchase", async () => {
    mocks.session = "cs_old";
    await expect(startOperationsCheckout(form())).rejects.toMatchObject({
      url: "https://checkout.stripe.com/c/pay/reused",
    });
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("uses the established profile customer idempotency contract for new customers", async () => {
    mocks.mapping = false;
    await expect(startOperationsCheckout(form())).rejects.toMatchObject({
      url: "https://checkout.stripe.com/c/pay/test",
    });
    expect(mocks.request.mock.calls[0][2]).toBe(
      "akisuite-customer:11111111-1111-4111-8111-111111111111",
    );
  });
});
