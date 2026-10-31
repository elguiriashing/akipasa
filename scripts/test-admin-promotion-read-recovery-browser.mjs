import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
// Actual Master-based Promotions page/AdminLayout/AppShell with faithful
// social_campaign/featured_listing synthetic records, including stale data+errors.
// Mutations and external requests are forbidden. No actual Auth/RLS/private-write,
// provider, physical-device or production-data acceptance is implied.
const out = resolve("test-results/admin-promotion-read-recovery");
mkdirSync(out, { recursive: true });
const auth =
  "const q=new URLSearchParams(location.search),mode=q.get('failure')||'ready',id='00000000-0000-4000-8000-000000000002',venue='00000000-0000-4000-8000-000000000003',event='00000000-0000-4000-8000-000000000004',now='2026-10-31T12:00:00Z';const common={venue_id:venue,event_id:event,state:'new',operator_notes:null,created_at:now,venues:{name:'Synthetic venue'},events:{title_en:'Synthetic public event',title_es:'Evento p\u00fablico sint\u00e9tico'},feature_slots:[]};const records={promotion_requests:[{...common,id:'00000000-0000-4000-8000-000000000005',service:'social_campaign',message:'Synthetic social request'},{...common,id:'00000000-0000-4000-8000-000000000006',service:'featured_listing',message:'Synthetic featured request'}],feature_slots:[{id:'00000000-0000-4000-8000-000000000007',event_id:event,label_en:'Synthetic feature',label_es:'Destacado sint\u00e9tico',starts_at:now,ends_at:'2026-11-01T12:00:00Z'}],events:[{id:event,venue_id:venue,title_en:'Synthetic public event',title_es:'Evento p\u00fablico sint\u00e9tico'}]};export async function requireUser(){return{user:{id},supabase:{from(table){const c={select(){return c},eq(){return c},in(){return c},order(){return c},limit(){return c},maybeSingle(){return Promise.resolve(result())},then(f){return Promise.resolve(result()).then(f)}};function result(){const failed=(mode==='all'&&table in records)||({requests:'promotion_requests',slots:'feature_slots',events:'events'}[mode]===table);window.__fixtureReads.push({table,failed,staleDataReturned:failed});return{data:table==='profiles'?{id,app_role:'administrator'}:mode==='empty'?[]:records[table]||[],error:failed?{message:'Synthetic unavailable with stale data'}:null,count:0}}return c}}}}";
const entry =
  "import React from'react';import{createRoot}from'react-dom/client';import{AppShell}from'./src/components/AppShell';import Layout from'./src/app/[locale]/admin/layout';import Page from'./src/app/[locale]/admin/promotions/page';const locale=window.__fixtureLocale,theme=window.__fixtureTheme;document.documentElement.lang=locale;document.documentElement.dataset.theme=theme;window.__fixtureReads=[];window.__actions=[];(async()=>{try{const props={params:Promise.resolve({locale}),searchParams:Promise.resolve({})};const page=await Page(props),content=await Layout({...props,children:page});createRoot(document.getElementById('root')).render(<AppShell locale={locale} signedIn role='administrator'>{content}</AppShell>);requestAnimationFrame(()=>requestAnimationFrame(()=>window.ready=true))}catch(e){window.failure=String(e.stack);window.ready=true}})();";
