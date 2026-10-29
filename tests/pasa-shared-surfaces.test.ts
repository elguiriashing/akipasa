import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("AkiPasa shared redesign system", () => {
  it("loads one canonical surface stylesheet from the consumer app shell", () => {
    const shell = source("src/components/AppShell.tsx");
    expect(shell).toContain('import "./PasaSharedSurfaces.css";');
    expect(shell).toContain("<PasaBottomDock locale={locale} />");
    expect(shell).toContain("<LaunchRibbon locale={locale} />");
    expect(shell).not.toContain('<nav className="app-bottom-nav"');
  });

  it("reuses the existing authenticated WorkspaceShell for each operational area", () => {
    for (const context of ["account", "admin", "staff"]) {
      const layout = source(`src/app/[locale]/${context}/layout.tsx`);
      expect(layout).toContain("WorkspaceShell");
      expect(layout).toContain("<WorkspaceShell");
      expect(layout).toContain("requireUser");
    }
  });

  it("has shared reusable styles for controls, workspaces and primary detail pages", () => {
    const surfaces = source("src/components/PasaSharedSurfaces.css");
    for (const selector of [
      ".workspace-grid-system",
      ".workspace-sidebar",
      ".workspace-navigation",
      ".workspace-section-heading",
      ".account-workspace",
      ".admin-workspace",
      ".staff-workspace",
      ".spotlight-page",
    ]) {
      expect(surfaces, selector).toContain(selector);
    }
    expect(surfaces).toContain('html[data-theme="light"]');
    expect(surfaces).toContain("prefers-reduced-transparency");
    expect(surfaces).toContain("safe-area-inset-bottom");
  });

  it("keeps real venue and event actions inside existing spotlight templates", () => {
    for (const kind of ["events", "venues"]) {
      const page = source(`src/app/[locale]/${kind}/[slug]/page.tsx`);
      expect(page).toContain("spotlight-page");
      expect(page).toContain("spotlight-detail.css");
    }
  });

  it("retains event-card styles and a separate sponsored class after consolidation", () => {
    const card = source("src/components/EventCard.tsx");
    expect(card).toContain("card pasa-event-card event-plan-card");
    expect(card).toContain('"card-featured": result.event.sponsored');
    expect(source("src/app/globals.css")).toContain("aki-event-cards.css");
    expect(source("src/app/aki-event-cards.css")).toContain(
      "prefers-reduced-motion: reduce",
    );
  });

  it("shares responsive booking styling without replacing protected booking handlers", () => {
    const css = source("src/components/PasaSharedSurfaces.css");
    expect(css).toContain('data-pasa-surface="booking"');
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(css).toContain("@media (max-width: 759px)");
    expect(css).toContain("color-scheme: light");
    for (const kind of ["events", "venues"]) {
      const booking = source(`src/app/[locale]/${kind}/[slug]/book/page.tsx`);
      expect(booking).toContain("requireUser");
      expect(booking).toContain('.eq("status", "published")');
      expect(booking).toContain(
        `request${kind === "events" ? "Event" : "Venue"}Booking`,
      );
    }
  });

  it("styles business applications without changing review actions", () => {
    const css = source("src/components/PasaSharedSurfaces.css");
    const page = source("src/app/[locale]/business/apply/page.tsx");
    expect(css).toContain(".business-application-steps");
    expect(css).toContain(".business-application-form-layout");
    expect(css).toContain("@media (max-width: 800px)");
    expect(css).toContain("safe-area-inset-bottom");
    expect(css).toContain('html[data-theme="light"]');
    expect(page).toContain("requireUser");
    expect(page).toContain("submitBusinessApplication");
    expect(page).toContain("business-application-checklist");
    expect(page).toContain("No se te ha cobrado nada");
    expect(page).toContain("You have not been charged");
  });

  it("uses shared terms styling while keeping terms consent server-owned", () => {
    const css = source("src/components/PasaSharedSurfaces.css");
    const page = source("src/app/[locale]/terms/accept/page.tsx");
    const actions = source("src/app/[locale]/terms/accept/actions.ts");
    expect(css).toContain(".pasa-terms-accept-documents");
    expect(css).toContain(".pasa-terms-accept-consent");
    expect(css).toContain("safe-area-inset-bottom");
    expect(css).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(page).toContain("pasa-terms-accept-page");
    expect(page).toContain("pasa-terms-accept-panel");
    expect(page).toContain('type="checkbox"');
    expect(page).toContain('name="acceptTerms"');
    expect(page).toContain("safeAuthDestination");
    expect(actions).toContain("safeAuthDestination");
    expect(actions).toContain("accept_current_terms");
    expect(actions).toContain('formData.get("acceptTerms") !== "accepted"');
  });

  it("uses shared conversion surfaces while keeping plan and referral gates server-owned", () => {
    const css = source("src/components/PasaSharedSurfaces.css");
    const membership = source("src/app/[locale]/membership/page.tsx");
    const referral = source("src/app/[locale]/referrals/page.tsx");
    expect(css).toContain(".pasa-conversion-hero");
    expect(css).toContain(".pasa-conversion-panel");
    expect(css).toContain(".pasa-membership-intro");
    expect(css).toContain(".pasa-referral-entry");
    expect(css).toContain("safe-area-inset-bottom");
    expect(css).toContain('html[data-theme="light"]');
    expect(membership).toContain("pasa-membership-intro");
    expect(membership).toContain("AkiSuiteMembershipGrid");
    expect(membership).toContain("akiSuiteCheckoutReady");
    expect(membership).toContain("personalPremiumLaunchOpen()");
    expect(membership).toContain("optionalUser()");
    expect(referral).toContain("referralCode((await searchParams).ref)");
    expect(referral).toContain('AKISUITE_REFERRALS_READY === "true"');
    expect(referral).toContain("requireUser(locale");
    expect(referral).toContain("captureReferral");
    expect(referral).toContain('name="product" value="akipasa"');
    expect(referral).toContain('name="code" value={code}');
  });

  it("keeps early-partner visual improvements separate from claim-owner and consent rules", () => {
    const css = source(
      "src/app/[locale]/business/early-partner/early-partner.module.css",
    );
    const page = source("src/app/[locale]/business/early-partner/page.tsx");
    const actions = source(
      "src/app/[locale]/business/early-partner/actions.ts",
    );
    expect(css).toContain("--partner-accent");
    expect(css).toContain('html[data-theme="light"]');
    expect(css).toContain("safe-area-inset-bottom");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain(":focus-visible");
    expect(page).toContain("requireUser(locale, current)");
    expect(page).toContain('.eq("claimant_id", user.id)');
    expect(page).toContain('claim.status !== "approved"');
    expect(page).toContain("submitEarlyPartnerFeedback");
    expect(page).toContain("3 months of AkiPasa listing Premium");
    expect(actions).toContain(
      'contact_permission: parsed.data.contactPermission === "yes"',
    );
    expect(actions).toContain('status", "approved"');
    expect(actions).toContain('onConflict: "claim_id"');
  });
  it("keeps the owner cockpit protected and source data server-owned", () => {
    const page = source("src/app/[locale]/owner/page.tsx");
    const access = source("src/lib/owner-console.ts");
    const css = source("src/components/PasaSharedSurfaces.css");
    expect(page).toContain("requireOwnerConsole(locale)");
    expect(access).toContain('rpc("has_owner_console")');
    expect(page).toContain('className="owner-command-kicker"');
    expect(page).toContain('id="owner-launchpad"');
    expect(page).toContain('id="owner-activity"');
    expect(page).toContain("pendingApprovals.count");
    expect(page).toContain("OwnerAppearanceForm");
    expect(css).toContain("Owner-only operational cockpit");
    expect(css).toContain('data-pasa-surface="operations"');
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("safe-area-inset-bottom");
    expect(css).toContain('html[data-theme="light"]');
  });

});
