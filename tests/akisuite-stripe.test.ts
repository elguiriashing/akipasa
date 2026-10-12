import { afterEach, describe, expect, it, vi } from "vitest";
import { configuredAkiSuitePriceId, matchConfiguredAkiSuitePriceId, verifiedAkiSuitePriceId } from "../src/lib/akisuite-stripe";
import { akisuitePriceCents } from "../src/lib/akisuite-catalogue";

describe("staged AkiSuite Stripe integration (no live checkout)", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it("rejects checkout while price IDs are unconfigured", () => {
    expect(() => configuredAkiSuitePriceId("aki_enterprise", "month")).toThrow("not configured");
  });
  it("checks that price, product metadata, currency and period match the catalogue", async () => {
    vi.stubEnv("STRIPE_AKISUITE_ENTERPRISE_MONTH_PRICE_ID", "price_enterprise123");
    vi.stubEnv("STRIPE_SECRET_KEY", "test_secret");
    const valid = { id: "price_enterprise123", product: "prod_enterprise", active: true, currency: "eur",
      unit_amount: akisuitePriceCents("aki_enterprise", "month"),
      recurring: { interval: "month", interval_count: 1 },
      metadata: { akisuite_plan: "aki_enterprise", akisuite_interval: "month" } };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(valid));
    vi.stubGlobal("fetch", fetchMock);
    await expect(verifiedAkiSuitePriceId("aki_enterprise", "month")).resolves.toBe("price_enterprise123");
    expect(matchConfiguredAkiSuitePriceId("price_enterprise123")).toEqual({ plan: "aki_enterprise", interval: "month" });
    fetchMock.mockResolvedValue(Response.json({ ...valid, unit_amount: 7998 }));
    await expect(verifiedAkiSuitePriceId("aki_enterprise", "month")).rejects.toThrow("approved catalogue");
  });
  it("does not permit standalone discounted AkiBusiness without AkiHQ Pro", async () => {
    await expect(verifiedAkiSuitePriceId("akihq_business_addon", "month", ["akihq_standard"]))
      .rejects.toThrow("AkiHQ Pro");
  });
});
