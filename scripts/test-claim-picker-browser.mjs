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

function matchesSearch(request, query, vertical) {
  const url = new URL(request.url());
  return (
    url.pathname === "/api/business/claim-search" &&
    url.searchParams.get("q") === query &&
    url.searchParams.get("vertical") === vertical
  );
}

async function readGeometry(page) {
  // Read every box in one browser task: loading/empty copy can change the
  // panel height between separate protocol calls without any actual overlap.
  return page.evaluate(() => {
    const box = (selector) =>
      document.querySelector(selector).getBoundingClientRect().toJSON();
    return {
      label: box(".claim-search-input"),
      input: box("#claim-venue-search"),
      results: box(".claim-search-results"),
      map: box(".claim-map-panel"),
      scrollWidth: document.documentElement.scrollWidth,
      resultsText: document.querySelector(".claim-search-results").textContent,
    };
  });
}

function assertGeometry(geometry, width) {
  expect(geometry.results.y).toBeGreaterThanOrEqual(geometry.label.bottom);
  expect(geometry.results.y).toBeGreaterThanOrEqual(geometry.input.bottom);
  expect(geometry.results.x).toBeGreaterThanOrEqual(0);
  expect(geometry.results.right).toBeLessThanOrEqual(width + 1);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(width + 1);
  expect(geometry.map.width).toBeGreaterThan(100);
  expect(geometry.map.height).toBeGreaterThan(100);
  if (width <= 900)
    expect(geometry.map.y).toBeGreaterThanOrEqual(geometry.results.bottom);
}

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
        const geometryEvidence = [];
        page.on("pageerror", (error) => errors.push(error.message));
        let releaseDelayedSearch;
        const delayedSearch = new Promise((resolve) => {
          releaseDelayedSearch = resolve;
        });
        await page.route("**/api/business/claim-search?**", async (route) => {
          const query = new URL(route.request().url()).searchParams.get("q");
          if (query === "delayed") await delayedSearch;
          return route.fulfill({
            json: {
              rows:
                query === "empty" || query === "delayed"
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
        const panel = page.locator(".claim-search-results");
        const spinner = page.locator(".claim-search-input > span");
        const emptyCopy = locale === "es" ? "No encontramos" : "No unclaimed";
        // Hold a real request so the short loading copy and the taller settled
        // empty copy each have their own strict, same-frame geometry proof.
        await Promise.all([
          page.waitForRequest((request) =>
            matchesSearch(request, "delayed", "activities"),
          ),
          input.fill("delayed"),
        ]);
        await expect(spinner).toBeVisible();
        await expect(panel).toContainText(
          locale === "es" ? "Buscando" : "Searching",
        );
        const loadingGeometry = await readGeometry(page);
        assertGeometry(loadingGeometry, width);
        geometryEvidence.push({ phase: "loading", ...loadingGeometry });
        await page.screenshot({
          path: resolve(
            dir,
            `${locale}-${theme}-${width}x${height}-loading.png`,
          ),
          fullPage: true,
        });
        const delayedResponse = page.waitForResponse((response) =>
          matchesSearch(response.request(), "delayed", "activities"),
        );
        releaseDelayedSearch();
        await delayedResponse;
        await expect(spinner).toHaveCount(0);
        await expect(panel).toContainText(emptyCopy);
        const emptyGeometry = await readGeometry(page);
        assertGeometry(emptyGeometry, width);
        expect(emptyGeometry.resultsText).toContain(emptyCopy);
        geometryEvidence.push({ phase: "settled-empty", ...emptyGeometry });
        await input.fill("");
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
            // Empty copy briefly renders before the search effect marks the
            // request pending. Require this exact response and its completed
            // render rather than accepting that transient no-results state.
            await Promise.all([
              page.waitForResponse((response) =>
                matchesSearch(response.request(), query, vertical),
              ),
              input.fill(query),
            ]);
            await expect(spinner).toHaveCount(0);
            if (query === "empty") await expect(panel).toContainText(emptyCopy);
            else await expect(panel.locator("button")).toHaveCount(24);
            const geometry = await readGeometry(page);
            assertGeometry(geometry, width);
            if (query === "empty")
              expect(geometry.resultsText).toContain(emptyCopy);
            geometryEvidence.push({ phase: query, vertical, ...geometry });
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
        await Promise.all([
          page.waitForResponse((response) =>
            matchesSearch(response.request(), "empty", "accommodation"),
          ),
          input.fill("empty"),
        ]);
        await expect(spinner).toHaveCount(0);
        await expect(panel).toContainText(emptyCopy);
        await page.screenshot({
          path: resolve(dir, `${locale}-${theme}-${width}x${height}.png`),
          fullPage: true,
        });
        expect(errors).toEqual([]);
        results.push({
          locale,
          theme,
          width,
          height,
          pass: true,
          geometry: geometryEvidence,
        });
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
