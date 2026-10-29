import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createHash } from "node:crypto";
const directory = resolve("test-results/staff-pagination");
mkdirSync(directory, { recursive: true });
const entry = `import React from 'react';import{createRoot}from'react-dom/client';import Page from './src/app/[locale]/staff/moderation/page';const locale=location.pathname.split('/')[1];const root=createRoot(document.getElementById('root'));window.__staffQueueReads=[];(async()=>{try{const result=await Page({params:Promise.resolve({locale}),searchParams:Promise.resolve(Object.fromEntries(new URLSearchParams(location.search)))});root.render(<main className="workspace-shell consumer-workspace staff-workspace" style={{padding:16,maxWidth:1100,margin:'auto'}}><p data-fixture-marker>Disposable staff queue fixture · no live identity or data</p>{result}</main>);requestAnimationFrame(()=>requestAnimationFrame(()=>window.__staffQueueReady=true));}catch(error){if(error.kind){root.render(<p data-denied>{error.kind}</p>);window.__staffQueueReady=true;}else window.__staffQueueError=String(error.stack||error)}})();`;
const auth = `export async function requireUser(){const params=new URLSearchParams(location.search);const role=params.get('role')||'moderator';if(role==='guest')throw Object.assign(new Error('guest'),{kind:'redirect'});return{user:{id:'disposable-staff'},supabase:{from(table){const call={table,orders:[]};window.__staffQueueReads.push(call);const result=()=>{if(table==='profiles')return{data:{app_role:role},error:null};if(table==='automatic_moderation_settings')return{data:{enabled:false},error:null};const failed=params.get('fixture')==='failed';return{data:failed?[{id:'stale',name:'NEVER SHOW STALE FAILED ROW'}]:Array.from({length:20},(_,i)=>({id:'00000000-0000-4000-8000-'+String((call.range?.[0]||0)+i+1).padStart(12,'0'),name:'Disposable venue '+i,title_en:'Disposable event '+i,title_es:'Evento de prueba '+i,title:'Disposable suggestion '+i,venue_name:'Fixture venue',address:'Fixture address',venue_address:'Fixture address',city:'Fixture city',created_at:'2026-10-29T10:00:00Z',submitted_by:'disposable-account',status:'pending',state:'pending'})),count:failed?null:75,error:failed?{message:'PRIVATE FIXTURE ERROR'}:null}};const q={select:(...args)=>{call.select=args;return q},eq:()=>q,order:(...args)=>{call.orders.push(args);return q},range:(a,b)=>{call.range=[a,b];return q},maybeSingle:async()=>result(),then:r=>Promise.resolve(result()).then(r)};return q}}}}`;
const output = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  outdir: resolve(directory, "bundle"),
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [
    {
      name: "explicit-disposable-staff-adapters",
      setup(b) {
        b.onResolve({ filter: /^@\/lib\/auth$/ }, () => ({
          path: "auth",
          namespace: "fixture",
        }));
        b.onResolve({ filter: /^next\/(link|navigation)$/ }, (a) => ({
          path: a.path,
          namespace: "fixture",
        }));
        b.onResolve({ filter: /(?:^|\/)actions$/ }, () => ({
          path: "actions",
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
          contents:
            a.path === "auth"
              ? auth
              : a.path === "actions"
                ? `async function capture(form){window.__staffQueueAction=Object.fromEntries(form)}export const moderateItem=capture,reviewRentalCompany=capture,setAutomaticModeration=capture;`
                : a.path === "next/link"
                  ? `import React from 'react';export default function Link({children,prefetch,...props}){return <a {...props}>{children}</a>}`
                  : `export function usePathname(){return location.pathname}export function useSearchParams(){return new URLSearchParams(location.search)}export function notFound(){throw Object.assign(new Error('not-found'),{kind:'not-found'})}export function redirect(href){throw Object.assign(new Error('redirect'),{kind:'redirect',href})}`,
          loader: "jsx",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
const script = output.outputFiles.find((f) => f.path.endsWith(".js")).contents;
const cssPaths = [
  ...readFileSync("src/app/layout.tsx", "utf8").matchAll(
    /import\s+["'](\.\/[^"']+\.css)["'];/g,
  ),
].map((m) => resolve("src/app", m[1]));
cssPaths.push(
  resolve("src/app/[locale]/staff/claim-review.css"),
  resolve("src/app/[locale]/staff/staff-ui.css"),
);
const css = (
  await postcss([tailwind()]).process(
    cssPaths.map((p) => readFileSync(p, "utf8")).join("\n"),
    { from: resolve("src/app/globals.css") },
  )
).css;
const server = createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (path === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(script);
  } else if (path === "/styles.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else {
    const file = resolve("public", "." + path);
    if (file.startsWith(resolve("public") + "/") && existsSync(file)) {
      res.setHeader(
        "Content-Type",
        {
          ".svg": "image/svg+xml",
          ".png": "image/png",
          ".woff2": "font/woff2",
        }[extname(file)] || "application/octet-stream",
      );
      res.end(readFileSync(file));
      return;
    }
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = "http://127.0.0.1:" + server.address().port;
let browser;
const results = [];
const sources = [
  "scripts/test-staff-pagination-browser.mjs",
  "src/app/[locale]/staff/moderation/page.tsx",
  "src/app/[locale]/staff/StaffQueue.tsx",
  "src/app/[locale]/staff/RentalReviewQueue.tsx",
  "src/app/[locale]/moderation/actions.ts",
  "src/lib/staff-moderation-queue.ts",
  ...cssPaths,
];
const receipt = {
  fixture: true,
  scope:
    "Actual async Staff page and queue controls with disposable role/data/actions; not live Auth/RLS or device acceptance",
  bundleSHA256: createHash("sha256").update(script).digest("hex"),
  sourceHashes: Object.fromEntries(
    sources.map((p) => [
      p,
      createHash("sha256").update(readFileSync(p)).digest("hex"),
    ]),
  ),
  results,
};
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : {}),
  });
  for (const locale of ["en", "es"])
    for (const theme of ["light", "dark"])
      for (const width of [360, 390, 820, 1440])
        for (const queue of [
          "venues",
          "events",
          "offers",
          "community",
          "rentals",
        ]) {
          const page = await browser.newPage({
            viewport: { width, height: 900 },
          });
          const errors = [];
          page.on("pageerror", (e) => errors.push(e.message));
          await page.route("**/*", (route) => {
            if (new URL(route.request().url()).origin !== origin)
              throw Error("Unexpected external fixture request");
            return route.continue();
          });
          await page.goto(
            origin +
              "/" +
              locale +
              "/staff/moderation?queue=" +
              queue +
              "&page=2",
          );
          await page.waitForFunction(
            () => window.__staffQueueReady || window.__staffQueueError,
          );
          expect(
            await page.evaluate(() => window.__staffQueueError || null),
          ).toBeNull();
          await page.evaluate((theme) => {
            document.documentElement.dataset.theme = theme;
            document.documentElement.classList.toggle("dark", theme === "dark");
          }, theme);
          const reads = await page.evaluate(() => window.__staffQueueReads);
          const loaded = reads.find((r) => r.range);
          expect(loaded.range).toEqual([20, 39]);
          expect(loaded.orders).toEqual([
            ["created_at", { ascending: true }],
            ["id", { ascending: true }],
          ]);
          await expect(
            page.getByText(
              locale === "es"
                ? "Página 2 · 75 pendientes"
                : "Page 2 · 75 pending",
            ),
          ).toBeVisible();
          const first = page
            .locator(
              queue === "rentals" ? ".staff-queue article" : ".queue-card",
            )
            .first();
          await expect(first).toBeVisible();
          if (queue === "rentals")
            await first.locator("textarea").fill("Disposable browser review");
          else
            await first
              .locator("[name=reason]")
              .fill("Disposable browser review");
          await first
            .getByRole("button", {
              name:
                locale === "es"
                  ? queue === "rentals"
                    ? "Aprobar y publicar"
                    : "Aprobar"
                  : queue === "rentals"
                    ? "Approve and publish"
                    : "Approve",
              exact: true,
            })
            .click();
          await page.waitForFunction(() => window.__staffQueueAction);
          expect(
            (await page.evaluate(() => window.__staffQueueAction)).queuePage,
          ).toBe("2");
          await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
          await page.screenshot({
            path: resolve(
              directory,
              `${locale}-${theme}-${width}-${queue}.png`,
            ),
          });
          if (queue !== "rentals") {
            const contrast = await first
              .locator(".button.danger")
              .evaluate((button) => {
                const style = getComputedStyle(button);
                const rgb = (value) =>
                  value
                    .match(/[\d.]+/g)
                    .slice(0, 3)
                    .map(Number)
                    .map((v) => v / 255);
                const luminance = (color) =>
                  color
                    .map((v) =>
                      v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
                    )
                    .reduce(
                      (sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i],
                      0,
                    );
                const fg = luminance(rgb(style.color)),
                  bg = luminance(rgb(style.backgroundColor));
                return {
                  foreground: style.color,
                  background: style.backgroundColor,
                  ratio: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05),
                };
              });
            receipt.lastContrast = { locale, theme, width, queue, ...contrast };
            expect(
              contrast.ratio,
              JSON.stringify(receipt.lastContrast),
            ).toBeGreaterThanOrEqual(4.5);
          }
          if (queue === "offers" && width === 390)
            await first.locator(".moderation-form").screenshot({
              path: resolve(
                directory,
                `${locale}-${theme}-${width}-decision-controls.png`,
              ),
            });
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          ).toBe(true);
          const next = page.getByRole("link", {
            name: locale === "es" ? "Siguiente" : "Next",
            exact: true,
          });
          await next.click();
          await page.waitForURL(
            "**/staff/moderation?queue=" + queue + "&page=3",
          );
          await page.waitForFunction(() => window.__staffQueueReady);
          expect(
            (await page.evaluate(() => window.__staffQueueReads)).find(
              (r) => r.range,
            ).range,
          ).toEqual([40, 59]);
          expect(errors).toEqual([]);
          results.push({
            locale,
            theme,
            width,
            queue,
            status: "passed",
            fixture: true,
          });
          await page.close();
        }
  const page = await browser.newPage();
  for (const role of ["consumer", "organiser", "guest"]) {
    await page.goto(origin + "/en/staff/moderation?queue=events&role=" + role);
    await page.waitForFunction(() => window.__staffQueueReady);
    await expect(page.locator("[data-denied]")).toBeVisible();
    expect(
      (await page.evaluate(() => window.__staffQueueReads)).some(
        (r) => r.table === "events",
      ),
    ).toBe(false);
    results.push({ role, status: "denied-before-queue" });
  }
  for (const locale of ["en", "es"]) {
    await page.goto(
      origin +
        "/" +
        locale +
        "/staff/moderation?queue=events&page=3&fixture=failed",
    );
    await page.waitForFunction(() => window.__staffQueueReady);
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText("NEVER SHOW STALE FAILED ROW")).toHaveCount(0);
    await expect(
      page.getByRole("link", {
        name: locale === "es" ? "Reintentar" : "Retry",
      }),
    ).toHaveAttribute(
      "href",
      "/" + locale + "/staff/moderation?queue=events&page=3",
    );
    results.push({ locale, status: "failed-read-hidden-and-retry-preserved" });
  }
  await page.close();
  console.log(JSON.stringify({ passed: results.length, directory }));
} finally {
  writeFileSync(
    resolve(directory, "browser-evidence.json"),
    JSON.stringify(receipt, null, 2),
  );
  await browser?.close();
  await new Promise((done) => server.close(done));
}
