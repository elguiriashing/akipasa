import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * This suite verifies guest return-path security and an auth-shell preview.
 * Acceptance of the protected confirmation form requires a real signed-in
 * test account and separate visual/device review.
 */
const viewports = [
  { name: "phone-390", width: 390, height: 844, android: false },
  { name: "desktop-1440", width: 1440, height: 900, android: false },
  { name: "android-webview-emulated", width: 390, height: 844, android: true },
] as const;

for (const locale of ["en", "es"] as const) {
  test(`${locale} terms confirmation rejects external post-login destinations`, async ({
    request,
  }) => {
    const malicious = `/${locale}/terms/accept?next=${encodeURIComponent(
      "https://attacker.example/steal",
    )}`;
    const response = await request.get(malicious, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    const destination = new URL(response.headers().location || "", response.url());
    expect(destination.origin).toBe(new URL(response.url()).origin);
    expect(destination.pathname).toBe(`/${locale}/auth`);
    const returnTo = new URL(
      destination.searchParams.get("next") || "",
      response.url(),
    );
    expect(returnTo.pathname).toBe(`/${locale}/terms/accept`);
    expect(returnTo.searchParams.get("next")).toBe(`/${locale}/account`);
  });

  for (const device of viewports) {
    for (const theme of ["dark", "light"] as const) {
      test(`${locale} guest terms entry on ${device.name}/${theme}`, async ({
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
          const page = await context.newPage();
          await page.addInitScript((value) => {
            localStorage.setItem("akipasa.theme", value);
          }, theme);
          const desired = `/${locale}/account`;
          const route = `/${locale}/terms/accept?next=${encodeURIComponent(desired)}`;
          const gate = await context.request.get(route, { maxRedirects: 0 });
          expect(gate.status()).toBe(307);
          const location = new URL(gate.headers().location || "", baseURL);
          expect(location.pathname).toBe(`/${locale}/auth`);
          const returnTo = new URL(location.searchParams.get("next") || "", baseURL);
          expect(returnTo.pathname).toBe(`/${locale}/terms/accept`);
          expect(returnTo.searchParams.get("next")).toBe(desired);

          const response = await page.goto(route, {
            waitUntil: "domcontentloaded",
          });
          expect(response?.status()).toBe(200);
          expect(new URL(page.url()).pathname).toBe(`/${locale}/auth`);
          await expect(page.getByRole("main").first()).toBeVisible();

          const dimensions = await page.evaluate(() => ({
            viewport: document.documentElement.clientWidth,
            content: document.documentElement.scrollWidth,
          }));
          expect(dimensions.content - dimensions.viewport).toBeLessThanOrEqual(2);

          mkdirSync("test-results", { recursive: true });
          const stem = `pasa-terms-entry-${locale}-${device.name}-${theme}`;
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
                redirect: location.pathname,
                protectedReturnPath: returnTo.pathname,
                requestedNext: returnTo.searchParams.get("next"),
                locale,
                device,
                theme,
                screenshot,
                acceptance: "guest-gate-only",
                authenticatedTermsFormReviewed: false,
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
