import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "parallel" });

const viewports = [
  { width: 390, height: 844 },
  { width: 600, height: 960 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 640, height: 400 },
];

for (const locale of ["en", "es"]) {
  for (const theme of ["light", "dark"]) {
    test(`tablet routes ${locale} ${theme}`, async ({ page }) => {
      test.setTimeout(180_000);
      page.setDefaultTimeout(15_000);
      // Navigation acceptance uses an existing consent-version cookie; optional
      // privacy choices retain their default false values. No consent backend is mocked.
      await page.context().addCookies([
        {
          name: "ak_consent_version",
          value: "2",
          url: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100",
        },
      ]);
      await page.addInitScript((theme) => {
        localStorage.setItem("akipasa.theme", theme);
      }, theme);
      await page.route(/^https?:\/\//, (route) => {
        if (new URL(route.request().url()).hostname === "127.0.0.1")
          return route.continue();
        return route.abort();
      });
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        for (const route of [
          `/${locale}`,
          `/${locale}/auth`,
          `/${locale}/membership`,
          `/${locale}/map`,
          `/${locale}/passports`,
          `/${locale}/community`,
          `/${locale}/privacy`,
          `/${locale}/terms`,
          `/akiduermo?lang=${locale}`,
        ]) {
          console.log(`${locale} ${theme} ${viewport.width} ${route}`);
          await page.goto(route, { waitUntil: "domcontentloaded" });
          await expect(page.locator("main")).toBeVisible();
          if (route === `/${locale}`) {
            const reject = page.getByRole("button", {
              name: locale === "es" ? "Rechazar opcionales" : "Reject optional",
              exact: true,
            });
            if (await reject.isVisible()) await reject.click();
            const more = page.getByRole("button", {
              name: locale === "es" ? "Más opciones" : "More options",
              exact: true,
            });
            if (await more.isVisible()) {
              await more.click();
              const sheet = page.locator(".app-sheet");
              await expect(sheet).toBeVisible();
              const bounds = await sheet.boundingBox();
              expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
                viewport.width + 1,
              );
              await sheet.locator(".app-sheet-close").click();
              await expect(sheet).toBeHidden();
            }
          }
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
            `${route} ${viewport.width}`,
          ).toBeLessThanOrEqual(viewport.width + 1);
        }
        await page.screenshot({
          path: `test-results/tablet-${locale}-${theme}-${viewport.width}.png`,
          fullPage: true,
        });
      }
    });
  }
}

test("per-host install identities and raster icons", async ({ request }) => {
  for (const [host, name, start] of [
    ["akipasa.com", "AkiPasa", "/es"],
    ["business.akipasa.com", "AkiBusiness", "/es/business"],
    ["akiduermo.akipasa.com", "AkiDuermo", "/"],
  ]) {
    const response = await request.get("/manifest.webmanifest", {
      headers: { host },
    });
    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    expect(manifest.name).toBe(name);
    expect(manifest.start_url).toBe(start);
    for (const resource of ["/sw.js", "/offline.html"]) {
      const shell = await request.get(resource, {
        headers: { host },
        maxRedirects: 0,
      });
      expect(shell.status()).toBe(200);
    }
    expect(
      manifest.icons.filter(
        (icon: { type: string }) => icon.type === "image/png",
      ),
    ).toHaveLength(4);
    for (const icon of manifest.icons) {
      const image = await request.get(icon.src, {
        headers: { host },
        maxRedirects: 0,
      });
      expect(image.status()).toBe(200);
      expect(image.headers()["content-type"]).toContain(icon.type);
    }
  }
});

test("AkiBusiness login and modes fit tablets and split windows", async ({
  page,
}) => {
  test.setTimeout(240_000);
  // Forward the real virtual-host request through the local Next server.
  await page.route(/http:\/\/127\.0\.0\.1:\d+\//, async (route) => {
    const response = await route.fetch({
      headers: { ...route.request().headers(), host: "business.akipasa.com" },
    });
    await route.fulfill({ response });
  });
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"]) {
      await page.addInitScript(
        (theme) => localStorage.setItem("akipasa.theme", theme),
        theme,
      );
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        for (const mode of ["signin", "signup", "magic", "recover"]) {
          await page.goto(`/${locale}/auth?mode=${mode}`, {
            waitUntil: "domcontentloaded",
          });
          await expect(page.locator(".auth-theme-business")).toBeVisible();
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
          ).toBeLessThanOrEqual(viewport.width + 1);
          const panel = page.locator(".auth-focus-panel");
          const bounds = await panel.boundingBox();
          expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
            viewport.width + 1,
          );
        }
        await page.screenshot({
          path: `test-results/business-auth-${locale}-${theme}-${viewport.width}.png`,
          fullPage: true,
        });
      }
    }
});
