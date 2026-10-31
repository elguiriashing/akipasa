// Actual async Prestige pages and AppShell; only disposable Auth/RPC/request adapters.
// Local compile-only flags exercise UI states; never enable production gates or issue awards.
// Native Retry uses a fresh document GET and re-reads the synthetic public RPC.
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const root = process.cwd();
const out = resolve(
  process.env.PRESTIGE_RETRY_OUTPUT || "/tmp/akipasa-prestige-retry-20261031",
);
mkdirSync(out, { recursive: true });
const globals = [
  ...readFileSync("src/app/layout.tsx", "utf8").matchAll(
    /import\s+["'](\.\/[^"']+\.css)["'];/g,
  ),
].map((m) => resolve("src/app", m[1]));
const files = [
  "scripts/test-prestige-routes-browser.mjs",
  "scripts/test-prestige-retry-browser.mjs",
  "src/app/[locale]/passports/prestige/page.tsx",
  "src/app/[locale]/passports/prestige/hall/page.tsx",
  "src/app/[locale]/passports/prestige/certificate/[publicId]/page.tsx",
  "src/app/[locale]/privacy/prestige/page.tsx",
  "src/app/[locale]/passports/prestige/PrestigeControls.tsx",
  "src/components/PassportPrestigeCard.tsx",
  "src/components/PassportPrestigeDownload.tsx",
  "src/components/PassportPrestigePrivacy.tsx",
  "src/components/PassportPrestigeShipping.tsx",
  "src/components/passport-prestige.module.css",
  "src/lib/passport-prestige.ts",
  "src/lib/passport-prestige-identity.ts",
  "src/components/AppShell.tsx",
  "src/components/PasaCinematic.css",
  "src/components/PasaSharedSurfaces.css",
  ...globals.map((f) => f.slice(root.length + 1)),
];
const hashes = () =>
  Object.fromEntries(
    files.map((f) => [
      f,
      createHash("sha256").update(readFileSync(f)).digest("hex"),
    ]),
  );
