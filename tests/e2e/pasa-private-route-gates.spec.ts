import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

type RouteRecord = {
  scope: string;
  status: string;
};

const manifest = JSON.parse(
  readFileSync("docs/AKIPASA_UI_ROUTE_MATRIX_20261028.json", "utf8"),
) as { routes: Record<string, RouteRecord> };

const privateRoutes = Object.keys(manifest.routes)
  .filter((path) =>
    /^src\/app\/\[locale\]\/(account|admin|staff|owner)(?:\/.*)?\/page\.tsx$/.test(
      path,
    ),
  )
  .map((path) =>
    path
      .replace(/^src\/app\/\[locale\]/, "")
      .replace(/\/page\.tsx$/, "")
      .replace(/\[id\]/g, "00000000-0000-4000-8000-000000000001"),
  )
  .sort();

test.describe("AkiPasa private route matrix", () => {
  for (const locale of ["en", "es"] as const) {
    test(`all ${locale} account, admin, staff and owner pages enforce guest sign-in`, async ({
      request,
    }) => {
      test.setTimeout(180_000);
      expect(privateRoutes.length).toBeGreaterThan(30);
      for (const path of privateRoutes) {
        const route = `/${locale}${path}`;
        const response = await request.get(route, { maxRedirects: 0 });
        expect(
          [303, 307],
          `${route} returned ${response.status()} without an authenticated session`,
        ).toContain(response.status());
        const redirect = response.headers().location || "";
        // Membership aliases are normalized by middleware before auth runs.
        // Verify the canonical destination still enforces sign-in rather than
        // assuming the first 307 is issued by requireUser.
        if (path === "/account/membership" || path === "/account/memberships") {
          const destination = new URL(redirect, response.url());
          expect(
            destination.origin,
            `${route} must stay on the same origin`,
          ).toBe(new URL(response.url()).origin);
          expect(destination.pathname).toBe(`/${locale}/account/subscription`);
          const canonical = await request.get(destination.toString(), {
            maxRedirects: 0,
          });
          expect([303, 307], `${route} canonical guest gate`).toContain(
            canonical.status(),
          );
          const signIn = new URL(
            canonical.headers().location || "",
            canonical.url(),
          );
          expect(signIn.origin).toBe(new URL(canonical.url()).origin);
          expect(signIn.pathname).toBe(`/${locale}/auth`);
          expect(signIn.searchParams.get("next")).toMatch(
            new RegExp(`^/${locale}/account/subscription(?:\\?|$)`),
          );
          continue;
        }
        const signIn = new URL(redirect, response.url());
        expect(signIn.origin, `${route} sign-in must remain same-origin`).toBe(
          new URL(response.url()).origin,
        );
        expect(signIn.pathname, `${route} must enforce sign-in`).toBe(
          `/${locale}/auth`,
        );
        expect(signIn.searchParams.get("next"), route).toBeTruthy();
      }
    });
  }
});

const ownerDevices = [
  { name: "phone-360", width: 360, height: 800, android: false },
  { name: "tablet-820", width: 820, height: 1024, android: false },
  { name: "desktop-1440", width: 1440, height: 900, android: false },
  { name: "android-emulated", width: 390, height: 844, android: true },
] as const;

for (const locale of ["en", "es"] as const) {
  for (const device of ownerDevices) {
    for (const theme of ["light", "dark"] as const) {
      test(`${locale} protected owner guest entry ${device.name}/${theme}`, async ({
        browser,
      }) => {
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
          const path = `/${locale}/owner`;
          const gate = await context.request.get(path, { maxRedirects: 0 });
          expect([303, 307]).toContain(gate.status());
          const signIn = new URL(gate.headers().location || "", baseURL);
          expect(signIn.origin).toBe(new URL(baseURL).origin);
          expect(signIn.pathname).toBe(`/${locale}/auth`);
          expect(signIn.searchParams.get("next")).toBe(path);
          const page = await context.newPage();
          await page.addInitScript((value) => {
            localStorage.setItem("akipasa.theme", value);
          }, theme);
          const response = await page.goto(path, {
            waitUntil: "domcontentloaded",
          });
          expect(response?.status()).toBe(200);
          expect(new URL(page.url()).pathname).toBe(`/${locale}/auth`);
          await expect(page.getByRole("main").first()).toBeVisible();
          const dimensions = await page.evaluate(() => ({
            viewport: document.documentElement.clientWidth,
            content: document.documentElement.scrollWidth,
          }));
          expect(dimensions.content).toBeLessThanOrEqual(
            dimensions.viewport + 2,
          );
          mkdirSync("test-results", { recursive: true });
          const stem = `pasa-owner-guest-${locale}-${device.name}-${theme}`;
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
                route: path,
                locale,
                device,
                theme,
                screenshot,
                acceptance: "guest-auth-only",
                authenticatedOwnerReviewed: false,
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
