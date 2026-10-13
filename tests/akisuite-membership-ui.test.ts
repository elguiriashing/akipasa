import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  akisuitePlans,
  akisuitePriceCents,
} from "../src/lib/akisuite-catalogue";

describe("AkiSuite localized membership catalogue", () => {
  const grid = readFileSync(
    "src/components/AkiSuiteMembershipGrid.tsx",
    "utf8",
  );
  const publicPage = readFileSync(
    "src/app/[locale]/membership/page.tsx",
    "utf8",
  );
  const accountPage = readFileSync(
    "src/app/[locale]/account/subscription/page.tsx",
    "utf8",
  );

  it("covers all products with bilingual copy and approved yearly pricing", () => {
    for (const key of Object.keys(
      akisuitePlans,
    ) as (keyof typeof akisuitePlans)[]) {
      expect(grid).toContain(key);
      expect(akisuitePriceCents(key, "year")).toBe(
        Math.round(akisuitePlans[key].monthlyCents * 9.6),
      );
    }
    expect(grid).toContain('locale === "es"');
    expect(grid).toContain("startAkiSuiteCheckout");
  });

  it("keeps seven plans visible and restores sector-specific AkiHQ tool previews", () => {
    expect(grid).toContain("businessCategories.map");
    expect(grid).toContain("getBusinessPackageHighlights");
    expect(grid).toContain("businessPackageTools[sectorTier]");
    expect(grid).toContain('aria-expanded={expandedPlans.includes(key)}');
    expect(grid).toContain("order.map");
  });

  it("renders the full catalogue regardless of checkout activation", () => {
    for (const source of [publicPage, accountPage]) {
      expect(source).toContain("AkiSuiteMembershipGrid");
      expect(source).toContain("suiteCatalogueReady");
      expect(source).toContain("akiSuiteCheckoutReady()");
      expect(source).not.toContain("MembershipPicker");
    }
    expect(publicPage).not.toContain("membership-details");
    expect(accountPage).not.toContain("Previous-plan access details");
  });

  it("routes the business and accommodation membership aliases to the shared catalogue", () => {
    for (const path of [
      "src/app/[locale]/business/memberships/page.tsx",
      "src/app/[locale]/duermo/memberships/page.tsx",
    ]) {
      const source = readFileSync(path, "utf8");
      expect(source).toContain("/membership?from=");
    }
  });
});
