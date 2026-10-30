import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  pasaSurfaceFamily,
  type PasaSurfaceFamily,
} from "../../src/lib/pasa-surface-families";

test.describe("Roadmap back link remains clear of shared Search", () => {
  for (const locale of ["en", "es"] as const) {
    for (const width of [360, 390, 820, 1440]) {
      for (const theme of ["dark", "light"] as const) {
        test(`${locale} Roadmap back link at ${width}/${theme}`, async ({
          page,
        }) => {
          const height =
            width === 360
              ? 800
              : width === 390
                ? 844
                : width === 820
                  ? 1180
                  : 900;
          await page.setViewportSize({ width, height });
          await page.emulateMedia({
            colorScheme: theme,
            reducedMotion: "reduce",
          });
          await page.addInitScript((value) => {
            localStorage.setItem("akipasa.theme", value);
          }, theme);
          await page.context().addCookies([
            {
              name: "ak_consent_version",
              value: "2",
              url: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100",
            },
          ]);
          const response = await page.goto(`/${locale}/roadmap`, {
            waitUntil: "domcontentloaded",
          });
          expect(response?.status()).toBe(200);
          const back = page.getByRole("link", {
            name: locale === "es" ? "Volver a explorar" : "Back to exploring",
            exact: true,
          });
          await expect(back).toBeVisible();
          await expect(back).toHaveAttribute("href", `/${locale}`);
          const search = page.locator(".global-search-trigger");
          await expect(search).toBeVisible();
          await expect(search).toBeEnabled();
          const backBox = await back.boundingBox();
          const searchBox = await search.boundingBox();
          expect(backBox).not.toBeNull();
          expect(searchBox).not.toBeNull();
          const overlap =
            Math.max(
              0,
              Math.min(
                backBox!.x + backBox!.width,
                searchBox!.x + searchBox!.width,
              ) - Math.max(backBox!.x, searchBox!.x),
            ) *
            Math.max(
              0,
              Math.min(
                backBox!.y + backBox!.height,
                searchBox!.y + searchBox!.height,
              ) - Math.max(backBox!.y, searchBox!.y),
            );
          expect(
            overlap,
            "Search must not cover any part of the back link",
          ).toBe(0);
          const hitTargets = await back.evaluate((link) => {
            const box = link.getBoundingClientRect();
            return [2, box.width / 2, box.width - 2].map((offset) =>
              link.contains(
                document.elementFromPoint(
                  box.x + offset,
                  box.y + box.height / 2,
                ),
              ),
            );
          });
          expect(
            hitTargets,
            "The entire back link must receive pointer hits",
          ).toEqual([true, true, true]);
          mkdirSync("test-results", { recursive: true });
          const stem = `test-results/pasa-roadmap-back-${locale}-${width}-${theme}`;
          await page.screenshot({
            path: `${stem}.png`,
            animations: "disabled",
          });
          let reachedBack = false;
          for (let step = 0; step < 60 && !reachedBack; step++) {
            await page.keyboard.press("Tab");
            reachedBack = await back.evaluate(
              (link) => document.activeElement === link,
            );
          }
          expect(reachedBack, "Native Tab must reach the back link").toBe(true);
          await expect(back).toBeFocused();
          await page.keyboard.press("Enter");
          await expect
            .poll(() => new URL(page.url()).pathname)
            .toBe(`/${locale}`);
          writeFileSync(
            `${stem}.json`,
            JSON.stringify(
              {
                sourceCommit: process.env.GITHUB_SHA || "local-working-tree",
                locale,
                theme,
                width,
                backBox,
                searchBox,
                overlap,
                hitTargets,
                nativeTabEnterDestination: new URL(page.url()).pathname,
                screenshot: `${stem}.png`,
                proof:
                  "actual-next-browser; no physical-device acceptance inferred",
              },
              null,
              2,
            ),
          );
        });
      }
    }
  }
});

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
              url: test.info().project.use.baseURL || "http://127.0.0.1:3100",
            },
          ]);
          const evidence: Array<{
            route: string;
            surface: PasaSurfaceFamily;
            status: number;
            viewport: string;
            screenshot: string;
            theme: string;
            fullPageScreenshot?: string;
            belowFoldScreenshot?: string;
            documentHeight?: number;
            failedImages?: string[];
            passportScreenshots?: string[];
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
                "rgb(8, 8, 7)",
              );
              await expect(page.locator(".auth-form-head h2")).toHaveCSS(
                "color",
                "rgb(255, 247, 240)",
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
            if (path === "" && device.width === 360) {
              const logo = page.locator(".brand-logo:visible").first();
              await expect(logo.locator("image")).toHaveAttribute(
                "clip-path",
                /^url\(#brand-mark-/,
              );
              await logo.screenshot({
                path: screenshot.replace(".png", "-brand.png"),
                animations: "disabled",
              });
            }
            const extended: {
              fullPageScreenshot?: string;
              belowFoldScreenshot?: string;
              documentHeight?: number;
              failedImages?: string[];
              passportScreenshots?: string[];
            } = {};
            if (
              [360, 1440].includes(device.width) &&
              [
                "",
                "/community",
                "/roadmap",
                "/privacy",
                "/terms",
                "/photo-credits",
                "/passports",
              ].includes(path)
            ) {
              // Visit the whole document before capture: fullPage alone does not
              // trigger off-screen lazy images or prove bottom controls usable.
              const height = await page.evaluate(
                () => document.documentElement.scrollHeight,
              );
              for (let y = 0; y < height; y += device.height * 0.75) {
                await page.evaluate((top) => window.scrollTo(0, top), y);
                await page.waitForTimeout(75);
              }
              await page.evaluate(async () => {
                await Promise.all(
                  [...document.images]
                    .filter(
                      (image) =>
                        image.currentSrc &&
                        image.loading === "lazy" &&
                        image.complete,
                    )
                    .map((image) => image.decode().catch(() => undefined)),
                );
              });
              await page.evaluate(() =>
                window.scrollTo(0, document.documentElement.scrollHeight),
              );
              const scrollState = await page.evaluate(() => ({
                top: scrollY,
                height: document.documentElement.scrollHeight,
                viewport: innerHeight,
                failedImages: [...document.images]
                  .filter(
                    (image) =>
                      image.currentSrc && image.complete && !image.naturalWidth,
                  )
                  .map((image) => image.currentSrc),
              }));
              if (scrollState.height > scrollState.viewport + 2)
                expect(
                  scrollState.top,
                  `${route}: actually visited below-fold content`,
                ).toBeGreaterThan(0);
              extended.failedImages = scrollState.failedImages;
              const footer = page.locator("footer").last();
              if (path !== "/passports" && (await footer.count()))
                await expect(footer).toBeVisible();
              extended.documentHeight = await page.evaluate(
                () => document.documentElement.scrollHeight,
              );
              extended.belowFoldScreenshot = screenshot.replace(
                ".png",
                "-below-fold.png",
              );
              await page.screenshot({
                path: extended.belowFoldScreenshot,
                animations: "disabled",
              });
              await page.evaluate(() => window.scrollTo(0, 0));
              extended.fullPageScreenshot = screenshot.replace(
                ".png",
                "-full-page.png",
              );
              await page.screenshot({
                path: extended.fullPageScreenshot,
                fullPage: true,
                animations: "disabled",
              });
              if (path === "/passports") {
                await page
                  .getByRole("button", {
                    name: locale === "es" ? "Abrir pasaporte" : "Open passport",
                    exact: true,
                  })
                  .click();
                await expect(
                  page.getByRole("heading", {
                    name: locale === "es" ? "Ciudades" : "Cities",
                    exact: true,
                  }),
                ).toBeVisible();
                extended.passportScreenshots = [];
                for (const chapter of ["index", "progress"] as const) {
                  if (chapter === "progress") {
                    if (device.width === 360)
                      await page
                        .getByRole("button", {
                          name:
                            locale === "es"
                              ? "Abrir menú del pasaporte"
                              : "Open passport menu",
                          exact: true,
                        })
                        .click();
                    await page
                      .getByRole("button", {
                        name: locale === "es" ? /Mi viaje/ : /My journey/,
                      })
                      .first()
                      .click();
                    await expect(
                      page.getByRole("heading", {
                        name: locale === "es" ? "Mi viaje" : "My journey",
                        exact: true,
                      }),
                    ).toBeVisible();
                  }
                  if (chapter === "index") {
                    const search = page.getByRole("searchbox", {
                      name:
                        locale === "es" ? "Busca una ciudad" : "Find a city",
                    });
                    const ratio = await search.evaluate((input) => {
                      const rgb = (value: string) =>
                        (value.match(/[\d.]+/g) || []).map(Number);
                      const foreground = rgb(
                        getComputedStyle(input, "::placeholder").color,
                      );
                      const background = rgb(
                        getComputedStyle(input).backgroundColor,
                      );
                      if (background.length > 3 && background[3] !== 1)
                        throw new Error(
                          "Placeholder needs opaque contrast surface",
                        );
                      const opacity =
                        Number(
                          getComputedStyle(input, "::placeholder").opacity,
                        ) * (foreground[3] ?? 1);
                      const luminance = (color: number[]) =>
                        color
                          .slice(0, 3)
                          .map((value) => {
                            const channel = value / 255;
                            return channel <= 0.04045
                              ? channel / 12.92
                              : ((channel + 0.055) / 1.055) ** 2.4;
                          })
                          .reduce(
                            (sum, channel, index) =>
                              sum + channel * [0.2126, 0.7152, 0.0722][index],
                            0,
                          );
                      const front = luminance(
                        foreground
                          .slice(0, 3)
                          .map(
                            (value, index) =>
                              value * opacity +
                              background[index] * (1 - opacity),
                          ),
                      );
                      const back = luminance(background);
                      return (
                        (Math.max(front, back) + 0.05) /
                        (Math.min(front, back) + 0.05)
                      );
                    });
                    expect(
                      ratio,
                      "Paper Passport search placeholder contrast",
                    ).toBeGreaterThanOrEqual(4.5);
                  }
                  const capture = screenshot.replace(".png", `-${chapter}.png`);
                  await page.screenshot({
                    path: capture,
                    fullPage: true,
                    animations: "disabled",
                  });
                  extended.passportScreenshots.push(capture);
                }
              }
            }
            evidence.push({
              ...extended,
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

  test("Passport chapters expose their actual internal below-fold content", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const evidence = [];
    await page.context().addCookies([
      {
        name: "ak_consent_version",
        value: "2",
        url: test.info().project.use.baseURL || "http://127.0.0.1:3100",
      },
    ]);
    for (const locale of ["en", "es"] as const)
      for (const width of [360, 1440])
        for (const theme of ["dark", "light"] as const) {
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({
            reducedMotion: "reduce",
            colorScheme: theme,
          });
          await page.addInitScript(
            (value) => localStorage.setItem("akipasa.theme", value),
            theme,
          );
          for (const view of ["index", "progress"]) {
            await page.goto(
              `/${locale}/passports${view === "progress" ? "?view=progress" : ""}`,
            );
            if (view === "index")
              await page
                .getByRole("button", {
                  name: locale === "es" ? "Abrir pasaporte" : "Open passport",
                  exact: true,
                })
                .click();
            await expect(
              page.getByRole("heading", {
                name:
                  view === "index"
                    ? locale === "es"
                      ? "Ciudades"
                      : "Cities"
                    : locale === "es"
                      ? "Mi viaje"
                      : "My journey",
                exact: true,
              }),
            ).toBeVisible();
            const chapter = page
              .locator('[class*="PassportBook_page__"]')
              .first();
            await expect(chapter).toBeVisible();
            const state = await chapter.evaluate((element) => {
              element.scrollTop = element.scrollHeight;
              return {
                top: element.scrollTop,
                height: element.scrollHeight,
                viewport: element.clientHeight,
              };
            });
            if (width === 360 && state.height > state.viewport + 2)
              expect(state.top).toBeGreaterThan(0);
            const screenshot = `test-results/pasa-passport-${locale}-${width}-${theme}-${view}-chapter-bottom.png`;
            await page.screenshot({
              path: screenshot,
              fullPage: true,
              animations: "disabled",
            });
            evidence.push({ locale, width, theme, view, ...state, screenshot });
          }
        }
    writeFileSync(
      "test-results/pasa-passport-chapter-bottom-evidence.json",
      JSON.stringify(
        {
          sourceCommit: process.env.GITHUB_SHA || "local",
          acceptance: "automated-render-only",
          cases: evidence,
        },
        null,
        2,
      ),
    );
  });

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
