// Bounded review fixture for two pending real page exports. This does not exercise
// real Next/Supabase identity, RLS, payments, attendance, XP or physical devices.
// All data is synthetic. Server actions and outbound/non-GET requests are forbidden.
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const out = resolve(
  process.env.MAP_REVIEW_EVIDENCE_DIR || "test-results/map-route-review",
);
mkdirSync(out, { recursive: true });
const token = "91000000-0000-4000-8000-000000000001";
const globals = [
  ...readFileSync("src/app/layout.tsx", "utf8").matchAll(
    /import\s+["'](\.\/[^"']+\.css)["'];/g,
  ),
].map((m) => resolve("src/app", m[1]));
const adapter = `export async function mapPreviewPortrait(){return null}
export async function nearbyVenuePage(){return{rows:[],total:0,page:1}}
export async function recommendDiscovery(request){window.fixtureReads.push({source:'recommendDiscovery',request});return{requestId:'synthetic-map-read',items:[{reasonCodes:[],result:{distanceKm:0.4,event:{id:'synthetic-event',slug:'synthetic-show',title:{en:'Synthetic music event',es:'Evento musical de prueba'},summary:{en:'Read-only map review fixture',es:'Prueba visual de solo lectura'},category:'music',priceCents:0,currency:'EUR',priceDisplayMode:'show',source:'verified_venue',sponsored:false,venueId:'synthetic-venue',location:null},venue:{id:'synthetic-venue',name:'Synthetic venue',latitude:36.54,longitude:-4.62},occurrence:{id:'synthetic-occurrence',startsAt:'2099-11-08T18:00:00Z',endsAt:'2099-11-08T21:00:00Z',status:'scheduled'}}}]}}
export function trackBehaviour(event){(window.fixtureTelemetry||=[]).push(event)}
`;
const entry = `import React from'react';import{createRoot}from'react-dom/client';import{AppShell}from'./src/components/AppShell';import MapPage from'./src/app/[locale]/map/page';
const q=new URLSearchParams(location.search),locale=location.pathname.split('/')[1]||'en';document.documentElement.lang=locale;document.documentElement.dataset.theme=q.get('theme')||'dark';window.fixtureReads=[];window.fixtureActions=[];window.fixtureAuth=[];
(async()=>{try{const content=await MapPage({params:Promise.resolve({locale}),searchParams:Promise.resolve(Object.fromEntries(q))});createRoot(document.getElementById('root')).render(<AppShell locale={locale} signedIn={false} role='consumer'><div data-fixture-notice style={{padding:4,color:'#ffb27b',background:'#15100c',fontSize:12}}>DISPOSABLE MAP REVIEW: synthetic marker/data/basemap; no live provider.</div>{content}</AppShell>);requestAnimationFrame(()=>requestAnimationFrame(()=>window.fixtureReady=true))}catch(e){window.fixtureFailure=String(e.stack||e)}})();`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: root, loader: "tsx" },
  bundle: true,
  write: false,
  outdir: out,
  metafile: true,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  loader: { ".css": "css" },
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [
    {
      name: "disposable-consumer-read-fixtures",
      setup(b) {
        b.onLoad({ filter: /\.module\.css$/ }, (a) => ({
          contents: readFileSync(a.path, "utf8"),
          loader: "local-css",
        }));
        b.onResolve(
          {
            filter:
              /^@\/lib\/(pals\/server|personalisation\/server|personalisation\/client|unclaimed-venues)$/,
          },
          () => ({ path: "map-adapter", namespace: "fixture" }),
        );
        b.onResolve({ filter: /^maplibre-gl$/ }, () => ({
          path: "native-map",
          namespace: "fixture",
        }));
        b.onResolve({ filter: /^@\/lib\/auth$/ }, () => ({
          path: "auth",
          namespace: "fixture",
        }));
        b.onLoad({ filter: /[\\/]lib[\\/]auth\.ts$/ }, () => ({
          contents: adapter,
          loader: "js",
        }));
        b.onResolve({ filter: /^@\/lib\/feature-flags$/ }, () => ({
          path: "flags",
          namespace: "fixture",
        }));
        b.onResolve({ filter: /^node:crypto$/ }, () => ({
          path: "crypto",
          namespace: "fixture",
        }));
        b.onResolve({ filter: /^next\/(link|navigation|image)$/ }, (a) => ({
          path: a.path,
          namespace: "fixture",
        }));
        b.onResolve({ filter: /(?:^|\/)actions$/ }, (a) => ({
          path: resolve(a.resolveDir, a.path.replace(/^@\//, "src/")) + ".ts",
          namespace: "actions",
        }));
        b.onLoad({ filter: /.*/, namespace: "actions" }, (a) => {
          let path = a.path;
          if (!existsSync(path) && path.includes("/src/"))
            path = resolve(root, "src", path.split("/src/").at(-1));
          const names = [
            ...readFileSync(path, "utf8").matchAll(
              /export\s+(?:async\s+)?function\s+(\w+)/g,
            ),
          ].map((x) => x[1]);
          return {
            contents: names
              .map(
                (n) =>
                  `export async function ${n}(){window.fixtureActions.push('${n}');throw Error('Read-only fixture forbids actions')}`,
              )
              .join("\n"),
            loader: "js",
          };
        });
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
          contents:
            a.path === "map-adapter"
              ? adapter
              : a.path === "native-map"
                ? `import Native from ${JSON.stringify(resolve("node_modules/maplibre-gl/dist/maplibre-gl.js"))}; export class Map extends Native.Map{constructor(options){super(options);(window.fixtureMaps||=[]).push(this)}};export const NavigationControl=Native.NavigationControl,GeolocateControl=Native.GeolocateControl,ScaleControl=Native.ScaleControl,AttributionControl=Native.AttributionControl,Popup=Native.Popup;`
                : a.path === "auth"
                  ? `export async function optionalUser(){return{user:null,supabase:null}}`
                  : a.path === "flags"
                    ? `export async function loadFeatureFlags(){return{loyalty_check_ins:new URLSearchParams(location.search).get('state')!=='paused'}}`
                    : a.path === "crypto"
                      ? `const crypto={randomUUID:()=>globalThis.crypto.randomUUID()};export default crypto;export const randomUUID=crypto.randomUUID;`
                      : a.path === "next/navigation"
                        ? `import{useSyncExternalStore,useMemo}from'react';const router={refresh(){location.reload()},push(p){location.href=p},replace(p){history.replaceState(null,'',p);window.dispatchEvent(new PopStateEvent('popstate'))}};const subscribe=fn=>{window.addEventListener('popstate',fn);return()=>window.removeEventListener('popstate',fn)};export function usePathname(){return location.pathname}export function useSearchParams(){const s=useSyncExternalStore(subscribe,()=>location.search);return useMemo(()=>new URLSearchParams(s),[s])}export function useRouter(){return router}export function notFound(){throw Object.assign(new Error('not-found'),{kind:'not-found'})}export function redirect(href){throw new Error('redirect:'+href)}`
                        : `import React from'react';export default function Adapter({children,prefetch,fill,priority,unoptimized,replace,scroll,...p}){return React.createElement('${a.path === "next/image" ? "img" : "a"}',p,children)}`,
          loader: "jsx",
          resolveDir: root,
        }));
      },
    },
  ],
});
const css = (
  await postcss([tailwind()]).process(
    globals.map((f) => readFileSync(f, "utf8")).join("\n") +
      "\n" +
      bundle.outputFiles
        .filter((f) => f.path.endsWith(".css"))
        .map((f) => f.text)
        .join("\n"),
    { from: resolve("src/app/globals.css") },
  )
).css;
const js = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text;
writeFileSync(resolve(out, "bundle.js"), js);
writeFileSync(resolve(out, "styles.css"), css);
writeFileSync(
  resolve(out, "metafile.json"),
  JSON.stringify(bundle.metafile, null, 2),
);
const sourceFiles = [
  ...new Set([
    ...Object.keys(bundle.metafile.inputs).filter(
      (f) =>
        !f.startsWith("node_modules/") && !f.includes(":") && existsSync(f),
    ),
    ...globals.map((f) => f.slice(root.length + 1)),
    "src/app/layout.tsx",
    "node_modules/maplibre-gl/dist/maplibre-gl.js",
    "package-lock.json",
    "scripts/test-map-route-review-browser.mjs",
  ]),
];
const hashes = () =>
  Object.fromEntries(
    sourceFiles.map((f) => [
      f,
      createHash("sha256").update(readFileSync(f)).digest("hex"),
    ]),
  );
