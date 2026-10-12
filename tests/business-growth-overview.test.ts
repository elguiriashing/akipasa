import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AkiBusiness Growth rollout boundaries", () => {
  const page = readFileSync("src/app/[locale]/business/page.tsx", "utf8");
  const growth = readFileSync(
    "src/components/BusinessGrowthOverview.tsx",
    "utf8",
  );
  const css = readFileSync(
    "src/components/BusinessGrowthOverview.module.css",
    "utf8",
  );

  it("preserves authorized business entry and existing promotion request form", () => {
    expect(page).toContain("requireBusinessAccess");
    expect(page).toContain("BusinessGrowthOverview");
    expect(page).toContain("premiumEnabled={premiumEnabled}");
    expect(growth).toContain("!premiumActive &&");
    expect(growth).toContain("account/subscription?from=akibusiness");
    expect(page).toContain("action={requestPromotion}");
    expect(page).toContain('view === "analytics" || view === "growth"');
  });

  it("does not market synthetic analytics or enable unimplemented checkout", () => {
    expect(growth).toContain("Analytics unavailable");
    expect(growth).toContain("Coming later");
    expect(growth).toContain("Checkout is not available yet.");
    expect(growth).not.toContain("checkout.stripe.com");
    expect(growth).not.toContain("2,847");
  });

  it("provides phone, tablet and wide-screen layout rules", () => {
    expect(css.replace(/\s/g, "")).toContain("grid-template-columns:repeat(3");
    expect(css.replace(/\s/g, "")).toContain("@media(max-width:780px)");
    expect(css.replace(/\s/g, "")).toContain("@media(max-width:480px)");
  });
});
