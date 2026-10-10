import { expect, test } from "@playwright/test";

for (const locale of ["en", "es"] as const) {
  for (const theme of ["light", "dark"] as const) {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1280, height: 800 },
    ]) {
      test(`AkiDuermo guest routes ${locale} ${theme} ${viewport.width}`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.addInitScript(
          (value) => localStorage.setItem("akipasa.theme", value),
          theme,
        );
        // Exercise the same Next server through the stay virtual host, without real credentials.
        await page.route(/http:\/\/127\.0\.0\.1:\d+\//, async (route) => {
          const path = new URL(route.request().url()).pathname;
          if (path === "/api/stays")
            return route.fulfill({ json: { rows: [], total: 0 } });
          if (path === "/api/map/stays")
            return route.fulfill({ json: { ids: [], total: 0 } });
          const response = await route.fetch({
            headers: {
              ...route.request().headers(),
              host: "akiduermo.akipasa.com",
            },
          });
          await route.fulfill({ response });
        });
        for (const path of [
          `/${locale}/auth?next=%2Fbookings`,
          "/saved",
          "/map",
        ]) {
          await page.goto(
            `${path}${path.includes("?") ? "&" : "?"}lang=${locale}`,
            { waitUntil: "domcontentloaded" },
          );
          await expect(page.locator("main")).toBeVisible();
          if (path.includes("/auth?")) {
            await expect(
              page.getByRole("link", { name: /AkiDuermo\./ }),
            ).toBeVisible();
            await expect(
              page.getByRole("complementary", { name: "Primary navigation" }),
            ).toHaveCount(0);
          }
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
            path,
          ).toBeLessThanOrEqual(viewport.width + 1);
          if (path === "/map") {
            await expect(
              page.getByRole("application", {
                name: locale === "es" ? "Mapa interactivo" : "Interactive map",
              }),
            ).toBeVisible();
            const map = await page.locator(".production-map").boundingBox();
            expect(map?.width).toBeGreaterThan(viewport.width * 0.9);
            expect(map?.height).toBeGreaterThan(viewport.height * 0.6);
          }
        }
        await page.screenshot({
          path: `test-results/duermo-${locale}-${theme}-${viewport.width}.png`,
        });
        await page.unrouteAll({ behavior: "ignoreErrors" });
      });
    }
  }
}
