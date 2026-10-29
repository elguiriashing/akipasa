import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const legalSurfaces = [
  {
    path: "/privacy",
    heading: {
      en: "Your information, under control",
      es: "Tu información, bajo control",
    },
  },
  {
    path: "/terms",
    heading: {
      en: "Using AkiPasa responsibly",
      es: "Uso responsable de AkiPasa",
    },
  },
  {
    path: "/photo-credits",
    heading: {
      en: "Photo credits",
      es: "Créditos de las fotografías",
    },
  },
] as const;

const viewports = [
  { name: "phone-360", width: 360, height: 800, android: false },
  { name: "phone-390", width: 390, height: 844, android: false },
  { name: "tablet-820", width: 820, height: 1180, android: false },
  { name: "desktop-1440", width: 1440, height: 900, android: false },
  // Chromium with Android/WebView-like touch, viewport and UA.
  // This is browser emulation, NOT physical Android device acceptance.
  { name: "android-webview-emulated", width: 390, height: 844, android: true },
] as const;

for (const locale of ["en", "es"] as const) {
  for (const device of viewports) {
    for (const theme of ["dark", "light"] as const) {
      test(`${locale} legal pages render on ${device.name}/${theme}`, async ({
        browser,
      }) => {
        test.setTimeout(180_000);
        const context = await browser.newContext({
          baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100",
          viewport: { width: device.width, height: device.height },
          colorScheme: theme,
          reducedMotion: "reduce",
          ...(device.android
            ? {
                isMobile: true,
                hasTouch: true,
                deviceScaleFactor: 2.75,
                userAgent:
                  "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.0.0 Mobile Safari/537.36",
              }
            : {}),
        });
        try {
          const page = await context.newPage();
          await page.addInitScript((value) => {
            localStorage.setItem("akipasa.theme", value);
          }, theme);
          await context.addCookies([
            {
              name: "ak_consent_version",
              value: "2",
              url: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100",
            },
          ]);
          const screenshots: string[] = [];
          for (const surface of legalSurfaces) {
            const route = `/${locale}${surface.path}`;
            const response = await page.goto(route, {
              waitUntil: "domcontentloaded",
            });
            expect(response?.status(), route).toBe(200);
            await expect(
              page.getByRole("heading", {
                name: surface.heading[locale],
                level: 1,
              }),
            ).toBeVisible();
            const main = page.locator("main.pasa-legal-page");
            await expect(main, route).toBeVisible();
            await expect(main.locator(".pasa-legal-hero")).toBeVisible();
            await expect(page.locator("html")).toHaveAttribute(
              "data-theme",
              theme,
            );
            await expect(main.locator(".pasa-legal-hero")).toHaveCSS(
              "color",
              theme === "light" ? "rgb(24, 43, 59)" : "rgb(255, 255, 255)",
            );
            await expect(main.locator(".pasa-legal-hero h1")).toHaveCSS(
              "color",
              theme === "light" ? "rgb(24, 43, 59)" : "rgb(255, 255, 255)",
            );
            if (surface.path === "/photo-credits") {
              const cards = main.locator(".pasa-photo-credit-card");
              expect(await cards.count()).toBeGreaterThan(0);
              for (const card of await cards.all()) {
                await expect(
                  card.getByRole("heading", { level: 2 }),
                ).toBeVisible();
                expect(
                  await card.locator("a[href]").count(),
                  "Source and licence links must remain present",
                ).toBeGreaterThanOrEqual(2);
              }
            } else {
              await expect(main.locator(".pasa-legal-prose")).toBeVisible();
            }
            await page.evaluate(() => document.fonts.ready);
            const geometry = await page.evaluate(() => ({
              viewport: document.documentElement.clientWidth,
              width: document.documentElement.scrollWidth,
            }));
            expect(
              geometry.width,
              `${route}: horizontal overflow ${JSON.stringify(geometry)}`,
            ).toBeLessThanOrEqual(geometry.viewport + 2);
            const screenshot =
              `test-results/pasa-legal-${locale}-${surface.path.slice(1)}-${device.name}-${theme}.png`;
            mkdirSync("test-results", { recursive: true });
            await page.screenshot({
              path: screenshot,
              animations: "disabled",
              fullPage: false,
            });
            screenshots.push(screenshot);
          }
          writeFileSync(
            `test-results/pasa-legal-${locale}-${device.name}-${theme}.json`,
            JSON.stringify(
              {
                sourceCheckout: process.env.GITHUB_SHA || "local",
                language: locale,
                viewport: device,
                theme,
                screenshots,
                proof: device.android
                  ? "emulated-Android-WebView-browser-only"
                  : "automated-browser-render-only",
                accepted: false,
              },
              null,
              2,
            ),
          );
        } finally {
          await context.close();
        }
      });
    }
  }
}
