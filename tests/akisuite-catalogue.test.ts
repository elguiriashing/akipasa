import { describe, expect, it } from "vitest";
import { akisuitePlans, akisuitePriceCents, businessAddonEligible, effectiveAkiSuitePlans } from "../src/lib/akisuite-catalogue";
describe("AkiSuite commercial catalogue", () => {
  it("applies 20 percent off every yearly plan", () => {
    for (const plan of Object.keys(akisuitePlans) as (keyof typeof akisuitePlans)[]) {
      expect(akisuitePriceCents(plan, "year")).toBe(Math.round(akisuitePlans[plan].monthlyCents * 9.6));
    }
    expect(akisuitePriceCents("aki_enterprise", "year")).toBe(76790);
    expect(akisuitePriceCents("akipasa_premium", "year")).toBe(1910);
  });
  it("requires HQ Pro for discounted AkiBusiness", () => {
    expect(businessAddonEligible(["akihq_standard"])).toBe(false);
    expect(businessAddonEligible(["akihq_pro"])).toBe(true);
    expect(effectiveAkiSuitePlans(["akihq_business_addon"]).has("akibusiness_premium")).toBe(false);
    expect(effectiveAkiSuitePlans(["akihq_pro", "akihq_business_addon"]).has("akibusiness_premium")).toBe(true);
  });
  it("grants all four Enterprise components without Standard", () => {
    const access = effectiveAkiSuitePlans(["aki_enterprise"]);
    for (const plan of ["akipasa_premium","akibusiness_premium","akiduermo_premium","akihq_pro"] as const) expect(access.has(plan)).toBe(true);
    expect(access.has("akihq_standard")).toBe(false);
  });
});
