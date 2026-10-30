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
const out = resolve("test-results/prestige-routes");
mkdirSync(out, { recursive: true });
const globals = [
  ...readFileSync("src/app/layout.tsx", "utf8").matchAll(
    /import\s+["'](\.\/[^"']+\.css)["'];/g,
  ),
].map((m) => resolve("src/app", m[1]));
const files = [
  "scripts/test-prestige-routes-browser.mjs",
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
const persist = () =>
  writeFileSync(
    out + "/results.json",
    JSON.stringify(
      {
        scope:
          "Actual async page exports/AppShell; compile-local Prestige flag=true, synthetic identity/RPC, actions forbidden; no actualNext/realAuth/RLS/DB/awards/device proof",
        sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        sourceDirty: Boolean(
          execFileSync("git", ["status", "--porcelain"], {
            encoding: "utf8",
          }).trim(),
        ),
        initialSourceHashes: initial,
        finalSourceHashes: hashes(),
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
      for (const width of [360, 390, 820, 1440]) {
        const c = await browser.newContext({
          viewport: { width, height: width === 820 ? 1180 : 900 },
          colorScheme: theme,
          reducedMotion: "reduce",
        });
        const origin = "http://127.0.0.1:" + server.address().port;
        await c.route("**/*", (r) =>
          new URL(r.request().url()).origin === origin &&
          r.request().method() === "GET"
            ? r.continue()
            : r.abort(),
        );
        const p = await c.newPage();
        const cases = [
          ...["member", "hall", "certificate"].map((route) => ({
            route,
            state: "ready",
          })),
          ...((locale === "en" && theme === "dark" && width === 390) ||
          (locale === "es" && theme === "light" && width === 1440)
            ? ["member", "hall", "certificate"].flatMap((route) =>
                ["empty", "error"].map((state) => ({ route, state })),
              )
            : []),
          ...["ready", "empty", "error"].map((state) => ({
            route: "privacy",
            state,
          })),
        ];
        if (
          !cases.some((x) => x.route === "certificate" && x.state === "error")
        )
          cases.push({ route: "certificate", state: "error" });
        for (const { route, state } of cases) {
          const path =
            route === "member"
              ? "/passports/prestige"
              : route === "privacy"
                ? "/privacy/prestige"
                : route === "hall"
                  ? "/passports/prestige/hall"
                  : "/passports/prestige/certificate/10000000-0000-4000-8000-000000000002";
          await p.goto(
            `${origin}/${locale}${path}?route=${route}&locale=${locale}&theme=${theme}&state=${state}`,
            { waitUntil: "networkidle" },
          );
          await p.waitForFunction(() => window.ready || window.failure);
          expect(await p.evaluate(() => window.failure || null)).toBeNull();
          const missing = await p.evaluate(() => !!window.fixtureMissing);
          expect(missing).toBe(route === "certificate" && state === "empty");
          if (!missing) {
            await expect(p.locator("[data-fixture-notice]")).toBeVisible();
            if (state === "error")
              await expect(p.getByRole("alert")).toBeVisible();
            if (route === "member" && state === "ready") {
              await expect(
                p.getByRole("heading", {
                  name:
                    locale === "es"
                      ? "Tu próximo logro"
                      : "Your next achievement",
                }),
              ).toBeVisible();
              await expect(p.locator("progress")).toHaveAttribute("value", "1");
              await expect(p.locator("progress")).toHaveAttribute("max", "3");
            }
            if (route === "hall" && state === "ready") {
              const certificate = p.locator(
                'a[href="/' +
                  locale +
                  '/passports/prestige/certificate/10000000-0000-4000-8000-000000000002"]',
              );
              await expect(certificate).toHaveCount(1);
              await expect(certificate.locator("h2")).toHaveText(
                locale === "es"
                  ? "Reconocimiento sintético para revisar la interfaz"
                  : "Synthetic achievement for interface review",
              );
            }
            if (route === "privacy") {
              await expect(p.getByRole("heading", { level: 1 })).toHaveText(
                locale === "es"
                  ? "Privacidad de prestigio"
                  : "Prestige privacy",
              );
              expect(await p.evaluate(() => window.fixtureAuth)).toEqual([
                { kind: "optionalUser" },
              ]);
              expect(await p.evaluate(() => window.fixtureReads)).toEqual([
                { name: "prestige_member", input: { p_action: "export" } },
              ]);
              const workspace = p.locator("main").last();
              await expect(
                workspace.locator("input:not([type=hidden]),textarea"),
              ).toHaveCount(0);
              if (state === "ready") {
                await expect(
                  workspace.getByRole("button", {
                    name:
                      locale === "es"
                        ? "Eliminar dirección de envío"
                        : "Delete shipping address",
                  }),
                ).toHaveCount(1);
              } else {
                await expect(workspace.locator("form")).toHaveCount(0);
                if (state === "empty")
                  await expect(workspace.getByRole("status")).toContainText(
                    locale === "es"
                      ? "Nada que gestionar todavía"
                      : "Nothing to manage yet",
                  );
              }
            }
          }
          expect(await p.evaluate(() => window.fixtureActions)).toEqual([]);
          const stem = `${locale}-${theme}-${width}-${route}-${state}`;
          const image = out + "/" + stem + "-full.png";
          await p.screenshot({
            path: image,
            fullPage: true,
            animations: "disabled",
          });
          const geometry = await p.evaluate(() => ({
            overflow: document.documentElement.scrollWidth - innerWidth,
            reads: window.fixtureReads,
            auth: window.fixtureAuth,
            forms: document.querySelectorAll("form").length,
          }));
          expect(geometry.overflow).toBeLessThanOrEqual(1);
          let privacyDarkContrast = null;
          if (route === "privacy" && theme === "dark") {
            privacyDarkContrast = await p
              .locator("main")
              .last()
              .evaluate((main) => {
                const rgb = (value) =>
                  value
                    .match(/[\d.]+/g)
                    .slice(0, 3)
                    .map(Number);
                const luminance = (values) =>
                  values
                    .map((value) => {
                      const normalized = value / 255;
                      return normalized <= 0.04045
                        ? normalized / 12.92
                        : ((normalized + 0.055) / 1.055) ** 2.4;
                    })
                    .reduce(
                      (sum, value, index) =>
                        sum + value * [0.2126, 0.7152, 0.0722][index],
                      0,
                    );
                const contrast = (foreground, background) => {
                  const a = luminance(foreground),
                    b = luminance(background);
                  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
                };
                const style = getComputedStyle(main);
                // #29201a is the lightest actual endpoint of the opaque hero
                // gradient; it conservatively bounds all charcoal surfaces.
                const samples = Array.from(
                  main.querySelectorAll("h1,h2,h3,p,button,a,span"),
                )
                  .filter(
                    (node) =>
                      node.textContent.trim() &&
                      node.getBoundingClientRect().height,
                  )
                  .map((node) => {
                    const computed = getComputedStyle(node);
                    const isOrangeAction =
                      computed.backgroundColor === "rgb(255, 141, 73)";
                    return {
                      text: node.textContent.trim(),
                      ratio: contrast(
                        rgb(computed.color),
                        isOrangeAction ? [255, 141, 73] : [41, 32, 26],
                      ),
                    };
                  });
                return {
                  panel: style
                    .getPropertyValue("--prestige-private-panel")
                    .trim(),
                  muted: style
                    .getPropertyValue("--prestige-private-muted")
                    .trim(),
                  samples,
                };
              });
            expect(privacyDarkContrast.panel).toBe("#181716");
            expect(privacyDarkContrast.muted).toBe("#c7beb4");
            expect(privacyDarkContrast.samples.length).toBeGreaterThan(5);
            for (const sample of privacyDarkContrast.samples)
              expect(sample.ratio).toBeGreaterThanOrEqual(4.5);
          }
          const lowerControlProof = [];
          let lowerImage = null;
          if (state === "ready" && ["member", "privacy"].includes(route)) {
            const workspace = p.locator("main").last();
            const controls = workspace.locator(
              'a[href],button:not(:disabled),input:not([type="hidden"]):not(:disabled)',
            );
            expect(await controls.count()).toBe(route === "member" ? 8 : 3);
            for (let i = 0; i < (await controls.count()); i++) {
              const control = controls.nth(i);
              let reached = false;
              let tabs = 0;
              for (; tabs < 100; tabs++) {
                await p.keyboard.press("Tab");
                if (
                  await control.evaluate((el) => el === document.activeElement)
                ) {
                  reached = true;
                  break;
                }
              }
              expect(reached).toBe(true);
              // Native focused controls can sit behind a fixed dock until the
              // owner scrolls farther. Center the actual scrollable ancestor;
              // never submit privacy, claim, withdrawal or deletion actions.
              await control.evaluate((el) =>
                el.scrollIntoView({ block: "center", inline: "nearest" }),
              );
              const proof = await control.evaluate((el) => {
                const rect = el.getBoundingClientRect();
                return {
                  name: (
                    el.textContent ||
                    el.getAttribute("name") ||
                    ""
                  ).trim(),
                  focused: el === document.activeElement,
                  focusVisible: el.matches(":focus-visible"),
                  rect: {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                  },
                  clearHits: [0.2, 0.5, 0.8].map((fraction) => {
                    const hit = document.elementFromPoint(
                      rect.left + rect.width * fraction,
                      rect.top + rect.height / 2,
                    );
                    return hit === el || el.contains(hit);
                  }),
                  scrollers: Array.from(document.querySelectorAll("*"))
                    .filter(
                      (node) =>
                        node.scrollHeight > node.clientHeight + 10 &&
                        ["auto", "scroll"].includes(
                          getComputedStyle(node).overflowY,
                        ),
                    )
                    .map((node) => ({
                      tag: node.tagName,
                      scrollTop: node.scrollTop,
                    })),
                };
              });
              expect(proof.focused).toBe(true);
              expect(proof.focusVisible).toBe(true);
              expect(proof.clearHits).toEqual([true, true, true]);
              expect(proof.rect.y).toBeGreaterThanOrEqual(0);
              expect(proof.rect.y + proof.rect.height).toBeLessThanOrEqual(
                width === 820 ? 1180 : 900,
              );
              lowerControlProof.push({ nativeTabSteps: tabs + 1, ...proof });
            }
            lowerImage = out + "/" + stem + "-lower.png";
            await p.screenshot({ path: lowerImage, animations: "disabled" });
            expect(await p.evaluate(() => window.fixtureActions)).toEqual([]);
          }
          let retryProof = null;
          if (route === "certificate" && state === "error") {
            const href = `/${locale}/passports/prestige/certificate/10000000-0000-4000-8000-000000000002`,
              retry = p.getByRole("link", {
                name: locale === "es" ? "Reintentar" : "Retry",
                exact: true,
              });
            await expect(retry).toHaveAttribute("href", href);
            let focused = false,
              steps = 0;
            for (; steps < 80; steps++) {
              await p.keyboard.press("Tab");
              if (await retry.evaluate((el) => el === document.activeElement)) {
                focused = true;
                break;
              }
            }
            expect(focused).toBe(true);
            expect(
              await retry.evaluate((el) => el.matches(":focus-visible")),
            ).toBe(true);
            expect(
              await retry.evaluate((el) => {
                const r = el.getBoundingClientRect();
                const hit = document.elementFromPoint(
                  r.x + r.width / 2,
                  r.y + r.height / 2,
                );
                return el.contains(hit);
              }),
            ).toBe(true);
            const gets = [];
            const listen = (r) => {
              if (r.isNavigationRequest())
                gets.push({ url: r.url(), method: r.method() });
            };
            p.on("request", listen);
            await p.keyboard.press("Enter");
            await p.waitForURL(origin + href);
            await p.waitForFunction(() => window.ready || window.failure);
            p.off("request", listen);
            expect(gets).toEqual([{ url: origin + href, method: "GET" }]);
            expect(await p.evaluate(() => window.failure || null)).toBeNull();
            await expect(
              p.getByRole("heading", {
                name:
                  locale === "es"
                    ? "Certificado de logro"
                    : "Achievement certificate",
                exact: true,
              }),
            ).toBeVisible();
            expect(await p.evaluate(() => window.fixtureReads)).toEqual([
              {
                name: "prestige_public",
                input: { p_public_id: "10000000-0000-4000-8000-000000000002" },
              },
            ]);
            expect(await p.evaluate(() => window.fixtureActions)).toEqual([]);
            retryProof = {
              nativeTabSteps: steps + 1,
              focusVisible: true,
              clearHit: true,
              gets,
              rpcRequeried: true,
            };
          }
          results.push({
            locale,
            theme,
            viewport: { width, height: width === 820 ? 1180 : 900 },
            route,
            state,
            missing,
            ...geometry,
            image,
            imageSha256: createHash("sha256")
              .update(readFileSync(image))
              .digest("hex"),
            retryProof,
            lowerControlProof,
            privacyDarkContrast,
            lowerImage,
            lowerImageSha256: lowerImage
              ? createHash("sha256")
                  .update(readFileSync(lowerImage))
                  .digest("hex")
              : null,
          });
          persist();
        }
        await c.close();
      }
  expect(hashes()).toEqual(initial);
  console.log(
    "PASS",
    results.length,
    "actual Prestige page fixture states; no mutations/prod awards",
  );
} finally {
  persist();
  await browser?.close();
  await new Promise((r) => server.close(r));
}
