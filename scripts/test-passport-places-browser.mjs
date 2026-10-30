// Actual async Places export and AppShell, with the existing disposable RPC adapter.
// Esbuild component proof only: not Next HTTP, live Supabase/RLS or device acceptance.
// No production participation, attendance, awards or XP are created by this runner.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createHash } from "node:crypto";
const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const out = resolve("test-results/passport-places");
mkdirSync(out, { recursive: true });
const files = [
  "src/app/[locale]/passports/places/page.tsx",
  "src/app/[locale]/passports/places/places.module.css",
  "src/components/AppShell.tsx",
  "src/components/PasaCinematic.css",
  "src/components/PasaSharedSurfaces.css",
];
const hashes = () =>
  Object.fromEntries(
    files.map((f) => [
      f,
      createHash("sha256").update(readFileSync(f)).digest("hex"),
    ]),
  );
let initial = hashes();
const auth = `export function createSupabasePublicClient(){return{rpc:async(name,input)=>{window.__placesReads.push({name,input});if(name!=='passport_places')throw Error('Unexpected synthetic read '+name);const state=new URLSearchParams(location.search).get('state')||'ready';return{data:state==='empty'?[]:[{id:'00000000-0000-4000-8000-000000000010',name:'Synthetic participating venue — disposable fixture',slug:'synthetic-venue'}],error:state==='error'?{message:'PRIVATE SYNTHETIC DIAGNOSTIC'}:null}}}};export async function optionalUser(){return{user:null,supabase:null}}export async function requireUser(){throw Error('Public Places fixture must not authenticate')}export async function requireOwnerConsole(){throw Error('Public Places fixture must not enter owner console')}export const defaultOwnerPreferences={};`;
const entry = `import React from'react';import{createRoot}from'react-dom/client';import{AppShell}from'./src/components/AppShell';import Places from'./src/app/[locale]/passports/places/page';const q=new URLSearchParams(location.search),locale=q.get('locale')||'en';window.__placesReads=[];window.__fixtureActions=[];document.documentElement.lang=locale;document.documentElement.dataset.theme=q.get('theme')||'dark';(async()=>{try{const content=await Places({params:Promise.resolve({locale}),searchParams:Promise.resolve({city:q.get('city')??'malaga',category:q.get('category')||undefined})});createRoot(document.getElementById('root')).render(<AppShell locale={locale} signedIn={false} role='consumer'><p data-fixture-notice style={{padding:12,color:"#ffb27b",background:"#15100c"}}>Disposable Places fixture — synthetic venue participation only, not a production location or verified visit.</p>{content}</AppShell>);requestAnimationFrame(()=>requestAnimationFrame(()=>window.ready=true))}catch(e){if(e.message==='not-found'){window.fixtureMissing=true;window.ready=true}else window.failure=String(e.stack)}})();`;

