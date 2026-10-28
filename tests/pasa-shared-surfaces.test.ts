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
});
