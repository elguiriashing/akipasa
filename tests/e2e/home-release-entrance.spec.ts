// Scoped to the selected production-base Home hero/search contract.
// The main overhaul LaunchRibbon is intentionally outside this candidate.
import { expect, test } from "@playwright/test";

for (const locale of ["en", "es"] as const)
  for (const width of [360, 1440])
    test(`${locale} released Home hero opens the shared working filters at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/${locale}`);
      const hero = page.getByRole("region", {
        name:
          locale === "es" ? "¿Qué hacemos hoy?" : "What are we doing today?",
      });
      const entrance = hero.getByRole("button", {
        name:
          locale === "es"
            ? "¿Qué te apetece hacer?"
            : "What are you in the mood for?",
      });
      await expect(entrance).toBeEnabled();
      await expect(hero.locator("img")).toHaveJSProperty("complete", true);
      expect(
        await hero
          .locator("img")
          .evaluate((image: HTMLImageElement) => image.naturalWidth),
      ).toBeGreaterThan(0);
      await entrance.focus();
      await page.keyboard.press("Enter");
      const filters = page.getByRole("search", {
        name: locale === "es" ? "Buscar en AkiPasa" : "Search AkiPasa",
        exact: true,
      });
      await expect(filters).toBeVisible();
      await expect(filters.locator("form")).toHaveAttribute(
        "data-search-handlers-ready",
        "true",
      );
      await page.keyboard.press("Escape");
      await expect(filters).toBeHidden();
      await expect(entrance).toBeFocused();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