const initial = hashes();
const adapter = `const q=new URLSearchParams(location.search),state=q.get('state')||'ready',route=q.get('route');const award={id:'10000000-0000-4000-8000-000000000001',programme_key:'city_master',public_id:'10000000-0000-4000-8000-000000000002',serial:42,title_es:'Reconocimiento sintético para revisar la interfaz',title_en:'Synthetic achievement for interface review',public_alias:'Synthetic fixture explorer',awarded_at:'2026-10-20T12:00:00Z',shared:false,hall_of_fame:false,revoked_at:null,physical_status:null,delivery_status:'disabled',has_shipping_address:route==='privacy'};const programmes=[{key:'city_master',title_es:'Logro sintético obtenido',title_en:'Synthetic earned achievement',physical_eligible:false,active:true,definition_current:true,requirements:[]},{key:'coastal_explorer',title_es:'Próximo hito sintético',title_en:'Next synthetic milestone',physical_eligible:false,active:true,definition_current:true,requirements:[{key:'fixture_checkin',title_es:'Visitas sintéticas verificadas',title_en:'Synthetic verified visits',current:1,target:3}]}];const publicAward={public_id:award.public_id,serial:award.serial,title_es:award.title_es,title_en:award.title_en,public_alias:award.public_alias,awarded_at:award.awarded_at};const supabase={async rpc(name,input){window.fixtureReads.push({name,input});if(state==='error')return{data:null,error:{message:'Synthetic unavailable'}};if(name==='prestige_member')return{data:input.p_action==='export'?{awards:state==='empty'?[]:[award],shipping_addresses:state==='empty'?[]:[{award_id:award.id,delete_after:'2026-11-30T12:00:00Z'}]}:{awards:state==='empty'?[]:[award],programmes:state==='empty'?[]:programmes,fulfilment_enabled:false,shipping_intake_enabled:false},error:null};if(name==='prestige_public')return{data:state==='empty'?[]:[publicAward],error:null};throw Error('Unexpected synthetic RPC '+name)}};const user={id:'10000000-0000-4000-8000-000000000099'};export async function requireUser(locale,next){window.fixtureAuth.push({kind:'requireUser',locale,next});return{supabase,user}}export async function optionalUser(){window.fixtureAuth.push({kind:'optionalUser'});return{supabase,user}}export async function createSupabaseServerClient(){return supabase};`;
const entry = `import React from'react';import{createRoot}from'react-dom/client';import{AppShell}from'./src/components/AppShell';import Member from'./src/app/[locale]/passports/prestige/page';import Hall from'./src/app/[locale]/passports/prestige/hall/page';import Certificate from'./src/app/[locale]/passports/prestige/certificate/[publicId]/page';import Privacy from'./src/app/[locale]/privacy/prestige/page';const q=new URLSearchParams(location.search),locale=q.get('locale')||location.pathname.split('/')[1]||'en',route=q.get('route')||(location.pathname.includes('/certificate/')?'certificate':location.pathname.endsWith('/hall')?'hall':location.pathname.includes('/privacy/prestige')?'privacy':'member');document.documentElement.lang=locale;if(q.get('theme'))localStorage.setItem('prestige-fixture-theme',q.get('theme'));document.documentElement.dataset.theme=q.get('theme')||localStorage.getItem('prestige-fixture-theme')||'dark';window.fixtureReads=[];window.fixtureAuth=[];window.fixtureActions=[];(async()=>{try{const content=await({member:Member,hall:Hall,certificate:Certificate,privacy:Privacy}[route])({params:Promise.resolve({locale,publicId:'10000000-0000-4000-8000-000000000002'}),searchParams:Promise.resolve({})});createRoot(document.getElementById('root')).render(<AppShell locale={locale} signedIn={route==='member'||route==='privacy'} role='consumer'><p data-fixture-notice style={{padding:12,color:'#ffb27b',background:'#15100c'}}>DISPOSABLE PRESTIGE PAGE FIXTURE — synthetic awards/progression only; no real achievement, address or production data.</p>{content}</AppShell>);requestAnimationFrame(()=>requestAnimationFrame(()=>window.ready=true))}catch(e){if(e.kind==='not-found'){window.fixtureMissing=true;createRoot(document.getElementById('root')).render(<p>Actual route returned notFound in disposable fixture; this is not the real Next404layout.</p>);window.ready=true}else window.failure=String(e.stack||e)}})();`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: root, loader: "tsx" },
  bundle: true,
  write: false,
  outdir: out,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.AKIPASA_PRESTIGE_ENABLED": '"true"',
    "process.env.AKIPASA_PRESTIGE_SCHEMA_READY": '"true"',
    "process.env": "{}",
  },
  plugins: [
    {
      name: "disposable-read-only-prestige-page-adapters",
      setup(b) {
        b.onResolve({ filter: /^@\/lib\/(auth|supabase\/server)$/ }, () => ({
          path: "auth",
          namespace: "fixture",
        }));
        b.onLoad({ filter: /[\\/]lib[\\/]auth\.ts$/ }, () => ({
          contents: adapter,
          loader: "js",
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
          const source = readFileSync(path, "utf8");
          const names = [
            ...source.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g),
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
              : a.path === "next/navigation"
                ? `export function usePathname(){return location.pathname}export function useSearchParams(){return new URLSearchParams(location.search)}export function useRouter(){return{refresh(){},push(){}}}export function notFound(){throw Object.assign(new Error('not-found'),{kind:'not-found'})}export function redirect(href){throw new Error('redirect:'+href)}`
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
writeFileSync(out + "/bundle.js", js);
writeFileSync(out + "/styles.css", css);
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
      for (const width of [360, 390, 820, 1440])
        for (const route of ["member", "privacy"]) {
          const c = await browser.newContext({
            viewport: { width, height: 900 },
            colorScheme: theme,
            reducedMotion: "reduce",
          });
          const blocked = [];
          await c.route("**/*", (r) =>
            new URL(r.request().url()).origin === origin &&
            r.request().method() === "GET"
              ? r.continue()
              : (blocked.push({
                  url: r.request().url(),
                  method: r.request().method(),
                }),
                r.abort()),
          );
          const p = await c.newPage();
          const errors = [];
          p.on("pageerror", (e) => errors.push(String(e)));
          await p.goto(
            origin +
              "/?" +
              new URLSearchParams({ locale, theme, route, state: "error" }),
          );
          await p.waitForFunction(() => window.ready || window.failure);
          expect(await p.evaluate(() => window.failure || null)).toBeNull();
          const href =
            "/" +
            locale +
            (route === "member" ? "/passports/prestige" : "/privacy/prestige");
          const retry = p.getByRole("link", {
            name: locale === "es" ? "Reintentar" : "Retry",
            exact: true,
          });
          await expect(retry).toHaveAttribute("href", href);
          let tabs = 0;
          for (; tabs < 80; tabs++) {
            await p.keyboard.press("Tab");
            if (await retry.evaluate((e) => e === document.activeElement))
              break;
          }
          expect(tabs).toBeLessThan(80);
          const proof = await retry.evaluate((e) => {
            const r = e.getBoundingClientRect();
            return {
              focusVisible: e.matches(":focus-visible"),
              rect: { x: r.x, y: r.y, width: r.width, height: r.height },
              hits: [
                [0.1, 0.1],
                [0.9, 0.1],
                [0.5, 0.5],
                [0.1, 0.9],
                [0.9, 0.9],
              ].map(([x, y]) =>
                e.contains(
                  document.elementFromPoint(
                    r.x + r.width * x,
                    r.y + r.height * y,
                  ),
                ),
              ),
              color: getComputedStyle(e).color,
              theme: document.documentElement.dataset.theme,
              overflow: document.documentElement.scrollWidth - innerWidth,
            };
          });
          expect(proof.focusVisible).toBe(true);
          expect(proof.hits).toEqual([true, true, true, true, true]);
          expect(proof.theme).toBe(theme);
          expect(proof.overflow).toBeLessThanOrEqual(1);
          const image =
            out +
            "/" +
            [locale, theme, width, route, "retry"].join("-") +
            ".png";
          await p.screenshot({ path: image, animations: "disabled" });
          const gets = [];
          p.on("request", (r) => {
            if (r.isNavigationRequest())
              gets.push({ url: r.url(), method: r.method() });
          });
          await p.keyboard.press("Enter");
          await p.waitForURL(origin + href);
          await p.waitForFunction(() => window.ready || window.failure);
          expect(gets).toEqual([{ url: origin + href, method: "GET" }]);
          expect(await p.evaluate(() => window.fixtureReads)).toEqual([
            {
              name: "prestige_member",
              input: { p_action: route === "member" ? "read" : "export" },
            },
          ]);
          expect(await p.evaluate(() => window.fixtureActions)).toEqual([]);
          expect(errors).toEqual([]);
          expect(blocked).toEqual([]);
          results.push({
            locale,
            theme,
            width,
            route,
            nativeTabSteps: tabs + 1,
            ...proof,
            gets,
            image,
            imageSha256: createHash("sha256")
              .update(readFileSync(image))
              .digest("hex"),
            actions: [],
            blocked,
            errors,
          });
          await c.close();
        }
  console.log("PASS " + results.length + " native GET Retry cases");
} finally {
  writeFileSync(
    out + "/results.json",
    JSON.stringify(
      {
        scope:
          "Actual async pages/AppShell plus compile-local synthetic identity/RPC. No Next transport, provider/RLS, real owner mutation, or physical device proof.",
        sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        sourceDirty: true,
        initialSourceHashes: initial,
        finalSourceHashes: hashes(),
        results,
      },
      null,
      2,
    ),
  );
  if (browser) await browser.close();
  await new Promise((r) => server.close(r));
}