const bundle = await build({
  metafile: true,
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  outdir: out,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env":
      '{"AKIPASA_PRESTIGE_ENABLED":"true","AKISUITE_REFERRALS_READY":"true"}',
  },
  plugins: [
    {
      name: "read-only-operations-adapters",
      setup(b) {
        b.onResolve({ filter: /^@\/lib\/(auth|owner-console)$/ }, () => ({
          path: "auth",
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
            path = resolve(process.cwd(), "src", path.split("/src/").at(-1));
          const source = readFileSync(path, "utf8");
          const names = [
            ...source.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g),
          ].map((x) => x[1]);
          return {
            contents: names
              .map(
                (n) =>
                  `export async function ${n}(...args){if('${n}'==='passportAdminAction'&&args[1]?.action==='search'){window.__fixtureReads.push({action:'search'});const s=new URLSearchParams(location.search).get('state');return {data:s==='ready'?[{id:'00000000-0000-4000-8000-000000000002',display_name:'Synthetic member',email:'fixture@example.invalid',test_account:false}]:[],error:s==='error'?'Synthetic read unavailable':null}}window.__actions.push('forbidden');throw new Error('Read-only fixture forbids actions')}`,
              )
              .join("\n"),
            loader: "js",
          };
        });
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
          contents:
            a.path === "auth"
              ? auth
              : a.path === "next/navigation"
                ? `export function usePathname(){return location.pathname}export function useSearchParams(){return new URLSearchParams(location.search)}export function useRouter(){return{refresh(){},push(){}}}export function notFound(){throw new Error('not-found')}export function redirect(href){throw new Error('redirect:'+href)}`
                : `import React from'react';export default function Adapter({children,prefetch,fill,priority,unoptimized,replace,scroll,...p}){return React.createElement('${a.path === "next/image" ? "img" : "a"}',p,children)}`,
          loader: "jsx",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
const globalFiles = [
  ...readFileSync("src/app/layout.tsx", "utf8").matchAll(
    /import\s+["']([^"']+\.css)["'];/g,
  ),
].map(([, p]) =>
  resolve(p.startsWith("@/") ? "src/" + p.slice(2) : "src/app/" + p),
);
const runner = fileURLToPath(import.meta.url);
const sourcePaths = [
  ...new Set([
    "src/app/layout.tsx",
    "package.json",
    "package-lock.json",
    ...globalFiles,
    ...Object.keys(bundle.metafile.inputs).filter(
      (p) => !p.includes(":") && existsSync(p),
    ),
  ]),
];
const snapshot = () =>
  Object.fromEntries(
    sourcePaths.map((p) => [
      p.replace(process.cwd() + "/", ""),
      createHash("sha256").update(readFileSync(p)).digest("hex"),
    ]),
  );
const initialSourceHashes = snapshot();
const runnerSha256 = createHash("sha256")
  .update(readFileSync(runner))
  .digest("hex");
const css = (
  await postcss([tailwind()]).process(
    globalFiles.map((f) => readFileSync(f, "utf8")).join("\n") +
      "\n" +
      bundle.outputFiles
        .filter((f) => f.path.endsWith(".css"))
        .map((f) => f.text)
        .join("\n"),
    { from: resolve("src/app/globals.css") },
  )
).css;
const js = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text;
const server = createServer((req, res) => {
  const p = new URL(req.url, "http://localhost").pathname;
  if (p === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(js);
  } else if (p === "/style.css") {
    res.setHeader("Content-Type", "text/css");
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
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
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
  const origin = "http://127.0.0.1:" + server.address().port;
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const mode of [
        "ready",
        "empty",
        "requests",
        "slots",
        "events",
        "all",
      ]) {
        const width = theme === "dark" ? 390 : 1440,
          c = await browser.newContext({
            viewport: { width, height: width === 390 ? 844 : 1000 },
            reducedMotion: "reduce",
            colorScheme: theme,
            hasTouch: width === 390,
          });
        await c.addInitScript(
          ({ locale, theme }) => {
            window.__fixtureLocale = locale;
            window.__fixtureTheme = theme;
          },
          { locale, theme },
        );
        const page = await c.newPage(),
          errors = [],
          requests = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await c.route("**/*", (route) => {
          const req = route.request(),
            u = new URL(req.url());
          if (u.origin !== origin) return route.abort();
          assert.equal(
            req.method(),
            "GET",
            "Read-only fixture prohibits writes",
          );
          requests.push({
            method: req.method(),
            path: u.pathname,
            search: u.search,
            resourceType: req.resourceType(),
          });
          return route.continue();
        });
        const stem = [locale, theme, width, mode].join("-");
        let failure = null;
        try {
          await page.goto(
            origin + "/" + locale + "/admin/promotions?failure=" + mode,
            { waitUntil: "networkidle" },
          );
          await page.waitForFunction(() => window.ready || window.failure);
          assert.equal(await page.evaluate(() => window.failure || null), null);
          const expected = {
            ready: ["2", "1"],
            empty: ["0", "0"],
            requests: ["—", "1"],
            slots: ["2", "—"],
            events: ["2", "1"],
            all: ["—", "—"],
          }[mode];
          assert.deepEqual(
            await page.locator(".workspace-stat strong").allTextContents(),
            expected,
            "Independent metric unknown/zero distinction",
          );
          const forms = page.locator(".admin-commercial-request-form");
          assert.equal(
            await forms.count(),
            { ready: 2, empty: 0, requests: 0, slots: 2, events: 1, all: 0 }[
              mode
            ],
            "Dependent editor availability",
          );
          assert.equal(
            await page.locator(".workspace-disclosure").count(),
            ["events", "all"].includes(mode) ? 0 : 1,
            "Schedule-feature must require readable events",
          );
          assert.equal(
            await page.locator("[role=alert]").count(),
            { ready: 0, empty: 0, requests: 1, slots: 1, events: 2, all: 3 }[
              mode
            ],
          );
          if (mode === "events") {
            assert.equal(
              await forms.locator("input[name=service]").inputValue(),
              "social_campaign",
              "Healthy ordinary request remains editable",
            );
            assert.equal(
              await forms.locator("input[name=requestId]").inputValue(),
              "00000000-0000-4000-8000-000000000005",
            );
          }
          if (["requests", "all"].includes(mode))
            assert.equal(
              await page.locator(".admin-commercial-request-message").count(),
              0,
              "Stale request records must not leak through failed read",
            );
          if (mode === "slots") {
            assert.equal(
              await page.locator(".admin-commercial-request-message").count(),
              2,
              "Healthy sibling request list retained",
            );
            assert.ok(
              (
                await page.locator(".workspace-stat strong").allTextContents()
              )[0] === "2",
            );
          }
          const reads = await page.evaluate(() => window.__fixtureReads);
          for (const read of reads.filter((x) => x.failed))
            assert.equal(read.staleDataReturned, true);
          assert.deepEqual(await page.evaluate(() => window.__actions), []);
          await page.screenshot({
            path: out + "/" + stem + "-full.png",
            fullPage: true,
          });
          let nativeGetRetry = false;
          if (!["ready", "empty"].includes(mode)) {
            const retry = page.locator("[role=alert] a").first();
            assert.equal(
              await retry.getAttribute("href"),
              "/" + locale + "/admin/promotions",
            );
            await retry.focus();
            await page.keyboard.press("Enter");
            await page.waitForURL(
              (u) =>
                u.pathname === "/" + locale + "/admin/promotions" && !u.search,
            );
            await page.waitForFunction(() => window.ready);
            assert.equal(
              await page.evaluate(() => window.failure || null),
              null,
            );
            assert.deepEqual(
              await page.locator(".workspace-stat strong").allTextContents(),
              ["2", "1"],
              "Retry must perform fresh successful reads",
            );
            assert.equal(await forms.count(), 2);
            assert.equal(await page.locator("[role=alert]").count(), 0);
            assert.ok(
              (await page.evaluate(() => window.__fixtureReads)).every(
                (x) => !x.failed,
              ),
            );
            assert.ok(
              requests.some(
                (x) =>
                  x.resourceType === "document" &&
                  x.path === "/" + locale + "/admin/promotions" &&
                  !x.search &&
                  x.method === "GET",
              ),
            );
            assert.deepEqual(await page.evaluate(() => window.__actions), []);
            nativeGetRetry = true;
            await page.screenshot({
              path: out + "/" + stem + "-recovered.png",
            });
          }
          assert.deepEqual(errors, []);
          assert.ok(
            (await page.evaluate(
              () => document.documentElement.scrollWidth - innerWidth,
            )) <= 0,
            "No horizontal overflow; a reserved vertical scrollbar gutter is valid",
          );
          results.push({
            locale,
            theme,
            width,
            mode,
            expectedCounts: expected,
            syntheticStaleReads: reads,
            nativeGetRetry,
            requests,
            errors,
            failure,
          });
        } catch (e) {
          failure = String(e.stack);
          results.push({
            locale,
            theme,
            width,
            mode,
            failure,
            requests,
            errors,
          });
        }
        await c.close();
        console.log(stem, failure || "PASS");
      }
  const finalSourceHashes = snapshot();
  writeFileSync(
    out + "/results.json",
    JSON.stringify(
      {
        sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        sourceDirty: Boolean(
          execFileSync("git", ["status", "--porcelain"], {
            encoding: "utf8",
          }).trim(),
        ),
        runnerSha256,
        initialSourceHashes,
        finalSourceHashes,
        contexts: results.length,
        nativeGetRecoveries: results.filter((x) => x.nativeGetRetry).length,
        qualification:
          "Actual candidate AppShell/AdminLayout/Promotions page with faithful social_campaign/featured_listing synthetic read adapters. Stale data accompanies failed reads. Forbidden actions, no real Auth/RLS/private writes/provider/device proof.",
        results,
      },
      null,
      2,
    ),
  );
  assert.deepEqual(finalSourceHashes, initialSourceHashes);
  assert.equal(results.length, 24);
  assert.equal(results.filter((x) => x.nativeGetRetry).length, 16);
  for (const r of results) assert.equal(r.failure, null, JSON.stringify(r));
  console.log(
    "Promotions targeted read recovery:24 contexts and16 native GET recoveries PASS.",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
