import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
// Actual async pages, AdminLayout and AppShell; synthetic read-only identity/data.
// This does not establish production Auth/RLS, mutations or physical-device proof.
const out = resolve("test-results/admin-achievement-palette");
mkdirSync(out, { recursive: true });
const auth = `export async function requireUser(){return{user:{id:'00000000-0000-4000-8000-000000000001'},supabase:{from(table){const data=table==='profiles'?{app_role:'administrator'}:table==='achievements'?[{key:'synthetic_review',title_en:'Synthetic achievement',title_es:'Logro sintético',description_en:'Disposable display fixture',description_es:'Prueba visual desechable',minimum_xp:10,condition_type:'xp',target_count:10,icon:'star',active:true}]:table==='venues'?[{id:'00000000-0000-4000-8000-000000000002',name:'Synthetic venue',address:'Fixture street',venue_achievement_categories:[]}]:[];const result={data,error:null,count:Array.isArray(data)?data.length:0};const query={select(){return query},eq(){return query},order(){return query},range(){return query},ilike(){return query},in(){return query},maybeSingle(){return Promise.resolve(result)},then(done){window.__fixtureReads.push({table});return Promise.resolve(result).then(done)}};return query}}}}`;
const entry = `import React from'react';import{createRoot}from'react-dom/client';import{AppShell}from'./src/components/AppShell';import Layout from'./src/app/[locale]/admin/layout';import Achievements from'./src/app/[locale]/admin/achievements/page';import Venues from'./src/app/[locale]/admin/achievements/venues/page';const q=new URLSearchParams(location.search),locale=q.get('locale'),route=q.get('route');document.documentElement.lang=locale;document.documentElement.dataset.theme=q.get('theme');window.__actions=[];window.__fixtureReads=[];(async()=>{try{const props={params:Promise.resolve({locale}),searchParams:Promise.resolve({})};const page=await(route==='achievements'?Achievements:Venues)(props);const content=await Layout({...props,children:page});createRoot(document.getElementById('root')).render(<AppShell locale={locale} signedIn role='administrator'>{content}</AppShell>);requestAnimationFrame(()=>requestAnimationFrame(()=>window.ready=true))}catch(e){window.failure=String(e.stack);window.ready=true}})();`;
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
                (name) =>
                  `export async function ${name}(){window.__actions.push('${name}');throw new Error('Read-only fixture forbids actions')}`,
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
const sourcePaths = [
  ...new Set([
    "scripts/test-admin-achievement-palette-browser.mjs",
    "src/app/layout.tsx",
    ...globalFiles,
    ...Object.keys(bundle.metafile.inputs).filter((p) => p.startsWith("src/")),
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
  for (const context of ["en", "es"].flatMap((locale) =>
    ["dark", "light"].flatMap((theme) =>
      [390, 820, 1440].map((width) => ({ locale, theme, width })),
    ),
  ))
    for (const route of ["achievements", "achievements/venues"])
      for (const state of ["ready"]) {
        const c = await browser.newContext({
          viewport: {
            width: context.width,
            height: context.width === 390 ? 844 : 900,
          },
          colorScheme: context.theme,
          reducedMotion: "reduce",
        });
        const page = await c.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await c.route("**/*", async (req) => {
          const u = new URL(req.request().url());
          if (u.origin !== origin) return req.abort();
          if (u.pathname.startsWith("/api/")) {
            if (req.request().method() !== "GET")
              throw Error("Mutation forbidden");
            const member = {
              profile_id: "00000000-0000-4000-8000-000000000002",
              display_name: "Synthetic account",
              primary_email: "fixture@example.invalid",
              app_role: "consumer",
              account_status: "active",
              created_at: "2026-10-30T00:00:00Z",
            };
            const rows =
              state === "ready"
                ? [
                    {
                      id: member.profile_id,
                      name: "Synthetic venue",
                      locality: "Málaga",
                      address: "Fixture street",
                      relevance_class: "local",
                      action: "KEEP",
                      slug: "synthetic-venue",
                      confidence: 0.9,
                      reason: "Synthetic read-only relevance proposal",
                      source_categories: [],
                      manual_override: null,
                      chain_name: null,
                      stale: false,
                      suggested_action: "keep",
                      proposed_action: "keep",
                      score: 70,
                      reasons: ["Synthetic review"],
                      fingerprint: "synthetic-only",
                      weight: 1,
                    },
                  ]
                : [];
            return req.fulfill({
              status: state === "error" ? 503 : 200,
              contentType: "application/json",
              body: JSON.stringify(
                state === "error"
                  ? { error: "Synthetic read unavailable" }
                  : {
                      users: state === "ready" ? [member] : [],
                      rows,
                      total: rows.length,
                    },
              ),
            });
          }
          return req.continue();
        });
        const stem =
          context.locale +
          "-" +
          context.theme +
          "-" +
          context.width +
          "-" +
          route.replaceAll("/", "-") +
          "-" +
          state;
        let failure = null;
        try {
          await page.goto(
            origin +
              "/" +
              context.locale +
              "/admin/" +
              route +
              "?" +
              new URLSearchParams({ ...context, route, state }),
            { waitUntil: "networkidle" },
          );
          await page.waitForFunction(() => window.ready || window.failure);
          const summary = page.locator('[class*="venueRow"] summary').first();
          let nativeDisclosure = null;
          if (await summary.count()) {
            await summary.focus();
            await page.keyboard.press("Enter");
            nativeDisclosure = await summary.evaluate(
              (e) => e.closest("details").open,
            );
            if (!nativeDisclosure)
              throw Error("Native venue disclosure did not open");
          }
          const palette = await page.evaluate(() => {
            const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
            const luminance = (c) =>
              c
                .slice(0, 3)
                .map((x) => {
                  x /= 255;
                  return x <= 0.04045
                    ? x / 12.92
                    : ((x + 0.055) / 1.055) ** 2.4;
                })
                .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
            const bg = (e) => {
              let c = parse(getComputedStyle(e).backgroundColor);
              if (c.length === 3) c.push(1);
              if ((c[3] || 0) < 1) {
                const under = e.parentElement
                  ? bg(e.parentElement)
                  : document.documentElement.dataset.theme === "light"
                    ? [255, 255, 255]
                    : [0, 0, 0];
                return c
                  .slice(0, 3)
                  .map(
                    (v, i) => v * (c[3] || 0) + under[i] * (1 - (c[3] || 0)),
                  );
              }
              return c.slice(0, 3);
            };
            return [
              ...document.querySelectorAll(
                '[class*="toolbar"] select,[class*="venueRow"] summary,[class*="venueRow"] summary small',
              ),
            ]
              .filter((e) => e.checkVisibility())
              .map((e) => {
                const fg = parse(getComputedStyle(e).color),
                  back = bg(e),
                  a = luminance(fg),
                  b = luminance(back),
                  rect = e.getBoundingClientRect();
                return {
                  tag: e.tagName,
                  text: e.textContent,
                  foreground: fg,
                  background: back,
                  contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
                  height: rect.height,
                };
              });
          });
          if (!palette.length) throw Error("No affected native controls found");
          if (palette.some((x) => x.contrast < 4.5))
            throw Error(
              "Affected control contrast below4.5: " + JSON.stringify(palette),
            );
          await page.screenshot({ path: out + "/" + stem + "-upper.png" });
          await page.evaluate(() =>
            scrollTo(0, document.documentElement.scrollHeight),
          );
          await page.screenshot({ path: out + "/" + stem + "-lower.png" });
          const check = await page.evaluate(() => ({
            overflow: document.documentElement.scrollWidth - innerWidth,
            failure: window.failure || null,
            actions: window.__actions,
            reads: window.__fixtureReads,
            body: document.body.innerText,
            alerts: [...document.querySelectorAll("[role=alert]")].map(
              (x) => x.textContent,
            ),
          }));
          results.push({
            ...context,
            route,
            state,
            ...check,
            errors,
            palette,
            nativeDisclosure,
          });
        } catch (e) {
          failure = String(e);
          results.push({ ...context, route, state, failure, errors });
        }
        await c.close();
        console.log(results.length, stem, failure || "captured");
      }
  const sourceHashes = Object.fromEntries(
    Object.keys(bundle.metafile.inputs)
      .filter((f) => !f.includes(":") && existsSync(f))
      .map((f) => [
        f,
        createHash("sha256").update(readFileSync(f)).digest("hex"),
      ]),
  );
  writeFileSync(
    out + "/results.json",
    JSON.stringify(
      {
        sourceCommit: execHead(),
        sourceDirty: Boolean(
          execFileSync("git", ["status", "--porcelain"], {
            encoding: "utf8",
          }).trim(),
        ),
        initialSourceHashes,
        finalSourceHashes: snapshot(),
        sourceHashes,
        actualNext: false,
        actualAppShell: true,
        fixtureAuth: true,
        productionRLS: false,
        physicalDevice: false,
        results,
      },
      null,
      2,
    ),
  );
  assert.equal(results.length, 24);
  assert.deepEqual(
    snapshot(),
    initialSourceHashes,
    "Source changed during browser proof",
  );
  for (const row of results) {
    assert.equal(row.failure, null);
    assert.deepEqual(row.errors, []);
    assert.deepEqual(row.actions, []);
    assert.ok(row.overflow <= 0);
    assert.ok(row.body.includes("Synthetic") || row.body.includes("sintético"));
    if (row.route.endsWith("venues")) assert.equal(row.nativeDisclosure, true);
  }
  console.log("Admin achievement palette: 24 cases passed.");
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
function execHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}
