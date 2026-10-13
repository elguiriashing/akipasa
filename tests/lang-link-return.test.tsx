// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LanguageLink } from "../src/components/LanguageLink";
import { safeAuthDestination } from "../src/lib/auth-security";

const navigation = vi.hoisted(() => ({ pathname: "/es/auth", search: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

afterEach(() => {
  cleanup();
  navigation.pathname = "/es/auth";
  navigation.search = "";
});

function switchedDestination(locale: "en" | "es", requested: string) {
  navigation.search = new URLSearchParams({
    next: requested,
    mode: "signin",
    from: "akibusiness",
  }).toString();
  render(<LanguageLink locale={locale} />);
  const href = screen.getByRole("link").getAttribute("href")!;
  return new URL(href, "https://akipasa.com");
}

describe("language switching preserves safe authentication returns", () => {
  it.each([
    ["es", "en", "/account/subscription?from=akibusiness"],
    ["en", "es", "/account/subscription?from=akiduermo"],
    ["es", "en", "/account/profile"],
    ["en", "es", "/venues/casa-colon-9c71c129"],
    ["es", "en", "/events/test-0114af/book"],
    ["en", "es", "/business?view=claims"],
    ["es", "en", "/passports?city=fuengirola#stamps"],
  ] as const)("keeps %s → %s return %s", (source, target, suffix) => {
    navigation.pathname = `/${source}/auth`;
    const url = switchedDestination(target, `/${source}${suffix}`);
    expect(url.pathname).toBe(`/${target}/auth`);
    expect(url.searchParams.get("next")).toBe(`/${target}${suffix}`);
    expect(url.searchParams.get("mode")).toBe("signin");
    expect(url.searchParams.get("from")).toBe("akibusiness");
    expect(safeAuthDestination(target, url.searchParams.get("next")!)).toBe(
      `/${target}${suffix}`,
    );
  });

  it("preserves encoded query values, hashes and repeated unrelated parameters", () => {
    const requested = "/es/venues/cafe?filter=M%C3%A1laga&tag=a%26b#menu";
    navigation.search = new URLSearchParams([
      ["next", requested],
      ["tag", "one"],
      ["tag", "two"],
      ["locationName", "Málaga & Costa del Sol"],
    ]).toString();
    render(<LanguageLink locale="en" compact />);
    const url = new URL(
      screen.getByRole("link").getAttribute("href")!,
      "https://akipasa.com",
    );
    expect(url.searchParams.get("next")).toBe(
      requested.replace("/es/", "/en/"),
    );
    expect(url.searchParams.getAll("tag")).toEqual(["one", "two"]);
    expect(url.searchParams.get("locationName")).toBe("Málaga & Costa del Sol");
    expect(screen.getByRole("link").getAttribute("hrefLang")).toBe("en");
    expect(screen.getByRole("link").className).toContain("language--compact");
  });

  it.each(["/pals", "/bookings", "/saved", "/stays/agur?lang=es", "/account"])(
    "keeps the unlocalized return %s unchanged",
    (requested) => {
      const url = switchedDestination("en", requested);
      expect(url.searchParams.get("next")).toBe(requested);
    },
  );

  it.each([
    "https://attacker.example/es/account",
    "//attacker.example/es/account",
    "%2F%2Fattacker.example/es/account",
    "%2Fes%2Faccount",
    "/es/../outside",
    "/es/%2e%2e//attacker.example",
    "/es/\\attacker.example",
    "/es/account%ZZ",
    "/es/account\n",
    "javascript:alert(1)",
  ])("never promotes unsafe or malformed return %s", (requested) => {
    const url = switchedDestination("en", requested);
    expect(url.searchParams.get("next")).toBe(requested);
    expect(safeAuthDestination("en", url.searchParams.get("next")!)).toBe(
      "/en/account",
    );
  });

  it("leaves ambiguous duplicate returns intact for the existing server guard", () => {
    navigation.search =
      "next=%2Fes%2Faccount&next=https%3A%2F%2Fattacker.example";
    render(<LanguageLink locale="en" />);
    const url = new URL(
      screen.getByRole("link").getAttribute("href")!,
      "https://akipasa.com",
    );
    expect(url.searchParams.getAll("next")).toEqual([
      "/es/account",
      "https://attacker.example",
    ]);
  });

  it("keeps ordinary discovery filters when there is no return destination", () => {
    navigation.pathname = "/es/map";
    navigation.search = "locality=fuengirola&radius=25&venuePage=2&list=1";
    render(<LanguageLink locale="en" />);
    expect(screen.getByRole("link").getAttribute("href")).toBe(
      "/en/map?locality=fuengirola&radius=25&venuePage=2&list=1",
    );
  });
});
