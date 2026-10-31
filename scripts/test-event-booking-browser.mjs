import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Real event server component + shared client wizard. Only auth/database reads,
// Next navigation and mutation transport use disposable in-process fixtures.
const directory = resolve(
  process.env.AKIPASA_EVENT_BOOKING_EVIDENCE_DIR ||
    "test-results/event-booking-browser",
);
mkdirSync(directory, { recursive: true });
const entry = `import React from 'react';import{createRoot}from'react-dom/client';import Page from './src/app/[locale]/events/[slug]/book/page';
const q=new URLSearchParams(location.search),locale=q.get('locale')||'en';
(async()=>{try{const content=await Page({params:Promise.resolve({locale,slug:'local-concert'}),searchParams:Promise.resolve({occurrence:'selected-occurrence',...(q.get('state')==='requested'?{requested:'1'}:{})})});createRoot(document.getElementById('root')).render(<div className="app-shell"><aside className="app-rail" aria-hidden="true"/><div className="app-content" data-pasa-surface="booking">{content}</div></div>);requestAnimationFrame(()=>requestAnimationFrame(()=>window.__eventBookingReady=true));}catch(e){window.__eventBookingError=String(e.stack||e)}})();`;
const authFixture = `
const q=new URLSearchParams(location.search),mode=q.get('state')||'ready';
const settings={mode:mode==='external'?'external':'request',active:mode!=='inactive',requires_deposit:true,deposit_cents:1200,instructions_es:'Llega diez minutos antes.',instructions_en:'Arrive ten minutes early.'};
const event={id:'30000000-0000-4000-8000-000000000001',venue_id:'30000000-0000-4000-8000-000000000004',title_es:'Concierto local de prueba',title_en:'Fixture local concert',event_occurrences:[{id:'selected-occurrence'}],venues:{name:'Fixture local venue',venue_booking_settings:settings}};
const slots=[{id:'30000000-0000-4000-8000-000000000002',starts_at:'2099-07-03T18:00:00Z',ends_at:'2099-07-03T19:00:00Z',capacity:50,remaining:2,offering_id:'30000000-0000-4000-8000-000000000005',offering_name:'Fixture activity',resource_name:'Terrace'},{id:'30000000-0000-4000-8000-000000000006',starts_at:'2099-07-03T19:00:00Z',ends_at:'2099-07-03T20:00:00Z',capacity:50,remaining:0,offering_id:null,offering_name:null,resource_name:'Main room'}];
export async function requireUser(locale,next){window.__eventBookingAuth={locale,next};window.__eventBookingReads=[];return{user:{id:'own-disposable-profile',email:'account@example.test'},supabase:{from(table){const result=()=>table==='events'?{data:mode==='metadata-error'?null:event,error:mode==='metadata-error'?{message:'Private fixture error'}:null}:{data:{display_name:'Fixture Guest',public_email:'guest@example.test',phone:'600000000'},error:null};const query={select:()=>query,eq:()=>query,maybeSingle:async()=>result()};return query},async rpc(name,args){window.__eventBookingReads.push({name,args});return{data:mode==='empty'?[]:mode==='full'?slots.map(s=>({...s,remaining:0})):slots,error:mode==='availability-error'?{message:'Private fixture error'}:null}}}}};
`;
const output = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  outdir: "/tmp/akipasa-event-booking-browser-assets",
  loader: { ".css": "local-css" },
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "event-booking-disposable-boundaries",
      setup(builder) {
        builder.onResolve({ filter: /^@\/lib\/(auth|config)$/ }, (args) => ({
          path: args.path,
          namespace: "event-fixture",
        }));
        builder.onResolve({ filter: /^next\/(link|navigation)$/ }, (args) => ({
          path: args.path,
          namespace: "event-fixture",
        }));
        builder.onResolve({ filter: /^\.\/actions$/ }, (args) =>
          args.importer.endsWith("/events/[slug]/book/page.tsx")
            ? { path: "actions", namespace: "event-fixture" }
            : undefined,
        );
        builder.onLoad(
          { filter: /.*/, namespace: "event-fixture" },
          (args) => ({
            contents:
              args.path === "@/lib/auth"
                ? authFixture
                : args.path === "@/lib/config"
                  ? `export const isLocale=v=>v==='en'||v==='es';`
                  : args.path === "next/navigation"
                    ? `export function notFound(){throw Error('not-found')}`
                    : args.path === "next/link"
                      ? `import React from 'react';export default function Link(props){return <a {...props}/>}`
                      : `export async function requestEventBooking(data){window.__eventBookingSubmitCount=(window.__eventBookingSubmitCount||0)+1;window.__eventBookingSubmitted=Object.fromEntries(data);return new Promise(resolve=>window.__releaseBookingSubmit=()=>resolve({error:location.search.includes('locale=es')?'Prueba: disponibilidad actualizada':'Fixture: availability changed',remaining:1}));}`,
            loader: "jsx",
            resolveDir: process.cwd(),
          }),
        );
      },
    },
  ],
});
const cssFiles = [
  "src/app/globals.css",
  "src/app/compact-app.css",
  "src/app/brand.css",
  "src/app/appearance.css",
  "src/app/tablet-responsive.css",
  "src/app/portal-unity.css",
  "src/components/PasaCinematic.css",
  "src/components/PasaSharedSurfaces.css",
];
const css =
  (
    await postcss([tailwind()]).process(
      cssFiles.map((path) => readFileSync(path, "utf8")).join("\n"),
      { from: resolve("src/app/globals.css") },
    )
  ).css +
  output.outputFiles
    .filter((file) => file.path.endsWith(".css"))
    .map((file) => file.text)
    .join("\n");
