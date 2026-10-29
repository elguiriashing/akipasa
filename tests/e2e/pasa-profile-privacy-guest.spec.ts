import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * Guest-only EN/ES profile privacy boundary and responsive sign-in return.
 * Authenticated profile-data and native Android approval remain separate gates.
 */
const devices = [
  { name: "phone-360", width: 360, height: 800, android: false },
  { name: "desktop-1440", width: 1440, height: 900, android: false },
  { name: "android-webview-emulated", width: 390, height: 844, android: true },
] as const;

for (const locale of ["en", "es"] as const) {
  for (const device of devices) {
    for (const theme of ["light", "dark"] as const) {
      test(`${locale} profile guest privacy ${device.name}/${theme}`, async ({
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
          const route = `/${locale}/account/profile`;
          const gate = await context.request.get(route, { maxRedirects: 0 });
          expect([303, 307], route).toContain(gate.status());
          const login = new URL(gate.headers().location || "", baseURL);
          expect(login.origin).toBe(new URL(baseURL).origin);
          expect(login.pathname).toBe(`/${locale}/auth`);
          expect(login.searchParams.get("next")).toMatch(
            new RegExp(`^/${locale}/account(?:/|$)`),
          );
          const response = await page.goto(route, {
            waitUntil: "domcontentloaded",
          });
          expect(response?.status()).toBe(200);
          expect(new URL(page.url()).pathname).toBe(`/${locale}/auth`);
          await expect(page.locator(".account-profile-screen")).toHaveCount(0);
          await expect(page.getByRole("main").first()).toBeVisible();
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          const width = await page.evaluate(() => ({
            viewport: document.documentElement.clientWidth,
            content: document.documentElement.scrollWidth,
          }));
          expect(width.content - width.viewport).toBeLessThanOrEqual(2);
          const stem = `pasa-profile-guest-${locale}-${device.name}-${theme}`;
          mkdirSync("test-results", { recursive: true });
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
                guardedRoute: route,
                loginPath: login.pathname,
                next: login.searchParams.get("next"),
                screenshot,
                acceptance: false,
                proof: device.android
                  ? "Chromium Android-like emulation only"
                  : "guest browser render only",
                authenticatedProfileReviewed: false,
                physicalAndroidReviewed: false,
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
