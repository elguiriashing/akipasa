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
});
