import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

// Actual MapLibre/ProductionMap; only navigation, telemetry and HTTP data are
// disposable adapters. Tileless recovery verifies UX, not live provider coverage.
const output = resolve("test-results/map-availability");
mkdirSync(output, { recursive: true });
const entry = `import React from 'react';import{createRoot}from'react-dom/client';
import{ProductionMap}from'./src/components/ProductionMap';
const q=new URLSearchParams(location.search);const locale=q.get('lang')||'en';
document.documentElement.dataset.theme=q.get('theme')||'dark';
document.documentElement.lang=locale;
createRoot(document.getElementById('root')).render(<div className="app-shell"><aside className="suite-discovery-nav" data-product="pasa" data-compact="true" aria-hidden="true"/><div className="app-content"><main className="shell discover-page map-page"><ProductionMap fullScreen locale={locale} points={[]} styleUrl={location.origin+'/fixture-style.json'} center={{latitude:36.54,longitude:-4.62}}/></main></div></div>);`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  outdir: "/tmp/map-availability-browser-build",
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "map-availability-fixtures",
      setup(b) {
        b.onResolve({ filter: /^next\/navigation$/ }, () => ({
          path: "navigation",
          namespace: "fixture",
        }));
        b.onResolve({ filter: /^@\/lib\/personalisation\/client$/ }, () => ({
          path: "telemetry",
          namespace: "fixture",
        }));
        b.onResolve({ filter: /^maplibre-gl$/ }, () => ({
          path: "native-map",
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
          loader: "js",
          resolveDir: process.cwd(),
          contents:
            args.path === "navigation"
              ? 'const router={push(){throw new Error("Unexpected navigation")}};export const useRouter=()=>router;'
              : args.path === "telemetry"
                ? "export function trackBehaviour(event){(window.__fixtureTelemetry||=[]).push(event)}"
                : `import Native from ${JSON.stringify(resolve("node_modules/maplibre-gl/dist/maplibre-gl.js"))};
export class Map extends Native.Map {constructor(options){super(options);(window.__fixtureMaps||=[]).push(this)}}
export const NavigationControl=Native.NavigationControl,GeolocateControl=Native.GeolocateControl,ScaleControl=Native.ScaleControl,AttributionControl=Native.AttributionControl,Popup=Native.Popup;`,
        }));
      },
    },
  ],
});
const stylesheetFiles = new Set();
function localStyles(path) {
  stylesheetFiles.add(relative(process.cwd(), path));
  return readFileSync(path, "utf8").replace(
    /@import\s+["'](\.[^"']+)["']\s*;/g,
    (_, file) => localStyles(resolve(dirname(path), file)),
  );
}
const layoutStyles = [
  ...readFileSync("src/app/layout.tsx", "utf8").matchAll(
    /import\s+["'](\.\/[^"']+\.css)["']/g,
  ),
]
  .map((match) => localStyles(resolve("src/app", match[1])))
  .join("\n");
const shellStyles = [
  "src/components/DiscoveryNavigation.tsx",
  "src/components/AppShell.tsx",
]
  .flatMap((file) =>
    [
      ...readFileSync(file, "utf8").matchAll(
        /import\s+["'](\.\/[^"']+\.css)["']/g,
      ),
    ].map((match) => localStyles(resolve(dirname(file), match[1]))),
  )
  .join("\n");
