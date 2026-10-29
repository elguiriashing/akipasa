import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  pasaSurfaceFamily,
  type PasaSurfaceFamily,
} from "../../src/lib/pasa-surface-families";

/**
 * Source-backed visual coverage for real public surfaces. These captures
 * are review evidence, NOT automatic visual acceptance or invented user data.
 * The rest of the 89-route list has authenticated/operational protections
 * and must be reviewed with authorized disposable account fixtures.
 */
const publicSurfaces = [
  "",
  "/map",
  "/check-in",
  "/community",
  "/community/creators",
  "/akipals",
  "/passports",
  "/roadmap",
  "/auth",
  "/membership",
  "/privacy",
  "/terms",
  "/photo-credits",
] as const;

const devices = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
] as const;

test.describe("AkiPasa shared public page-family visuals", () => {
  for (const locale of ["en", "es"] as const) {
    for (const device of devices) {
      test(`${locale} public routes share one visual system on ${device.name}`, async ({
        page,
      }) => {
        test.setTimeout(240_000);
        await page.setViewportSize({
          width: device.width,
          height: device.height,
        });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.addInitScript(() => {
          document.cookie = "ak_consent_version=2; Path=/";
        });

        const evidence: Array<{
          route: string;
          surface: PasaSurfaceFamily;
          status: number;
          viewport: string;
          screenshot: string;
        }> = [];

        for (const path of publicSurfaces) {
          const route = `/${locale}${path}`;
          const response = await page.goto(route, {
            waitUntil: "domcontentloaded",
          });
          expect(response, `${route}: HTTP response`).not.toBeNull();
          expect(response!.status(), `${route}: HTTP status`).toBe(200);
          const surface = pasaSurfaceFamily(route);
          const container = page.locator(".app-content[data-pasa-surface]");
          await expect(container, route).toHaveAttribute(
            "data-pasa-surface",
            surface,
          );
          await expect(page.getByRole("main").first(), route).toBeVisible();
          const bounds = await page.evaluate(() => ({
            width: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
          }));
          expect(
            bounds.scroll,
            `${route}: horizontal overflow ${JSON.stringify(bounds)}`,
          ).toBeLessThanOrEqual(bounds.width + 2);
          const slug = path.replaceAll("/", "-") || "-home";
          const screenshot = `test-results/pasa-review-${locale}${slug}-${device.name}.png`;
          await page.screenshot({ path: screenshot, fullPage: false });
          evidence.push({
            route,
            surface,
            status: response!.status(),
            viewport: device.name,
            screenshot,
          });
        }
        mkdirSync("test-results", { recursive: true });
        writeFileSync(
          `test-results/pasa-route-evidence-${locale}-${device.name}.json`,
          JSON.stringify(
            {
              sourceCommit: process.env.GITHUB_SHA || "local",
              acceptance: "automated-render-only",
              routes: evidence,
            },
            null,
            2,
          ),
        );
      });
    }
  }

  test("AkiPasa secondary entrypoint preserves approved redirects", async ({
    request,
  }) => {
    const root = await request.get("/", { maxRedirects: 0 });
    expect(root.status()).toBe(308);
    expect(root.headers().location).toContain("/es");

    const roadmap = await request.get("/roadmap", { maxRedirects: 0 });
    expect(roadmap.status()).toBe(308);
    expect(roadmap.headers().location).toContain("/es/roadmap");

    for (const locale of ["en", "es"] as const) {
      const creators = await request.get(`/${locale}/creators`, {
        maxRedirects: 0,
      });
      expect([303, 307, 308]).toContain(creators.status());
      expect(creators.headers().location).toContain(
        `/${locale}/community/creators`,
      );
    }
  });
});
