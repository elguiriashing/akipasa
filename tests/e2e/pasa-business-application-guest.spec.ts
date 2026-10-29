import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const devices = [
  { name: "phone-390", width: 390, height: 844, android: false },
  { name: "desktop-1440", width: 1440, height: 900, android: false },
  { name: "android-emulated", width: 390, height: 844, android: true },
] as const;

for (const locale of ["en", "es"] as const) {
  for (const device of devices) {
    for (const theme of ["dark", "light"] as const) {
      const title = `${locale} business guest on ${device.name}/${theme}`;
      test(title, async ({ browser }) => {
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
          const page = await context.newPage();
          await page.addInitScript((value) => {
            localStorage.setItem("akipasa.theme", value);
          }, theme);
          const route = `/${locale}/business/apply`;
          const gate = await context.request.get(route, {
            maxRedirects: 0,
          });
          expect([303, 307], route).toContain(gate.status());
          const signIn = new URL(gate.headers().location || "", baseURL);
          expect(signIn.origin).toBe(new URL(baseURL).origin);
          expect(signIn.pathname).toBe(`/${locale}/auth`);
          expect(signIn.searchParams.get("next")).toBe(route);

          const response = await page.goto(route, {
            waitUntil: "domcontentloaded",
          });
          expect(response?.status()).toBe(200);
          const destination = new URL(page.url());
          expect(destination.pathname).toBe(`/${locale}/auth`);
          expect(destination.searchParams.get("next")).toBe(route);
          await expect(page.getByRole("main").first()).toBeVisible();
          const dimensions = await page.evaluate(() => ({
            viewport: document.documentElement.clientWidth,
            width: document.documentElement.scrollWidth,
          }));
          const overflow = dimensions.width - dimensions.viewport;
          expect(overflow).toBeLessThanOrEqual(2);

          mkdirSync("test-results", { recursive: true });
          const stem = `pasa-business-guest-${locale}-${device.name}-${theme}`;
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
                route,
                signInPath: destination.pathname,
                returnPath: destination.searchParams.get("next"),
                locale,
                device,
                theme,
                screenshot,
                acceptance: "guest-auth-only",
                physicalAndroidReviewed: false,
                authenticatedBusinessPageReviewed: false,
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
