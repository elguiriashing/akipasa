import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "parallel" });
// Next's local Node adapter canonicalizes the request authority to localhost.
// Use that same browser origin so the real CSRF-protected consent POST is valid.
const localBase = new URL(
  process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100",
);
if (localBase.hostname === "127.0.0.1") localBase.hostname = "localhost";
test.use({ baseURL: localBase.origin });

const viewports = [
  { width: 390, height: 844 },
  { width: 600, height: 960 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 640, height: 400 },
];

for (const locale of ["en", "es"]) {
  for (const theme of ["light", "dark"]) {
    for (const viewport of viewports) {
      test(`tablet routes ${locale} ${theme} ${viewport.width}`, async ({
        page,
      }) => {
        test.setTimeout(180_000);
        page.setDefaultTimeout(15_000);
        await page.setViewportSize(viewport);
        await page.addInitScript((theme) => {
          localStorage.setItem("akipasa.theme", theme);
        }, theme);
        await page.route(/^https?:\/\//, (route) => {
          if (
            ["127.0.0.1", "localhost"].includes(
              new URL(route.request().url()).hostname,
            )
          )
            return route.continue();
          return route.abort();
        });
        // Make the real opt-out decision before testing navigation. A cookie seed
        // or a non-waiting visibility check can race client hydration.
        await page.goto(`/${locale}`, { waitUntil: "domcontentloaded" });
        const privacy = page.locator(".personalisation-consent");
        await expect(privacy).toBeVisible();
        const consentResponse = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname ===
              "/api/v1/personalisation/consent" &&
            response.request().method() === "POST",
        );
        await privacy
          .getByRole("button", {
            name: locale === "es" ? "Rechazar opcionales" : "Reject optional",
            exact: true,
          })
          .click();
        expect((await consentResponse).status()).toBe(204);
        await expect(privacy).toBeHidden();
        expect(
          await page.evaluate(() =>
            document.cookie.split("; ").includes("ak_consent_version=2"),
          ),
        ).toBe(true);
        for (const cookie of ["analytics", "personalisation", "marketing"])
          expect(
            await page.evaluate(
              (name) =>
                document.cookie.split("; ").includes(`ak_${name}=denied`),
              cookie,
            ),
          ).toBe(true);
        for (const route of [
          `/${locale}`,
          `/${locale}/auth`,
          `/${locale}/membership`,
          `/${locale}/map`,
          `/${locale}/passports`,
          `/${locale}/community`,
          `/${locale}/privacy`,
          `/${locale}/terms`,
          `/akiduermo?lang=${locale}`,
        ]) {
          console.log(`${locale} ${theme} ${viewport.width} ${route}`);
          await page.goto(route, { waitUntil: "domcontentloaded" });
          await expect(page.locator("main")).toBeVisible();
          const restored = await page.evaluate(() => ({
            origin: location.origin,
            version: document.cookie
              .split("; ")
              .includes("ak_consent_version=2"),
            denied: ["analytics", "personalisation", "marketing"].every(
              (name) =>
                document.cookie.split("; ").includes(`ak_${name}=denied`),
            ),
          }));
          console.log("Synthetic consent restore", { route, ...restored });
          expect(restored.origin).toBe(localBase.origin);
          expect(restored.version, `Consent version after ${route}`).toBe(true);
          expect(restored.denied, `Opt-out after ${route}`).toBe(true);
          if (route === `/${locale}`) {
            await expect(privacy).toBeHidden();
            const more = page.getByRole("button", {
              name: locale === "es" ? "Más opciones" : "More options",
              exact: true,
            });
            if (await more.isVisible()) {
              const sheet = page.locator(".app-sheet");
              // Client hydration may replace the initial mobile navigation button.
              // Wait for the opened sheet and retry once after hydration if needed.
              await more.click();
              try {
                await expect(sheet).toBeVisible({ timeout: 4000 });
              } catch {
                await expect(more).toBeVisible();
                await more.click();
                await expect(sheet).toBeVisible();
              }
              const bounds = await sheet.boundingBox();
              expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
                viewport.width + 1,
              );
              await sheet.locator(".app-sheet-close").click();
              await expect(sheet).toBeHidden();
            }
          }
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
            `${route} ${viewport.width}`,
          ).toBeLessThanOrEqual(viewport.width + 1);
        }
        await page.screenshot({
          path: `test-results/tablet-${locale}-${theme}-${viewport.width}.png`,
          fullPage: true,
        });
      });
    }
  }
}

test("per-host install identities and raster icons", async ({ request }) => {
  for (const [host, name, start] of [
    ["akipasa.com", "AkiPasa", "/es"],
    ["business.akipasa.com", "AkiBusiness", "/es/business"],
    ["akiduermo.akipasa.com", "AkiDuermo", "/"],
  ]) {
    const response = await request.get("/manifest.webmanifest", {
      headers: { host },
    });
    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    expect(manifest.name).toBe(name);
    expect(manifest.start_url).toBe(start);
    for (const resource of ["/sw.js", "/offline.html"]) {
      const shell = await request.get(resource, {
        headers: { host },
        maxRedirects: 0,
      });
      expect(shell.status()).toBe(200);
    }
    expect(
      manifest.icons.filter(
        (icon: { type: string }) => icon.type === "image/png",
      ),
    ).toHaveLength(4);
    for (const icon of manifest.icons) {
      const image = await request.get(icon.src, {
        headers: { host },
        maxRedirects: 0,
      });
      expect(image.status()).toBe(200);
      expect(image.headers()["content-type"]).toContain(icon.type);
    }
  }
});

test("AkiBusiness login and modes fit tablets and split windows", async ({
  page,
}) => {
  test.setTimeout(240_000);
  // Forward the real virtual-host request through the local Next server.
  await page.route(
    /http:\/\/(?:127\.0\.0\.1|localhost):\d+\//,
    async (route) => {
      // Compiled assets, vendored fonts and immutable PWA icons retain their
      // real local HTTP transport instead of a second Node-side proxy request.
      const path = new URL(route.request().url()).pathname;
      if (
        path.startsWith("/_next/static/") ||
        path.startsWith("/assets/fonts/") ||
        path.startsWith("/pwa/")
      )
        return route.continue();
      const response = await route.fetch({
        // Retry one connection reset for GET only, never an HTTP failure or write.
        maxRetries: route.request().method() === "GET" ? 1 : 0,
        headers: { ...route.request().headers(), host: "business.akipasa.com" },
      });
      await route.fulfill({ response });
    },
  );
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"]) {
      await page.addInitScript(
        (theme) => localStorage.setItem("akipasa.theme", theme),
        theme,
      );
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        for (const mode of ["signin", "signup", "magic", "recover"]) {
          await page.goto(`/${locale}/auth?mode=${mode}`, {
            waitUntil: "domcontentloaded",
          });
          await expect(page.locator(".auth-theme-business")).toBeVisible();
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
          ).toBeLessThanOrEqual(viewport.width + 1);
          const panel = page.locator(".auth-focus-panel");
          const bounds = await panel.boundingBox();
          expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
            viewport.width + 1,
          );
        }
        await page.screenshot({
          path: `test-results/business-auth-${locale}-${theme}-${viewport.width}.png`,
          fullPage: true,
        });
      }
    }
  await page.unrouteAll({ behavior: "wait" });
});