const bundle = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  metafile: true,
  outdir: out,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [
    {
      name: "read-only-operations-adapters",
      setup(b) {
        b.onResolve(
          { filter: /^@\/lib\/(auth|owner-console|supabase\/public)$/ },
          () => ({ path: "auth", namespace: "fixture" }),
        );
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
                  `export async function ${n}(){window.__fixtureActions.push('forbidden');throw new Error('Read-only fixture forbids actions')}`,
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
    /import\s+["'](\.\/[^"']+\.css)["'];/g,
  ),
].map((m) => resolve("src/app", m[1]));
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
const dependencyPaths = Object.keys(bundle.metafile.inputs).filter((p) =>
  p.startsWith("src/"),
);
for (const p of [
  ...globalFiles.map((p) => p.slice(root.length)),
  ...dependencyPaths,
  "scripts/test-passport-places-browser.mjs",
])
  if (!files.includes(p)) files.push(p);
assert.deepEqual(
  Object.fromEntries(Object.keys(initial).map((p) => [p, hashes()[p]])),
  initial,
);
initial = hashes();
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
const results = [],
  validation = [];
let complete = false;
const origin = "http://127.0.0.1:" + server.address().port;
const persist = () =>
  writeFileSync(
    out + "/results.json",
    JSON.stringify(
      {
        scope:
          "Actual async Places export + production CSS + AppShell. Disposable public RPC/navigation/action adapters. Not Next server/HTTP404, live Supabase/Auth/RLS, real participation, awards/XP or physical device acceptance.",
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
        complete,
        actualNext: false,
        providerRLSAcceptance: false,
        physicalAndroid: false,
        results,
        validation,
      },
      null,
      2,
    ) + "\n",
  );
async function nativeLink(page, link) {
  let tabs = 0;
  while (
    tabs < 90 &&
    !(await link.evaluate((e) => e === document.activeElement))
  ) {
    await page.keyboard.press("Tab");
    tabs++;
  }
  assert.equal(
    await link.evaluate((e) => e === document.activeElement),
    true,
    "Actual native Tab must reach each Places link",
  );
  assert.equal(await link.evaluate((e) => e.matches(":focus-visible")), true);
  let wheelSteps = 0;
  while (wheelSteps < 8) {
    const geometry = await link.evaluate((e) => {
      const r = e.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        hit: e.contains(
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
        ),
      };
    });
    if (
      geometry.hit &&
      geometry.y >= 48 &&
      geometry.y + geometry.height <= 900
    ) {
      assert.ok(geometry.height >= 44);
      return { tabs, wheelSteps, ...geometry };
    }
    const box = await link.boundingBox();
    assert.ok(box);
    await page.mouse.move(
      Math.max(
        20,
        Math.min(
          (await page.evaluate(() => innerWidth)) - 20,
          box.x + box.width / 2,
        ),
      ),
      450,
    );
    await page.mouse.wheel(0, box.y + box.height / 2 - 450);
    await page.waitForTimeout(70);
    wheelSteps++;
  }
  throw Error("Places native focus/scroll did not expose an unobscured link");
}
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : { channel: "chrome" }),
  });
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const width of [360, 390, 820, 1440]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          colorScheme: theme,
          reducedMotion: "reduce",
          hasTouch: width <= 390,
        });
        await context.route("**/*", (r) =>
          new URL(r.request().url()).origin === origin
            ? r.continue()
            : r.abort(),
        );
        const page = await context.newPage();
        for (const state of ["ready", "empty", "error"]) {
          await page.goto(
            `${origin}/${locale}/passports/places?${new URLSearchParams({ state, locale, theme, city: "malaga" })}`,
            { waitUntil: "domcontentloaded" },
          );
          await page.waitForFunction(() => window.ready || window.failure);
          assert.equal(await page.evaluate(() => window.failure || null), null);
          assert.equal(
            await page.evaluate(() => Boolean(window.fixtureMissing)),
            false,
          );
          await page.locator("main h1").waitFor({ state: "visible" });
          assert.equal(
            await page.locator("html").getAttribute("data-theme"),
            theme,
          );
          const main = page.locator("main");
          assert.equal(await main.locator("form").count(), 0);
          assert.equal(await main.locator("h1").innerText(), "Málaga");
          const reads = await page.evaluate(() => window.__placesReads);
          assert.deepEqual(reads, [
            {
              name: "passport_places",
              input: { p_city: "malaga", p_category: null },
            },
          ]);
          const text = await main.innerText();
          assert.ok(!text.includes("PRIVATE SYNTHETIC DIAGNOSTIC"));
          assert.equal(
            await main.locator("[role=alert]").count(),
            state === "error" ? 1 : 0,
          );
          if (state === "empty")
            assert.ok(
              text.includes(
                locale === "es"
                  ? "Próximamente más locales participantes."
                  : "More participating venues coming soon.",
              ),
            );
          const links = main.locator("a");
          assert.equal(await links.count(), state === "ready" ? 2 : 1);
          assert.equal(
            await links.first().getAttribute("href"),
            `/${locale}/passports?city=malaga`,
          );
          if (state === "ready")
            assert.equal(
              await links.nth(1).getAttribute("href"),
              `/${locale}/venues/synthetic-venue`,
            );
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          );
          assert.ok(overflow <= 1);
          await page
            .locator(
              width < 1000 ? "nav.pasa-dock" : "aside.suite-discovery-nav",
            )
            .waitFor({ state: "visible" });
          const stem = `${locale}-${theme}-${width}-${state}`,
            full = out + "/" + stem + "-full.png",
            lower = out + "/" + stem + "-lower.png";
          await page.screenshot({
            path: full,
            fullPage: true,
            animations: "disabled",
          });
          const scrollPosition = () =>
            page.evaluate(() => ({
              document: document.scrollingElement?.scrollTop || 0,
              content: document.querySelector(".app-content")?.scrollTop || 0,
            }));
          const scrollBefore = await scrollPosition();
          await page.mouse.move(width - 28, 600);
          await page.mouse.wheel(0, 600);
          await page.waitForTimeout(80);
          const scrollAfter = await scrollPosition();
          const nativeScroll = {
            before: scrollBefore,
            after: scrollAfter,
            moved: JSON.stringify(scrollBefore) !== JSON.stringify(scrollAfter),
          };
          const linkProof = [];
          for (const link of await links.all())
            linkProof.push({
              href: await link.getAttribute("href"),
              ...(await nativeLink(page, link)),
            });
          await page.screenshot({ path: lower, animations: "disabled" });
          assert.deepEqual(
            await page.evaluate(() => window.__fixtureActions),
            [],
          );
          results.push({
            locale,
            theme,
            width,
            state,
            reads,
            overflow,
            linkProof,
            nativeScroll,
            image: full,
            imageSha256: createHash("sha256")
              .update(readFileSync(full))
              .digest("hex"),
            lowerImage: lower,
            lowerSha256: createHash("sha256")
              .update(readFileSync(lower))
              .digest("hex"),
          });
        }
        await context.close();
      }
  // Input-boundary probes execute the actual route and prove invalid input never reads the provider.
  const page = await browser.newPage();
  for (const locale of ["en", "es"])
    for (const [kind, query, missing] of [
      ["category", { city: "malaga", category: "restaurant" }, false],
      ["missing-city", { city: "" }, true],
      ["invalid-city", { city: "not-a-real-city" }, true],
      [
        "invalid-category",
        { city: "malaga", category: "not-a-real-category" },
        true,
      ],
    ]) {
      await page.goto(
        `${origin}/${locale}/passports/places?${new URLSearchParams({ locale, ...query })}`,
      );
      await page.waitForFunction(() => window.ready || window.failure);
      assert.equal(await page.evaluate(() => window.failure || null), null);
      assert.equal(
        await page.evaluate(() => Boolean(window.fixtureMissing)),
        missing,
      );
      const reads = await page.evaluate(() => window.__placesReads);
      assert.deepEqual(
        reads,
        missing
          ? []
          : [
              {
                name: "passport_places",
                input: { p_city: "malaga", p_category: "restaurant" },
              },
            ],
      );
      validation.push({ locale, kind, missing, reads });
    }
  await page.goto(origin + "/fr/passports/places?locale=fr&city=malaga");
  await page.waitForFunction(() => window.ready || window.failure);
  assert.equal(await page.evaluate(() => Boolean(window.fixtureMissing)), true);
  assert.deepEqual(await page.evaluate(() => window.__placesReads), []);
  validation.push({
    locale: "fr",
    kind: "invalid-locale",
    missing: true,
    reads: [],
  });
  await page.close();
  assert.ok(
    results.some((r) => r.nativeScroll.moved),
    "Native wheel must actually scroll at least one responsive Places state",
  );
  assert.deepEqual(hashes(), initial);
  complete = true;
  persist();
  console.log(
    "PASS",
    results.length,
    "actual Places page states +",
    validation.length,
    "query-boundary probes; native Tab/scroll/hit checks, no mutations",
  );
} finally {
  persist();
  await browser?.close();
  await new Promise((r) => server.close(r));
}