const css =
  (
    await postcss([tailwind()]).process(layoutStyles + "\n" + shellStyles, {
      from: resolve("src/app/globals.css"),
    })
  ).css +
  (bundle.outputFiles.find((file) => file.path.endsWith(".css"))?.text || "");
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundle.outputFiles.find((file) => file.path.endsWith(".js")).text);
  } else if (req.url === "/styles.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else if (req.url.startsWith("/api/map/tiles/")) {
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        version: 2,
        generatedAt: new Date().toISOString(),
        count: 0,
        markers: [],
      }),
    );
  } else if (req.url.startsWith("/?")) {
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  } else {
    res.statusCode = 404;
    res.end("Fixture resource not found");
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const cases = [];
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : {}),
    args: ["--enable-unsafe-swiftshader"],
  });
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const width of [360, 390, 820, 1440]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          reducedMotion: "reduce",
          ...(width === 390
            ? {
                isMobile: true,
                hasTouch: true,
                userAgent:
                  "Mozilla/5.0 (Linux; Android 13; AkiPasaWebView) AppleWebKit/537.36 Chrome/153.0.0.0 Mobile Safari/537.36",
              }
            : {}),
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        let styleRequests = 0;
        await page.route("**/fixture-style.json", async (route) => {
          styleRequests++;
          await route.fulfill(
            styleRequests === 1
              ? {
                  status: 404,
                  contentType: "application/json",
                  body: '{"fixture":"style outage"}',
                }
              : {
                  status: 200,
                  contentType: "application/json",
                  body: JSON.stringify({
                    version: 8,
                    glyphs: `${origin}/fixture-glyphs/{fontstack}/{range}.pbf`,
                    sources: {},
                    layers: [
                      {
                        id: "background",
                        type: "background",
                        paint: { "background-color": "#faf7f2" },
                      },
                    ],
                  }),
                },
          );
        });
        await page.goto(
          `${origin}/?lang=${locale}&theme=${theme}&category=music&radius=15`,
        );
        const alert = page.getByRole("alert");
        await expect(alert).toBeVisible();
        await expect(alert).toContainText(
          locale === "es"
            ? "La lista y los filtros siguen disponibles"
            : "The list and filters are still available",
        );
        await expect(page.locator("main")).toHaveCSS("opacity", "1");
        const layoutGap = () =>
          page.evaluate(() => {
            const tabs = document
              .querySelector(".map-vertical-tabs")
              .getBoundingClientRect();
            const legend = document
              .querySelector(".map-legend")
              .getBoundingClientRect();
            const alert = document
              .querySelector('[role="alert"]')
              .getBoundingClientRect();
            return Math.min(
              legend.top - tabs.bottom,
              alert.top - legend.bottom,
            );
          });
        await expect.poll(layoutGap).toBeGreaterThanOrEqual(10);
        // The offset follows actual wrapping, locale labels and window resizing.
        await page.setViewportSize({
          width: width === 360 ? 820 : 360,
          height: 900,
        });
        await expect.poll(layoutGap).toBeGreaterThanOrEqual(10);
        await page.setViewportSize({ width, height: 900 });
        await expect.poll(layoutGap).toBeGreaterThanOrEqual(10);
        const legendToggle = page.locator(".map-legend > summary");
        await legendToggle.click();
        await expect(page.locator(".map-legend")).toHaveAttribute("open", "");
        await expect.poll(layoutGap).toBeGreaterThanOrEqual(10);
        await legendToggle.click();
        await expect.poll(layoutGap).toBeGreaterThanOrEqual(10);

        await page.screenshot({
          path: resolve(
            output,
            `${locale}-${theme}-${width}-initial-outage.png`,
          ),
        });
        await page
          .getByRole("button", {
            name: locale === "es" ? "Alojamientos" : "Accommodation",
            exact: true,
          })
          .click();
        // Camera observation uses the actual instance; no rendering methods are mocked.
        await page.evaluate(() =>
          window.__fixtureMaps[0].jumpTo({ center: [-4.7, 36.6], zoom: 12 }),
        );
        const retry = page.getByRole("button", {
          name: locale === "es" ? "Reintentar mapa" : "Retry map",
          exact: true,
        });
        await retry.focus();
        await expect(retry).toBeFocused();
        const geometry = await retry.evaluate((button) => {
          const r = button.getBoundingClientRect();
          const a = button.closest('[role="alert"]').getBoundingClientRect();
          return {
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            alert: { x: a.x, y: a.y, width: a.width, height: a.height },
            viewport: innerWidth,
            document: document.documentElement.scrollWidth,
          };
        });
        expect(geometry.height).toBeGreaterThanOrEqual(44);
        expect(geometry.width).toBeGreaterThanOrEqual(44);
        expect(geometry.x).toBeGreaterThanOrEqual(0);
        expect(geometry.x + geometry.width).toBeLessThanOrEqual(width);
        expect(geometry.document).toBeLessThanOrEqual(width + 1);
        await page.screenshot({
          path: resolve(output, `${locale}-${theme}-${width}-outage.png`),
        });
        await page.keyboard.press("Enter");
        await expect.poll(() => styleRequests).toBe(2);
        await expect(alert).toHaveCount(0);
        await expect
          .poll(() =>
            page.evaluate(() => window.__fixtureMaps.at(-1).isStyleLoaded()),
          )
          .toBe(true);
        await expect(
          page.getByRole("button", {
            name: locale === "es" ? "Alojamientos" : "Accommodation",
            exact: true,
          }),
        ).toHaveAttribute("aria-pressed", "true");
        const state = await page.evaluate(() => {
          const m = window.__fixtureMaps.at(-1),
            c = m.getCenter();
          return {
            latitude: c.lat,
            longitude: c.lng,
            zoom: m.getZoom(),
            search: location.search,
            telemetry: window.__fixtureTelemetry.length,
            canvas: document.querySelectorAll("canvas.maplibregl-canvas")
              .length,
          };
        });
        expect(state.latitude).toBeCloseTo(36.6, 5);
        expect(state.longitude).toBeCloseTo(-4.7, 5);
        expect(state.zoom).toBe(12);
        expect(state.search).toContain("category=music&radius=15");
        expect(state.telemetry).toBe(1);
        expect(state.canvas).toBe(1);
        expect(errors).toEqual([]);
        await page.screenshot({
          path: resolve(output, `${locale}-${theme}-${width}-recovered.png`),
        });
        cases.push({
          locale,
          theme,
          width,
          geometry,
          state,
          styleRequests,
          passed: true,
        });
        await context.close();
      }
  const files = [
    "src/components/ProductionMap.tsx",
    "src/components/ProductionMap.module.css",
    "scripts/test-map-availability-browser.mjs",
    "src/app/layout.tsx",
    "node_modules/maplibre-gl/dist/maplibre-gl.js",
    ...stylesheetFiles,
  ];
  writeFileSync(
    resolve(output, "evidence.json"),
    JSON.stringify(
      {
        fixture: true,
        scope:
          "Actual MapLibre style404 and controlled tileless recovery; not live tiles/authentication/physical Android acceptance",
        head: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        sourceHashes: Object.fromEntries(
          files.map((file) => [
            file,
            createHash("sha256").update(readFileSync(file)).digest("hex"),
          ]),
        ),
        cases,
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS ${cases.length} actual MapLibre outage/retry cases; disposable tileless fixture, no live provider acceptance.`,
  );
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
