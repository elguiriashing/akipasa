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
        const picker = page.locator(".aki-workspace-picker");
        await expect(picker.getByRole("link")).toHaveCount(5);
        await picker
          .getByRole("link", { name: "AkiPasa", exact: true })
          .focus();
        for (const name of [
          "AkiPasa",
          "AkiDuermo",
          "AkiCoches",
          "AkiHQ",
          "AkiBusiness",
        ]) {
          const card = picker.getByRole("link", { name, exact: true });
          await expect(card).toHaveAttribute("data-selected", "true");
          const word = card.locator(".aks-selector__label");
          await expect(word).toHaveText(name);
          const geometry = await word.evaluate((node) => {
            const range = document.createRange();
            range.selectNodeContents(node);
            return {
              lines: new Set(
                Array.from(range.getClientRects()).map((rect) => rect.top),
              ).size,
              width: range.getBoundingClientRect().width,
              available: node.getBoundingClientRect().width,
            };
          });
          expect(geometry.lines).toBe(1);
          expect(geometry.width).toBeLessThanOrEqual(geometry.available + 1);
          expect((await card.boundingBox())!.height).toBeGreaterThanOrEqual(44);
          await page.keyboard.press("ArrowRight");
        }
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width + 1);
      });
    }
