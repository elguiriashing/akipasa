import { expect, test } from "@playwright/test";

const devices = [
  { name: "360", width: 360, height: 800, native: false },
  { name: "390", width: 390, height: 844, native: false },
  { name: "820", width: 820, height: 1180, native: false },
  { name: "1440", width: 1440, height: 900, native: false },
  { name: "android-like", width: 390, height: 844, native: true },
] as const;

for (const device of devices) {
  test.describe(`Privacy control clearance ${device.name}`, () => {
    test.use({
      viewport: { width: device.width, height: device.height },
      ...(device.native
        ? {
            userAgent:
              "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/149.0.0.0 Mobile Safari/537.36 AkiPasaAndroid/1.0",
          }
        : {}),
    });
    for (const locale of ["en", "es"] as const) {
      for (const theme of ["dark", "light"] as const) {
        test(`${locale}/${theme} final privacy control stays reachable`, async ({
          page,
        }) => {
          test.setTimeout(180_000);
          await page.emulateMedia({
            reducedMotion: "reduce",
            colorScheme: theme,
          });
          await page.addInitScript((value) => {
            localStorage.setItem("akipasa.theme", value);
            document.cookie = "ak_consent_version=2; Path=/";
          }, theme);
          const writes: string[] = [];
          page.on("request", (request) => {
            if (
              request.method() === "POST" &&
              new URL(request.url()).pathname ===
                "/api/v1/personalisation/consent"
            )
              writes.push(request.url());
          });

          for (const suffix of [
            "",
            "/community",
            "/roadmap",
            "/membership",
            "/privacy",
            "/terms",
          ]) {
            const route = `/${locale}${suffix}`;
            const response = await page.goto(route, {
              waitUntil: "domcontentloaded",
            });
            expect(response?.status(), route).toBe(200);
            await expect(page.locator("html")).toHaveAttribute(
              "data-theme",
              theme,
            );
            if (device.native)
              await expect(page.locator("body")).toHaveAttribute(
                "data-android-app",
                "true",
              );
            const trigger = page.locator("body > .privacy-preferences button");
            await expect(trigger).toHaveText(
              locale === "es" ? "Opciones de privacidad" : "Privacy choices",
            );
            await page.evaluate(() =>
              window.scrollTo(0, document.documentElement.scrollHeight),
            );
            if (device.width <= 850) {
              const contrast = await page
                .locator(
                  ".app-topbar-mobile .brand-wordmark > span:first-child",
                )
                .evaluate((wordmark) => {
                  const header = wordmark.closest(".app-topbar-mobile")!;
                  const luminance = (color: string) => {
                    const components = color.match(/[\d.]+/g)!.map(Number);
                    const rgb = components.slice(0, 3).map((value) => {
                      const channel = value / 255;
                      return channel <= 0.04045
                        ? channel / 12.92
                        : ((channel + 0.055) / 1.055) ** 2.4;
                    });
                    return {
                      value:
                        rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722,
                      alpha: components[3] ?? 1,
                    };
                  };
                  const ink = luminance(getComputedStyle(wordmark).color);
                  const background = luminance(
                    getComputedStyle(header).backgroundColor,
                  );
                  return {
                    opaque: background.alpha === 1,
                    ratio:
                      (Math.max(ink.value, background.value) + 0.05) /
                      (Math.min(ink.value, background.value) + 0.05),
                  };
                });
              expect(contrast.opaque, route).toBe(true);
              expect(contrast.ratio, route).toBeGreaterThanOrEqual(4.5);
            }
            const geometry = await trigger.evaluate((button) => {
              const rect = button.getBoundingClientRect();
              const dock = document.querySelector<HTMLElement>(".pasa-dock");
              const dockVisible = Boolean(dock?.getClientRects().length);
              return {
                top: rect.top,
                bottom: rect.bottom,
                height: rect.height,
                viewport: innerHeight,
                dockTop: dockVisible ? dock!.getBoundingClientRect().top : null,
                hit: button.contains(
                  document.elementFromPoint(
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2,
                  ),
                ),
              };
            });
            expect(geometry.height, route).toBeGreaterThanOrEqual(44);
            expect(geometry.top, route).toBeGreaterThanOrEqual(0);
            expect(geometry.bottom, route).toBeLessThanOrEqual(
              geometry.viewport,
            );
            expect(geometry.hit, route).toBe(true);
            if (geometry.dockTop !== null)
              expect(geometry.bottom, route).toBeLessThan(geometry.dockTop);

            await trigger.focus();
            await page.keyboard.press("Enter");
            const panel = page.getByRole("complementary", {
              name:
                locale === "es" ? "Opciones de privacidad" : "Privacy choices",
              exact: true,
            });
            await expect(panel).toBeVisible();
            for (const name of ["analytics", "personalisation", "marketing"])
              expect(await page.context().cookies()).not.toContainEqual(
                expect.objectContaining({
                  name: `ak_${name}`,
                  value: "granted",
                }),
              );
            await page.keyboard.press("Tab");
            await expect(
              panel.getByRole("button", {
                name:
                  locale === "es"
                    ? "Cerrar opciones de privacidad"
                    : "Close privacy choices",
                exact: true,
              }),
            ).toBeFocused();
            await page.keyboard.press("Escape");
            await expect(panel).toHaveCount(0);
            await expect(trigger).toBeFocused();
            expect(writes, route).toEqual([]);
            if (!suffix || suffix === "/privacy")
              await page.screenshot({
                path: `test-results/pasa-privacy-clearance-${locale}-${theme}-${device.name}-${suffix ? "legal" : "home"}.png`,
                animations: "disabled",
              });
          }
        });
      }
    }
  });
}
