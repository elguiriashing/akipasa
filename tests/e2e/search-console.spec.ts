import { expect, test } from "@playwright/test";

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
  expect(root.headers().location).toBe("/es");
});
