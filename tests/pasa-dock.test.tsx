import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pasaDestinations } from "../src/components/PasaBottomDock";

describe("canonical AkiPasa navigation", () => {
 it.each(["en","es"] as const)("defines exactly five navigable destinations in %s", locale => {
  const items=pasaDestinations(locale);
  expect(items.map(i=>i.key)).toEqual(["home","map","checkin","community","profile"]);
  expect(new Set(items.map(i=>i.href)).size).toBe(5);
  expect(items.every(i=>i.href.startsWith(`/${locale}`))).toBe(true);
 });
 it("has one consumer mobile dock renderer",()=>{
  const shell=readFileSync("src/components/AppShell.tsx","utf8");
  expect(shell).toContain("<PasaBottomDock locale={locale} />");
  expect(shell).not.toMatch(/<nav\s+className="app-bottom-nav"/);
 });
 it("never makes the check-in entry an award operation",()=>{
  const entry=readFileSync("src/app/[locale]/check-in/page.tsx","utf8");
  expect(entry).not.toMatch(/completeCheckIn|grantXp|awardAchievement/);
  expect(entry).toContain("/map");
 });
});
