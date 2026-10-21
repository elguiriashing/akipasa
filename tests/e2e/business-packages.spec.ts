import { expect, test } from "@playwright/test";

for (const locale of ["en", "es"] as const) {
  test(`signed-out membership aliases retain ${locale} destination and origin`, async ({
    page,
  }) => {
    for (const alias of ["membership", "memberships", "subscription"]) {
      await page.goto(`/${locale}/account/${alias}?from=akiduermo`);
      await expect(page).toHaveURL(/\/auth\?next=/);
      expect(new URL(page.url()).searchParams.get("next")).toBe(
        `/${locale}/account/subscription?from=akiduermo`,
      );
    }
  });
  test(`signed-out operations retains ${locale} selected location`, async ({
    page,
  }) => {
    await page.goto(
      `/${locale}/account/subscription/operations?workspace=private-owner&next=https://evil.invalid`,
    );
    await expect(page).toHaveURL(/\/auth\?next=/);
    expect(new URL(page.url()).searchParams.get("next")).toBe(
      `/${locale}/account/subscription/operations?workspace=private-owner`,
    );
  });
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
    [1024, 768],
    [1440, 1000],
  ]) {
    test(`scoped AkiSuite plans: ${locale}, ${width}px`, async ({ page }) => {
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
      await expect(catalogue.locator("article")).toHaveCount(5);
      await expect(catalogue.locator("#akihq-free")).toContainText("AkiHQ");
      await expect(catalogue.locator("#operations-basico")).toContainText(
        locale === "es" ? "24,99" : "24.99",
      );
      await expect(catalogue.locator("#operations-standard")).toContainText(
        locale === "es" ? "44,99" : "44.99",
      );
      await expect(catalogue.locator("#operations-pro")).toContainText(
        locale === "es" ? "64,99" : "64.99",
      );
      await expect(catalogue.locator("#akisuite-sector")).toHaveCount(0);
      await expect(
        catalogue.getByRole("heading", {
          name:
            locale === "es"
              ? "Herramientas para tu actividad"
              : "Tools for your business",
        }),
      ).toHaveCount(0);
      await expect(
        catalogue.locator(
          "#aki_enterprise, #akihq_pro, #akihq_standard, #akihq_business_addon",
        ),
      ).toHaveCount(0);
      await expect(
        catalogue.locator("input[name=akisuite-interval]"),
      ).toHaveCount(0);
      await expect(catalogue.locator("article form")).toHaveCount(0);
      for (const link of await catalogue
        .getByRole("link", {
          name:
            locale === "es"
              ? "Gestionar herramientas de operaciones"
              : "Manage operating tools",
        })
        .all())
        await expect(link).toHaveAttribute(
          "href",
          `/${locale}/account/subscription/operations`,
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
