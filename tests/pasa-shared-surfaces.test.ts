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
    expect(card).toContain('result.event.sponsored ? " card-featured" : ""');
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
      expect(booking).toContain(`request${kind === "events" ? "Event" : "Venue"}Booking`);
    }
  });

});
