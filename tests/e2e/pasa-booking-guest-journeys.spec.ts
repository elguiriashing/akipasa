import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * Public booking and onboarding ingress, exercised without session cookies.
 * These tests never query private reservations, make bookings, award XP,
 * bypass age/consent checks, or represent authenticated visual acceptance.
 */
const fixtureOccurrence = "00000000-0000-4000-8000-000000000001";

for (const locale of ["en", "es"] as const) {
  test(`${locale} booking and onboarding guest gates retain their safe return paths`, async ({
    request,
  }) => {
    const protectedPaths = [
      `/${locale}/events/fixture-event/book?occurrence=${fixtureOccurrence}`,
      `/${locale}/venues/fixture-venue/book`,
      `/${locale}/onboarding`,
      `/${locale}/onboarding/privacy`,
    ];
    for (const path of protectedPaths) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(307);
      const location = response.headers().location;
      expect(location, path).toBeTruthy();
      const destination = new URL(location!, "http://localhost");
      expect(destination.pathname, path).toBe(`/${locale}/auth`);
      expect(destination.searchParams.get("next"), path).toBe(path);
    }

    const terms = await request.get(`/${locale}/terms/accept`, {
      maxRedirects: 0,
    });
    expect(terms.status()).toBe(307);
    const destination = new URL(
      terms.headers().location!,
      "http://localhost",
    );
    expect(destination.pathname).toBe(`/${locale}/auth`);
    expect(destination.searchParams.get("next")).toContain(
      `/${locale}/terms/accept?next=`,
    );

    const malformed = await request.get(
      `/${locale}/check-in/not-a-valid-venue-token`,
      { maxRedirects: 0 },
    );
    expect(malformed.status()).toBe(404);
  });

  for (const device of [
    { name: "phone", width: 390, height: 844 },
    { name: "desktop", width: 1440, height: 900 },
  ] as const) {
    for (const theme of ["dark", "light"] as const) {
      test(`${locale} booking guest entry at ${device.name}/${theme} stays accessible`, async ({
        page,
      }) => {
        await page.setViewportSize({
          width: device.width,
          height: device.height,
        });
        await page.emulateMedia({
          colorScheme: theme,
          reducedMotion: "reduce",
        });
        const path = `/${locale}/events/fixture-event/book?occurrence=${fixtureOccurrence}`;
        const response = await page.goto(path, {
          waitUntil: "domcontentloaded",
        });
        expect(response?.status()).toBe(200);
        const destination = new URL(page.url());
        expect(destination.pathname).toBe(`/${locale}/auth`);
        expect(destination.searchParams.get("next")).toBe(path);

        const main = page.getByRole("main").first();
        await expect(main).toBeVisible();
        const dimensions = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
        }));
        expect(
          dimensions.content,
          `Guest entry ${path}: ${JSON.stringify(dimensions)}`,
        ).toBeLessThanOrEqual(dimensions.viewport + 2);

        mkdirSync("test-results", { recursive: true });
        const screenshot =
          `test-results/pasa-booking-auth-${locale}-${device.name}-${theme}.png`;
        await page.screenshot({ path: screenshot, fullPage: false });
        writeFileSync(
          `test-results/pasa-booking-auth-${locale}-${device.name}-${theme}.json`,
          JSON.stringify(
            {
              sourceCommit: process.env.GITHUB_SHA || "local",
              route: path,
              finalPath: destination.pathname,
              returnPath: destination.searchParams.get("next"),
              device,
              theme,
              screenshot,
              acceptance: "guest-entry-only",
            },
            null,
            2,
          ),
        );
      });
    }
  }
}
