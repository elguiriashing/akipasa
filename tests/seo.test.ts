// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  languageUrls,
  localizedMetadata,
  serializeJsonLd,
  shouldNoindex,
} from "../src/lib/seo";
import {
  sitemapFile,
  sitemapIndex,
  sitemapPageSize,
  sitemapUrls,
  type SitemapSource,
} from "../src/lib/sitemaps";

function document(xml: string) {
  const parsed = new DOMParser().parseFromString(xml, "application/xml");
  expect(parsed.querySelector("parsererror")).toBeNull();
  return parsed;
}

const rows = Array.from({ length: 1001 }, (_, id) => ({
  slug: `venue-${id}`,
  updated_at: "2026-08-20T14:00:00Z",
}));
const source: SitemapSource = {
  count: async (kind) => (kind === "venues" ? rows.length : 0),
  page: async (kind, page) =>
    kind === "venues"
      ? rows.slice(page * sitemapPageSize, (page + 1) * sitemapPageSize)
      : [],
};

describe("public search metadata", () => {
  it("gives each language its own canonical and reciprocal language URLs", () => {
    for (const locale of ["es", "en"] as const) {
      const metadata = localizedMetadata(
        locale,
        "/venues/cafe",
        "Café",
        "A local café",
      );
      expect(metadata.alternates).toEqual({
        canonical: `https://akipasa.com/${locale}/venues/cafe`,
        languages: languageUrls("/venues/cafe"),
      });
      expect(metadata.openGraph).toMatchObject({
        url: `https://akipasa.com/${locale}/venues/cafe`,
        locale: locale === "es" ? "es_ES" : "en_GB",
      });
    }
  });

  it("keeps workspace, sign-in and transactional URLs out of search without blocking public details", () => {
    for (const path of [
      "/en/account",
      "/es/admin/users",
      "/en/staff",
      "/es/business/venue/id",
      "/en/community",
      "/en/auth/recover",
      "/es/check-in/token",
      "/es/terms/accept",
      "/api/analytics",
    ]) {
      expect(shouldNoindex(path), path).toBe(true);
    }
    for (const path of [
      "/en",
      "/es/map",
      "/en/membership",
      "/es/passports",
      "/es/terms",
      "/en/venues/business-cafe",
      "/en/events/community-party",
      "/sitemap.xml",
    ]) {
      expect(shouldNoindex(path), path).toBe(false);
    }
  });

  it("cannot terminate a structured-data script with user-authored content", () => {
    const payload = { name: "</script><script>alert(1)</script>" };
    const json = serializeJsonLd(payload);
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toEqual(payload);
  });
});

describe("catalogue sitemaps", () => {
  it("splits at the database row limit and includes the final venue exactly once in each language", async () => {
    const index = await sitemapIndex(() => source);
    const indexDocument = document(await index.text());
    expect(
      [...indexDocument.querySelectorAll("loc")].map((loc) => loc.textContent),
    ).toEqual([
      "https://akipasa.com/sitemap-pages.xml",
      "https://akipasa.com/sitemap-venues-0.xml",
      "https://akipasa.com/sitemap-venues-1.xml",
    ]);
    const urls: string[] = [];
    for (const page of [0, 1]) {
      const response = await sitemapFile(`venues-${page}.xml`, () => source);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/xml");
      const doc = document(await response.text());
      urls.push(
        ...[...doc.querySelectorAll("loc")].map((loc) => loc.textContent!),
      );
    }
    expect(urls).toHaveLength(2002);
    expect(new Set(urls).size).toBe(2002);
    expect(urls).toContain("https://akipasa.com/en/venues/venue-1000");
  });

  it("exposes only canonical public static pages with language alternates", async () => {
    const response = await sitemapFile("pages.xml", () => {
      throw new Error("must not query catalogue");
    });
    const doc = document(await response.text());
    expect(doc.querySelectorAll("url")).toHaveLength(12);
    expect(doc.querySelectorAll("lastmod")).toHaveLength(0);
    const urls = [...doc.querySelectorAll("loc")].map(
      (loc) => loc.textContent!,
    );
    expect(urls.every((url) => !shouldNoindex(new URL(url).pathname))).toBe(
      true,
    );
    expect(
      doc.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "link"),
    ).toHaveLength(36);
  });

  it("escapes XML, preserves real change dates and omits invented dates", () => {
    const doc = document(
      sitemapUrls([
        { path: "/venues/a&b", updatedAt: "2026-08-20T14:00:00Z" },
        { path: "/map", updatedAt: "invalid" },
      ]),
    );
    expect(doc.querySelector("loc")?.textContent).toBe(
      "https://akipasa.com/es/venues/a&b",
    );
    expect(doc.querySelectorAll("lastmod")).toHaveLength(2);
    expect(doc.querySelector("lastmod")?.textContent).toBe(
      "2026-08-20T14:00:00.000Z",
    );
  });

  it("returns retryable failures instead of silently dropping the live catalogue", async () => {
    const unavailable = () => {
      throw new Error("provider unavailable");
    };
    for (const response of [
      await sitemapIndex(unavailable),
      await sitemapFile("venues-0.xml", unavailable),
    ]) {
      expect(response.status).toBe(503);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("retry-after")).toBe("60");
    }
  });

  it("rejects malformed, private and nonexistent sitemap pages", async () => {
    for (const file of [
      "account.xml",
      "venues--1.xml",
      "venues-01.xml",
      "venues-100000.xml",
      "venues-2.xml",
      "events-0.xml",
    ]) {
      expect((await sitemapFile(file, () => source)).status, file).toBe(404);
    }
  });
});
