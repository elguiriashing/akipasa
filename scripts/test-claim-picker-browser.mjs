import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// Real picker and styles, with disposable search responses and no tile service.
// This proves geometry and selection, not production auth/RLS or map rendering.
const dir = resolve("test-results/claim-picker");
mkdirSync(dir, { recursive: true });
const bundle = await build({
  stdin: {
    contents: `import React from 'react';import{createRoot}from'react-dom/client';import{ClaimVenuePicker}from'./src/components/ClaimVenuePicker';const locale=new URLSearchParams(location.search).get('lang')||'en';createRoot(document.getElementById('root')).render(<main className="akibusiness-host" style={{padding:16}}><form><ClaimVenuePicker locale={locale} styleUrl=""/></form></main>);`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  loader: { ".css": "empty" },
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
});
const css = (
  await postcss([tailwind()]).process(
    [
      "globals.css",
      "compact-app.css",
      "brand.css",
      "appearance.css",
      "portal-unity.css",
    ]
      .map((file) => readFileSync(`src/app/${file}`, "utf8"))
      .join("\n"),
    { from: resolve("src/app/globals.css") },
  )
).css;
const rows = Array.from({ length: 24 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  slug: `test-${i}`,
  name: `Test ${i + 1}: Asociación de hostelería con un nombre muy largo`,
  address: "Avenida de la Constitución, Fuengirola, Málaga",
  locality: "Fuengirola",
  latitude: 36.539,
  longitude: -4.624,
}));
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundle.outputFiles[0].text);
  } else if (url.pathname === "/styles.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else if (url.pathname === "/api/business/claim-search") {
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        rows: url.searchParams.get("q") === "empty" ? [] : rows,
      }),
    );
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body data-product="akibusiness"><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const address = server.address();
let browser;
let passed = 0;
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
        [1180, 820],
        [640, 400],
        [1536, 960],
      ]) {
        const page = await browser.newPage({ viewport: { width, height } });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(`http://127.0.0.1:${address.port}/?lang=${locale}`);
        await page.evaluate((t) => {
          document.documentElement.dataset.theme = t;
        }, theme);
        const input = page.locator("#claim-venue-search");
        await expect(input).toBeVisible();
        // Force the real heading to wrap, reproducing the fixed-offset failure.
        await page.locator(".claim-search-heading h3").evaluate((node) => {
          node.style.maxWidth = "9ch";
        });
        for (const query of ["empty", "test"]) {
          await input.fill(query);
          const results = page.locator(".claim-search-results");
          if (query === "empty")
            await expect(results).toContainText(
              locale === "es" ? "No encontramos" : "No unclaimed",
            );
          else await expect(results.locator("button")).toHaveCount(24);
          const inputBox = await input.boundingBox();
          const resultsBox = await results.boundingBox();
          expect(resultsBox.y).toBeGreaterThanOrEqual(
            inputBox.y + inputBox.height,
          );
          expect(
            await input.evaluate((node) => {
              const box = node.getBoundingClientRect();
              return (
                document.elementFromPoint(
                  box.x + box.width / 2,
                  box.y + box.height / 2,
                ) === node
              );
            }),
          ).toBe(true);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          ).toBe(true);
          const mapBox = await page.locator(".claim-map-panel").boundingBox();
          expect(mapBox.width).toBeGreaterThan(0);
          expect(mapBox.height).toBeGreaterThan(0);
          if (width <= 900)
            expect(mapBox.y).toBeGreaterThanOrEqual(
              resultsBox.y + resultsBox.height,
            );
          if (query === "test") {
            await results.locator("button").last().scrollIntoViewIfNeeded();
            await expect(results.locator("button").last()).toBeVisible();
          }
          await page.screenshot({
            path: `${dir}/${locale}-${theme}-${width}-${query}.png`,
            fullPage: true,
          });
        }
        await page.locator(".claim-search-results button").first().click();
        await expect(page.locator('input[name="venueId"]')).toHaveValue(
          rows[0].id,
        );
        await expect(
          page.locator(".claim-selected-confirmation"),
        ).toContainText(rows[0].name);
        await expect(page.locator(".claim-search-results")).toHaveCount(0);
        await page.locator(".claim-selected-confirmation button").click();
        await expect(input).toHaveValue("");
        await expect(page.locator('input[name="venueId"]')).toHaveValue("");
        expect(errors).toEqual([]);
        await page.close();
        passed++;
        console.log(`PASS claim picker ${locale} ${theme} ${width}x${height}`);
      }
  console.log(`PASS ${passed} responsive claim picker scenarios`);
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
