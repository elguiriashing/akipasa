import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AkiDuermo membership landing", () => {
  const page = readFileSync("src/app/akiduermo/membership/page.tsx", "utf8");
  const account = readFileSync("src/app/akiduermo/account/page.tsx", "utf8");
  it("has four visible business and enterprise offers and a hidden personal tier", () => {
    expect(page).toContain("AkiDuermo Premium for Business");
    expect(page).toContain("AkiBusiness Standard");
    expect(page).toContain("AkiBusiness Pro");
    expect(page).toContain("AkiEnterprise");
    expect(page).toContain("StayAppShell");
    expect(page).not.toContain("startAkiSuiteCheckout");
    expect(page).toContain("<StayAppShell locale={locale}>");
  });
  it("connects the accommodation account to the new local page", () => {
    expect(account).toContain('href="/akiduermo/membership"');
  });
});
