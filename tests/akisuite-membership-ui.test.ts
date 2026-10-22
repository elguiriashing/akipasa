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

  it("keeps historic billing definitions while acquiring only canonical monthly operations", () => {
    expect(akisuitePlans.akihq_pro.monthlyCents).toBe(6000);
    expect(akisuitePriceCents("akihq_pro", "year")).toBe(57600);
    expect(grid).toContain("OPERATION_PRICES");
    expect(grid).not.toContain("akihq_standard");
    expect(grid).not.toContain("aki_enterprise");
    expect(grid).not.toContain("setInterval");
    const studio = readFileSync(
      "src/components/AkiSuiteMembershipStudio.tsx",
      "utf8",
    );
    for (const logo of ["/brand/business-mark.svg", "/brand/hq-mark.svg"])
      expect(studio).toContain(logo);
    const css = readFileSync(
      "src/components/AkiSuiteMembershipStudio.module.css",
      "utf8",
    );
    expect(css).toContain("grid-column: 1 / span 2");
    expect(css).toContain("grid-column: 3 / span 3");
    expect(css).toContain("scroll-snap-type: x proximity");
    expect(grid).toContain("AkiSuiteMembershipStudio");
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
    expect(grid).toContain('origin === "akipasa" && personalPremiumUnlocked');
    expect(actions).toContain("!personalPremiumLaunchOpen()");
  });
});