const javascript = output.outputFiles.find((file) =>
  file.path.endsWith(".js"),
).text;
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(javascript);
  } else if (req.url === "/styles.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else {
    const url = new URL(req.url, "http://localhost"),
      locale = url.searchParams.get("locale") === "es" ? "es" : "en",
      theme = url.searchParams.get("theme") === "light" ? "light" : "dark";
    res.setHeader("Content-Type", "text/html");
    res.end(
      `<!doctype html><html lang="${locale}" data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`,
    );
  }
});
await new Promise((done, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", done);
});
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BOOKING_BROWSER_PATH
    ? { executablePath: process.env.BOOKING_BROWSER_PATH }
    : {}),
});
const results = [];
let activePage = null;
const sourceFiles = [
  "src/app/[locale]/events/[slug]/book/page.tsx",
  "src/app/[locale]/events/[slug]/book/actions.ts",
  "src/app/[locale]/events/[slug]/book/consumer-action.module.css",
  "src/components/BookingWizard.tsx",
  "scripts/test-event-booking-browser.mjs",
  ...cssFiles,
];
const hashes = Object.fromEntries(
  sourceFiles.map((path) => [
    path,
    createHash("sha256").update(readFileSync(path)).digest("hex"),
  ]),
);
try {
  for (const locale of ["en", "es"])
    for (const width of [360, 390, 820, 1440])
      for (const theme of ["dark", "light"]) {
        const page = await browser.newPage({
          viewport: { width, height: 1000 },
          hasTouch: width < 500,
          isMobile: width < 500,
          reducedMotion: width === 390 ? "reduce" : "no-preference",
          ...(width === 390
            ? {
                userAgent:
                  "Mozilla/5.0 (Linux; Android 14; WebView emulation) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36",
              }
            : {}),
        });
        activePage = page;
        const errors = [],
          external = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.route("**/*", (route) => {
          const url = new URL(route.request().url());
          if (
            url.origin !== origin &&
            !["data:", "blob:"].includes(url.protocol)
          ) {
            external.push(url.href);
            return route.abort();
          }
          if (route.request().method() !== "GET")
            throw Error("Unexpected network mutation");
          return route.continue();
        });
        const goto = async (state) => {
          await page.goto(
            `${origin}/?locale=${locale}&theme=${theme}&state=${state}`,
          );
          await page.waitForFunction(
            () => window.__eventBookingReady || window.__eventBookingError,
          );
          expect(
            await page.evaluate(() => window.__eventBookingError || null),
          ).toBeNull();
        };
        const capture = async (state) => {
          await page.evaluate(async () => {
            const animations = document
              .getAnimations()
              .filter((animation) =>
                Number.isFinite(animation.effect?.getComputedTiming().endTime),
              );
            await Promise.all(
              animations.map((animation) => animation.finished),
            );
          });
          await expect(page.locator("main")).toHaveCSS("opacity", "1");
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          ).toBe(true);
          const name = `${locale}-${width}-${theme}-${state}.png`;
          await page.screenshot({
            path: resolve(directory, name),
            fullPage: true,
          });
          results.push({
            locale,
            width,
            theme,
            state,
            screenshot: name,
            sha256: createHash("sha256")
              .update(readFileSync(resolve(directory, name)))
              .digest("hex"),
          });
        };
        await goto("ready");
        await expect(
          page.getByRole("button", { name: /0 (places left|plazas libres)/ }),
        ).toBeDisabled();
        await expect(page.locator(".booking-wizard")).toContainText(
          locale === "es" ? "2 plazas libres" : "2 places left",
        );
        await capture("dates");
        const next = () =>
          page.getByRole("button", {
            name: locale === "es" ? /Continuar/ : /Continue/,
          });
        await next().focus();
        await page.keyboard.press("Enter");
        await page
          .getByRole("button", {
            name: locale === "es" ? "Añadir persona" : "Add guest",
          })
          .click();
        await expect(
          page.getByRole("button", {
            name: locale === "es" ? "Añadir persona" : "Add guest",
          }),
        ).toBeDisabled();
        await capture("guests");
        await next().click();
        await expect(
          page.getByLabel(locale === "es" ? "Nombre" : "Name", { exact: true }),
        ).toHaveValue("Fixture Guest");
        await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
          "guest@example.test",
        );
        const key = await page.locator("input[name=requestKey]").inputValue();
        expect(key).toMatch(/^[a-f0-9-]{36}$/);
        await capture("contact");
        await page
          .getByRole("button", {
            name: locale === "es" ? "Solicitar reserva" : "Request booking",
          })
          .click();
        await expect(
          page.getByRole("button", {
            name: locale === "es" ? "Enviando..." : "Submitting...",
          }),
        ).toBeDisabled();
        await capture("submitting");
        await page
          .getByRole("button", {
            name: locale === "es" ? "Enviando..." : "Submitting...",
          })
          .evaluate((button) => {
            button.click();
            button.click();
          });
        expect(
          await page.evaluate(() => window.__eventBookingSubmitCount),
        ).toBe(1);
        expect(
          await page.evaluate(() => window.__eventBookingSubmitted),
        ).toMatchObject({
          eventId: "30000000-0000-4000-8000-000000000001",
          occurrence: "selected-occurrence",
          venueId: "30000000-0000-4000-8000-000000000004",
          partySize: "2",
          requestKey: key,
          contactName: "Fixture Guest",
        });
        await page.evaluate(() => window.__releaseBookingSubmit());
        await expect(page.getByRole("alert")).toContainText(
          locale === "es" ? "actualizada" : "changed",
        );
        await expect(page.locator(".booking-wizard")).toContainText(
          locale === "es" ? "1 plaza libre" : "1 place left",
        );
        await capture("submit-error");
        await next().click();
        await next().click();
        await expect(
          page.getByLabel(locale === "es" ? "Nombre" : "Name", { exact: true }),
        ).toHaveValue("Fixture Guest");
        await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
          "guest@example.test",
        );
        await expect(page.locator("input[name=requestKey]")).toHaveValue(key);
        await expect(page.locator("input[name=eventId]")).toHaveValue(
          "30000000-0000-4000-8000-000000000001",
        );
        await expect(page.locator("input[name=occurrence]")).toHaveValue(
          "selected-occurrence",
        );
        await capture("retry-contact");
        for (const state of [
          "empty",
          "full",
          "availability-error",
          "metadata-error",
          "external",
          "inactive",
          "requested",
        ]) {
          await goto(state);
          if (["availability-error", "metadata-error"].includes(state)) {
            await expect(page.getByRole("alert")).toBeVisible();
            await expect(
              page.getByRole("link", {
                name: locale === "es" ? "Reintentar" : "Retry",
              }),
            ).toHaveAttribute(
              "href",
              `/${locale}/events/local-concert/book?occurrence=selected-occurrence`,
            );
            await expect(page.locator(".booking-wizard")).toHaveCount(0);
          } else if (state === "empty" || state === "full") {
            await expect(
              page.getByRole("heading", {
                name:
                  state === "empty"
                    ? locale === "es"
                      ? "No hay horarios disponibles"
                      : "No available dates"
                    : locale === "es"
                      ? "No quedan plazas disponibles"
                      : "No places available",
              }),
            ).toBeVisible();
            await expect(page.locator("form")).toHaveCount(0);
          } else if (state === "external" || state === "inactive") {
            expect(
              await page.evaluate(() => window.__eventBookingReads.length),
            ).toBe(0);
            await expect(page.locator(".booking-wizard")).toHaveCount(0);
          } else
            await expect(page.getByRole("status")).toContainText(
              locale === "es" ? "Consulta tu solicitud" : "Check your request",
            );
          await capture(state);
        }
        expect(errors).toEqual([]);
        expect(external).toEqual([]);
        await page.close();
      }
  const receipt = {
    timestamp: new Date().toISOString(),
    scope:
      "Real event booking page and shared wizard; disposable auth/database/action adapters. No production data or network mutations. Android is emulation only.",
    sourceHashes: hashes,
    compiledCssSha256: createHash("sha256").update(css).digest("hex"),
    compiledBundleSha256: createHash("sha256").update(javascript).digest("hex"),
    browser: browser.version(),
    results,
  };
  writeFileSync(
    resolve(directory, "results.json"),
    JSON.stringify(receipt, null, 2),
  );
  console.log(`${results.length} actual event-booking browser states passed`);
} catch (error) {
  const stamp = Date.now();
  if (activePage && !activePage.isClosed())
    await activePage
      .screenshot({
        path: resolve(directory, `failure-${stamp}.png`),
        fullPage: true,
      })
      .catch(() => {});
  writeFileSync(
    resolve(directory, `failure-${stamp}.json`),
    JSON.stringify(
      {
        status: "failed",
        timestamp: new Date().toISOString(),
        message: String(error.stack || error),
        sourceHashes: hashes,
        completed: results,
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
