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
    expect(grid).toContain("aria-expanded={expandedPlans.includes(key)}");
    expect(grid).toContain("order.filter");
  });

  it("uses original AkiSuite app marks for every plan including bundles", () => {
    expect(grid).toContain('"/pwa/akipasa-192.png"');
    expect(grid).toContain('"/brand/business-icon.png"');
    expect(grid).toContain('"/brand/duermo-icon.png"');
    expect(grid).toContain('"/brand/hq-icon.png"');
    expect(grid).toContain('plan === "aki_enterprise"');
    expect(grid).toContain('plan === "akihq_business_addon"');
    expect(grid).toContain("<PlanBrandLogos plan={key} />");
    expect(grid).toContain("brandLogos");
    expect(grid.indexOf("<PlanBrandLogos plan={key} />")).toBeLessThan(
      grid.indexOf("className={styles.mobileExpand}"),
    );
  });

  it("renders the full catalogue regardless of checkout activation", () => {
    for (const source of [publicPage, accountPage]) {
      expect(source).toContain("AkiSuiteMembershipGrid");
      expect(source).toContain("suiteCatalogueReady");
      expect(source).toContain("akiSuiteCheckoutReady()");
      expect(source).not.toContain("MembershipPicker");
    }
    expect(publicPage).toContain('purchaseMode="account"');
    expect(accountPage).not.toContain('purchaseMode="account"');
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

describe("Personal Premium launch is server-controlled", () => {
  it("keeps the catalogue scoped to its origin and the locked plans out of checkout", () => {
    const grid = readFileSync(
      "src/components/AkiSuiteMembershipGrid.tsx",
      "utf8",
    );
    const actions = readFileSync(
      "src/app/[locale]/account/subscription/akisuite-actions.ts",
      "utf8",
    );
    expect(grid).toContain("personalPremiumUnlocked = false");
    expect(grid).toContain(
      'originatingApp === "akipasa" && personalPremiumUnlocked',
    );
    expect(grid).toContain(
      'originatingApp === "akiduermo" && personalPremiumUnlocked',
    );
    expect(actions).toContain("!personalPremiumLaunchOpen()");
  });
});
