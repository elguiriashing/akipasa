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
  { name: "small-phone", width: 360, height: 800 },
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

test.describe("AkiPasa shared public page-family visuals", () => {
  for (const locale of ["en", "es"] as const) {
    for (const device of devices) {
      for (const theme of ["dark", "light"] as const) {
        test(`${locale} public routes share one visual system on ${device.name}/${theme}`, async ({
          page,
        }) => {
          test.setTimeout(240_000);
          await page.setViewportSize({
            width: device.width,
            height: device.height,
          });
          await page.emulateMedia({
            reducedMotion: "reduce",
            colorScheme: theme,
          });
          await page.addInitScript((value) => {
            localStorage.setItem("akipasa.theme", value);
          }, theme);

          await page.context().addCookies([
            {
              name: "ak_consent_version",
              value: "2",
              url: "http://127.0.0.1:3100",
            },
          ]);
          const evidence: Array<{
            route: string;
            surface: PasaSurfaceFamily;
            status: number;
            viewport: string;
            screenshot: string;
            theme: string;
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
            if (device.width <= 850 && path !== "/auth") {
              const dock = page.locator(".pasa-dock");
              await expect(
                dock,
                `${route}: canonical mobile navigation`,
              ).toHaveCount(1);
              await expect(
                dock,
                `${route}: canonical mobile navigation`,
              ).toBeVisible();
              await expect(dock.locator(".pasa-dock__item")).toHaveCount(5);
            }
            await expect(page.locator("html")).toHaveAttribute(
              "data-theme",
              theme,
            );
            if (path === "/akipals") {
              await expect(
                page.getByRole("heading", { level: 1, name: "AkiPals." }),
              ).toHaveCSS("color", "rgb(255, 255, 255)");
            }
            if (path === "/auth") {
              await expect(page.locator(".auth-focus-panel")).toHaveCSS(
                "background-color",
                "rgb(16, 27, 45)",
              );
              await expect(page.locator(".auth-form-head h2")).toHaveCSS(
                "color",
                "rgb(244, 247, 255)",
              );
            }
            if (path === "" && device.width <= 850) {
              const header = page.locator(".app-topbar-mobile");
              const ribbon = page.getByRole("complementary", {
                name:
                  locale === "es" ? "Aviso de lanzamiento" : "Launch update",
              });
              const headerBox = await header.boundingBox();
              const ribbonBox = await ribbon.boundingBox();
              expect(headerBox).not.toBeNull();
              expect(ribbonBox).not.toBeNull();
              expect(ribbonBox!.y).toBeGreaterThanOrEqual(
                headerBox!.y + headerBox!.height,
              );
              for (const label of await page
                .locator(".pasa-dock__item span")
                .all()) {
                const text = await label.evaluate((node) => {
                  const range = document.createRange();
                  range.selectNodeContents(node);
                  return {
                    actual: range.getBoundingClientRect().width,
                    available: node.getBoundingClientRect().width,
                  };
                });
                expect(
                  text.actual,
                  "complete navigation label",
                ).toBeLessThanOrEqual(text.available + 1);
              }
              for (const button of [
                ".app-suite-mobile-trigger",
                ".app-more-mobile-trigger",
              ]) {
                const target = await header.locator(button).boundingBox();
                expect(target!.width).toBeGreaterThanOrEqual(44);
                expect(target!.height).toBeGreaterThanOrEqual(44);
              }
            }
            await page.evaluate(async () => {
              const animations = document
                .getAnimations()
                .filter(
                  (animation) =>
                    animation.effect?.getTiming().iterations !== Infinity,
                );
              await Promise.allSettled(
                animations.map((animation) => animation.finished),
              );
            });
            const titleOpacity = await page
              .getByRole("main")
              .first()
              .evaluate((main) => {
                let opacity = 1;
                for (
                  let node: Element | null = main;
                  node;
                  node = node.parentElement
                )
                  opacity *= Number(getComputedStyle(node).opacity);
                return opacity;
              });
            expect(
              titleOpacity,
              `${route}: fully rendered content`,
            ).toBeGreaterThanOrEqual(0.99);
            if (path === "" && device.width > 850) {
              const explanation = page.locator(
                ".discovery-empty > div:first-child",
              );
              if (await explanation.count()) {
                const paragraph = await explanation
                  .locator("p")
                  .first()
                  .boundingBox();
                const card = await explanation.boundingBox();
                expect(
                  paragraph!.width,
                  "desktop empty-state text stays out of the icon column",
                ).toBeGreaterThanOrEqual(card!.width * 0.8);
              }
            }
            if (path === "" && device.width <= 850) {
              const explanation = page.locator(
                ".discovery-empty > div:first-child",
              );
              if (await explanation.count()) {
                const fullText = await explanation
                  .locator("p")
                  .first()
                  .boundingBox();
                const card = await explanation.boundingBox();
                expect(
                  fullText!.width,
                  "empty-state paragraph uses its full card width",
                ).toBeGreaterThanOrEqual(card!.width - 2);
                const expand = page
                  .locator(".discovery-empty-actions a")
                  .filter({
                    hasText:
                      locale === "es" ? "Ampliar radio" : "Expand radius",
                  });
                await expect(expand).toHaveAttribute("href", /radius=50/);
              }
            }
            const bounds = await page.evaluate(() => ({
              width: document.documentElement.clientWidth,
              scroll: document.documentElement.scrollWidth,
            }));
            expect(
              bounds.scroll,
              `${route}: horizontal overflow ${JSON.stringify(bounds)}`,
            ).toBeLessThanOrEqual(bounds.width + 2);
            const slug = path.replaceAll("/", "-") || "-home";
            const screenshot = `test-results/pasa-review-${locale}${slug}-${device.name}-${theme}.png`;
            await page.screenshot({
              path: screenshot,
              fullPage: false,
              animations: "disabled",
            });
            evidence.push({
              route,
              surface,
              status: response!.status(),
              viewport: device.name,
              screenshot,
              theme,
            });
          }
          mkdirSync("test-results", { recursive: true });
          writeFileSync(
            `test-results/pasa-route-evidence-${locale}-${device.name}-${theme}.json`,
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
