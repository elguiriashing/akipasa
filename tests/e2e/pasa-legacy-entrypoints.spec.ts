import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * Legacy URLs must hand users to the canonical, role-protected screen.
 * Screenshots prove guest redirects only, NOT authenticated operations UI.
 */
const views = {
  support: "/staff/support",
  inventory: "/staff/catalogue",
  commercial: "/staff/promotions",
  audit: "/admin/audit",
} as const;

for (const locale of ["en", "es"] as const) {
  test(`${locale} legacy moderation views stay on canonical protected routes`, async ({
    request,
  }) => {
    for (const [view, target] of Object.entries(views)) {
      const route = `/${locale}/moderation?view=${view}`;
      const response = await request.get(route, { maxRedirects: 0 });
      expect([303, 307]).toContain(response.status());
      const destination = new URL(
        response.headers().location || "",
        response.url(),
      );
      expect(destination.origin).toBe(new URL(response.url()).origin);
      expect(destination.pathname).toBe(`/${locale}${target}`);
      const guest = await request.get(destination.toString(), {
        maxRedirects: 0,
      });
      expect([303, 307]).toContain(guest.status());
      const auth = new URL(guest.headers().location || "", guest.url());
      expect(auth.origin).toBe(new URL(guest.url()).origin);
      expect(auth.pathname).toBe(`/${locale}/auth`);
      expect(auth.searchParams.get("next")).toBeTruthy();
    }

    const encodedQueue = await request.get(
      `/${locale}/moderation?queue=claims%26show%3Dprivate`,
      { maxRedirects: 0 },
    );
    expect([303, 307]).toContain(encodedQueue.status());
    const destination = new URL(
      encodedQueue.headers().location || "",
      encodedQueue.url(),
    );
    expect(destination.pathname).toBe(`/${locale}/staff/moderation`);
    expect(destination.searchParams.get("queue")).toBe(
      "claims&show=private",
    );
    expect(destination.searchParams.has("show")).toBe(false);
    const noOverride = await request.get(
      `/${locale}/moderation?view=https%3A%2F%2Fevil.test&queue=claims`,
      { maxRedirects: 0 },
    );
    const fallback = new URL(
      noOverride.headers().location || "",
      noOverride.url(),
    );
    expect(fallback.origin).toBe(new URL(noOverride.url()).origin);
    expect(fallback.pathname).toBe(`/${locale}/staff/moderation`);
    expect(fallback.searchParams.get("queue")).toBe("claims");
  });

  test(`${locale} old membership and business paths respect product boundaries`, async ({
    request,
  }) => {
    const duermo = await request.get(
      `/${locale}/duermo/memberships`,
      { maxRedirects: 0 },
    );
    expect([307, 308]).toContain(duermo.status());
    const membership = new URL(
      duermo.headers().location || "",
      duermo.url(),
    );
    expect(membership.pathname).toBe(`/${locale}/membership`);
    expect(membership.searchParams.get("from")).toBe("akiduermo");

    const uuid = "00000000-0000-4000-8000-000000000001";
    for (const suffix of [
      "/business",
      "/business/memberships",
      "/business/mobility",
      `/business/venue/${uuid}`,
    ]) {
      const response = await request.get(
        `/${locale}${suffix}?source=akipasa`,
        { maxRedirects: 0 },
      );
      expect(response.status()).toBe(307);
      const destination = new URL(
        response.headers().location || "",
        response.url(),
      );
      expect(destination.origin).toBe("https://business.akipasa.com");
      expect(destination.pathname).toBe(`/${locale}${suffix}`);
      expect(destination.searchParams.get("source")).toBe("akipasa");
    }
  });
}

test("public root preserves its canonical locale and campaign query", async ({
  request,
}) => {
  const response = await request.get("/?campaign=launch", {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(308);
  const target = new URL(
    response.headers().location || "",
    response.url(),
  );
  expect(target.pathname).toBe("/es");
  expect(target.searchParams.get("campaign")).toBe("launch");
  expect(target.origin).toBe(new URL(response.url()).origin);
});

const devices = [
  { name: "phone-360", width: 360, height: 800, android: false },
  { name: "desktop-1440", width: 1440, height: 900, android: false },
  { name: "android-webview-emulated", width: 390, height: 844, android: true },
] as const;

for (const locale of ["en", "es"] as const) {
  for (const device of devices) {
    test(`${locale} legacy moderation guest handoff on ${device.name}`, async ({
      browser,
    }) => {
      test.setTimeout(90_000);
      const baseURL =
        process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";
      const context = await browser.newContext({
        baseURL,
        viewport: { width: device.width, height: device.height },
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
        const response = await page.goto(
          `/${locale}/moderation?queue=claims`,
          { waitUntil: "domcontentloaded" },
        );
        expect(response?.status()).toBe(200);
        expect(new URL(page.url()).pathname).toBe(`/${locale}/auth`);
        await expect(page.locator("main").first()).toBeVisible();
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          ),
        ).toBeLessThanOrEqual(2);
        const stem = `pasa-legacy-moderation-guest-${locale}-${device.name}`;
        mkdirSync("test-results", { recursive: true });
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
              device,
              screen: "/auth",
              originalRoute: `/${locale}/moderation?queue=claims`,
              screenshot,
              accepted: false,
              authenticatedReviewer: null,
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