const initial = hashes();
const server = createServer((req, res) => {
  const p = new URL(req.url, "http://localhost").pathname;
  if (p === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript; charset=utf-8");
    res.end(js);
  } else if (p === "/style.css") {
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    res.end(css);
  } else if (
    /^\/(?:brand|images)\/[a-z0-9/-]+\.(svg|webp|png)$/.test(p) &&
    existsSync(resolve("public", p.slice(1)))
  ) {
    res.setHeader(
      "Content-Type",
      extname(p) === ".svg" ? "image/svg+xml" : "image/" + extname(p).slice(1),
    );
    res.end(readFileSync(resolve("public", p.slice(1))));
  } else {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(
      '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = "http://127.0.0.1:" + server.address().port;
let browser;
const results = [];
const violations = [];
const failures = [];
const persist = () =>
  writeFileSync(
    resolve(out, "results.json"),
    JSON.stringify(
      {
        scope:
          "Actual Map page export, AppShell and MapLibre with one synthetic event and synthetic tileless background. No live provider/Auth/RLS/geolocation/device acceptance.",
        sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        initialSourceHashes: initial,
        finalSourceHashes: hashes(),
        compiledBundleSha256: createHash("sha256").update(js).digest("hex"),
        compiledCssSha256: createHash("sha256").update(css).digest("hex"),
        violations,
        failures,
        results,
      },
      null,
      2,
    ),
  );
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : {}),
    args: ["--enable-unsafe-swiftshader"],
  });
  const contexts = process.env.MAP_REVIEW_CONTRAST_PROBE
    ? [["es", "light", 1440]]
    : process.env.MAP_REVIEW_PROBE
      ? [["en", "dark", 360]]
      : ["en", "es"].flatMap((locale) =>
          ["dark", "light"].flatMap((theme) =>
            [360, 820, 1440].map((width) => [locale, theme, width]),
          ),
        );
  for (const [locale, theme, width] of contexts) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      colorScheme: theme,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => failures.push(e.stack || e.message));
    let styleRequests = 0;
    let recoveryAllowed = false;
    await context.route("**/*", async (r) => {
      const u = new URL(r.request().url());
      if (r.request().method() !== "GET") {
        violations.push({
          url: u.origin + u.pathname,
          method: r.request().method(),
        });
        return r.abort();
      }
      if (
        /style(?:\.json)?(?:$|\?)/.test(u.pathname) ||
        u.pathname.endsWith("/liberty")
      ) {
        styleRequests++;
        return r.fulfill(
          !recoveryAllowed
            ? {
                status: 404,
                contentType: "application/json",
                body: '{"fixture":"provider outage"}',
              }
            : {
                contentType: "application/json",
                body: JSON.stringify({
                  version: 8,
                  glyphs: origin + "/fixture-glyphs/{fontstack}/{range}.pbf",
                  sources: {},
                  layers: [
                    {
                      id: "background",
                      type: "background",
                      paint: {
                        "background-color":
                          theme === "dark" ? "#172539" : "#e7f0ea",
                      },
                    },
                  ],
                }),
              },
        );
      }
      if (u.origin !== origin) {
        violations.push({
          url: u.origin + u.pathname,
          method: r.request().method(),
        });
        return r.abort();
      }
      if (u.pathname.startsWith("/api/map/tiles/"))
        return r.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            version: 2,
            generatedAt: new Date().toISOString(),
            count: 0,
            markers: [],
          }),
        });
      if (u.pathname.startsWith("/api/venues/nearby"))
        return r.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            rows: [],
            total: 0,
            page: 1,
            hasMore: false,
            nextCursor: null,
          }),
        });
      if (u.pathname.startsWith("/fixture-glyphs/"))
        return r.fulfill({ status: 200, body: Buffer.alloc(0) });
      return r.continue();
    });
    await page.goto(
      origin +
        "/" +
        locale +
        "/map?locality=fuengirola&category=music&price=free&theme=" +
        theme,
    );
    await page.waitForFunction(
      () => window.fixtureReady || window.fixtureFailure,
    );
    expect(await page.evaluate(() => window.fixtureFailure || null)).toBeNull();
    await page.waitForTimeout(250);
    const snapshot = async (state, extra = {}) => {
      await page.evaluate(async () => {
        await Promise.all(
          document
            .getAnimations()
            .filter((a) =>
              Number.isFinite(a.effect?.getComputedTiming().endTime),
            )
            .map((a) => a.finished.catch(() => {})),
        );
      });
      const file =
        "map-" + locale + "-" + theme + "-" + width + "-" + state + ".png";
      await page.screenshot({ path: resolve(out, file), fullPage: true });
      results.push({
        locale,
        theme,
        width,
        state,
        image: file,
        imageSha256: createHash("sha256")
          .update(readFileSync(resolve(out, file)))
          .digest("hex"),
        styleRequests,
        overflow: await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
        ...extra,
        reads: await page.evaluate(() => window.fixtureReads),
        mapState: await page.evaluate(() =>
          window.fixtureMaps?.map((m) => ({
            styleLoaded: m.isStyleLoaded(),
            center: m.getCenter(),
            zoom: m.getZoom(),
            sources: Object.keys(m.getStyle()?.sources || {}),
          })),
        ),
      });
      persist();
    };
    if (process.env.MAP_REVIEW_PROBE) await snapshot("probe");
    writeFileSync(
      resolve(out, "dom-" + locale + "-" + theme + "-" + width + ".json"),
      JSON.stringify(
        await page.evaluate(() => ({
          text: document.body.innerText,
          buttons: [...document.querySelectorAll("button,a,summary")].map(
            (e) => ({
              tag: e.tagName,
              text: e.textContent,
              ariaLabel: e.getAttribute("aria-label"),
              class: e.className,
              href: e.getAttribute("href"),
            }),
          ),
          selects: [...document.querySelectorAll("select")].map((e) => ({
            name: e.name,
            value: e.value,
          })),
        })),
        null,
        2,
      ),
    );
    if (process.env.MAP_REVIEW_PROBE) {
      await context.close();
      continue;
    }
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await snapshot("outage");
    const retry = page.getByRole("button", {
      name: locale === "es" ? "Reintentar mapa" : "Retry map",
      exact: true,
    });
    await retry.focus();
    await expect(retry).toBeFocused();
    const styleRequestsBeforeRetry = styleRequests;
    recoveryAllowed = true;
    await page.keyboard.press("Enter");
    await expect
      .poll(() => styleRequests)
      .toBeGreaterThan(styleRequestsBeforeRetry);
    await expect(alert).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() => window.fixtureMaps.at(-1).isStyleLoaded()),
      )
      .toBe(true);
    await snapshot("recovered");
    const point = await page.evaluate(() => {
      const m = window.fixtureMaps.at(-1);
      const p = m.project([-4.62, 36.54]);
      return { x: p.x, y: p.y };
    });
    await page.locator("canvas.maplibregl-canvas").click({ position: point });
    const popupLink = page.locator(
      '.maplibregl-popup a[href*="/events/synthetic-show"]',
    );
    await expect(popupLink).toBeVisible();
    await expect(popupLink).toHaveAttribute(
      "href",
      "/" + locale + "/events/synthetic-show?occurrence=synthetic-occurrence",
    );
    await snapshot("marker-popup");
    const popupClose = page.locator(".maplibregl-popup-close-button");
    if (await popupClose.count()) await popupClose.click();
    await page.locator(".map-list-toggle").click();
    const card = page.locator(".event-plan-card");
    await expect(card).toBeVisible();
    const title = card.getByText(
      locale === "es" ? "Evento musical de prueba" : "Synthetic music event",
      { exact: true },
    );
    const readability = await title.evaluate((el) => {
      const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
      const chain = [];
      let bg = null;
      for (let node = el; node; node = node.parentElement) {
        const cs = getComputedStyle(node);
        chain.push({
          tag: node.tagName,
          className: node.className,
          color: cs.color,
          backgroundColor: cs.backgroundColor,
          backgroundImage: cs.backgroundImage,
        });
        const c = rgb(cs.backgroundColor);
        if (c.length >= 3 && (c.length < 4 || c[3] >= 0.999)) {
          bg = c.slice(0, 3);
          break;
        }
      }
      const fg = rgb(getComputedStyle(el).color).slice(0, 3);
      bg = bg || [255, 255, 255];
      const luminance = (c) =>
        c
          .map((v) => v / 255)
          .map((v) =>
            v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4),
          )
          .reduce((v, n, i) => v + n * [0.2126, 0.7152, 0.0722][i], 0);
      const a = luminance(fg),
        b = luminance(bg);
      return {
        target: "map-list-event-title",
        text: el.textContent,
        foreground: fg,
        background: bg,
        contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
        chain,
      };
    });
    await snapshot("list", { readability });
    expect(readability.contrast).toBeGreaterThanOrEqual(4.5);
    const closeList = page.getByRole("button", {
      name: locale === "es" ? "Cerrar lista" : "Close list",
      exact: true,
    });
    await closeList.click();
    const search = page.getByRole("button", {
      name: locale === "es" ? "Buscar en AkiPasa" : "Search AkiPasa",
      exact: true,
    });
    await search.click();
    await expect(page.locator('select[name="category"]')).toHaveValue("music");
    await expect(page.locator('select[name="price"]')).toHaveValue("free");
    await snapshot("filters");

    expect(await page.evaluate(() => window.fixtureActions)).toEqual([]);
    await context.close();
  }
  expect(violations).toEqual([]);
  expect(failures).toEqual([]);
  expect(hashes()).toEqual(initial);
  persist();
  console.log("PASS " + results.length + " source-bound composed Map captures");
} catch (e) {
  failures.push(String(e.stack || e));
  persist();
  throw e;
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
