import { describe, expect, it } from "vitest";
import { canReplaceAkiSuitePlan } from "../src/lib/akisuite-plan-change";
describe("replacement plan boundaries", () => {
  it("rejects replacing the qualifying Pro subscription with its own dependent add-on", () => {
    expect(
      canReplaceAkiSuitePlan("akihq_pro", "akihq_business_addon", []),
    ).toBe(false);
    expect(
      canReplaceAkiSuitePlan("akihq_pro", "akihq_business_addon", [
        "akiduermo_premium",
      ]),
    ).toBe(false);
    expect(canReplaceAkiSuitePlan("akihq_pro", "akihq_pro", [])).toBe(true);
  });
  it("replaces a single workspace plan and permits interval changes without a second subscription", () => {
    expect(canReplaceAkiSuitePlan("akihq_standard", "akihq_pro", [])).toBe(
      true,
    );
    expect(canReplaceAkiSuitePlan("akihq_pro", "akihq_standard", [])).toBe(
      true,
    );
    expect(
      canReplaceAkiSuitePlan("akipasa_premium", "akipasa_premium", []),
    ).toBe(true);
    expect(
      canReplaceAkiSuitePlan("akibusiness_premium", "aki_enterprise", []),
    ).toBe(true);
  });
  it("rejects ambiguous consolidation, scope changes and loss of a qualifying Pro plan", () => {
    expect(
      canReplaceAkiSuitePlan("akihq_standard", "aki_enterprise", [
        "akipasa_premium",
      ]),
    ).toBe(false);
    expect(
      canReplaceAkiSuitePlan("akihq_pro", "akihq_standard", [
        "akihq_business_addon",
      ]),
    ).toBe(false);
    expect(
      canReplaceAkiSuitePlan("akipasa_premium", "aki_enterprise", []),
    ).toBe(false);
    expect(
      canReplaceAkiSuitePlan("akihq_business_addon", "akibusiness_premium", [
        "akibusiness_premium",
      ]),
    ).toBe(false);
  });
});
