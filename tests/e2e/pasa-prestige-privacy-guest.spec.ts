import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * The Prestige privacy centre is a private, feature-gated screen.
 * Guest screenshots verify the flag and sign-in boundary only.
 * They are NOT authenticated UI acceptance or physical Android evidence.
 */
const devices = [
  { name: "phone-360", width: 360, height: 800, android: false },
  { name: "desktop-1440", width: 1440, height: 900, android: false },
  { name: "android-webview-emulated", width: 390, height: 844, android: true },
] as const;

for (const locale of ["en", "es"] as const) {
  for (const device of devices) {
    for (const theme of ["dark", "light"] as const) {
      test(`${locale} Prestige privacy guest boundary ${device.name}/${theme}`, async ({
        browser,
      }) => {
        test.setTimeout(90_000);
        const baseURL =
          process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";
        const context = await browser.newContext({
          baseURL,
          viewport: { width: device.width, height: device.height },
          colorScheme: theme,
          reducedMotion: "reduce",
          ...(device.android
            ? {
                isMobile: true,
                hasTouch: true,
                deviceScaleFactor: 2.75,
                userAgent:
                  "Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
              }
            : {}),
        });
        try {
          const page = await context.newPage();
          await page.addInitScript((value) => {
            localStorage.setItem("akipasa.theme", value);
          }, theme);
          const route = `/${locale}/privacy/prestige`;
          const gate = await context.request.get(route, { maxRedirects: 0 });
          // The feature is intentionally 404 when disabled; when enabled it
          // requires a real identity before any award or address is queried.
          expect([307, 308, 404]).toContain(gate.status());
          const response = await page.goto(route, {
            waitUntil: "domcontentloaded",
          });
          const actualPath = new URL(page.url()).pathname;
          if (gate.status() === 404) {
            expect(response?.status()).toBe(404);
            expect(actualPath).toBe(route);
          } else {
            const destination = new URL(gate.headers().location || "", baseURL);
            expect(destination.pathname).toBe(`/${locale}/auth`);
            expect(destination.searchParams.get("next")).toBe(route);
            expect(response?.status()).toBe(200);
            expect(actualPath).toBe(`/${locale}/auth`);
          }
          await expect(page.locator('[class*="privacyAwardCard"]')).toHaveCount(
            0,
          );
          const dimensions = await page.evaluate(() => ({
            viewport: document.documentElement.clientWidth,
            width: document.documentElement.scrollWidth,
          }));
          expect(dimensions.width - dimensions.viewport).toBeLessThanOrEqual(2);
          mkdirSync("test-results", { recursive: true });
          const stem = `pasa-prestige-privacy-guest-${locale}-${device.name}-${theme}`;
          const screenshot = `test-results/${stem}.png`;
          await page.screenshot({
            path: screenshot,
            fullPage: false,
            animations: "disabled",
          });
          writeFileSync(
            `test-results/${stem}.json`,
            JSON.stringify(
              {
                sourceCommit: process.env.GITHUB_SHA || "local",
                locale,
                theme,
                device,
                route,
                gateStatus: gate.status(),
                finalPath: actualPath,
                screenshot,
                proof: device.android
                  ? "Android-like Chromium emulation; no physical device"
                  : "guest browser boundary; not authenticated presentation",
                acceptance: false,
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
