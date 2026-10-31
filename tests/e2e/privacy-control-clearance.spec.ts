import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

for (const locale of ["en", "es"] as const)
  for (const theme of ["dark", "light"] as const)
    for (const width of [360, 390]) {
      test.describe(`${locale}/${theme}/${width} privacy control clearance`, () => {
        test.use({
          viewport: { width, height: 844 },
          hasTouch: true,
          isMobile: true,
        });

        test("privacy remains pointer and keyboard accessible above the dock without changing consent", async ({
          page,
        }) => {
          await page.emulateMedia({
            colorScheme: theme,
            reducedMotion: "reduce",
          });
          await page.addInitScript((value) => {
            localStorage.setItem("akipasa.theme", value);
          }, theme);
          const blockedMethods: string[] = [];
          await page.route("**/*", (route) => {
            if (["GET", "HEAD"].includes(route.request().method()))
              return route.continue();
            blockedMethods.push(route.request().method());
            return route.abort("blockedbyclient");
          });
          const output = "test-results/privacy-control-clearance";
          mkdirSync(output, { recursive: true });
          const observations = [];
          for (const route of ["community", "roadmap"]) {
            expect((await page.goto(`/${locale}/${route}`))?.status()).toBe(
              200,
            );
            await expect(page.locator("html")).toHaveAttribute(
              "data-theme",
              theme,
            );
            const storage = () =>
              page.evaluate(() => ({
                cookies: document.cookie,
                local: Object.entries(localStorage).sort(),
                session: Object.entries(sessionStorage).sort(),
              }));
            await expect
              .poll(() => page.locator(".app-bottom-nav:visible").count())
              .toBeGreaterThan(0);
            const before = await storage();
            const close = page.getByRole("button", {
              name:
                locale === "es"
                  ? "Cerrar opciones de privacidad"
                  : "Close privacy choices",
              exact: true,
            });
            if (await close.isVisible()) await close.click();
            const trigger = page.getByRole("button", {
              name:
                locale === "es" ? "Opciones de privacidad" : "Privacy choices",
              exact: true,
            });
            await page.evaluate(() => {
              window.scrollTo(0, document.documentElement.scrollHeight);
            });
            const clearance = () =>
              trigger.evaluate((element) => {
                const bounds = element.getBoundingClientRect();
                const dock = Array.from(
                  document.querySelectorAll(".app-bottom-nav"),
                )
                  .map((candidate) => candidate.getBoundingClientRect())
                  .find(
                    (candidate) => candidate.width > 0 && candidate.height > 0,
                  );
                const hit = document.elementFromPoint(
                  bounds.left + bounds.width / 2,
                  bounds.top + bounds.height / 2,
                );
                return {
                  unobstructed: hit === element || element.contains(hit),
                  bottom: bounds.bottom,
                  dockTop: dock?.top ?? null,
                  focused: document.activeElement === element,
                  canonicalDock: Boolean(document.querySelector(".pasa-dock")),
                  wrapperPaddingBottom: Number.parseFloat(
                    getComputedStyle(element.parentElement!).paddingBottom,
                  ),
                  rootFontSize: Number.parseFloat(
                    getComputedStyle(document.documentElement).fontSize,
                  ),
                };
              });
            await expect
              .poll(async () => (await clearance()).unobstructed)
              .toBe(true);
            const atBottom = await clearance();
            expect(atBottom.dockTop).not.toBeNull();
            if (atBottom.canonicalDock)
              expect(atBottom.wrapperPaddingBottom).toBeGreaterThanOrEqual(
                7 * atBottom.rootFontSize,
              );
            expect(atBottom.bottom).toBeLessThanOrEqual(atBottom.dockTop!);
            await page.evaluate(() => {
              if (document.activeElement instanceof HTMLElement)
                document.activeElement.blur();
            });
            for (let step = 0; step < 100; step++) {
              await page.keyboard.press("Tab");
              if ((await clearance()).focused) break;
            }
            await expect(trigger).toBeFocused();
            await expect
              .poll(async () => (await clearance()).unobstructed)
              .toBe(true);
            const afterTab = await clearance();
            expect(afterTab.unobstructed).toBe(true);
            expect(afterTab.bottom).toBeLessThanOrEqual(afterTab.dockTop!);
            await trigger.click();
            await expect(close).toBeVisible();
            await close.click();
            expect(await storage()).toEqual(before);
            await page.screenshot({
              path: `${output}/${locale}-${theme}-${width}-${route}.png`,
              animations: "disabled",
            });
            observations.push({
              route,
              atBottom,
              afterTab,
              storageUnchanged: true,
            });
          }
          writeFileSync(
            `${output}/${locale}-${theme}-${width}.json`,
            JSON.stringify({
              sourceCommit: process.env.GITHUB_SHA || "local-working-candidate",
              actualNext: true,
              physicalAndroid: false,
              locale,
              theme,
              width,
              observations,
              blockedMethods,
              consentSubmitted: false,
            }),
          );
        });
      });
    }
