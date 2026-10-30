import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

// The generic public fixture intentionally has zero events. This same dedicated
// adapter gate is used by the maintained Spotlight matrix; the runner enables it
// and must execute all sixteen cases. It is not a release-policy exclusion.
test.describe("current populated Event candidate review", () => {
  test.use({ isMobile: false, deviceScaleFactor: 1 });
  test.skip(
    process.env.SPOTLIGHT_E2E !== "1",
    "Dedicated disposable Spotlight adapter required; no production event seeding.",
  );
  for (const locale of ["en", "es"] as const)
    for (const theme of ["dark", "light"] as const)
      for (const width of [360, 390, 820, 1440])
        test(`${locale} ${theme} ${width} populated event keyboard booking and back`, async ({
          page,
          context,
          request,
        }) => {
          const response = await request.get("/__spotlight_fixture");
          expect(response.status()).toBe(200);
          const fixture = await response.json();
          expect(new URL(fixture.siteUrl).hostname).toBe("127.0.0.1");
          await context.addCookies([
            { name: "ak_consent_version", value: "2", url: fixture.siteUrl },
          ]);
          await page.setViewportSize({ width, height: 1000 });
          await page.emulateMedia({
            reducedMotion: "reduce",
            colorScheme: theme,
          });
          await page.addInitScript(
            (value) => localStorage.setItem("akipasa.theme", value),
            theme,
          );
          await page.route(/^https?:\/\//, (route) =>
            new URL(route.request().url()).origin === fixture.siteUrl
              ? route.continue()
              : route.abort(),
          );
          const path = `/${locale}/events/${fixture.event.slug}`;
          const result = await page.goto(path, {
            waitUntil: "domcontentloaded",
          });
          expect(result!.status()).toBe(200);
          const event = page.locator("main.spotlight-event");
          await expect(event.getByRole("heading", { level: 1 })).toHaveText(
            fixture.event.title[locale],
          );
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          await expect(
            event.locator(".event-spotlight-facts time").first(),
          ).toHaveAttribute("datetime", fixture.event.startsAt);
          await expect(event).toContainText(
            new Intl.NumberFormat(locale, {
              style: "currency",
              currency: "EUR",
            }).format(12.5),
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth - innerWidth,
            ),
          ).toBeLessThanOrEqual(2);
          const booking = event.locator(".event-spotlight-primary-action a");
          const bookingPath = `${path}/book?occurrence=${fixture.event.occurrenceId}`;
          await expect(booking).toHaveAttribute("href", bookingPath);
          await expect(
            page.locator(
              width < 1000 ? "nav.pasa-dock" : "aside.suite-discovery-nav",
            ),
          ).toBeVisible();
          await mkdir("test-results/event-candidate-review", {
            recursive: true,
          });
          const image = `test-results/event-candidate-review/${locale}-${theme}-${width}`;
          await page.screenshot({
            path: image + "-full.png",
            fullPage: true,
            animations: "disabled",
          });
          await page.evaluate(() =>
            scrollTo(0, document.documentElement.scrollHeight),
          );
          await page.screenshot({
            path: image + "-lower.png",
            animations: "disabled",
          });
          await page.evaluate(() => {
            (document.activeElement as HTMLElement)?.blur();
            window.scrollTo(0, 0);
          });
          for (
            let i = 0;
            i < 60 &&
            !(await booking.evaluate((el) => el === document.activeElement));
            i++
          )
            await page.keyboard.press("Tab");
          await expect(booking).toBeFocused();
          await page.keyboard.press("Enter");
          await expect(page).toHaveURL(
            (url) =>
              url.pathname === `/${locale}/auth` &&
              url.searchParams.get("next") === bookingPath,
          );
          await page.goBack({ waitUntil: "domcontentloaded" });
          await expect(event.getByRole("heading", { level: 1 })).toHaveText(
            fixture.event.title[locale],
          );
          expect(new URL(page.url()).pathname).toBe(path);
          expect(
            (await request.get(`/${locale}/events/spotlight-missing`)).status(),
          ).toBe(404);
          await test.info().attach("populated-event-fixture-scope", {
            body: "Actual Next Event; local declared synthetic data. Guest keyboard booking redirect/back only; no authenticated booking, payment, attendance, XP or real provider acceptance.",
            contentType: "text/plain",
          });
        });
});
