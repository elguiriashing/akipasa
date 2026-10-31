import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { accountProfileWebsiteHref } from "@/lib/account-profile-website";

describe("saved profile website navigation", () => {
  it.each([
    ["akipasa.com", "https://akipasa.com/"],
    ["www.example.com/path", "https://www.example.com/path"],
    ["https://example.com/?ref=profile", "https://example.com/?ref=profile"],
    ["http://example.com", "http://example.com/"],
    ["  https://example.com/privacy  ", "https://example.com/privacy"],
  ])("accepts a valid HTTP(S) website: %s", (raw, expected) => {
    expect(accountProfileWebsiteHref(raw)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    "",
    " ",
    "javascript:alert(1)",
    "data:text/html,hi",
    "mailto:hello@example.com",
    "ftp://example.com",
    "//untrusted.example/path",
    "https://alice:secret@example.com",
    "https://example.com\\@untrusted.example",
    "https://example.com\n.invalid",
    "https://",
  ])("does not render unsafe or malformed legacy URL values: %s", (raw) => {
    expect(accountProfileWebsiteHref(raw)).toBeNull();
  });

  it("keeps account profile identity server-owned and the preview honest", () => {
    const page = readFileSync(
      "src/app/[locale]/account/profile/page.tsx",
      "utf8",
    );
    const css = readFileSync(
      "src/app/[locale]/account/account-controls.css",
      "utf8",
    );
    expect(page).toMatch(
      /requireUser\(\s*locale,\s*`\/\$\{locale\}\/account\/profile`,?\s*\)/,
    );
    expect(page).toContain('.eq("id", user.id)');
    expect(page).toContain("accountProfileWebsiteHref(profile?.website_url)");
    expect(page).toContain("href={websiteHref}");
    expect(page).toContain("profile?.profile_visibility");
    expect(page).toContain("account-profile-visibility");
    expect(page).toContain("Visible para usuarios de AkiPasa");
    expect(page).toContain("Visible to AkiPasa members");
    expect(page).toContain("Solo tú puedes ver este perfil");
    expect(page).toContain("Only you can see this profile");
    expect(page).toContain("updateAccountProfile");
    expect(page).toContain("uploadProfileMedia");
    expect(css).toContain(".account-profile-visibility");
    expect(css).toContain("@media (max-width: 480px)");
  });
});
