import { expect, test } from "@playwright/test";

function mobileHeaderContrast(header: Element) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d")!;
  const rgba = (value: string) => {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    return Array.from(context.getImageData(0, 0, 1, 1).data).map(
      (channel, index) => (index === 3 ? channel / 255 : channel),
    );
  };
  const luminance = (color: number[]) => {
    const rgb = color.slice(0, 3).map((value) => {
      const channel = value / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const ratio = (ink: number[], background: number[]) => {
    const foreground = luminance(ink),
      backdrop = luminance(background);
    return (
      (Math.max(foreground, backdrop) + 0.05) /
      (Math.min(foreground, backdrop) + 0.05)
    );
  };
  const backdrop = rgba(getComputedStyle(header).backgroundColor);
  const wordmark = header.querySelector(".brand-wordmark > span:first-child")!;
  const controls = [
    header.querySelector(".app-suite-mobile-trigger")!,
    header.querySelector(".app-more-mobile-trigger")!,
    document.querySelector(".global-search-trigger")!,
  ].map((element) => {
    const style = getComputedStyle(element),
      background = rgba(style.backgroundColor);
    const composited = background
      .slice(0, 3)
      .map(
        (value, index) =>
          value * background[3] + backdrop[index] * (1 - background[3]),
      );
    const rect = element.getBoundingClientRect();
    return {
      name: element.getAttribute("aria-label"),
      ratio: ratio(
        rgba(getComputedStyle(element.querySelector("svg") || element).color),
        composited,
      ),
      width: rect.width,
      height: rect.height,
    };
  });
  return {
    opaque: backdrop[3] === 1,
    ratio: ratio(rgba(getComputedStyle(wordmark).color), backdrop),
    controls,
  };
}

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
              const search = page.locator(".global-search-trigger");
              await expect(search).toBeEnabled();
              const contrast = await page
                .locator(".app-topbar-mobile")
                .evaluate(mobileHeaderContrast);
              expect(contrast.opaque, route).toBe(true);
              expect(contrast.ratio, route).toBeGreaterThanOrEqual(4.5);
              for (const control of contrast.controls) {
                expect(
                  control.ratio,
                  `${route} ${control.name}`,
                ).toBeGreaterThanOrEqual(4.5);
                expect(
                  control.width,
                  `${route} ${control.name}`,
                ).toBeGreaterThanOrEqual(44);
                expect(
                  control.height,
                  `${route} ${control.name}`,
                ).toBeGreaterThanOrEqual(44);
              }
              if (!suffix) {
                await search.focus();
                await page.keyboard.press("Enter");
                const searchPanel = page.getByRole("search", {
                  name:
                    locale === "es" ? "Buscar en AkiPasa" : "Search AkiPasa",
                  exact: true,
                });
                await expect(searchPanel).toBeVisible();
                await page.keyboard.press("Escape");
                await expect(searchPanel).toBeHidden();
                await expect(search).toBeFocused();
              }
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
