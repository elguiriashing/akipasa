import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Real component and styles; only search data is disposable. An empty styleUrl
// keeps map networking off: these assertions cover layout, not live map pins.
const dir = resolve("test-results/claim-picker");
mkdirSync(dir, { recursive: true });
const entry = `import React from "react";import{createRoot}from"react-dom/client";
import{ClaimVenuePicker}from"./src/components/ClaimVenuePicker";
const locale=new URLSearchParams(location.search).get("locale")||"en";
createRoot(document.getElementById("root")).render(<main className="akibusiness-host"><div className="business-workspace" style={{padding:16}}><ClaimVenuePicker locale={locale} styleUrl=""/></div></main>);`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  outdir: "/tmp/claim-picker-browser-build",
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
const css =
  (
    await postcss([tailwind()]).process(
      [
        "globals.css",
        "compact-app.css",
        "brand.css",
        "appearance.css",
        "tablet-responsive.css",
        "portal-unity.css",
      ]
        .map((name) => readFileSync(`src/app/${name}`, "utf8"))
        .join("\n"),
      { from: resolve("src/app/globals.css") },
    )
  ).css +
  (bundle.outputFiles.find((file) => file.path.endsWith(".css"))?.text || "");
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundle.outputFiles.find((file) => file.path.endsWith(".js")).text);
  } else if (req.url === "/styles.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body data-product="akibusiness"><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
let browser;
const results = [];
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : {}),
  });
  for (const locale of ["en", "es"])
    for (const theme of ["light", "dark"])
      for (const [width, height] of [
        [360, 800],
        [600, 960],
        [820, 1180],
        [1024, 768],
        [1440, 900],
        [640, 400],
      ]) {
        const page = await browser.newPage({
          viewport: { width, height },
          colorScheme: theme,
        });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.route("**/api/business/claim-search?**", (route) => {
          const query = new URL(route.request().url()).searchParams.get("q");
          return route.fulfill({
            json: {
              rows:
                query === "empty"
                  ? []
                  : Array.from({ length: 24 }, (_, i) => ({
                      id: `venue-${i}`,
                      slug: `venue-${i}`,
                      name: `Test venue ${i} with a long name`,
                      address: "Long test address in Fuengirola",
                      locality: "Fuengirola",
                      latitude: 36.5,
                      longitude: -4.6,
                    })),
            },
          });
        });
        await page.goto(
          `http://127.0.0.1:${server.address().port}/?locale=${locale}`,
        );
        await page.locator("html").evaluate((element, t) => {
          element.dataset.theme = t;
          element.classList.add(`theme-${t}`);
        }, theme);
        const input = page.locator("#claim-venue-search");
        await expect(input).toBeVisible();
        // Force the actual existing heading to wrap without replacing copy.
        await page.locator(".claim-search-heading").evaluate((element) => {
          element.style.maxWidth = "12rem";
        });
        for (const vertical of ["activities", "accommodation"]) {
          await page
            .getByRole("button", {
              name:
                vertical === "activities"
                  ? locale === "es"
                    ? "Locales y eventos"
                    : "Venues & events"
                  : locale === "es"
                    ? "Alojamientos"
                    : "Accommodation",
              exact: true,
            })
            .click();
          for (const query of ["empty", "venues"]) {
            await input.fill(query);
            const panel = page.locator(".claim-search-results");
            if (query === "empty")
              await expect(panel).toContainText(
                locale === "es" ? "No encontramos" : "No unclaimed",
              );
            else await expect(panel.locator("button")).toHaveCount(24);
            const inputBox = await page
              .locator(".claim-search-input")
              .boundingBox();
            const resultsBox = await panel.boundingBox();
            expect(resultsBox.y).toBeGreaterThanOrEqual(
              inputBox.y + inputBox.height,
            );
            expect(resultsBox.x).toBeGreaterThanOrEqual(0);
            expect(resultsBox.x + resultsBox.width).toBeLessThanOrEqual(
              width + 1,
            );
            expect(
              await page.evaluate(() => document.documentElement.scrollWidth),
            ).toBeLessThanOrEqual(width + 1);
            const mapBox = await page.locator(".claim-map-panel").boundingBox();
            expect(mapBox.width).toBeGreaterThan(100);
            expect(mapBox.height).toBeGreaterThan(100);
            if (width <= 900)
              expect(mapBox.y).toBeGreaterThanOrEqual(
                resultsBox.y + resultsBox.height,
              );
            await page.screenshot({
              path: resolve(
                dir,
                `${locale}-${theme}-${width}x${height}-${vertical}-${query}.png`,
              ),
              fullPage: true,
            });
            if (query === "venues") {
              expect(
                await panel.evaluate(
                  (element) => element.scrollHeight > element.clientHeight,
                ),
              ).toBe(true);
              await panel.locator("button").last().click();
              await expect(page.locator("input[name=venueId]")).toHaveValue(
                "venue-23",
              );
              await expect(
                page.locator(".claim-selected-confirmation"),
              ).toContainText("Test venue 23");
              await page
                .getByRole("button", {
                  name: locale === "es" ? "Cambiar local" : "Change venue",
                  exact: true,
                })
                .click();
              await expect(page.locator("input[name=venueId]")).toHaveValue("");
            }
          }
        }
        await input.fill("empty");
        await expect(page.locator(".claim-search-results")).toContainText(
          locale === "es" ? "No encontramos" : "No unclaimed",
        );
        await page.screenshot({
          path: resolve(dir, `${locale}-${theme}-${width}x${height}.png`),
          fullPage: true,
        });
        expect(errors).toEqual([]);
        results.push({ locale, theme, width, height, pass: true });
        await page.close();
      }
  writeFileSync(resolve(dir, "results.json"), JSON.stringify(results, null, 2));
  console.log(
    `Claim picker layout/selection: ${results.length} combinations passed.`,
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
