import { expect, test } from "@playwright/test";

for (const locale of ["en", "es"]) {
  for (const theme of ["light", "dark"]) {
    test(`touch scroll surfaces ${locale} ${theme}`, async ({ page }) => {
      await page.goto(`/${locale}`);
      expect(
        await page.evaluate(() => matchMedia("(pointer: coarse)").matches),
      ).toBe(true);
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.dataset.ownerBackground = "aurora";
        document.documentElement.dataset.ownerGlass = "true";
        document.documentElement.dataset.ownerMotion = "true";
      }, theme);
      await expect(page.locator("body")).toHaveCSS(
        "background-attachment",
        "scroll",
      );
      await expect(page.locator("body")).toHaveCSS("animation-name", "none");
      await expect(page.locator(".app-bottom-nav")).toHaveCSS(
        "backdrop-filter",
        "none",
      );
      await page.evaluate(() => window.scrollTo(0, 500));
      await expect(page.locator(".app-bottom-nav")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
}

test("reduced motion also removes shared paint effects on a fine pointer", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  try {
    await page.goto(
      `${process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100"}/en`,
    );
    await page.evaluate(() => {
      document.documentElement.dataset.ownerMotion = "true";
    });
    await expect(page.locator("body")).toHaveCSS("animation-name", "none");
    await expect(page.locator(".app-rail")).toHaveCSS(
      "backdrop-filter",
      "none",
    );
  } finally {
    await context.close();
  }
});
