import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const userAgent =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230805.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36";

for (const locale of ["en", "es"] as const)
  for (const theme of ["dark", "light"] as const)
    for (const width of [360, 390]) {
      test.describe(`${locale}/${theme}/${width} Android WebView emulation`, () => {
        test.use({
          viewport: { width, height: 844 },
          userAgent,
          hasTouch: true,
          isMobile: true,
          serviceWorkers: "block",
        });
        test("finished public screens retain visible navigation", async ({
          page,
        }) => {
          await page.emulateMedia({
            colorScheme: theme,
            reducedMotion: "reduce",
          });
          await page.addInitScript((value) => {
            localStorage.setItem("akipasa.theme", value);
            document.cookie = "ak_consent_version=2; Path=/";
          }, theme);
          const output = "test-results/finished-public-webview";
          mkdirSync(output, { recursive: true });
          const observations = [];
          for (const route of [
            "/community",
            "/community/creators",
            "/community/creators/ana-local",
            "/roadmap",
            "/privacy",
            "/terms",
            "/photo-credits",
          ]) {
            const response = await page.goto(`/${locale}${route}`);
            expect(response?.status()).toBe(200);
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
            expect(overflow).toBeLessThanOrEqual(1);
            await page.keyboard.press("Tab");
            expect(
              await page.evaluate(() => document.activeElement?.tagName),
            ).not.toBe("BODY");
            await page.screenshot({
              path: `${output}/${locale}-${theme}-${width}-${route.replaceAll("/", "-").slice(1)}.png`,
              animations: "disabled",
            });
            observations.push({ route, status: response?.status(), overflow });
          }
          expect(await page.evaluate(() => navigator.userAgent)).toContain(
            "; wv)",
          );
          writeFileSync(
            `${output}/${locale}-${theme}-${width}.json`,
            JSON.stringify({
              sourceCommit: process.env.GITHUB_SHA || "local-working-candidate",
              actualNext: true,
              emulationOnly: true,
              physicalAndroid: false,
              locale,
              theme,
              width,
              observations,
            }),
          );
        });
      });
    }
