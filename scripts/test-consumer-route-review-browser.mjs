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
  process.env.CONSUMER_REVIEW_EVIDENCE_DIR ||
    "test-results/consumer-route-review",
);
mkdirSync(out, { recursive: true });
const token = "91000000-0000-4000-8000-000000000001";
const globals = [
  ...readFileSync("src/app/layout.tsx", "utf8").matchAll(
    /import\s+["'](\.\/[^"']+\.css)["'];/g,
  ),
].map((m) => resolve("src/app", m[1]));
const adapter = `
const q=new URLSearchParams(location.search), state=q.get('state')||'ready';
const settings={mode:'request',active:true,external_url:null,instructions_es:'Llega diez minutos antes.',instructions_en:'Arrive ten minutes early.',requires_deposit:true,deposit_cents:1200};
const venue={id:'91000000-0000-4000-8000-000000000002',name:'Synthetic venue / Local de prueba',slug:'synthetic-venue',venue_booking_settings:settings};
const slot={id:'91000000-0000-4000-8000-000000000003',starts_at:'2099-11-01T18:00:00Z',ends_at:'2099-11-01T19:00:00Z',capacity:50,remaining:2,offering_id:null,offering_name:null,resource_name:'Synthetic room'};
const supabase={from(table){window.fixtureReads.push({table});if(!['venues','profiles'].includes(table))throw Error('Forbidden private table '+table);const result=()=>table==='venues'?{data:state==='missing'?null:venue,error:state==='metadata-error'?{message:'PRIVATE BACKEND DIAGNOSTIC'}:null}:{data:{display_name:'Synthetic Guest',public_email:'guest@example.test',phone:'600000000'},error:null};const chain={select:()=>chain,eq:()=>chain,maybeSingle:async()=>result()};return chain},rpc(name,args){window.fixtureReads.push({name,args});if(name==='checkin_venue_preview')return{maybeSingle:async()=>({data:state==='missing'?null:{venue_id:venue.id,venue_name:state==='error'?'PRIVATE STALE VENUE':venue.name},error:state==='error'?{code:'PGRST202',message:'PRIVATE BACKEND DIAGNOSTIC'}:null})};if(name==='booking_available_slots')return Promise.resolve({data:state==='empty'?[]:[slot,{...slot,id:'91000000-0000-4000-8000-000000000004',starts_at:'2099-11-01T19:00:00Z',ends_at:'2099-11-01T20:00:00Z',remaining:0}],error:state==='error'?{message:'PRIVATE BACKEND DIAGNOSTIC'}:null});throw Error('Forbidden RPC '+name)}};
const user={id:'91000000-0000-4000-8000-000000000099',email:'account@example.test'};
export async function requireUser(locale,next){window.fixtureAuth.push({locale,next});return{supabase,user}}
export async function optionalUser(){return{supabase,user}}
`;
const entry = `
import React from'react';import{createRoot}from'react-dom/client';import{AppShell}from'./src/components/AppShell';
import Token from'./src/app/[locale]/check-in/[token]/page';import Venue from'./src/app/[locale]/venues/[slug]/book/page';
const q=new URLSearchParams(location.search), locale=q.get('locale')||location.pathname.split('/')[1]||'en', kind=location.pathname.includes('/check-in/')?'token':'venue';
if(q.get('theme'))localStorage.setItem('consumer-review-theme',q.get('theme'));document.documentElement.lang=locale;document.documentElement.dataset.theme=q.get('theme')||localStorage.getItem('consumer-review-theme')||'dark';window.fixtureReads=[];window.fixtureAuth=[];window.fixtureActions=[];
(async()=>{try{const content=await(kind==='token'?Token:Venue)({params:Promise.resolve({locale,token:'${token}',slug:'synthetic-venue'}),searchParams:Promise.resolve({})});createRoot(document.getElementById('root')).render(<AppShell locale={locale} signedIn={true} role='consumer'><p data-fixture-notice style={{padding:12,color:'#ffb27b',background:'#15100c'}}>DISPOSABLE REVIEW: synthetic identity/data; actions forbidden.</p>{content}</AppShell>);requestAnimationFrame(()=>requestAnimationFrame(()=>window.fixtureReady=true))}catch(e){if(e.kind==='not-found'){window.fixtureMissing=true;createRoot(document.getElementById('root')).render(<p>Actual page returned notFound; this notice is not the Next404layout.</p>);window.fixtureReady=true}else window.fixtureFailure=String(e.stack||e)}})();
`;
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
            a.path === "auth"
              ? adapter
              : a.path === "flags"
                ? `export async function loadFeatureFlags(){return{loyalty_check_ins:new URLSearchParams(location.search).get('state')!=='paused'}}`
                : a.path === "crypto"
                  ? `const crypto={randomUUID:()=>globalThis.crypto.randomUUID()};export default crypto;export const randomUUID=crypto.randomUUID;`
                  : a.path === "next/navigation"
                    ? `export function usePathname(){return location.pathname}export function useSearchParams(){return new URLSearchParams(location.search)}export function useRouter(){return{refresh(){location.reload()},push(p){location.href=p}}}export function notFound(){throw Object.assign(new Error('not-found'),{kind:'not-found'})}export function redirect(href){throw new Error('redirect:'+href)}`
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
    "src/app/[locale]/check-in/[token]/actions.ts",
    "src/app/[locale]/venues/[slug]/book/actions.ts",
    "package-lock.json",
    "scripts/test-consumer-route-review-browser.mjs",
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
          "Actual token/Venue booking page exports and AppShell with synthetic auth/reads/GPS; actions forbidden. Not actual Next, real Auth/RLS/provider/XP/payment/device proof.",
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
  });
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const width of [360, 820, 1440]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          colorScheme: theme,
          reducedMotion: "reduce",
        });
        await context.addInitScript(() => {
          window.fixtureGeo = [];
          Object.defineProperty(navigator, "geolocation", {
            configurable: true,
            value: {
              getCurrentPosition(success, error) {
                window.fixtureGeo.push({ success, error });
              },
            },
          });
        });
        await context.route("**/*", (r) => {
          const u = new URL(r.request().url());
          if (u.origin !== origin || r.request().method() !== "GET") {
            violations.push({
              url: u.origin + u.pathname,
              method: r.request().method(),
            });
            return r.abort();
          }
          return r.continue();
        });
        const page = await context.newPage();
        page.on("pageerror", (e) => failures.push(e.message));
        const paths = {
          token: `/${locale}/check-in/${token}`,
          venue: `/${locale}/venues/synthetic-venue/book`,
        };
        const ready = async () => {
          await page.waitForFunction(
            () => window.fixtureReady || window.fixtureFailure,
          );
          expect(
            await page.evaluate(() => window.fixtureFailure || null),
          ).toBeNull();
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
        };
        const go = async (kind, state) => {
          await page.goto(
            `${origin}${paths[kind]}?locale=${locale}&theme=${theme}&state=${state}`,
          );
          await ready();
        };
        const nativeReach = async (locator) => {
          await locator.scrollIntoViewIfNeeded();
          await locator.focus();
          await expect(locator).toBeFocused();
          const points = await locator.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return [r.left + 2, r.left + r.width / 2, r.right - 2].map((x) => {
              const hit = document.elementFromPoint(x, r.top + r.height / 2);
              return hit === el || el.contains(hit);
            });
          });
          expect(points.every(Boolean)).toBe(true);
          return points;
        };
        const capture = async (kind, state, extra = {}) => {
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          );
          expect(overflow).toBeLessThanOrEqual(1);
          expect(await page.evaluate(() => window.fixtureActions)).toEqual([]);
          expect(await page.locator("body").innerText()).not.toContain(
            "PRIVATE BACKEND DIAGNOSTIC",
          );
          const file = `${kind}-${locale}-${theme}-${width}-${state}.png`;
          await page.screenshot({ path: resolve(out, file), fullPage: true });
          results.push({
            kind,
            locale,
            theme,
            width,
            state,
            overflow,
            image: file,
            imageSha256: createHash("sha256")
              .update(readFileSync(resolve(out, file)))
              .digest("hex"),
            auth: await page.evaluate(() => window.fixtureAuth),
            reads: await page.evaluate(() => window.fixtureReads),
            actions: await page.evaluate(() => window.fixtureActions),
            ...extra,
          });
          persist();
        };
        await go("token", "ready");
        await expect(page.getByRole("heading", { level: 1 })).toContainText(
          "Synthetic venue",
        );
        const confirm = page.getByRole("button", {
            name: locale === "es" ? "Confirmar check-in" : "Confirm check-in",
          }),
          locate = page.getByRole("button", {
            name:
              locale === "es" ? "Obtener ubicación" : "Get current location",
          });
        await expect(confirm).toBeDisabled();
        await capture("token", "ready");
        await nativeReach(locate);
        await page.keyboard.press("Enter");
        await expect(confirm).toBeDisabled();
        await page.evaluate(() =>
          window.fixtureGeo[0].success({
            coords: { latitude: 36.54, longitude: -4.63, accuracy: 10 },
          }),
        );
        await expect(confirm).toBeEnabled();
        await capture("token", "location-received", {
          nativeHitPoints: await nativeReach(confirm),
        });
        await locate.click();
        await expect(confirm).toBeDisabled();
        await page.evaluate(() => {
          window.fixtureGeo[1].error({ code: 1 });
          window.fixtureGeo[0].success({
            coords: { latitude: 36.54, longitude: -4.63, accuracy: 10 },
          });
        });
        await expect(confirm).toBeDisabled();
        await capture("token", "denied-stale-fix-rejected");
        await go("token", "error");
        await expect(page.getByRole("heading", { level: 1 })).toContainText(
          locale === "es" ? "No se puede cargar" : "unavailable",
        );
        await expect(page.locator("body")).not.toContainText(
          "PRIVATE STALE VENUE",
        );
        await expect(
          page.getByRole("button", {
            name: locale === "es" ? "Confirmar check-in" : "Confirm check-in",
          }),
        ).toHaveCount(0);
        await capture("token", "error");
        const retry = page.getByRole("link", {
          name: locale === "es" ? "Reintentar" : "Retry",
          exact: true,
        });
        await expect(retry).toHaveAttribute("href", paths.token);
        const retryPoints = await nativeReach(retry);
        await Promise.all([
          page.waitForNavigation(),
          page.keyboard.press("Enter"),
        ]);
        await ready();
        await expect(page.getByRole("heading", { level: 1 })).toContainText(
          "Synthetic venue",
        );
        await capture("token", "retry-recovered", {
          nativeGetRetry: true,
          nativeHitPoints: retryPoints,
        });
        await go("token", "paused");
        await expect(page.locator("body")).toContainText(
          locale === "es"
            ? "No se ha registrado ninguna visita"
            : "No visit has been recorded",
        );
        await expect(
          page.getByRole("button", {
            name: locale === "es" ? "Confirmar check-in" : "Confirm check-in",
          }),
        ).toHaveCount(0);
        await capture("token", "paused");
        await go("token", "missing");
        expect(await page.evaluate(() => window.fixtureMissing)).toBe(true);
        results.push({
          kind: "token",
          locale,
          theme,
          width,
          state: "missing",
          actualPageNotFound: true,
          notActualNext404: true,
        });
        await go("venue", "ready");
        await expect(page.locator(".booking-wizard")).toBeVisible();
        await capture("venue", "dates");
        const next = page.getByRole("button", {
          name: locale === "es" ? /Continuar/ : /Continue/,
        });
        await nativeReach(next);
        await page.keyboard.press("Enter");
        await page
          .getByRole("button", {
            name: locale === "es" ? "Añadir persona" : "Add guest",
          })
          .click();
        await nativeReach(next);
        await page.keyboard.press("Enter");
        await capture("venue", "contact");
        const submit = page.getByRole("button", {
          name: locale === "es" ? "Solicitar reserva" : "Request booking",
          exact: true,
        });
        await nativeReach(submit);
        await capture("venue", "contact-focused", {
          nativeHitPoints: await nativeReach(submit),
        });
        await go("venue", "error");
        await expect(page.getByRole("alert")).toBeVisible();
        await expect(page.locator(".booking-wizard")).toHaveCount(0);
        await capture("venue", "availability-error");
        const vr = page.getByRole("link", {
          name: locale === "es" ? "Reintentar" : "Retry",
          exact: true,
        });
        await expect(vr).toHaveAttribute("href", paths.venue);
        await nativeReach(vr);
        await Promise.all([
          page.waitForNavigation(),
          page.keyboard.press("Enter"),
        ]);
        await ready();
        await expect(page.locator(".booking-wizard")).toBeVisible();
        await capture("venue", "retry-recovered", { nativeGetRetry: true });
        await go("venue", "metadata-error");
        await expect(page.getByRole("alert")).toBeVisible();
        await expect(page.locator(".booking-wizard")).toHaveCount(0);
        await capture("venue", "metadata-error");
        await go("venue", "empty");
        await expect(page.locator(".booking-wizard")).toBeVisible();
        await capture("venue", "empty");
        await go("venue", "missing");
        expect(await page.evaluate(() => window.fixtureMissing)).toBe(true);
        results.push({
          kind: "venue",
          locale,
          theme,
          width,
          state: "missing",
          actualPageNotFound: true,
          notActualNext404: true,
        });
        await context.close();
      }
  expect(violations).toEqual([]);
  expect(failures).toEqual([]);
  expect(hashes()).toEqual(initial);
  persist();
  console.log(
    `PASS ${results.length} source-bound token/Venue route cases; no actions or outbound requests.`,
  );
} catch (e) {
  failures.push(String(e.stack || e));
  persist();
  throw e;
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
