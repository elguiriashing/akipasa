import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createHash } from "node:crypto";
const dir = resolve(
  process.env.BUSINESS_READ_HANDOVER_ONLY === "1"
    ? "test-results/business-handover-fit"
    : "test-results/business-home-read",
);
mkdirSync(dir, { recursive: true });
const entry = `import React from 'react';import{createRoot}from'react-dom/client';import Page from './src/app/[locale]/business/page';import './src/components/PasaSharedSurfaces.css';
const q=new URLSearchParams(location.search),locale=location.pathname.startsWith('/es/')?'es':'en';document.documentElement.lang=locale;document.documentElement.dataset.theme=localStorage.getItem('business-read-theme')||'light';document.body.className='akibusiness-host';window.__fixtureActions=[];
Page({params:Promise.resolve({locale}),searchParams:Promise.resolve(Object.fromEntries(q))}).then(tree=>{createRoot(document.getElementById('root')).render(tree);window.__fixtureReady=true}).catch(error=>window.__fixtureError=error.message);`;
const auth = `import{businessHomeReadFixture}from'./tests/fixtures/business-home-read-state';function fixture(){const q=new URLSearchParams(location.search);if(q.has('fixtureStaff'))sessionStorage.setItem('business-read-fixture-staff',q.get('fixtureStaff'));return businessHomeReadFixture({failure:q.get('fixtureFailed')||'',empty:q.get('fixtureEmpty')==='1',staff:sessionStorage.getItem('business-read-fixture-staff')==='1'})}export async function requireUser(){return fixture()}export async function requireBusinessAccess(){return fixture()}`;
const names = [
  "confirmRedemption",
  "createOfficialEvent",
  "createVenue",
  "deleteManagedVenue",
  "requestPromotion",
  "reuseEvent",
  "saveLoyaltyProgram",
  "submitVenueClaim",
  "createEvent",
];
const built = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  outdir: "/tmp/business-home-read-browser",
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { "process.env": '{"NODE_ENV":"production"}' },
  plugins: [
    {
      name: "disposable-business-reads",
      setup(b) {
        b.onResolve(
          { filter: /^@\/lib\/(auth|entitlements|feature-flags)$/ },
          (args) => ({
            path: args.path.endsWith("feature-flags") ? "flags" : "auth",
            namespace: "fixture",
          }),
        );
        b.onResolve(
          { filter: /(^\.\/actions$|\/business\/actions$)/ },
          (args) =>
            args.importer.includes("business") ||
            args.importer.endsWith("BusinessEventComposer.tsx")
              ? { path: "actions", namespace: "fixture" }
              : undefined,
        );
        b.onResolve(
          {
            filter:
              /^@\/components\/(SpainAddressAutocomplete|OfficialEventLocationPicker|ClaimVenuePicker)$/,
          },
          (args) => ({
            path: args.path.split("/").at(-1),
            namespace: "fixture",
          }),
        );
        b.onResolve({ filter: /BusinessTeamRefresh$/ }, () => ({
          path: "refresh",
          namespace: "fixture",
        }));
        b.onResolve({ filter: /^next\/(link|navigation|image)$/ }, (args) => ({
          path: args.path,
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
          loader: "jsx",
          resolveDir: process.cwd(),
          contents:
            args.path === "auth"
              ? auth
              : args.path === "flags"
                ? "export async function loadFeatureFlags(){return {promotion_requests:true}}"
                : args.path === "actions"
                  ? names
                      .map(
                        (name) =>
                          `export async function ${name}(data){window.__fixtureActions.push('${name}');throw Error('Fixture actions deliberately disabled')}`,
                      )
                      .join("\n")
                  : args.path === "refresh"
                    ? "export function BusinessTeamRefresh(){return null}"
                    : args.path.startsWith("next/")
                      ? args.path.endsWith("navigation")
                        ? "export function notFound(){throw Error('not-found')}export function usePathname(){return location.pathname}export function useSearchParams(){return new URLSearchParams(location.search)}export function useRouter(){return {push(href){location.assign(href)},replace(href){location.replace(href)},refresh(){location.reload()}}}"
                        : args.path.endsWith("image")
                          ? "import React from'react';export default function Image({fill,priority,...props}){return <img {...props}/>}"
                          : "import React from'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}"
                      : `import React from'react';export function ${args.path}(){return <label>Disposable location adapter<input name='fixture-location'/></label>}`,
        }));
      },
    },
  ],
});
const js = built.outputFiles.find((file) => file.path.endsWith(".js")).text;
const rootCss = [
  ...readFileSync("src/app/layout.tsx", "utf8").matchAll(
    /import\s+["'](\.\/[^"']+\.css)["'];/g,
  ),
].map((match) => resolve("src/app", match[1]));
const css = (
  await postcss([tailwind()]).process(
    rootCss.map((file) => readFileSync(file, "utf8")).join("\n") +
      "\n" +
      built.outputFiles
        .filter((file) => file.path.endsWith(".css"))
        .map((file) => file.text)
        .join("\n"),
    { from: resolve("src/app/globals.css") },
  )
).css;
writeFileSync(resolve(dir, "bundle.js"), js);
writeFileSync(resolve(dir, "styles.css"), css);
const server = createServer((request, response) => {
  if (request.method !== "GET") {
    response.writeHead(405);
    response.end();
    return;
  }
  const path = new URL(request.url, "http://127.0.0.1").pathname;
  if (path === "/bundle.js" || path === "/styles.css") {
    response.setHeader(
      "Content-Type",
      path.endsWith(".js") ? "application/javascript" : "text/css",
    );
    response.end(path.endsWith(".js") ? js : css);
  } else if (path.startsWith("/assets/") || path.startsWith("/brand/")) {
    const file = resolve("public", `.${path}`);
    if (existsSync(file)) {
      const types = {
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".webp": "image/webp",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".woff2": "font/woff2",
        ".woff": "font/woff",
      };
      response.setHeader(
        "Content-Type",
        types[extname(file)] || "application/octet-stream",
      );
      response.end(readFileSync(file));
    } else {
      response.writeHead(404);
      response.end();
    }
  } else if (path === "/fixture.jpg") {
    response.setHeader("Content-Type", "image/svg+xml");
    response.end(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#314058"/></svg>',
    );
  } else {
    response.setHeader("Content-Type", "text/html");
    response.end(
      '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const cases = [],
  external = [],
  pageErrors = [];
const scenarios = [
  ["loyalty_programs", "loyalty", "loyalty"],
  ["reward_redemptions", "loyalty", "redemptions"],
  ["managed-events", "events", "events"],
  ["categories", "events", "event-options"],
  ["profiles", "venues", "editorial"],
  ["venues", "venues", "editorial"],
  ["promotion_requests", "growth", "promotions"],
  ["venue_claims", "claims", "claims"],
  ["venue_members", "venues", "membership"],
  ["", "loyalty", "empty"],
];
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : {}),
  });
  const smoke = process.env.BUSINESS_READ_SMOKE === "1";
  for (const locale of smoke ? ["en"] : ["en", "es"])
    for (const theme of smoke ? ["light"] : ["light", "dark"])
      for (const width of smoke ? [360] : [360, 390, 820, 1440]) {
        const es = locale === "es";
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          hasTouch: width <= 820,
          reducedMotion: "reduce",
          colorScheme: theme,
        });
        await context.addInitScript(
          (value) => localStorage.setItem("business-read-theme", value),
          theme,
        );
        await context.route("**/*", (route) => {
          if (new URL(route.request().url()).origin !== origin) {
            external.push(route.request().url());
            return route.abort();
          }
          return route.continue();
        });
        const page = await context.newPage();
        page.on("pageerror", (error) => pageErrors.push(error.message));
        for (const [failure, view, key] of scenarios.filter(
          ([failure]) =>
            process.env.BUSINESS_READ_HANDOVER_ONLY !== "1" ||
            failure === "loyalty_programs",
        )) {
          const query = new URLSearchParams({
            view,
            fixtureFailed: failure,
            fixtureStaff: ["profiles", "venues"].includes(failure) ? "1" : "0",
            ...(key === "empty" ? { fixtureEmpty: "1" } : {}),
            ...(failure === "categories" ? { compose: "1" } : {}),
          });
          await page.goto(`${origin}/${locale}/business?${query}`);
          await page.waitForFunction(
            () => window.__fixtureReady || window.__fixtureError,
          );
          expect(
            await page.evaluate(() => window.__fixtureError),
          ).toBeUndefined();
          const loadedImages = await page.evaluate(async () => {
            const rendered = (element) => {
              const bounds = element.getBoundingClientRect();
              return (
                bounds.width > 0 &&
                bounds.height > 0 &&
                getComputedStyle(element).visibility !== "hidden"
              );
            };
            const sources = [...document.images]
              .filter(rendered)
              .map((image) => image.currentSrc || image.src);
            for (const image of document.querySelectorAll("svg image"))
              if (rendered(image))
                sources.push(
                  new URL(image.getAttribute("href"), location.href).href,
                );
            return Promise.all(
              [...new Set(sources)].map(async (src) => {
                if (new URL(src).origin !== location.origin)
                  throw Error(`Nonlocal fixture image: ${src}`);
                const image = new Image();
                image.src = src;
                await image.decode();
                if (!image.naturalWidth || !image.naturalHeight)
                  throw Error(`Fixture image failed to load: ${src}`);
                return {
                  src: new URL(src).pathname,
                  width: image.naturalWidth,
                  height: image.naturalHeight,
                };
              }),
            );
          });
          if (width === 1440)
            expect(
              loadedImages.some(
                (image) => image.src === "/brand/pasa-2026-traced.svg",
              ),
            ).toBe(true);
          const alert = page.locator(`[data-business-read-error="${key}"]`);
          if (key !== "empty") await expect(alert).toBeVisible();
          else
            await expect(
              page.locator("[data-business-read-error]"),
            ).toHaveCount(0);
          if (["profiles", "venues"].includes(failure))
            await expect(
              page.locator('article[data-product="venue"]'),
            ).toHaveCount(1);
          if (failure === "loyalty_programs") {
            await expect(
              page.getByRole("button", {
                name: es ? "Guardar programa" : "Save programme",
                exact: true,
              }),
            ).toHaveCount(0);
            await expect(
              page.getByRole("button", {
                name: es ? "Confirmar entrega" : "Confirm handover",
              }),
            ).toBeVisible();
          }
          let handoverBounds;
          if (failure === "loyalty_programs") {
            handoverBounds = await page
              .getByRole("button", {
                name: es ? "Confirmar entrega" : "Confirm handover",
                exact: true,
              })
              .evaluate((button) => {
                const range = document.createRange();
                range.selectNodeContents(button);
                const text = range.getBoundingClientRect(),
                  bounds = button.getBoundingClientRect(),
                  style = getComputedStyle(button);
                return {
                  width: bounds.width,
                  height: bounds.height,
                  textWidth: text.width,
                  textHeight: text.height,
                  paddingX:
                    parseFloat(style.paddingLeft) +
                    parseFloat(style.paddingRight),
                };
              });
            expect(handoverBounds.width).toBeGreaterThanOrEqual(44);
            expect(handoverBounds.height).toBeGreaterThanOrEqual(44);
            expect(handoverBounds.width).toBeLessThanOrEqual(
              handoverBounds.textWidth + handoverBounds.paddingX + 6,
            );
            expect(handoverBounds.width).toBeGreaterThanOrEqual(
              handoverBounds.textWidth + handoverBounds.paddingX - 2,
            );
          }
          if (["reward_redemptions", ""].includes(failure))
            await expect(
              page.getByRole("button", {
                name: es ? "Guardar programa" : "Save programme",
                exact: true,
              }),
            ).toBeVisible();
          if (failure === "reward_redemptions")
            await expect(
              page.getByRole("button", {
                name: es ? "Confirmar entrega" : "Confirm handover",
              }),
            ).toHaveCount(0);
          if (failure === "managed-events") {
            await expect(page.locator("#create-event")).toBeVisible();
            await page.locator("#create-event summary").click();
            await expect(page.locator("#create-event form")).toBeVisible();
          }
          if (failure === "categories")
            await expect(page.locator("#create-event")).toHaveCount(0);
          if (["profiles", "venues"].includes(failure)) {
            await expect(
              page.getByRole("heading", {
                name: "Disposable venue",
                exact: true,
              }),
            ).toBeVisible();
            await expect(page.getByRole("status")).toContainText(
              es ? "total no disponible" : "total unavailable",
            );
          }
          if (failure === "venue_members")
            await expect(
              page.locator('form:has(input[name="name"])'),
            ).toHaveCount(0);
          if (failure === "promotion_requests") {
            await expect(
              page.getByRole("button", {
                name: es ? "Enviar solicitud" : "Send request",
                exact: true,
              }),
            ).toHaveCount(0);
            await expect(
              page.getByRole("heading", {
                name: es ? "Tu negocio, creciendo" : "Your business, growing",
              }),
            ).toBeVisible();
          }
          if (failure === "venue_claims")
            await expect(page.locator(".akibusiness-claim-form")).toHaveCount(
              0,
            );
          const bounds = await page.evaluate(() => ({
            width: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
          }));
          expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 2);
          const screenshot = resolve(
            dir,
            `${failure || "empty"}-${locale}-${theme}-${width}.png`,
          );
          if (key !== "empty") await alert.scrollIntoViewIfNeeded();
          await page.screenshot({
            path: screenshot,
            fullPage: true,
            animations: "disabled",
          });
          if (key !== "empty") {
            const retry = alert.getByRole("link", {
              name: es ? "Reintentar" : "Retry",
              exact: true,
            });
            if (width <= 390) await retry.tap();
            else {
              await retry.focus();
              await expect(retry).toBeFocused();
              await retry.press("Enter");
            }
            await page.waitForFunction(
              () => window.__fixtureReady || window.__fixtureError,
            );
            await expect(
              page.locator("[data-business-read-error]"),
            ).toHaveCount(0);
            if (["profiles", "venues"].includes(failure))
              await expect(
                page.locator('article[data-product="venue"]'),
              ).toHaveCount(2);
            if (view === "loyalty")
              await expect(
                page.getByRole("button", {
                  name: es ? "Guardar programa" : "Save programme",
                  exact: true,
                }),
              ).toBeVisible();
          }
          expect(await page.evaluate(() => window.__fixtureActions)).toEqual(
            [],
          );
          cases.push({
            failure,
            locale,
            theme,
            width,
            view,
            screenshot,
            retryRecovered: key !== "empty",
            handoverBounds,
            loadedImages,
          });
        }
        await context.close();
      }
  expect(external).toEqual([]);
  expect(pageErrors).toEqual([]);
  const files = [
    "src/app/[locale]/business/page.tsx",
    "src/components/BusinessHome.tsx",
    "src/components/BusinessGrowthOverview.tsx",
    "src/components/PasaSharedSurfaces.css",
    "src/components/BrandLogo.tsx",
    "public/brand/pasa-2026-traced.svg",
    "tests/fixtures/business-home-read-state.ts",
    "scripts/test-business-home-read-browser.mjs",
    ...rootCss,
  ];
  writeFileSync(
    resolve(dir, "evidence.json"),
    JSON.stringify(
      {
        accepted: false,
        fixture: true,
        physicalDeviceTested: false,
        liveAuthRlsActionsTested: false,
        cases,
        external,
        pageErrors,
        files: Object.fromEntries(
          files.map((file) => [
            file,
            createHash("sha256").update(readFileSync(file)).digest("hex"),
          ]),
        ),
        bundleSha256: createHash("sha256").update(js).digest("hex"),
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS ${cases.length} disposable EN/ES responsive independent-read cases`,
  );
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
