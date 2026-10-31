import { expect, test, type Locator } from "@playwright/test";

async function textContrast(target: Locator, background?: number[]) {
  return target.evaluate((element, supplied) => {
    const rgb = (value: string) => (value.match(/[\d.]+/g) || []).map(Number);
    const luminance = (color: number[]) =>
      color
        .slice(0, 3)
        .map((value) => {
          const channel = value / 255;
          return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4;
        })
        .reduce(
          (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
          0,
        );
    const foreground = rgb(getComputedStyle(element).color);
    let backdrop = supplied;
    for (
      let node: Element | null = element;
      !backdrop && node;
      node = node.parentElement
    ) {
      const color = rgb(getComputedStyle(node).backgroundColor);
      if (color.length === 3 || color[3] === 1) backdrop = color;
    }
    if (!backdrop) throw new Error("No opaque contrast surface");
    const front = luminance(foreground),
      back = luminance(backdrop);
    return (Math.max(front, back) + 0.05) / (Math.min(front, back) + 0.05);
  }, background);
}

for (const locale of ["en", "es"] as const)
  for (const theme of ["light", "dark"] as const)
    for (const width of [360, 1440])
      test(`${locale} ${theme} auth controls and avatar entrance retain contrast at ${width}px`, async ({
        page,
      }) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({
          colorScheme: theme,
          reducedMotion: "reduce",
        });
        await page.addInitScript(
          (value) => localStorage.setItem("akipasa.theme", value),
          theme,
        );
        await page.context().addCookies([
          {
            name: "ak_consent_version",
            value: "2",
            url: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100",
          },
        ]);
        const next = `/${locale}/akipals`;
        for (const mode of ["signin", "signup", "magic", "recover"]) {
          const response = await page.goto(
            `/${locale}/auth?${new URLSearchParams({ mode, next })}`,
          );
          expect(response?.status()).toBe(200);
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          const panel = page.locator(".auth-theme-akipasa .auth-focus-panel");
          await expect(panel).toHaveCSS("background-color", "rgb(8, 8, 7)");
          await expect(page.locator(".aki-workspace-picker h2")).toHaveCSS(
            "color",
            "rgb(245, 233, 223)",
          );
          const text = panel.locator(
            "h2, .auth-modes a, label, small, .auth-secondary a, .consent-row a, .auth-label-line a, .auth-form-head > span",
          );
          for (const element of await text.all()) {
            expect(
              await textContrast(element),
              (await element.textContent()) || "auth text contrast",
            ).toBeGreaterThanOrEqual(4.5);
          }
          const email = panel.locator('input[type="email"]');
          await expect(email).toBeVisible();
          expect(await textContrast(email)).toBeGreaterThanOrEqual(4.5);
          await email.focus();
          await expect(email).toBeFocused();
          await expect(email).toHaveCSS("outline-style", "solid");
          await page.keyboard.press("Tab");
          expect(
            await page.evaluate(() => document.activeElement?.tagName),
          ).not.toBe("BODY");
          for (const field of await panel.locator('input[name="next"]').all())
            await expect(field).toHaveValue(next);
          for (const checkbox of await panel.getByRole("checkbox").all())
            await expect(checkbox).not.toBeChecked();
          const google = panel.locator(".google-button");
          if (await google.count()) {
            expect(["signin", "signup"]).toContain(mode);
            expect(await textContrast(google)).toBeGreaterThanOrEqual(4.5);
          }
          for (const submit of await panel
            .locator('button[type="submit"]')
            .all()) {
            await submit.scrollIntoViewIfNeeded();
            expect(
              await submit.evaluate((button) => {
                const box = button.getBoundingClientRect();
                return (
                  document
                    .elementFromPoint(
                      box.x + box.width / 2,
                      box.y + box.height / 2,
                    )
                    ?.closest("button") === button
                );
              }),
              "Auth submit must not be covered by floating support",
            ).toBe(true);
          }
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
          ).toBeLessThanOrEqual(width + 1);
          await page.screenshot({
            path: `test-results/pasa-auth-contrast-${locale}-${theme}-${width}-${mode}.png`,
            fullPage: true,
            animations: "disabled",
          });
        }
        await page.goto(`/${locale}/auth?mode=signin&error=signin`);
        const alert = page.locator("#auth-error[role='alert']");
        await expect(alert).toBeVisible();
        expect(await textContrast(alert)).toBeGreaterThanOrEqual(4.5);
        await page.goto(`/${locale}/akipals`);
        const heading = page.getByRole("heading", {
          level: 1,
          name: "AkiPals.",
        });
        await expect(heading).toHaveCSS("color", "rgb(255, 255, 255)");
        // The brightest fixed gradient stop behind this heading is #6f2d39.
        expect(
          await textContrast(heading, [111, 45, 57]),
        ).toBeGreaterThanOrEqual(7);
        await page.screenshot({
          path: `test-results/pasa-avatar-contrast-${locale}-${theme}-${width}.png`,
          fullPage: true,
          animations: "disabled",
        });
      });
