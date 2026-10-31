import { expect, test } from "@playwright/test";

// Inline venue matches and the header's advanced filters are distinct journeys.
// API rows below are disposable browser fixtures, never claimed real venues.
for (const locale of ["en", "es"] as const)
  for (const theme of ["dark", "light"] as const)
    for (const width of [360, 390, 820, 1440])
      test.describe(`${locale} Home ${width}px/${theme}`, () => {
        test.use({ isMobile: width < 700, hasTouch: width < 1200 });
        test("inline search and header filters", async ({ page }, testInfo) => {
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({
            reducedMotion: "reduce",
            colorScheme: theme,
          });
          await page.addInitScript((value) => {
            localStorage.setItem("akipasa.theme", value);
            document.cookie = "ak_consent_version=2; Path=/";
          }, theme);
          const requests: string[] = [];
          await page.route("**/api/search/venues?*", async (route) => {
            expect(route.request().method()).toBe("GET");
            requests.push(route.request().url());
            await route.fulfill({
              json: {
                rows: Array.from({ length: 6 }, (_, index) => ({
                  id: `fixture-${index}`,
                  slug: `fixture-venue-${index}`,
                  name: `Fixture venue ${index + 1}`,
                  address: "Synthetic browser fixture address",
                  discovery_vertical: "venue",
                })),
                total: 6,
                nextOffset: 20,
              },
            });
          });
          await page.goto(`/${locale}`);
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          const hero = page.getByRole("region", {
            name:
              locale === "es"
                ? "¿Qué hacemos hoy?"
                : "What are we doing today?",
            exact: true,
          });
          const entrance = hero.getByRole("searchbox", {
            name: locale === "es" ? "Buscar locales" : "Search venues",
            exact: true,
          });
          await expect(entrance).toBeEnabled();
          await expect(hero.locator("img")).toHaveJSProperty("complete", true);
          expect(
            await hero
              .locator("img")
              .evaluate((image: HTMLImageElement) => image.naturalWidth),
          ).toBeGreaterThan(0);
          const filters = page.getByRole("search", {
            name: locale === "es" ? "Buscar en AkiPasa" : "Search AkiPasa",
            exact: true,
          });
          await expect(filters).toBeHidden();
          await entrance.focus();
          await page.keyboard.type("fixture");
          const matches = hero.getByRole("region", {
            name: locale === "es" ? "Resultados de locales" : "Venue results",
            exact: true,
          });
          await expect(matches.getByRole("link")).toHaveCount(5);
          await expect(
            matches.getByRole("link", { name: /Fixture venue 6/ }),
          ).toHaveCount(0);
          await expect(
            matches.getByRole("button", {
              name: locale === "es" ? "Ver más locales" : "Show more venues",
            }),
          ).toHaveCount(0);
          await expect(matches.getByRole("link").first()).toHaveAttribute(
            "href",
            `/${locale}/venues/fixture-venue-0`,
          );
          expect(requests.length).toBeGreaterThan(0);
          const request = new URL(requests.at(-1)!);
          expect(request.searchParams.get("q")).toBe("fixture");
          expect(request.searchParams.get("offset")).toBe("0");
          await page.keyboard.press("Enter");
          await expect(filters).toBeHidden();
          await expect(entrance).toBeFocused();
          const inlineImage = testInfo.outputPath(
            "home-inline-five-fixture-matches.png",
          );
          await page.screenshot({ path: inlineImage, animations: "disabled" });
          await testInfo.attach("Home inline five synthetic matches", {
            path: inlineImage,
            contentType: "image/png",
          });
          await page.keyboard.press("Escape");
          await expect(matches).toBeHidden();
          await expect(entrance).toBeFocused();
          const advanced = page.locator("button.global-search-trigger");
          await expect(advanced).toBeEnabled();
          await advanced.focus();
          await page.keyboard.press("Enter");
          await expect(filters).toBeVisible();
          await expect(filters.locator("form")).toHaveAttribute(
            "data-search-handlers-ready",
            "true",
          );
          const advancedImage = testInfo.outputPath(
            "home-header-advanced-filters.png",
          );
          await page.screenshot({
            path: advancedImage,
            animations: "disabled",
          });
          await testInfo.attach("Header advanced filters", {
            path: advancedImage,
            contentType: "image/png",
          });
          await page.keyboard.press("Escape");
          await expect(filters).toBeHidden();
          await expect(advanced).toBeFocused();
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
        });
      });
