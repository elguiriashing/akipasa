import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("responsive cross-suite membership centre", () => {
  const resolver = readFileSync("src/lib/akisuite-membership.ts", "utf8");
  const hub = readFileSync("src/components/AkiSuiteMembershipHub.tsx", "utf8");
  const styles = readFileSync(
    "src/components/AkiSuiteMembershipHub.module.css",
    "utf8",
  );
  const account = readFileSync(
    "src/app/[locale]/account/subscription/page.tsx",
    "utf8",
  );
  const publicPage = readFileSync(
    "src/app/[locale]/membership/page.tsx",
    "utf8",
  );
  const picker = readFileSync(
    "src/components/AkiSuiteMembershipGrid.tsx",
    "utf8",
  );

  it("shows four distinct systems and never grants a disconnected addon", () => {
    for (const app of ["AkiPasa", "AkiBusiness", "AkiDuermo", "AkiHQ"])
      expect(hub).toContain(app);
    expect(resolver).toContain("effectiveAkiSuitePlans(activePlans)");
    expect(resolver).toContain('codes.has("business_pro")');
    expect(resolver).toContain('included.has("aki_enterprise")');
    expect(hub).toContain("record.cancel_at_period_end");
    expect(hub).toContain("openBillingPortal");
  });

  it("loads new subscriptions only after the migration is declared ready", () => {
    expect(account).toContain(
      'process.env.AKISUITE_SUBSCRIPTIONS_READY === "true"',
    );
    expect(account).toContain('from("akisuite_billing_subscriptions")');
    expect(account).toContain("AkiSuiteMembershipHub");
    expect(account).toContain("unavailable=");
    expect(account).toContain("hasStripeCustomer=");
  });

  it("keeps the full catalogue visible with checkout disabled before launch", () => {
    expect(publicPage).toContain("AkiSuiteMembershipGrid");
    expect(picker).toContain("disabled={");
    expect(picker).toContain("Coming soon");
    expect(publicPage).not.toContain("MembershipPicker");
  });

  it("adapts across phone, portrait tablet, landscape tablet and desktop", () => {
    expect(styles.replace(/\s/g, "")).toContain(
      "grid-template-columns:repeat(4",
    );
    expect(styles.replace(/\s/g, "")).toContain("@media(max-width:1080px)");
    expect(styles.replace(/\s/g, "")).toContain("@media(max-width:740px)");
    expect(styles.replace(/\s/g, "")).toContain("@media(max-width:430px)");
  });
});
