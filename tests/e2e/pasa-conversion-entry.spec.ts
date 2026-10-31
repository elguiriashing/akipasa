import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * Public membership and referral entrypoints.
 * No payment, referral action or signed-in account is used for these captures.
 * Android-like Chromium emulation does not count as physical device acceptance.
 */
const devices = [
  { name: "phone-360", width: 360, height: 800, android: false },
  { name: "phone-390", width: 390, height: 844, android: false },
  { name: "tablet-820", width: 820, height: 1180, android: false },
  { name: "desktop-1440", width: 1440, height: 900, android: false },
  { name: "android-webview-emulated", width: 390, height: 844, android: true },
] as const;

const sampleCode = "AKIPASA2026";

for (const locale of ["en", "es"] as const) {
  test(`${locale} conversion links reject invalid codes`, async ({
    request,
  }) => {
    const badCode = await request.get(
      `/${locale}/referrals?ref=bad%3Cscript%3E`,
    );
    expect(badCode.status()).toBe(404);

    // The AkiBusiness gateway deliberately moves to its separate host first.
    const business = await request.get(`/${locale}/business/memberships`, {
      maxRedirects: 0,
    });
    expect(business.status()).toBe(307);
    const businessTarget = new URL(
      business.headers().location || "",
      business.url(),
    );
    expect(businessTarget.hostname).toBe("business.akipasa.com");
    expect(businessTarget.pathname).toBe(`/${locale}/business/memberships`);

    const duermo = await request.get(`/${locale}/duermo/memberships`, {
      maxRedirects: 0,
    });
    expect([307, 308]).toContain(duermo.status());
    const duermoTarget = new URL(duermo.headers().location || "", duermo.url());
    expect(duermoTarget.pathname).toBe(`/${locale}/membership`);
    expect(duermoTarget.searchParams.get("from")).toBe("akiduermo");

    const entry = await request.get(`/${locale}/membership?from=untrusted`);
    expect(entry.status()).toBe(200);
  });

  for (const device of devices) {
    for (const theme of ["dark", "light"] as const) {
      test(`${locale} conversion entry on ${device.name}/${theme}`, async ({
        browser,
      }) => {
        test.setTimeout(150_000);
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
          await context.addCookies([
            { name: "ak_consent_version", value: "2", url: baseURL },
          ]);
          const screenshots: string[] = [];

          const membership = await page.goto(
            `/${locale}/membership?from=akipasa`,
            { waitUntil: "domcontentloaded" },
          );
          expect(membership?.status()).toBe(200);
          await expect(
            page.getByRole("heading", {
              name: locale === "es" ? "Membresía" : "Membership",
              level: 1,
            }),
          ).toBeVisible();
          await expect(page.locator(".pasa-membership-intro")).toBeVisible();
          const manage = page.locator(".pasa-membership-manage");
          const manageHref = await manage.getAttribute("href");
          const destination = new URL(manageHref || "", baseURL);
          expect(destination.pathname).toBe(`/${locale}/auth`);
          expect(destination.searchParams.get("next")).toBe(
            `/${locale}/account/subscription?from=akipasa`,
          );
          await expect(page.locator(".app-content")).toHaveAttribute(
            "data-pasa-surface",
            "membership",
          );
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          const membershipScreenshot = `test-results/pasa-membership-entry-${locale}-${device.name}-${theme}.png`;
          mkdirSync("test-results", { recursive: true });
          await page.screenshot({
            path: membershipScreenshot,
            animations: "disabled",
            fullPage: false,
          });
          screenshots.push(membershipScreenshot);

          const referralPath = `/${locale}/referrals?ref=${sampleCode}`;
          const gate = await context.request.get(referralPath, {
            maxRedirects: 0,
          });
          const ready = process.env.AKISUITE_REFERRALS_READY === "true";
          const referral = await page.goto(referralPath, {
            waitUntil: "domcontentloaded",
          });
          expect(referral?.status()).toBe(200);
          if (ready) {
            expect(gate.status()).toBe(307);
            const location = new URL(gate.headers().location || "", baseURL);
            expect(location.pathname).toBe(`/${locale}/auth`);
            expect(location.searchParams.get("next")).toBe(referralPath);
            expect(new URL(page.url()).pathname).toBe(`/${locale}/auth`);
          } else {
            expect(gate.status()).toBe(200);
            await expect(
              page.getByRole("heading", {
                name:
                  locale === "es"
                    ? "Las recomendaciones están en preparación"
                    : "Referrals are being prepared",
                level: 1,
              }),
            ).toBeVisible();
            await expect(page.locator(".pasa-referral-entry")).toBeVisible();
            await expect(
              page.locator('.pasa-conversion-status[role="status"]'),
            ).toBeVisible();
            await expect(page.locator(".pasa-referral-entry form")).toHaveCount(
              0,
            );
            await expect(page.locator(".app-content")).toHaveAttribute(
              "data-pasa-surface",
              "referral",
            );
          }
          const dimensions = await page.evaluate(() => ({
            viewport: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
          }));
          expect(
            dimensions.scroll - dimensions.viewport,
            `Overflow: ${JSON.stringify(dimensions)}`,
          ).toBeLessThanOrEqual(2);

          const referralScreenshot = `test-results/pasa-referral-entry-${locale}-${device.name}-${theme}.png`;
          await page.screenshot({
            path: referralScreenshot,
            animations: "disabled",
            fullPage: false,
          });
          screenshots.push(referralScreenshot);

          // Business sign-in is an explicit cross-product handoff.
          // Inspect the public gateway, never follow the external login.
          const hqResponse = await page.goto(`/hq-login?lang=${locale}`, {
            waitUntil: "domcontentloaded",
          });
          expect(hqResponse?.status()).toBe(200);
          await expect(
            page.getByRole("heading", {
              level: 1,
              name:
                locale === "es"
                  ? "Gestiona tu local desde AkiHQ"
                  : "Manage your venue on AkiHQ",
            }),
          ).toBeVisible();
          const hqGuide = page.locator(
            'aside[aria-labelledby="hq-how-it-works"]',
          );
          await expect(hqGuide).toBeVisible();
          await expect(hqGuide.locator("li")).toHaveCount(3);
          const hqSignIn = page.getByRole("link", {
            name: locale === "es" ? "Entrar a AkiHQ" : "Sign in to AkiHQ",
          });
          const hqTarget = new URL(
            (await hqSignIn.getAttribute("href")) || "",
            baseURL,
          );
          expect(hqTarget.origin).toBe("https://akihq.app");
          expect(hqTarget.pathname).toBe("/login");
          expect(hqTarget.searchParams.get("lang")).toBe(locale);
          const operationsLink = page.getByRole("link", {
            name: locale === "es" ? "Conocer AkiBusiness" : "About AkiBusiness",
          });
          expect(await operationsLink.getAttribute("href")).toBe(
            "https://akibusiness.com",
          );
          const gatewayDimensions = await page.evaluate(() => ({
            viewport: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
          }));
          expect(
            gatewayDimensions.scroll - gatewayDimensions.viewport,
            `HQ gateway overflow: ${JSON.stringify(gatewayDimensions)}`,
          ).toBeLessThanOrEqual(2);
          const gatewayBrand = page.locator("main img").first();
          await expect(gatewayBrand).toHaveJSProperty("complete", true);
          expect(
            await gatewayBrand.evaluate(
              (image: HTMLImageElement) => image.naturalWidth,
            ),
          ).toBeGreaterThan(0);
          await gatewayBrand.evaluate((image: HTMLImageElement) =>
            image.decode(),
          );
          // Asset dimensions can precede the decoded SVG's final browser paint.
          await page.evaluate(
            () =>
              new Promise<void>((resolve) =>
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => resolve()),
                ),
              ),
          );
          const gatewayScreenshot = `test-results/pasa-hq-gateway-${locale}-${device.name}-${theme}.png`;
          await page.screenshot({
            path: gatewayScreenshot,
            animations: "disabled",
            fullPage: false,
          });
          screenshots.push(gatewayScreenshot);
          // A real, non-mutating GET of the cross-product email-verification UI.
          // Dummy tokens stay inside this disposable browser; never POST them.
          const waitlistProduct =
            device.name === "phone-360"
              ? "duermo"
              : device.name === "phone-390"
                ? "coches"
                : "pasa";
          const waitlistHost = {
            pasa: "https://akipasa.com",
            duermo: "https://akiduermo.com",
            coches: "https://akicoches.com",
          }[waitlistProduct];
          const waitlistEntry = "00000000-0000-4000-8000-000000000003";
          const waitlistToken = "a".repeat(64);
          const confirmation = await page.goto(
            `/waitlist/confirm?lang=${locale}&product=${waitlistProduct}&entry=${waitlistEntry}&token=${waitlistToken}`,
            { waitUntil: "domcontentloaded" },
          );
          expect(confirmation?.status()).toBe(200);
          await expect(
            page.getByRole("heading", {
              level: 1,
              name: locale === "es" ? "Solo falta un paso" : "One last step",
            }),
          ).toBeVisible();
          await expect(page.locator("main[data-product]")).toHaveAttribute(
            "data-product",
            waitlistProduct,
          );
          const confirmationForm = page.locator(
            'form[action="/api/launch-waitlist/confirm"][method="post"]',
          );
          await expect(confirmationForm).toBeVisible();
          await expect(
            confirmationForm.locator('input[name="entry"]'),
          ).toHaveValue(waitlistEntry);
          await expect(
            confirmationForm.locator('input[name="token"]'),
          ).toHaveValue(waitlistToken);
          await expect(
            confirmationForm.locator('input[name="lang"]'),
          ).toHaveValue(locale);
          await expect(
            confirmationForm.locator('input[name="product"]'),
          ).toHaveValue(waitlistProduct);
          await expect(
            page.getByRole("link", {
              name: locale === "es" ? "Volver a la web" : "Back to the website",
            }),
          ).toHaveAttribute("href", waitlistHost);
          const waitlistDimensions = await page.evaluate(() => ({
            viewport: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
            submitHeight: document
              .querySelector(
                'form[action="/api/launch-waitlist/confirm"] button',
              )
              ?.getBoundingClientRect().height,
          }));
          expect(
            waitlistDimensions.scroll - waitlistDimensions.viewport,
            `Waitlist overflow: ${JSON.stringify(waitlistDimensions)}`,
          ).toBeLessThanOrEqual(2);
          expect(waitlistDimensions.submitHeight).toBeGreaterThanOrEqual(44);
          const waitlistScreenshot = `test-results/pasa-waitlist-confirm-${locale}-${device.name}-${theme}.png`;
          await page.screenshot({
            path: waitlistScreenshot,
            animations: "disabled",
            fullPage: false,
          });
          screenshots.push(waitlistScreenshot);

          const stem = `pasa-conversion-${locale}-${device.name}-${theme}`;
          writeFileSync(
            `test-results/${stem}.json`,
            JSON.stringify(
              {
                sourceCommit: process.env.GITHUB_SHA || "local",
                locale,
                device,
                theme,
                screenshots,
                referralFeatureReady: ready,
                acceptance: "automated-guest-evidence-only",
                physicalAndroidReviewed: false,
                authenticatedReferralReviewed: false,
                checkoutReviewed: false,
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

for (const locale of ["en", "es"] as const) {
  test(`${locale} waitlist status screens never expose a submit action for invalid links`, async ({
    page,
  }) => {
    const cases = [
      {
        query: "product=untrusted&entry=bad&token=bad",
        product: "pasa",
        host: "https://akipasa.com",
        heading:
          locale === "es"
            ? "Enlace no válido o caducado"
            : "Link invalid or expired",
      },
      {
        query: "product=coches&status=invalid",
        product: "coches",
        host: "https://akicoches.com",
        heading:
          locale === "es"
            ? "Enlace no válido o caducado"
            : "Link invalid or expired",
      },
      {
        query: "product=duermo&status=unavailable",
        product: "duermo",
        host: "https://akiduermo.com",
        heading:
          locale === "es"
            ? "Verificación no disponible"
            : "Verification unavailable",
      },
    ] as const;

    for (const variant of cases) {
      const response = await page.goto(
        `/waitlist/confirm?lang=${locale}&${variant.query}`,
        { waitUntil: "domcontentloaded" },
      );
      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole("heading", { name: variant.heading, level: 1 }),
      ).toBeVisible();
      await expect(page.locator("main[data-product]")).toHaveAttribute(
        "data-product",
        variant.product,
      );
      await expect(
        page.locator('form[action="/api/launch-waitlist/confirm"]'),
      ).toHaveCount(0);
      await expect(
        page.getByRole("link", {
          name: locale === "es" ? "Volver a la web" : "Back to the website",
        }),
      ).toHaveAttribute("href", variant.host);
      await expect(
        page.locator('a[href="mailto:support@akipasa.com"]'),
      ).toBeVisible();
    }
  });
}
