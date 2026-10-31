import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";

// Runs real async layouts and role helpers. Only requireUser/database reads and
// Next navigation are replaced. This is fixture evidence, not live Auth/RLS proof.
const directory = resolve("test-results/workspace-role-browser");
mkdirSync(directory, { recursive: true });
const entry = `
import React from 'react';import {createRoot} from 'react-dom/client';
import AdminLayout from './src/app/[locale]/admin/layout';
import StaffLayout from './src/app/[locale]/staff/layout';
const root=createRoot(document.getElementById('root'));
const locale=location.pathname.split('/')[1],kind=location.pathname.split('/')[2];
window.__roleReads=[];window.__roleAuth=[];
(async()=>{try{
 const Layout=kind==='admin'?AdminLayout:StaffLayout;
 const result=await Layout({params:Promise.resolve({locale}),children:<section data-private-fixture><h1>{locale==='es'?'Contenido privado de prueba':'Private fixture content'}</h1><p>Disposable fixture; no production data.</p></section>});
 root.render(result);window.__roleResult={status:'allowed'};
}catch(error){
 if(!['not-found','redirect'].includes(error.kind)){window.__roleError=String(error.stack||error);return}
 window.__roleResult={status:error.kind,href:error.href||null};
 root.render(<p data-boundary-result>{error.kind}</p>);
}requestAnimationFrame(()=>requestAnimationFrame(()=>window.__roleReady=true));})();`;
const auth = `
export async function requireUser(locale,next){
 window.__roleAuth.push({locale,next});
 const role=new URLSearchParams(location.search).get('role');
 if(role==='guest')throw Object.assign(new Error('fixture guest'),{kind:'redirect',href:'/'+locale+'/auth?next='+encodeURIComponent(next)});
 return {user:{id:'disposable-role-user'},supabase:{from(table){
  const read={table,filters:[]};window.__roleReads.push(read);
  const result=()=>({data:table==='profiles'?(role==='missing'||role==='read-error'?null:{app_role:role}):null,error:role==='read-error'?{message:'disposable read failure'}:null,count:0});
  const query={select(){return query},eq(key,value){read.filters.push([key,value]);return query},in(){return query},maybeSingle:async()=>result(),then:r=>Promise.resolve(result()).then(r)};return query;
 }}};
}`;
const bundle = await build({
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
      name: "disposable-workspace-role-adapters",
      setup(builder) {
        builder.onResolve({ filter: /^@\/lib\/auth$/ }, () => ({
          path: "auth",
          namespace: "role-fixture",
        }));
        builder.onResolve({ filter: /^next\/(link|navigation)$/ }, (args) => ({
          path: args.path,
          namespace: "role-fixture",
        }));
        builder.onLoad({ filter: /.*/, namespace: "role-fixture" }, (args) => ({
          contents:
            args.path === "auth"
              ? auth
              : args.path === "next/link"
                ? "import React from 'react';export default function Link({children,prefetch,...props}){return <a {...props}>{children}</a>}"
                : "export function usePathname(){return location.pathname}export function useSearchParams(){return new URLSearchParams(location.search)}export function notFound(){throw Object.assign(new Error('not-found'),{kind:'not-found'})}export function redirect(href){throw Object.assign(new Error('redirect'),{kind:'redirect',href})}",
          loader: "jsx",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
const globalCss = [
  ...readFileSync("src/app/layout.tsx", "utf8").matchAll(
    /import\s+["'](\.\/[^"']+\.css)["'];/g,
  ),
].map((match) => readFileSync(resolve("src/app", match[1]), "utf8"));
const css =
  (
    await postcss([tailwind()]).process(globalCss.join("\n"), {
      from: resolve("src/app/globals.css"),
    })
  ).css +
  (bundle.outputFiles.find((file) => file.path.endsWith(".css"))?.text || "");
const script = bundle.outputFiles.find((file) =>
  file.path.endsWith(".js"),
).text;
const source = {
  commit: process.env.GITHUB_SHA || null,
  trackedChanges:
    "not-inferred; bundle and CSS hashes identify tested contents",
  scriptSha256: createHash("sha256").update(script).digest("hex"),
  cssSha256: createHash("sha256").update(css).digest("hex"),
};
const server = createServer((request, response) => {
  if (request.url === "/bundle.js") {
    response.setHeader("Content-Type", "text/javascript");
    response.end(script);
  } else if (request.url === "/styles.css") {
    response.setHeader("Content-Type", "text/css");
    response.end(css);
  } else {
    const asset = resolve(
      "public",
      `.${new URL(request.url, "http://localhost").pathname}`,
    );
    if (asset.startsWith(`${resolve("public")}/`) && existsSync(asset)) {
      response.setHeader(
        "Content-Type",
        {
          ".svg": "image/svg+xml",
          ".png": "image/png",
          ".woff2": "font/woff2",
        }[extname(asset)] || "application/octet-stream",
      );
      response.end(readFileSync(asset));
      return;
    }
    response.setHeader("Content-Type", "text/html");
    response.end(
      '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const results = [];
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : {}),
  });
  const page = await browser.newPage();
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).origin === origin)
      return route.continue();
    throw new Error("Unexpected external fixture request");
  });
  for (const locale of ["en", "es", "fr"])
    for (const kind of ["admin", "staff"])
      for (const role of [
        "guest",
        "consumer",
        "organiser",
        "moderator",
        "administrator",
        "missing",
        "read-error",
        "unknown-role",
      ]) {
        await page.goto(`${origin}/${locale}/${kind}?role=${role}`);
        await page.waitForFunction(
          () => window.__roleReady || window.__roleError,
        );
        const state = await page.evaluate(() => ({
          result: window.__roleResult,
          error: window.__roleError || null,
          reads: window.__roleReads,
          auth: window.__roleAuth,
        }));
        expect(state.error).toBeNull();
        const allowed =
          locale !== "fr" &&
          (role === "administrator" ||
            (kind === "staff" && role === "moderator"));
        expect(state.result.status).toBe(
          allowed
            ? "allowed"
            : locale !== "fr" && role === "guest"
              ? "redirect"
              : "not-found",
        );
        await expect(page.locator("[data-private-fixture]")).toHaveCount(
          allowed ? 1 : 0,
        );
        if (!allowed)
          await expect(page.locator(".workspace-navigation")).toHaveCount(0);
        if (locale === "fr") {
          expect(state.auth).toEqual([]);
          expect(state.reads).toEqual([]);
        } else if (role === "guest") {
          expect(state.reads).toEqual([]);
          expect(state.result.href).toBe(
            `/${locale}/auth?next=${encodeURIComponent(`/${locale}/${kind}`)}`,
          );
        } else {
          expect(state.auth).toEqual([{ locale, next: `/${locale}/${kind}` }]);
          expect(state.reads[0]).toEqual({
            table: "profiles",
            filters: [["id", "disposable-role-user"]],
          });
          expect(state.reads.map((read) => read.table)).toEqual(
            allowed && kind === "admin"
              ? ["profiles", "business_applications"]
              : ["profiles"],
          );
        }
        results.push({ locale, kind, role, ...state });
      }
  await page.close();
  for (const locale of ["en", "es"])
    for (const [kind, role] of [
      ["admin", "administrator"],
      ["staff", "moderator"],
    ])
      for (const theme of ["light", "dark"])
        for (const [name, width, height] of [
          ["phone-360", 360, 800],
          ["phone-390", 390, 844],
          ["tablet-820", 820, 1180],
          ["desktop-1440", 1440, 900],
          ["android-emulated", 390, 844],
        ]) {
          const context = await browser.newContext({
            viewport: { width, height },
            colorScheme: theme,
            reducedMotion: "reduce",
            ...(name === "android-emulated"
              ? {
                  isMobile: true,
                  hasTouch: true,
                  userAgent:
                    "Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
                }
              : {}),
          });
          const current = await context.newPage();
          await current.goto(`${origin}/${locale}/${kind}?role=${role}`);
          await current.waitForFunction(() => window.__roleReady);
          await current.evaluate((value) => {
            document.documentElement.dataset.theme = value;
            document.documentElement.classList.toggle("dark", value === "dark");
          }, theme);
          await expect(current.locator("[data-private-fixture]")).toBeVisible();
          await expect(async () => {
            expect(
              await current
                .locator(".workspace-mark img")
                .evaluateAll((images) =>
                  images.every(
                    (image) => image.complete && image.naturalWidth > 0,
                  ),
                ),
            ).toBe(true);
          }).toPass();
          const menu = current.locator(".workspace-mobile-trigger");
          if (await menu.isVisible()) {
            await menu.click();
            await expect(menu).toHaveAttribute("aria-expanded", "true");
            const drawer = current.locator("#workspace-mobile-drawer");
            await expect(drawer).toBeVisible();
            if (kind === "staff")
              await expect(
                drawer.locator(`a[href='/${locale}/admin/audit']`),
              ).toHaveCount(0);
            await current.keyboard.press("Escape");
            await expect(menu).toHaveAttribute("aria-expanded", "false");
            await expect(menu).toBeFocused();
          }
          expect(
            await current.evaluate(
              () =>
                document.documentElement.scrollWidth -
                document.documentElement.clientWidth,
            ),
          ).toBeLessThanOrEqual(2);
          const screenshot = `${locale}-${kind}-${name}-${theme}.png`;
          await current.screenshot({
            path: resolve(directory, screenshot),
            animations: "disabled",
          });
          results.push({
            locale,
            kind,
            role,
            theme,
            viewport: name,
            screenshot,
            status: "responsive-fixture-pass",
          });
          await context.close();
        }
  writeFileSync(
    resolve(directory, "evidence.json"),
    JSON.stringify(
      {
        source,
        evidence: "disposable-layout-role-fixture-only",
        accepted: false,
        productionAuthReviewed: false,
        databaseRlsReviewed: false,
        physicalAndroidReviewed: false,
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    `Workspace role browser: ${results.length} cases passed; fixture evidence only.`,
  );
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
