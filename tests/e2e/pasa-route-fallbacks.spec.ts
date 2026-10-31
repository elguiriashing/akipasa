import { expect, test } from "@playwright/test";

const base = new URL(
  process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100",
);
if (base.hostname === "127.0.0.1") base.hostname = "localhost";
test.use({ baseURL: base.origin, storageState: { cookies: [], origins: [] } });

for (const locale of ["en", "es"]) {
  test(`${locale} fallback preserves existing guest redirect and not-found HTTP contracts`, async ({
    request,
  }) => {
    for (const path of [
      `/${locale}/account`,
      `/${locale}/events/missing-event/book?occurrence=selected-occurrence`,
    ]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(307);
      const destination = new URL(response.headers().location!, base);
      expect(destination.pathname).toBe(`/${locale}/auth`);
      expect(destination.searchParams.get("next")).toBe(path);
    }
    const response = await request.get(
      `/${locale}/check-in/not-a-valid-venue-token`,
      { maxRedirects: 0 },
    );
    expect(response.status()).toBe(404);
    expect(await response.text()).toContain('name="robots" content="noindex"');
  });

  for (const width of [360, 390, 820, 1440])
    for (const theme of ["dark", "light"] as const) {
      test(`${locale} real missing routes ${width}/${theme} retain readable fallback and safe homes`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({
          colorScheme: theme,
          reducedMotion: width === 390 ? "reduce" : "no-preference",
        });
        await page.addInitScript(
          (theme) => localStorage.setItem("akipasa.theme", theme),
          theme,
        );
        await page.route(/^https?:\/\//, (route) => {
          const url = new URL(route.request().url());
          return ["localhost", "127.0.0.1"].includes(url.hostname)
            ? route.continue()
            : route.abort();
        });
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        for (const path of [
          `/${locale}/check-in/not-a-valid-venue-token`,
          `/${locale}/this-page-does-not-exist`,
        ]) {
          const response = await page.goto(path, {
            waitUntil: "domcontentloaded",
          });
          expect(response?.status(), path).toBe(404);
          const fallback = page.locator('[data-route-fallback="not-found"]');
          await expect(fallback).toBeVisible();
          await expect(fallback).toHaveAttribute(
            "data-boundary-product",
            "akipasa",
          );
          await expect(page.locator("html")).toHaveAttribute("lang", locale);
          await expect(
            page.getByRole("link", {
              name: locale === "es" ? "Volver al inicio" : "Back to the start",
              exact: true,
            }),
          ).toHaveAttribute("href", `/${locale}`);
          expect(
            await page
              .locator('meta[name="robots"]')
              .evaluateAll((elements) =>
                elements.some((element) =>
                  element.getAttribute("content")?.includes("noindex"),
                ),
              ),
          ).toBe(true);
          // Exercise the real opt-out; do not seed optional consent as accepted.
          const consent = page.locator(".personalisation-consent");
          if (await consent.count()) {
            const reject = consent.getByRole("button", {
              name: locale === "es" ? "Rechazar opcionales" : "Reject optional",
              exact: true,
            });
            if (await reject.isVisible()) {
              await reject.click();
              await expect(consent).toBeHidden();
            }
          }
          await page.evaluate(async () => {
            await Promise.all(
              document
                .getAnimations()
                .filter((animation) =>
                  Number.isFinite(
                    animation.effect?.getComputedTiming().endTime,
                  ),
                )
                .map((animation) => animation.finished),
            );
          });
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          ).toBe(true);
          await expect(
            fallback.getByRole("heading", { level: 1 }),
          ).toBeVisible();
          const home = fallback.getByRole("link", {
            name: locale === "es" ? "Volver al inicio" : "Back to the start",
            exact: true,
          });
          await home.focus();
          await expect(home).toBeFocused();
          await expect(fallback).not.toContainText(
            /Error:|stack trace|service_role|token=|not-a-valid-venue-token/,
          );
          const screenshot = `test-results/pasa-route-fallback-${locale}-${width}-${theme}-${path.includes("check-in") ? "localized" : "root"}.png`;
          await page.screenshot({ path: screenshot, fullPage: true });
          await testInfo.attach(
            `${locale}-${width}-${theme}-${path.includes("check-in") ? "localized" : "root"}`,
            { path: screenshot, contentType: "image/png" },
          );
        }
        expect(errors).toEqual([]);
      });
    }
}
