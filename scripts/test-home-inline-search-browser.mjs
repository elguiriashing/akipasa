// Actual Home hero + inline search with explicit disposable public-search responses.
// No production request, hosted data mutation or physical Android claim.
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const output = resolve("test-results/home-inline-search");
mkdirSync(output, { recursive: true });
const files = [
  "src/components/PlansFirstHero.tsx",
  "src/components/PlansFirstHero.module.css",
  "src/components/VenueQuickSearch.tsx",
  "src/components/VenueQuickSearch.module.css",
  "scripts/test-home-inline-search-browser.mjs",
];
const hashes = () =>
  Object.fromEntries(
    files.map((p) => [
      p,
      createHash("sha256").update(readFileSync(p)).digest("hex"),
    ]),
  );
const before = hashes();
const bundle = await build({
  stdin: {
    contents: `import React from 'react';import{createRoot}from'react-dom/client';import{PlansFirstHero}from'./src/components/PlansFirstHero';const locale=new URLSearchParams(location.search).get('locale')==='es'?'es':'en';createRoot(document.getElementById('root')).render(<PlansFirstHero locale={locale} location={{locality:'fuengirola',name:'Fuengirola',latitude:36.54,longitude:-4.62,radius:25}}/>);`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  outdir: "/inline-fixture",
  format: "iife",
  platform: "browser",
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.AKIPASA_TONIGHT_ENABLED": '"false"',
  },
  plugins: [
    {
      name: "fixture-next",
      setup(b) {
        b.onResolve({ filter: /^next\/(link|image)$/ }, (a) => ({
          path: a.path,
          namespace: "fixture-next",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture-next" }, (a) => ({
          loader: "jsx",
          resolveDir: process.cwd(),
          contents: a.path.endsWith("link")
            ? `import React from'react';export default function Link({prefetch,children,...p}){return <a {...p}>{children}</a>}`
            : `import React from'react';export default function Image({fill,priority,unoptimized,...p}){return <img {...p} style={{position:'absolute',width:'100%',height:'100%'}}/>}`,
        }));
      },
    },
  ],
});
const js = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text;
const css = bundle.outputFiles.find((f) => f.path.endsWith(".css")).text;
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(js);
    return;
  }
  if (req.url?.startsWith("/images/")) {
    res.setHeader("Content-Type", "image/webp");
    res.end(
      readFileSync(resolve("public/images/akipasa/nightlife-editorial.webp")),
    );
    return;
  }
  const theme =
    new URL(req.url, "http://localhost").searchParams.get("theme") === "light"
      ? "light"
      : "dark";
  res.setHeader("Content-Type", "text/html");
  res.end(
    `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;padding:16px;font:16px/1.5 system-ui;background:${theme === "dark" ? "#080a0c" : "#fff8f1"}}button,input{font:inherit}${css}</style></head><body><p>Disposable search fixture · no advertised venues</p><div id="root"></div><script src="/bundle.js"></script></body></html>`,
  );
});
await new Promise((r, j) => {
  server.once("error", j);
  server.listen(0, "127.0.0.1", r);
});
const origin = `http://127.0.0.1:${server.address().port}`;
const results = [];
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.BOOKING_BROWSER_PATH ||
      "/home/agent/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const width of [360, 390, 820, 1440]) {
        const page = await browser.newPage({
          viewport: { width, height: 900 },
          colorScheme: theme,
          reducedMotion: "reduce",
          ...(width === 390
            ? {
                isMobile: true,
                hasTouch: true,
                userAgent:
                  "Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
              }
            : {}),
        });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        let unavailableRequests = 0;
        await page.route("**/*", async (route) => {
          const request = route.request(),
            url = new URL(request.url());
          if (
            url.origin !== origin ||
            !["GET", "HEAD"].includes(request.method())
          )
            return route.abort();
          if (url.pathname === "/api/search/venues") {
            const q = url.searchParams.get("q");
            if (q === "Unavailable" && ++unavailableRequests === 1)
              return route.fulfill({
                status: 503,
                json: { error: "Synthetic unavailable" },
              });
            return route.fulfill({
              json: {
                rows:
                  q === "Casa"
                    ? Array.from({ length: 8 }, (_, i) => ({
                        id: String(i),
                        slug: `fixture-${i}`,
                        name: `Synthetic Casa ${i}`,
                        address: "Fixture only",
                      }))
                    : [],
                total: q === "Casa" ? 8 : 0,
                nextOffset: q === "Casa" ? 8 : null,
              },
            });
          }
          return route.continue();
        });
        await page.goto(`${origin}/?locale=${locale}&theme=${theme}`);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        const input = page.getByRole("searchbox", {
          name: locale === "es" ? "Buscar locales" : "Search venues",
        });
        await input.fill("Casa");
        const region = page.getByRole("region", {
          name: locale === "es" ? "Resultados de locales" : "Venue results",
        });
        await expect(region.getByRole("link")).toHaveCount(5);
        await expect(page.locator("[popover]:popover-open")).toHaveCount(0);
        await expect(region.getByRole("button")).toHaveCount(0);
        const prefix = `${locale}-${theme}-${width}`;
        await page.screenshot({
          path: resolve(output, `${prefix}-matches.png`),
          fullPage: true,
        });
        const first = region.getByRole("link").first();
        await first.focus();
        await expect(first).toBeFocused();
        const box = await first.boundingBox();
        if (!box || box.height < 44)
          throw Error("Result touch target below44px");
        await page.keyboard.press("Escape");
        await expect(region).toHaveCount(0);
        await input.focus();
        await expect(region.getByRole("link")).toHaveCount(5);
        await input.fill("Unavailable");
        await expect(
          page.getByText(
            locale === "es"
              ? "No se pudieron cargar los resultados."
              : "Could not load results.",
          ),
        ).toBeVisible();
        await page.screenshot({
          path: resolve(output, `${prefix}-unavailable.png`),
          fullPage: true,
        });
        const retry = page.getByRole("button", {
          name: locale === "es" ? "Reintentar" : "Retry",
        });
        const retryBox = await retry.boundingBox();
        if (!retryBox || retryBox.height < 44)
          throw Error("Retry touch target below44px");
        await retry.focus();
        await page.keyboard.press("Enter");
        await expect(
          page.getByText(
            locale === "es"
              ? "No encontramos ningún local."
              : "No venues found.",
          ),
        ).toBeVisible();
        await page.screenshot({
          path: resolve(output, `${prefix}-empty.png`),
          fullPage: true,
        });
        await input.fill("Casa");
        await expect(region.getByRole("link")).toHaveCount(5);
        await region.getByRole("link").first().focus();
        await Promise.all([
          page.waitForURL(`**/${locale}/venues/fixture-0`),
          page.keyboard.press("Enter"),
        ]);
        if (
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          )
        )
          throw Error("Page overflow");
        if (errors.length) throw Error(errors.join("\n"));
        results.push({
          locale,
          theme,
          width,
          androidEmulation: width === 390,
          physicalAndroid: false,
          pass: true,
        });
        await page.close();
      }
  if (JSON.stringify(before) !== JSON.stringify(hashes()))
    throw Error("Source changed during capture");
  writeFileSync(
    resolve(output, "results.json"),
    JSON.stringify(
      {
        source: before,
        qualification:
          "Actual hero/component with synthetic public API responses and Next link/image adapters; not real provider, production or physical-device acceptance",
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`${results.length} Home inline-search browser contexts passed`);
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
