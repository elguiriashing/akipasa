import { expect, test } from "@playwright/test";

test("current discovery layout is retained and achievement management requires sign-in", async ({
  request,
}) => {
  for (const locale of ["es", "en"]) {
    const page = await request.get(`/${locale}`);
    expect(page.status()).toBe(200);
    expect(await page.text()).toContain('id="city-discovery-title"');
    for (const path of ["achievements", "achievements/venues"]) {
      const admin = await request.get(`/${locale}/admin/${path}`, {
        maxRedirects: 0,
      });
      expect([303, 307]).toContain(admin.status());
      expect(admin.headers().location).toContain(`/${locale}/auth?next=`);
    }
  }
});

test("sitemap index and root-level child files are crawlable XML without sessions", async ({
  request,
}) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/xml");
  expect(response.headers()["set-cookie"]).toBeUndefined();
  expect(await response.text()).toContain(
    "https://akipasa.com/sitemap-pages.xml",
  );
  const child = await request.get("/sitemap-pages.xml");
  expect(child.status()).toBe(200);
  expect(child.headers()["set-cookie"]).toBeUndefined();
  const xml = await child.text();
  expect(xml.match(/<url>/g)).toHaveLength(12);
  expect(xml).toContain('hreflang="x-default"');
  expect(xml).not.toContain("/account");
  expect((await request.get("/sitemap-venues--1.xml")).status()).toBe(404);
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Sitemap: https://akipasa.com/sitemap.xml",
  );
});

test("all public landing pages render canonical, language and social metadata on the server", async ({
  request,
}) => {
  test.setTimeout(120_000);
  for (const locale of ["en", "es"]) {
    for (const path of [
      "",
      "/map",
      "/membership",
      "/passports",
      "/privacy",
      "/terms",
    ]) {
      const response = await request.get(
        `/${locale}${path}?utm_source=seo-check`,
      );
      expect(response.status(), `${locale}${path}`).toBe(200);
      expect(response.headers()["x-robots-tag"]).toBeUndefined();
      const html = await response.text();
      expect(html).toContain(`<html lang="${locale}"`);
      const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*>/)?.[0];
      expect(canonical).toContain(
        `href="https://akipasa.com/${locale}${path}"`,
      );
      expect(
        new RegExp(`hreflang="${locale === "es" ? "en" : "es"}"`, "i").test(
          html,
        ),
      ).toBe(true);
      expect(html).toContain('property="og:locale"');
      expect(html).toContain('name="description"');
    }
  }
});

test("sign-in is excluded from indexing and the root redirect is permanent", async ({
  request,
}) => {
  const auth = await request.get("/en/auth");
  expect(auth.status()).toBe(200);
  expect(auth.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  const root = await request.get("/", { maxRedirects: 0 });
  expect(root.status()).toBe(308);
  expect(new URL(root.headers().location, "https://akipasa.com").pathname).toBe(
    "/es",
  );
  const campaign = await request.get("/?utm_source=poster", {
    maxRedirects: 0,
  });
  expect(campaign.status()).toBe(308);
  expect(
    new URL(campaign.headers().location, "https://akipasa.com").pathname,
  ).toBe("/es");
  expect(
    new URL(campaign.headers().location, "https://akipasa.com").search,
  ).toBe("?utm_source=poster");
});

test("homepage excludes map CSS while the map route retains it and analytics has a narrowly scoped CSP", async ({
  request,
}) => {
  async function cssFor(path: string) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    const styles = [
      ...html.matchAll(/<link\b[^>]*href="([^"]+\.css(?:\?[^"]*)?)"[^>]*>/g),
    ].map((match) => match[1]);
    expect(styles.length).toBeGreaterThan(0);
    const sheets = await Promise.all(
      [...new Set(styles)].map(async (href) => {
        const sheet = await request.get(href);
        expect(sheet.status()).toBe(200);
        return sheet.text();
      }),
    );
    return {
      css: sheets.join("\n"),
      csp: response.headers()["content-security-policy"],
    };
  }
  const home = await cssFor("/en");
  expect(home.css).not.toContain(".maplibregl-map");
  expect(home.csp).toContain(
    "https://static.cloudflareinsights.com/beacon.min.js/",
  );
  expect(home.csp).toContain("object-src 'none'");
  expect(home.csp).toContain("frame-ancestors 'none'");
  const map = await cssFor("/en/map");
  expect(map.css).toContain(".maplibregl-map");
});
