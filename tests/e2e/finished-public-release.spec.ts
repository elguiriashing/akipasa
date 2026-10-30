import { mkdirSync, writeFileSync } from "node:fs";
import { devices, expect, test } from "@playwright/test";

const routes = [
  "/community",
  "/community/creators",
  "/community/creators/ana-local",
  "/roadmap",
  "/privacy",
  "/terms",
  "/photo-credits",
];

for (const locale of ["en", "es"] as const)
  for (const theme of ["dark", "light"] as const)
    for (const width of [360, 390, 820, 1440]) {
      test.describe(`${locale}/${theme}/${width} finished public release`, () => {
        const device = devices[width < 700 ? "Pixel 7" : "Desktop Chrome"];
        test.use({
          viewport: { width, height: 900 },
          userAgent: device.userAgent,
          isMobile: width < 700,
          hasTouch: width < 1200,
          serviceWorkers: "block",
        });
        test("complete public pages and native return controls", async ({
          page,
        }) => {
          test.setTimeout(180_000);
          await page.emulateMedia({
            colorScheme: theme,
            reducedMotion: "reduce",
          });
          await page.addInitScript((value) => {
            localStorage.setItem("akipasa.theme", value);
            document.cookie = "ak_consent_version=2; Path=/";
          }, theme);
          const output = "test-results/finished-public-release";
          mkdirSync(output, { recursive: true });
          const evidence = [];
          for (const route of routes) {
            const response = await page.goto(`/${locale}${route}`);
            expect(response?.status(), route).toBe(200);
            await expect(page.locator("html")).toHaveAttribute(
              "data-theme",
              theme,
            );
            await expect(
              page.getByRole("heading", { level: 1 }).first(),
            ).toBeVisible();
            const overflow = await page.evaluate(
              () =>
                document.documentElement.scrollWidth -
                document.documentElement.clientWidth,
            );
            expect(
              overflow,
              `${route}: horizontal overflow`,
            ).toBeLessThanOrEqual(1);
            const brokenImages = await page
              .locator("main img")
              .evaluateAll(async (images) => {
                const failed = [];
                for (const element of images) {
                  const image = element as HTMLImageElement;
                  image.scrollIntoView({ block: "center" });
                  try {
                    await image.decode();
                  } catch {
                    failed.push(image.currentSrc || image.src);
                  }
                  if (!image.naturalWidth && !failed.includes(image.src))
                    failed.push(image.currentSrc || image.src);
                }
                return failed;
              });
            expect(brokenImages, `${route}: real images decode`).toEqual([]);
            await page.evaluate(() => {
              window.scrollTo(0, 0);
              document.querySelector(".app-content")?.scrollTo(0, 0);
            });
            const name = route.replaceAll("/", "-").slice(1);
            await page.screenshot({
              path: `${output}/${locale}-${theme}-${width}-${name}-upper.png`,
              animations: "disabled",
            });
            await page.evaluate(() => {
              for (const element of document.querySelectorAll(
                "main,.app-content",
              ))
                element.scrollTo(0, element.scrollHeight);
              window.scrollTo(0, document.documentElement.scrollHeight);
            });
            await page.screenshot({
              path: `${output}/${locale}-${theme}-${width}-${name}-lower.png`,
              animations: "disabled",
            });
            if (route === "/roadmap") {
              const back = page.locator("#roadmap-main").getByRole("link", {
                name:
                  locale === "es" ? "Volver a explorar" : "Back to exploring",
              });
              await back.scrollIntoViewIfNeeded();
              const hits = await back.evaluate((element) => {
                const box = element.getBoundingClientRect();
                return [0.1, 0.5, 0.9].map((fraction) => {
                  const hit = document.elementFromPoint(
                    box.left + box.width * fraction,
                    box.top + box.height / 2,
                  );
                  return hit === element || element.contains(hit);
                });
              });
              expect(hits).toEqual([true, true, true]);
              await back.focus();
              await page.keyboard.press("Enter");
              await expect(page).toHaveURL(new RegExp(`/${locale}$`));
            }
            evidence.push({ route, status: response?.status(), overflow });
          }
          const gateway = await page.goto(`/hq-login?lang=${locale}`);
          expect(gateway?.status()).toBe(200);
          await expect(
            page.getByRole("link", {
              name: locale === "es" ? "Entrar a AkiHQ" : "Sign in to AkiHQ",
            }),
          ).toHaveAttribute("href", `https://akihq.app/login?lang=${locale}`);
          await expect(
            page.getByRole("link", {
              name:
                locale === "es" ? "Conocer AkiBusiness" : "About AkiBusiness",
            }),
          ).toHaveAttribute("href", "https://akibusiness.com");
          await page.screenshot({
            path: `${output}/${locale}-${theme}-${width}-hq-gateway.png`,
            fullPage: true,
            animations: "disabled",
          });
          writeFileSync(
            `${output}/${locale}-${theme}-${width}.json`,
            JSON.stringify({
              sourceCommit: process.env.GITHUB_SHA || "local-working-candidate",
              locale,
              theme,
              width,
              actualNext: true,
              syntheticPublicReads: true,
              physicalAndroid: false,
              evidence,
            }),
          );
        });
      });
    }

test("public redirects and missing profiles preserve safe canonical boundaries", async ({
  request,
}) => {
  const roadmap = await request.get("/roadmap", { maxRedirects: 0 });
  expect(roadmap.status()).toBe(308);
  expect(roadmap.headers().location).toContain("/es/roadmap");
  for (const locale of ["en", "es"]) {
    const alias = await request.get(`/${locale}/creators/ana-local`, {
      maxRedirects: 0,
    });
    expect(alias.status()).toBe(307);
    expect(alias.headers().location).toBe(
      `/${locale}/community/creators/ana-local`,
    );
    const missing = await request.get(
      `/${locale}/community/creators/missing-public-fixture`,
    );
    expect(missing.status()).toBe(404);
  }
});
