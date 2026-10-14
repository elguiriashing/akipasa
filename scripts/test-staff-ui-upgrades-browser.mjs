import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// Real async Staff/Admin loaders, workspace layouts and production CSS.
// Auth/database reads and actions are disposable; no production writes or provider calls.
const directory = resolve("test-results/staff-ui-upgrades");
mkdirSync(directory, { recursive: true });
const entry = `
import React from 'react';import{createRoot}from'react-dom/client';
import StaffLayout from './src/app/[locale]/staff/layout';
import AdminLayout from './src/app/[locale]/admin/layout';
import SupportPage from './src/app/[locale]/staff/support/page';
import CreatorPage from './src/app/[locale]/staff/creators/page';
import CataloguePage from './src/app/[locale]/staff/catalogue/page';
import VenuePage from './src/app/[locale]/staff/catalogue/venues/[id]/page';
import AdminPage from './src/app/[locale]/admin/page';
const pages={support:SupportPage,creators:CreatorPage,catalogue:CataloguePage,venue:VenuePage,admin:AdminPage};
const query=new URLSearchParams(location.search);const locale=location.pathname.startsWith('/es/')?'es':'en';
const route=query.get('route')||'support';const root=createRoot(document.getElementById('root'));
(async()=>{try{
 const props={params:Promise.resolve({locale,id:'10000000-0000-4000-8000-000000000001'}),searchParams:Promise.resolve(Object.fromEntries(query))};
 const content=await pages[route](props);const Layout=route==='admin'?AdminLayout:StaffLayout;
 root.render(await Layout({...props,children:content}));
 requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__staffUIReady=true}));
}catch(error){window.__staffUIError=String(error.stack||error);console.error(error)}})();`;
const authAdapter = `
const event={id:'20000000-0000-4000-8000-000000000001',venue_id:'10000000-0000-4000-8000-000000000001',title_es:'Concierto de verano',title_en:'Summer concert',description_es:'Descripción de un evento de ejemplo',description_en:'Description of a sample event',status:'published',price_cents:0,booking_url:'',venues:{name:'Fixture venue'}};
export async function requireUser(){const query=new URLSearchParams(location.search);const route=query.get('route');const failed=query.get('fixture')!=='success';return{user:{id:'staff-browser-fixture'},supabase:{from(table){
 const data=table==='profiles'?{app_role:'administrator'}:table==='venues'&&route==='venue'?{id:event.venue_id,name:'Fixture venue',slug:'fixture-venue',address:'Fixture street 1',status:'published',verified:true,description_es:'Descripción de un local de ejemplo',description_en:'Description of a sample venue'}:table==='events'?[event]:[];
 const failedTable={support:'reports',creators:'creator_profiles',catalogue:'events',admin:'business_applications'}[route];
 const result=()=>({data,error:failed&&table===failedTable?{message:'Private fixture error'}:null,count:table==='account_deletion_requests'?2:0});
 const request={select:()=>request,eq:()=>request,in:()=>request,order:()=>request,limit:()=>request,or:()=>request,ilike:()=>request,maybeSingle:async()=>result(),then:r=>Promise.resolve(result()).then(r)};return request;
}}}}`;
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
      name: "staff-ui-disposable-adapters",
      setup(builder) {
        builder.onResolve({ filter: /^@\/lib\/auth$/ }, () => ({
          path: "auth",
          namespace: "staff-fixture",
        }));
        builder.onResolve({ filter: /^next\/(link|navigation)$/ }, (args) => ({
          path: args.path,
          namespace: "staff-fixture",
        }));
        builder.onResolve(
          { filter: /^@\/components\/SpainAddressAutocomplete$/ },
          () => ({ path: "address", namespace: "staff-fixture" }),
        );
        builder.onResolve({ filter: /(?:^|\/)actions$/ }, () => ({
          path: "actions",
          namespace: "staff-fixture",
        }));
        builder.onLoad(
          { filter: /.*/, namespace: "staff-fixture" },
          (args) => ({
            contents:
              args.path === "auth"
                ? authAdapter
                : args.path === "actions"
                  ? "export async function resolveReport(){}export async function moderateCreator(){}export async function reviewBusinessApplication(){}export async function operatorDeleteCatalogueItem(){}export async function operatorUpdateEvent(){}export async function operatorUpdateVenue(){}"
                  : args.path === "address"
                    ? 'import React from "react";export function SpainAddressAutocomplete(){return <input aria-label="Address" defaultValue="Fixture street 1"/>}'
                    : args.path === "next/link"
                      ? 'import React from "react";export default function Link({children,prefetch,replace,scroll,...props}){return <a {...props}>{children}</a>}'
                      : 'export function usePathname(){return location.pathname}export function useSearchParams(){return new URLSearchParams(location.search)}export function notFound(){throw new Error("not-found")}export function redirect(href){throw new Error("redirect:"+href)}',
            loader: "jsx",
            resolveDir: process.cwd(),
          }),
        );
      },
    },
  ],
});
const css =
  (
    await postcss([tailwind()]).process(
      [
        "src/app/globals.css",
        "src/app/compact-app.css",
        "src/app/brand.css",
        "src/app/appearance.css",
        "src/app/tablet-responsive.css",
        "src/app/[locale]/admin/admin-suite.css",
        "src/app/[locale]/admin/admin-compact.css",
      ]
        .map((path) => readFileSync(path, "utf8"))
        .join("\n"),
      { from: resolve("src/app/globals.css") },
    )
  ).css +
  (bundle.outputFiles.find((file) => file.path.endsWith(".css"))?.text || "");
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundle.outputFiles.find((file) => file.path.endsWith(".js")).text);
  } else if (req.url === "/styles.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  }
});
await new Promise((resolve) => server.listen(3197, "127.0.0.1", resolve));
let browser;
let count = 0;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : {}),
  });
  for (const locale of ["en", "es"])
    for (const theme of ["light", "dark"])
      for (const [width, height] of [
        [360, 800],
        [600, 960],
        [1536, 960],
        [640, 400],
      ])
        for (const route of [
          "support",
          "creators",
          "catalogue",
          "venue",
          "admin",
        ]) {
          const page = await browser.newPage({ viewport: { width, height } });
          const pageErrors = [];
          page.on("pageerror", (error) => pageErrors.push(error.message));
          const query = new URLSearchParams({
            route,
            kind: "events",
            q: "Summer & sun",
            status: "published",
            error: "moderation",
            event: "20000000-0000-4000-8000-000000000001",
          });
          await page.goto(
            `http://127.0.0.1:3197/${locale}/${route === "admin" ? "admin" : `staff/${route}`}?${query}`,
          );
          await page.waitForFunction(
            () => window.__staffUIReady || window.__staffUIError,
          );
          expect(
            await page.evaluate(() => window.__staffUIError || null),
          ).toBeNull();
          await page.evaluate((value) => {
            document.documentElement.dataset.theme = value;
            document.documentElement.classList.toggle("dark", value === "dark");
          }, theme);
          if (route === "venue") {
            const event = page.locator(
              "#event-20000000-0000-4000-8000-000000000001",
            );
            await expect(event).toHaveAttribute("open", "");
            await expect(
              event.getByRole("button", {
                name: locale === "es" ? "Guardar evento" : "Save event",
              }),
            ).toBeVisible();
            await page.goto(
              `http://127.0.0.1:3197/${locale}/staff/venue?route=venue&event=30000000-0000-4000-8000-000000000001`,
            );
            await page.waitForFunction(() => window.__staffUIReady);
            await expect(page.locator("details[open]")).toHaveCount(0);
          } else {
            const retry = page.getByRole("link", {
              name: locale === "es" ? "Reintentar" : "Retry",
            });
            await expect(retry).toBeVisible();
            const box = await retry.boundingBox();
            expect(box?.height).toBeGreaterThanOrEqual(44 - 0.01);
            if (route === "catalogue") {
              const url = new URL(
                await retry.getAttribute("href"),
                "https://example.test",
              );
              expect(url.searchParams.get("q")).toBe("Summer & sun");
              expect(url.searchParams.get("status")).toBe("published");
            }
            if (route === "admin") {
              await expect(
                page.getByRole("heading", {
                  name:
                    locale === "es"
                      ? "2 asuntos conocidos requieren atención; faltan datos"
                      : "2 known items need attention; some data is unavailable",
                }),
              ).toBeVisible();
              await expect(
                page.getByRole("link", {
                  name: locale === "es" ? "Atender prioridad" : "Open priority",
                }),
              ).toHaveAttribute("href", `/${locale}/admin/privacy`);
            }
            await expect(page.getByText("Private fixture error")).toHaveCount(
              0,
            );
          }
          if (route !== "admin") {
            await expect(page.locator(".workspace-page-heading")).toHaveCount(
              0,
            );
            await expect(
              page.locator(".workspace-section-heading h1"),
            ).toHaveCount(1);
            const geometry = await page
              .locator(".workspace-section-heading")
              .evaluate((header) => {
                const bounds = header.getBoundingClientRect();
                return Array.from(header.querySelectorAll("span,h1,p")).map(
                  (node) => {
                    const range = document.createRange();
                    range.selectNodeContents(node);
                    const text = range.getBoundingClientRect();
                    return {
                      left: text.left - bounds.left,
                      right: bounds.right - text.right,
                    };
                  },
                );
              });
            for (const bounds of geometry) {
              expect(bounds.left).toBeGreaterThanOrEqual(8);
              expect(bounds.right).toBeGreaterThanOrEqual(8);
            }
          }
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          ).toBe(true);
          expect(pageErrors).toEqual([]);
          if (width === 360 || width === 1536)
            await page.screenshot({
              path: `${directory}/${route}-${locale}-${theme}-${width}.png`,
              fullPage: true,
            });
          await page.close();
          count++;
          console.log(
            `PASS staff/admin ${route} ${locale} ${theme} ${width}x${height}`,
          );
        }
  console.log(`PASS ${count} Staff/Admin browser combinations`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
