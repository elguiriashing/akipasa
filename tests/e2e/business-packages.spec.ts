import { expect, test } from "@playwright/test";

for (const locale of ["en", "es"] as const) {
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
    [1024, 768],
    [1440, 1000],
  ]) {
    test(`all seven AkiSuite plans: ${locale}, ${width}px`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width, height });
      await page.addInitScript(() => {
        document.cookie = "ak_consent_version=2; Path=/";
      });
      await page.goto(`/${locale}/membership?from=akibusiness`);
      const catalogue = page.locator(
        'section[aria-labelledby="akisuite-catalogue-title"]',
      );
      await expect(catalogue.locator("article")).toHaveCount(7);
      await expect(
        catalogue.locator("article").first().getByRole("heading"),
      ).toHaveText("Aki Enterprise");
      await expect(
        catalogue.locator('article[data-origin="true"]'),
      ).toContainText("AkiBusiness Premium");
      await expect(catalogue.locator("select")).toHaveCount(0);
      await expect(catalogue.getByRole("button")).toHaveCount(7);
      for (const button of await catalogue.getByRole("button").all())
        await expect(button).toBeDisabled();
      await catalogue.getByRole("radio").nth(1).check();
      await expect(catalogue.locator("#aki_enterprise")).toContainText(
        locale === "es" ? "767,90" : "767.90",
      );
      await expect(catalogue.locator("#akipasa_premium")).toContainText(
        locale === "es" ? "19,10" : "19.10",
      );
      await expect(catalogue.locator("#akihq_business_addon")).toContainText(
        locale === "es" ? "76,70" : "76.70",
      );
      await catalogue.getByRole("radio").nth(0).check();
      await expect(catalogue.locator("#aki_enterprise")).toContainText(
        locale === "es" ? "79,99" : "79.99",
      );
      for (const theme of ["light", "dark"]) {
        await page.evaluate(
          (value) => window.localStorage.setItem("akipasa.theme", value),
          theme,
        );
        await page.reload();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        const dimensions = await page.evaluate(() => ({
          width: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
        for (const card of await catalogue.locator("article").all()) {
          const bounds = await card.evaluate((element) => ({
            width: element.clientWidth,
            scroll: element.scrollWidth,
          }));
          expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
        }
        await catalogue.screenshot({
          path: `test-results/akisuite-${locale}-${width}-${theme}.png`,
        });
      }
      expect(errors).toEqual([]);
    });
  }
}
