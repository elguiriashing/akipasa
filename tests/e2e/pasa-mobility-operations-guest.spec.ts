import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * AkiPasa public-host handoff for the rental management workspace.
 * Tests only the canonical cross-host redirect and local guest sign-in UI.
 * It does NOT certify authenticated fleet/bookings actions or physical Android.
 */
const devices = [
  { name: "phone-360", width: 360, height: 800, android: false },
  { name: "tablet-820", width: 820, height: 1180, android: false },
  { name: "desktop-1440", width: 1440, height: 900, android: false },
  { name: "android-webview-emulated", width: 390, height: 844, android: true },
] as const;

for (const locale of ["en", "es"] as const) {
  for (const device of devices) {
    for (const theme of ["dark", "light"] as const) {
      test(`${locale} rental workspace guest ${device.name}/${theme}`, async ({
        browser,
      }) => {
        test.setTimeout(120_000);
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
          const route = `/${locale}/business/mobility`;
          const gate = await context.request.get(
            `${route}?view=fleet&selected=vehicle`,
            { maxRedirects: 0 },
          );
          expect(gate.status(), route).toBe(307);
          const canonical = new URL(gate.headers().location || "", baseURL);
          expect(canonical.origin).toBe("https://business.akipasa.com");
          expect(canonical.pathname).toBe(route);
          expect(canonical.searchParams.get("view")).toBe("fleet");
          expect(canonical.searchParams.get("selected")).toBe("vehicle");

          const page = await context.newPage();
          await page.addInitScript((value) => {
            localStorage.setItem("akipasa.theme", value);
          }, theme);
          const authPath = `/${locale}/auth?next=${encodeURIComponent(route)}`;
          const response = await page.goto(authPath, {
            waitUntil: "domcontentloaded",
          });
          expect(response?.status()).toBe(200);
          const destination = new URL(page.url());
          expect(destination.origin).toBe(new URL(baseURL).origin);
          expect(destination.pathname).toBe(`/${locale}/auth`);
          expect(destination.searchParams.get("next")).toBe(route);
          await expect(page.getByRole("main").first()).toBeVisible();
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          await expect(
            page.locator('[data-pasa-operation="rental-mobility"]'),
          ).toHaveCount(0);
          const dimensions = await page.evaluate(() => ({
            viewport: document.documentElement.clientWidth,
            width: document.documentElement.scrollWidth,
          }));
          expect(dimensions.width - dimensions.viewport).toBeLessThanOrEqual(2);
          mkdirSync("test-results", { recursive: true });
          const stem = `pasa-rental-guest-${locale}-${device.name}-${theme}`;
          const screenshot = `test-results/${stem}.png`;
          await page.screenshot({
            path: screenshot,
            animations: "disabled",
            fullPage: false,
          });
          writeFileSync(
            `test-results/${stem}.json`,
            JSON.stringify(
              {
                sourceCommit: process.env.GITHUB_SHA || "local",
                locale,
                device,
                theme,
                route,
                canonicalBusinessOrigin: canonical.origin,
                canonicalBusinessPath: canonical.pathname,
                localAuthPath: destination.pathname,
                next: destination.searchParams.get("next"),
                screenshot,
                acceptance: false,
                businessHostAuthenticatedReviewed: false,
                physicalAndroidReviewed: false,
                proof: device.android
                  ? "Android-like Chromium emulation and public-host handoff only"
                  : "guest public-host handoff and local auth preview only",
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
