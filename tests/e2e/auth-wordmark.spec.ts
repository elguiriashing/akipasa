import { expect, test } from "@playwright/test";

for (const locale of ["en", "es"] as const)
  for (const theme of ["light", "dark"] as const)
    for (const width of [360, 390, 600]) {
      test(`${locale} ${theme} auth brands remain whole at ${width}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.addInitScript((value) => {
          localStorage.setItem("akipasa.theme", value);
          document.addEventListener("DOMContentLoaded", () => {
            document.documentElement.dataset.theme = value;
          });
        }, theme);
        await page.goto(`/${locale}/auth`);
        const card = page
          .locator(".auth-product-portals .auth-product-card")
          .filter({ hasText: "AkiBusiness" });
        await expect(card).toBeVisible();
        const word = card.locator("strong");
        await expect(word).toHaveText("AkiBusiness");
        const geometry = await word.evaluate((node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          const text = range.getBoundingClientRect();
          const box = node.getBoundingClientRect();
          return {
            lines: new Set(
              Array.from(range.getClientRects()).map((rect) => rect.top),
            ).size,
            width: text.width,
            available: box.width,
          };
        });
        expect(geometry.lines).toBe(1);
        expect(geometry.width).toBeLessThanOrEqual(geometry.available + 1);
        expect((await card.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width + 1);
      });
    }
