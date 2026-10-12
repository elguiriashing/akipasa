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

  it("keeps legacy checkout visible until tax/account migration is explicitly ready", () => {
    for (const source of [publicPage, accountPage]) {
      expect(source).toContain("AkiSuiteMembershipGrid");
      expect(source).toContain("suiteCatalogueReady");
      expect(source).toContain(
        'process.env.AKISUITE_CHECKOUT_ENABLED === "true"',
      );
      expect(source).toContain('process.env.AKISUITE_TAX_READY === "true"');
      expect(source).toContain("MembershipPicker");
    }
  });
});
