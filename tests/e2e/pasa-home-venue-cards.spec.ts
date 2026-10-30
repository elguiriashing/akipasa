import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { devices, expect, test } from "@playwright/test";

const directory = "test-results/home-venue-cards";
const sourceFiles = [
  "src/app/[locale]/page.tsx",
  "src/app/[locale]/home-venues.module.css",
  "src/components/ResultPagination.tsx",
];
const sourceHashes = Object.fromEntries(
  sourceFiles.map((file) => [
    file,
    createHash("sha256").update(readFileSync(file)).digest("hex"),
  ]),
);

test.use({ serviceWorkers: "block" });

for (const locale of ["en", "es"] as const)
  for (const theme of ["dark", "light"] as const)
    for (const width of [360, 390, 820, 1440])
      test.describe(`${locale} Home venue cards ${width}px/${theme}`, () => {
        const device = devices[width < 700 ? "Pixel 7" : "Desktop Chrome"];
        test.use({
          viewport: { width, height: 900 },
          isMobile: device.isMobile,
          userAgent: device.userAgent,
          deviceScaleFactor: device.deviceScaleFactor,
          hasTouch: width < 1200,
        });
        test("readable cards, original destinations and keyboard navigation", async ({
          page,
        }) => {
          test.setTimeout(90_000);
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({
            colorScheme: theme,
            reducedMotion: "reduce",
          });
          await page.addInitScript((value) => {
            localStorage.setItem("akipasa.theme", value);
            document.cookie = "ak_consent_version=2; Path=/";
          }, theme);
          const response = await page.goto(
            `/${locale}?latitude=36.539&longitude=-4.624&radius=25`,
          );
          expect(response?.status()).toBe(200);
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          const section = page.locator("#venue-results");
          await expect(
            section.getByRole("heading", {
              name:
                locale === "es"
                  ? "Negocios cerca de ti"
                  : "Businesses near you",
              exact: true,
            }),
          ).toBeVisible();
          const cards = section.locator("a.card[data-home-venue-card]");
          await expect(cards).toHaveCount(20);
          const firstHref = await cards.first().getAttribute("href");
          expect(firstHref).toMatch(new RegExp(`^/${locale}/venues/`));
          const state = await cards.evaluateAll((elements) => {
            const rgb = (value: string) => {
              if (!/^rgba?\(/.test(value))
                throw new Error(`Unsupported computed colour ${value}`);
              const values = (value.match(/[\d.]+/g) || []).map(Number);
              return [values[0], values[1], values[2], values[3] ?? 1];
            };
            const composite = (front: number[], back: number[]) =>
              front
                .slice(0, 3)
                .map(
                  (value, index) =>
                    value * front[3] + back[index] * (1 - front[3]),
                );
            const luminance = (colour: number[]) =>
              colour
                .slice(0, 3)
                .map((value) => {
                  const srgb = value / 255;
                  return srgb <= 0.04045
                    ? srgb / 12.92
                    : ((srgb + 0.055) / 1.055) ** 2.4;
                })
                .reduce(
                  (sum, value, index) =>
                    sum + value * [0.2126, 0.7152, 0.0722][index],
                  0,
                );
            return elements.map((card) => {
              const box = card.getBoundingClientRect();
              const style = getComputedStyle(card);
              const base = rgb(style.backgroundColor);
              if (base[3] !== 1)
                throw new Error("Venue card must have an opaque contrast base");
              if (/url\(/.test(style.backgroundImage))
                throw new Error(
                  "Photo-free directory response cannot invent a venue image",
                );
              // Check the base and every computed gradient stop, including the
              // warm highlight's brightest bound, rather than ignoring lighting.
              const backgrounds = [
                base,
                ...(style.backgroundImage.match(/rgba?\([^)]*\)/g) || []).map(
                  (value) => composite(rgb(value), base),
                ),
              ];
              const texts = [
                ...card.querySelectorAll(
                  "h3,p,[class*='claim'],[class*='distance']",
                ),
              ].map((element) => {
                const foreground = rgb(getComputedStyle(element).color);
                const ratios = backgrounds.map((background) => {
                  const front = luminance(composite(foreground, background));
                  const back = luminance(background);
                  return (
                    (Math.max(front, back) + 0.05) /
                    (Math.min(front, back) + 0.05)
                  );
                });
                return {
                  text: element.textContent,
                  minimumContrast: Math.min(...ratios),
                };
              });
              return {
                width: box.width,
                height: box.height,
                left: box.left,
                right: box.right,
                background: style.backgroundColor,
                claimStatus: card.getAttribute("data-claim-status"),
                texts,
              };
            });
          });
          for (const card of state) {
            expect(card.width).toBeGreaterThan(120);
            expect(card.height).toBeGreaterThanOrEqual(44);
            expect(card.left).toBeGreaterThanOrEqual(0);
            expect(card.right).toBeLessThanOrEqual(width + 1);
            expect(["claimed", "unclaimed"]).toContain(card.claimStatus);
            expect(card.texts.length).toBeGreaterThanOrEqual(4);
            for (const sample of card.texts)
              expect(
                sample.minimumContrast,
                sample.text || "card label",
              ).toBeGreaterThanOrEqual(4.5);
          }
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          ).toBe(true);
          await cards.first().focus();
          await expect(cards.first()).toBeFocused();
          expect(
            await cards
              .first()
              .evaluate((card) => getComputedStyle(card).outlineStyle),
          ).not.toBe("none");
          expect(
            await cards
              .first()
              .evaluate((card) => getComputedStyle(card).transitionDuration),
          ).toBe("0s");
          mkdirSync(directory, { recursive: true });
          const screenshot = `${directory}/${locale}-${theme}-${width}-venue-directory.png`;
          await section.screenshot({ path: screenshot });
          await section.evaluate((element) =>
            element.scrollIntoView({ block: "start" }),
          );
          const viewportScreenshot = `${directory}/${locale}-${theme}-${width}-viewport.png`;
          await page.screenshot({ path: viewportScreenshot });
          expect(
            await cards.first().evaluate((card) => {
              const box = card.getBoundingClientRect();
              return (
                document
                  .elementFromPoint(
                    box.x + box.width / 2,
                    box.y + box.height / 2,
                  )
                  ?.closest("a") === card
              );
            }),
            "First card centre is unobscured by header/dock",
          ).toBe(true);
          const opening = `${directory}/${locale}-${theme}-${width}-opening.png`;
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: opening });
          if (width === 390 && theme === "dark") {
            await cards.first().focus();
            await page.keyboard.press("Enter");
            await expect(page).toHaveURL(new RegExp(`${firstHref}$`));
            await page.goBack();
            await expect(cards).toHaveCount(20);
            await expect(cards.first()).toHaveAttribute("href", firstHref!);
          }
          for (const file of sourceFiles)
            expect(
              createHash("sha256").update(readFileSync(file)).digest("hex"),
              file,
            ).toBe(sourceHashes[file]);
          writeFileSync(
            `${directory}/${locale}-${theme}-${width}.json`,
            JSON.stringify(
              {
                acceptance: "automated-render-and-navigation-only",
                fixtureCatalogue: true,
                physicalAndroid: false,
                emulation:
                  width < 700
                    ? "Android-like phone"
                    : width < 1200
                      ? "touch-enabled tablet viewport with desktop UA"
                      : "desktop Chromium context",
                sourceHashes,
                locale,
                theme,
                width,
                screenshot,
                viewportScreenshot,
                opening,
                cards: state,
              },
              null,
              2,
            ),
          );
        });
      });
