import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pasaDestinations } from "../src/components/PasaBottomDock";

describe("canonical AkiPasa navigation", () => {
  it.each(["en", "es"] as const)(
    "defines exactly five navigable destinations in %s",
    (locale) => {
      const items = pasaDestinations(locale);
      expect(items.map((i) => i.key)).toEqual([
        "home",
        "map",
        "checkin",
        "community",
        "profile",
      ]);
      expect(new Set(items.map((i) => i.href)).size).toBe(5);
      expect(items.every((i) => i.href.startsWith(`/${locale}`))).toBe(true);
    },
  );
  it("has one consumer mobile dock renderer", () => {
    const shell = readFileSync("src/components/AppShell.tsx", "utf8");
    expect(shell).toContain("<PasaBottomDock locale={locale} />");
    expect(shell).not.toMatch(/<nav\s+className="app-bottom-nav"/);
  });
  it("styles the shared dock for light mode without altering its dark mode or accessibility guards", () => {
    const css = readFileSync("src/components/PasaBottomDock.css", "utf8");
    expect(css).toContain('html[data-theme="light"] .app-bottom-nav.pasa-dock');
    expect(css).toContain('.pasa-dock__item.active');
    expect(css).toContain("background: #faf7f2");
    expect(css).toContain("background: rgba(7, 9, 11, 0.97)");
    expect(css).toContain("prefers-reduced-transparency");
    expect(css).toContain('data-owner-focus="true"');
  });
  it("never makes the check-in entry an award operation", () => {
    const entry = readFileSync("src/app/[locale]/check-in/page.tsx", "utf8");
    expect(entry).not.toMatch(/completeCheckIn|grantXp|awardAchievement/);
    expect(entry).toContain("/map");
  });
});
