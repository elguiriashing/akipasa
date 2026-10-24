import { describe, expect, it } from "vitest";
import {
  akisuitePlans,
  akisuitePriceCents,
  businessAddonEligible,
  effectiveAkiSuitePlans,
  blocksAkiSuitePurchase,
  overlappingAkiSuitePlan,
} from "../src/lib/akisuite-catalogue";
describe("AkiSuite commercial catalogue", () => {
  it("preserves historical annual terms independently of revised monthly offers", () => {
    for (const plan of Object.keys(
      akisuitePlans,
    ) as (keyof typeof akisuitePlans)[]) {
      if (["akibusiness_premium", "akiduermo_premium"].includes(plan)) continue;
      expect(akisuitePriceCents(plan, "year")).toBe(
        Math.round(akisuitePlans[plan].monthlyCents * 9.6),
      );
    }
    expect(akisuitePriceCents("akibusiness_premium", "month")).toBe(1199);
    expect(akisuitePriceCents("akiduermo_premium", "month")).toBe(2499);
    expect(akisuitePriceCents("akibusiness_premium", "year")).toBe(14390);
    expect(akisuitePriceCents("akiduermo_premium", "year")).toBe(5750);
    expect(akisuitePriceCents("aki_enterprise", "year")).toBe(76790);
    expect(akisuitePriceCents("akipasa_premium", "year")).toBe(1910);
  });
  it("requires HQ Pro for discounted AkiBusiness", () => {
    expect(businessAddonEligible(["akihq_standard"])).toBe(false);
    expect(businessAddonEligible(["akihq_pro"])).toBe(true);
    expect(
      effectiveAkiSuitePlans(["akihq_business_addon"]).has(
        "akibusiness_premium",
      ),
    ).toBe(false);
    expect(
      effectiveAkiSuitePlans(["akihq_pro", "akihq_business_addon"]).has(
        "akibusiness_premium",
      ),
    ).toBe(true);
  });
  it("inherits Pro capabilities through Enterprise", () => {
    const access = effectiveAkiSuitePlans(["aki_enterprise"]);
    for (const plan of [
      "akipasa_premium",
      "akibusiness_premium",
      "akiduermo_premium",
      "akihq_pro",
    ] as const)
      expect(access.has(plan)).toBe(true);
    expect(access.has("akihq_standard")).toBe(true);
  });
  it("blocks a second charge while the first subscription can resume", () => {
    for (const status of [
      "active",
      "trialing",
      "past_due",
      "unpaid",
      "incomplete",
      "paused",
    ])
      expect(blocksAkiSuitePurchase(status)).toBe(true);
    expect(blocksAkiSuitePurchase("canceled")).toBe(false);
    expect(overlappingAkiSuitePlan("aki_enterprise", ["premium"])).toBe(true);
    expect(overlappingAkiSuitePlan("akihq_pro", ["business"])).toBe(true);
    expect(overlappingAkiSuitePlan("akipasa_premium", ["aki_enterprise"])).toBe(
      true,
    );
    expect(
      overlappingAkiSuitePlan("akibusiness_premium", ["akihq_business_addon"]),
    ).toBe(true);
    expect(
      overlappingAkiSuitePlan("akiduermo_premium", ["akipasa_premium"]),
    ).toBe(false);
  });
});

it("scopes business purchases while retaining Enterprise's payer-wide consumer benefit", async () => {
  const { akiSuiteRelevantSubscription } = await import(
    "../src/lib/akisuite-catalogue"
  );
  expect(
    akiSuiteRelevantSubscription("akipasa_premium", null, {
      plan_code: "aki_enterprise",
      workspace_id: "ws_other",
    }),
  ).toBe(true);
  expect(
    akiSuiteRelevantSubscription("akihq_pro", "ws_one", {
      plan_code: "akihq_pro",
      workspace_id: "ws_two",
    }),
  ).toBe(false);
  expect(
    akiSuiteRelevantSubscription("akihq_pro", "ws_one", {
      plan_code: "akihq_pro",
      workspace_id: "ws_one",
    }),
  ).toBe(true);
});
