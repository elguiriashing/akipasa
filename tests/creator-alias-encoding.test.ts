import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (href: string): never => {
    navigation.redirect(href);
    throw new Error("fixture-redirect");
  },
  notFound: (): never => {
    navigation.notFound();
    throw new Error("fixture-not-found");
  },
}));
import CreatorAlias from "../src/app/[locale]/creators/[slug]/page";

beforeEach(() => vi.clearAllMocks());

const validSlugs = [
  ["plain identifier", "ana-local", "ana-local"],
  ["plain Unicode", "málaga música", "m%C3%A1laga%20m%C3%BAsica"],
  ["encoded Unicode", "m%C3%A1laga%20m%C3%BAsica", "m%C3%A1laga%20m%C3%BAsica"],
  ["plain spaces and ampersand", "artist & company", "artist%20%26%20company"],
  [
    "encoded spaces and ampersand",
    "artist%20%26%20company",
    "artist%20%26%20company",
  ],
  ["literal percent", "artist%25name", "artist%25name"],
  ["encoded literal escape", "artist%2520name", "artist%2520name"],
  ["encoded literal dot escape", "%252E%252E", "%252E%252E"],
] as const;
const invalidSlugs = [
  "",
  ".",
  "..",
  "%2e",
  "%2E%2e",
  "artist/name",
  "artist%2Fname",
  "artist\\name",
  "artist%5cname",
  "%",
  "artist%2",
  "artist%GG",
  "%C3%28",
  "https%3A%2F%2Fevil.invalid",
] as const;

for (const locale of ["en", "es"] as const) {
  describe(`${locale} creator alias component encoding`, () => {
    it.each(validSlugs)(
      "normalizes once for %s and ignores an untrusted next query",
      async (_label, slug, component) => {
        const request = {
          params: Promise.resolve({ locale, slug }),
          searchParams: Promise.resolve({ next: "https://evil.invalid" }),
        };
        await expect(CreatorAlias(request)).rejects.toThrow("fixture-redirect");
        expect(navigation.notFound).not.toHaveBeenCalled();
        expect(navigation.redirect).toHaveBeenCalledExactlyOnceWith(
          `/${locale}/community/creators/${component}`,
        );
        const destination = new URL(
          navigation.redirect.mock.calls[0][0],
          "https://akipasa.example",
        );
        expect(destination.origin).toBe("https://akipasa.example");
        expect(destination.search).toBe("");
        expect(destination.hash).toBe("");
      },
    );

    it.each(invalidSlugs)(
      "rejects malformed or non-component slug %j",
      async (slug) => {
        await expect(
          CreatorAlias({ params: Promise.resolve({ locale, slug }) }),
        ).rejects.toThrow("fixture-not-found");
        expect(navigation.notFound).toHaveBeenCalledOnce();
        expect(navigation.redirect).not.toHaveBeenCalled();
      },
    );
  });
}

it("checks the locale before malformed slug normalization", async () => {
  const decode = vi.spyOn(globalThis, "decodeURIComponent");
  try {
    await expect(
      CreatorAlias({ params: Promise.resolve({ locale: "fr", slug: "%" }) }),
    ).rejects.toThrow("fixture-not-found");
    expect(decode).not.toHaveBeenCalled();
    expect(navigation.notFound).toHaveBeenCalledOnce();
    expect(navigation.redirect).not.toHaveBeenCalled();
  } finally {
    decode.mockRestore();
  }
});
