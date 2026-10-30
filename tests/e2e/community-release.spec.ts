import { mkdirSync } from "node:fs";
import { devices, expect, test } from "@playwright/test";

for (const locale of ["en", "es"] as const)
  for (const theme of ["dark", "light"] as const)
    for (const width of [360, 390, 820, 1440]) {
      const device = devices[width < 700 ? "Pixel 7" : "Desktop Chrome"];
      test.describe(`${locale}/${theme}/${width} Community release`, () => {
        test.use({
          viewport: { width, height: 900 },
          userAgent: device.userAgent,
          isMobile: device.isMobile,
          hasTouch: width < 1200,
          serviceWorkers: "block",
        });
        test("real public landing, truthful upcoming identity and guest contribution return", async ({
          page,
        }) => {
          const es = locale === "es";
          await page.emulateMedia({
            colorScheme: theme,
            reducedMotion: "reduce",
          });
          await page.addInitScript((value) => {
            localStorage.setItem("akipasa.theme", value);
            document.cookie = "ak_consent_version=2; Path=/";
          }, theme);
          const response = await page.goto(`/${locale}/community`);
          expect(response?.status()).toBe(200);
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          const landing = page
            .locator("main")
            .filter({
              has: page.getByRole("heading", {
                name: es ? "Comunidad" : "Community",
                exact: true,
                level: 1,
              }),
            })
            .last();
          await expect(landing.getByRole("heading", { level: 1 })).toHaveCount(
            1,
          );
          await expect(
            landing.getByText(es ? "En desarrollo" : "In development", {
              exact: true,
            }),
          ).toBeVisible();
          await expect(
            landing.getByText(
              es
                ? "Inspiración editorial · ilustración, no un local ni un evento anunciado"
                : "Editorial inspiration · illustration, not an advertised venue or event",
              { exact: true },
            ),
          ).toBeVisible();
          const creators = landing.getByRole("link", {
            name: es ? /Explorar creadores/ : /Explore creators/,
          });
          await expect(creators).toHaveAttribute(
            "href",
            `/${locale}/community/creators`,
          );
          const suggest = landing.getByRole("link", {
            name: es ? "Proponer un plan" : "Suggest a plan",
            exact: true,
          });
          await expect(suggest).toHaveAttribute(
            "href",
            `/${locale}/community?view=suggest`,
          );
          for (const image of await landing.locator("img").all()) {
            await image.scrollIntoViewIfNeeded();
            await expect(image).toHaveJSProperty("complete", true);
            expect(
              await image.evaluate(
                (node: HTMLImageElement) => node.naturalWidth,
              ),
            ).toBeGreaterThan(0);
          }
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          const textContrast = await landing.evaluate((element) => {
            const colour = (value: string) => {
              const canvas = document.createElement("canvas");
              canvas.width = canvas.height = 1;
              const context = canvas.getContext("2d")!;
              context.fillStyle = value;
              context.fillRect(0, 0, 1, 1);
              return Array.from(context.getImageData(0, 0, 1, 1).data).slice(
                0,
                3,
              );
            };
            const lum = (rgb: number[]) =>
              rgb
                .map((v) => v / 255)
                .map((v) =>
                  v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
                )
                .reduce(
                  (sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i],
                  0,
                );
            const background = colour(
                getComputedStyle(element).backgroundColor,
              ),
              bg = lum(background);
            return [
              ...element.querySelectorAll("aside>span,section>header>a"),
            ].map((node) => {
              const fg = lum(colour(getComputedStyle(node).color));
              return {
                text: node.textContent,
                colour: getComputedStyle(node).color,
                background: getComputedStyle(element).backgroundColor,
                ratio: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05),
              };
            });
          });
          for (const text of textContrast)
            expect(text.ratio, JSON.stringify(text)).toBeGreaterThanOrEqual(
              4.5,
            );
          const bottom = landing.getByText(
            es ? "En desarrollo" : "In development",
            { exact: true },
          );
          await bottom.scrollIntoViewIfNeeded();
          mkdirSync("test-results/community-public", { recursive: true });
          await page.screenshot({
            path: `test-results/community-public/${locale}-${theme}-${width}-lower.png`,
            animations: "disabled",
          });
          await landing
            .getByRole("heading", { level: 1 })
            .scrollIntoViewIfNeeded();
          await page.screenshot({
            path: `test-results/community-public/${locale}-${theme}-${width}-top.png`,
            animations: "disabled",
          });
          await suggest.focus();
          await expect(suggest).toBeFocused();
          await suggest.press("Enter");
          await expect(page).toHaveURL(new RegExp(`/${locale}/auth\\?next=`));
          expect(new URL(page.url()).searchParams.get("next")).toBe(
            `/${locale}/community?view=suggest`,
          );
        });
      });
    }

for (const locale of ["en", "es"] as const)
  for (const view of ["report", "reports", "suggestions"] as const)
    test(`guest ${locale} ${view} preserves protected destination`, async ({
      page,
    }) => {
      const target = "event:95000000-0000-4000-8000-000000000009";
      const query = new URLSearchParams({
        view,
        ...(view === "report" ? { target, target_q: "Málaga" } : {}),
      });
      await page.goto(`/${locale}/community?${query}`);
      await expect(page).toHaveURL(new RegExp(`/${locale}/auth\\?next=`));
      const next = new URL(
        new URL(page.url()).searchParams.get("next")!,
        "http://local.invalid",
      );
      expect(next.pathname).toBe(`/${locale}/community`);
      expect(next.searchParams.get("view")).toBe(view);
      if (view === "report") {
        expect(next.searchParams.get("target")).toBe(target);
        expect(next.searchParams.get("target_q")).toBe("Málaga");
      }
    });
