import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, extname } from "node:path";

// Real async Staff/Admin loaders, workspace layouts and production CSS.
// Auth/database reads and actions are disposable; no production writes or provider calls.
const directory = resolve("test-results/staff-ui-upgrades");
mkdirSync(directory, { recursive: true });
const entry = `
import React from 'react';import{createRoot}from'react-dom/client';
import StaffLayout from './src/app/[locale]/staff/layout';
import OverviewPage from './src/app/[locale]/staff/page';
import {AppShell} from './src/components/AppShell';
import {requireUser} from '@/lib/auth';
import AdminLayout from './src/app/[locale]/admin/layout';
import SupportPage from './src/app/[locale]/staff/support/page';
import CreatorPage from './src/app/[locale]/staff/creators/page';
import CataloguePage from './src/app/[locale]/staff/catalogue/page';
import VenuePage from './src/app/[locale]/staff/catalogue/venues/[id]/page';
import AdminPage from './src/app/[locale]/admin/page';
const pages={overview:OverviewPage,support:SupportPage,creators:CreatorPage,catalogue:CataloguePage,venue:VenuePage,admin:AdminPage};
const query=new URLSearchParams(location.search);const locale=location.pathname.startsWith('/es/')?'es':'en';window.__staffFixtureWrites=[];
const route=query.get('route')||'support';document.documentElement.lang=locale;document.documentElement.dataset.theme=query.get('theme')||'dark';const root=createRoot(document.getElementById('root'));
(async()=>{try{
 const props={params:Promise.resolve({locale,id:'10000000-0000-4000-8000-000000000001'}),searchParams:Promise.resolve(Object.fromEntries(query))};
 const content=await pages[route](props);const Layout=route==='admin'?AdminLayout:StaffLayout;
 const {supabase,user}=await requireUser();const actor=await supabase.from('profiles').select('app_role').eq('id',user.id).maybeSingle();root.render(<AppShell locale={locale} signedIn={Boolean(user)} role={actor.data.app_role}>{await Layout({...props,children:content})}</AppShell>);
 requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__staffUIReady=true}));
}catch(error){window.__staffUIError=String(error.stack||error);console.error(error)}})();`;
const authAdapter = `
const event={id:'20000000-0000-4000-8000-000000000001',venue_id:'10000000-0000-4000-8000-000000000001',title_es:'Concierto de verano',title_en:'Summer concert',description_es:'Descripción de un evento de ejemplo',description_en:'Description of a sample event',status:'published',price_cents:0,booking_url:'',venues:{name:'Fixture venue'}};
export async function requireUser(){const query=new URLSearchParams(location.search);const route=query.get('route'),fixture=query.get('fixture');const healthy=['healthy-populated','healthy-empty'].includes(fixture),populated=fixture==='healthy-populated';const failed=fixture!=='success'&&!healthy;return{user:{id:'staff-browser-fixture'},supabase:{from(table){
 const report={id:'95000000-0000-4000-8000-000000000081',target_type:'event',target_id:event.id,reason:'incorrect',details:'Disposable report: verify this submitted information before resolving.',state:'open',created_at:'2026-10-29T12:00:00Z'};
 const creator={profile_id:'95000000-0000-4000-8000-000000000082',slug:'disposable-review-creator',display_name:'Disposable creator review',headline_es:'Creador de prueba para revisión',headline_en:'Disposable creator awaiting review',bio_es:'Biografía de prueba para revisar identidad y presencia pública.',bio_en:'Disposable biography for identity and public-presence review.',locality:'Málaga',province:'Málaga',avatar_url:null,website_url:'https://example.invalid/creator',instagram_url:'https://example.invalid/instagram',youtube_url:'https://example.invalid/youtube',updated_at:'2026-10-29T12:00:00Z'};
 const data=table==='profiles'?{app_role:'administrator'}:healthy&&table==='reports'&&route==='support'?(populated?[report]:[]):healthy&&table==='creator_profiles'&&route==='creators'?(populated?[creator]:[]):table==='venues'&&route==='venue'?{id:event.venue_id,name:'Fixture venue',slug:'fixture-venue',address:'Fixture street 1',status:'published',verified:true,description_es:'Descripción de un local de ejemplo',description_en:'Description of a sample venue'}:table==='events'?[event]:[];
 const failedTable={support:'reports',creators:'creator_profiles',catalogue:'events',admin:'business_applications'}[route];
 const result=()=>({data,error:failed&&table===failedTable?{message:'Private fixture error'}:null,count:route==='overview'&&['venues','events','offers','event_submissions','car_rental_companies','reports'].includes(table)?3:table==='account_deletion_requests'?2:0});
 const request={select:()=>request,eq:()=>request,in:()=>request,order:()=>request,limit:()=>request,or:()=>request,ilike:()=>request,maybeSingle:async()=>result(),then:r=>Promise.resolve(result()).then(r)};return request;
},rpc:async()=>({data:0,error:null})}}}`;
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
        builder.onResolve(
          { filter: /^next\/(link|navigation|image)$/ },
          (args) => ({
            path: args.path,
            namespace: "staff-fixture",
          }),
        );
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
                  ? "export async function signOut(){throw new Error('Sign-out is outside disposable staff fixture scope')}export async function resolveReport(){window.__staffFixtureWrites.push('resolveReport');throw Error('Staff fixture forbids actions')}export async function moderateCreator(){window.__staffFixtureWrites.push('moderateCreator');throw Error('Staff fixture forbids actions')}export async function reviewBusinessApplication(){}export async function operatorDeleteCatalogueItem(){}export async function operatorUpdateEvent(){}export async function operatorUpdateVenue(){}"
                  : args.path === "address"
                    ? 'import React from "react";export function SpainAddressAutocomplete(){return <input aria-label="Address" defaultValue="Fixture street 1"/>}'
                    : args.path === "next/image"
                      ? 'import React from "react";export default function Image({fill,priority,sizes,unoptimized,...props}){return <img {...props}/>;} '
                      : args.path === "next/link"
                        ? 'import React from "react";export default function Link({children,prefetch,replace,scroll,...props}){return <a {...props}>{children}</a>}'
                        : 'export function useRouter(){return{push(){},refresh(){}}}export function usePathname(){return location.pathname}export function useSearchParams(){return new URLSearchParams(location.search)}export function notFound(){throw new Error("not-found")}export function redirect(href){throw new Error("redirect:"+href)}',
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
        .concat(
          [
            ...readFileSync("src/app/layout.tsx", "utf8").matchAll(
              /import\s+["'](\.\/[^"']+\.css)["'];/g,
            ),
          ]
            .map((match) => resolve("src/app", match[1]))
            .filter(
              (path) =>
                ![
                  "globals.css",
                  "compact-app.css",
                  "brand.css",
                  "appearance.css",
                  "tablet-responsive.css",
                ].includes(path.split("/").at(-1)),
            ),
        )
        .map((path) => readFileSync(path, "utf8"))
        .join("\n"),
      { from: resolve("src/app/globals.css") },
    )
  ).css +
  (bundle.outputFiles.find((file) => file.path.endsWith(".css"))?.text || "");
const records = [];
const healthyQueueRecords = [];
const sourcePaths = [
  "scripts/test-staff-ui-upgrades-browser.mjs",
  "src/app/[locale]/staff/page.tsx",
  "src/app/[locale]/staff/layout.tsx",
  "src/app/[locale]/staff/staff-ui.css",
  "src/app/[locale]/staff/staff-overview.css",
  "src/app/[locale]/staff/support/page.tsx",
  "src/app/[locale]/staff/creators/page.tsx",
  "src/app/[locale]/staff/creators/actions.ts",
  "src/app/[locale]/moderation/actions.ts",
  "src/components/AppShell.tsx",
  "src/components/WorkspaceShell.tsx",
  "src/components/PasaCinematic.css",
  "src/components/PasaSharedSurfaces.css",
];
const sourceHashes = () =>
  Object.fromEntries(
    sourcePaths.map((path) => [
      path,
      createHash("sha256").update(readFileSync(path)).digest("hex"),
    ]),
  );
const initialHashes = sourceHashes();
function rgba(value) {
  const parts = value.match(/[\d.]+/g).map(Number);
  return [...parts.slice(0, 3), parts[3] ?? 1];
}
function composite(foreground, background) {
  return foreground
    .slice(0, 3)
    .map(
      (channel, index) =>
        channel * foreground[3] + background[index] * (1 - foreground[3]),
    );
}
function luminance(color) {
  return color
    .map((channel) => {
      const v = channel / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, v, index) => sum + v * [0.2126, 0.7152, 0.0722][index], 0);
}
function contrast(foreground, background) {
  const a = luminance(composite(foreground, background)),
    b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
async function assertStaffOverview(page, state) {
  await expect(page.locator(".staff-dashboard-hero h2")).toContainText(
    state.locale === "es" ? "15 asuntos" : "15 items",
  );
  expect(
    await page.locator(".staff-dashboard-metric strong").allTextContents(),
  ).toEqual(["15", "0", "3", "3", "3"]);
  const paint = await page.locator(".staff-dashboard-hero").evaluate((hero) => {
    const heroStyle = getComputedStyle(hero);
    return [
      ...hero.querySelectorAll(
        ".staff-dashboard-hero-copy p,.staff-dashboard-hero-actions a",
      ),
    ].map((element) => {
      const style = getComputedStyle(element);
      return {
        text: element.textContent,
        foreground: style.color,
        background: style.backgroundColor,
        image: style.backgroundImage,
        heroBackground: heroStyle.backgroundColor,
        heroImage: heroStyle.backgroundImage,
      };
    });
  });
  for (const item of paint) {
    const base = rgba(item.heroBackground);
    expect(base[3], "hero has an opaque base for compositing").toBe(1);
    let backgrounds = [
      base.slice(0, 3),
      ...[...item.heroImage.matchAll(/rgba?\([^)]+\)/g)].map((match) =>
        composite(rgba(match[0]), base),
      ),
    ];
    const own = rgba(item.background);
    backgrounds = backgrounds.map((background) => composite(own, background));
    // Include conservative channel bounds, covering all gradient interpolations.
    backgrounds.push(
      [0, 1, 2].map((i) => Math.max(...backgrounds.map((bg) => bg[i]))),
      [0, 1, 2].map((i) => Math.min(...backgrounds.map((bg) => bg[i]))),
    );
    const minimum = Math.min(
      ...backgrounds.map((background) =>
        contrast(rgba(item.foreground), background),
      ),
    );
    expect(
      minimum,
      JSON.stringify({ state, item, minimum }),
    ).toBeGreaterThanOrEqual(4.5);
    item.minimumContrast = minimum;
  }
  const trigger = page.locator(".workspace-mobile-trigger");
  if (await trigger.isVisible()) {
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".workspace-drawer")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
    await expect(page.locator(".workspace-drawer")).toHaveCount(0);
  }
  const links = page.locator(".staff-dashboard-hero-actions a");
  const hitTargets = [];
  for (const link of await links.all()) {
    await link.scrollIntoViewIfNeeded();
    await link.focus();
    const hit = await link.evaluate((element) => ({
      href: element.getAttribute("href"),
      rectangles: [...element.getClientRects()].map((rect) => ({
        height: rect.height,
        hit: element.contains(
          document.elementFromPoint(
            rect.x + rect.width / 2,
            rect.y + rect.height / 2,
          ),
        ),
      })),
    }));
    for (const rect of hit.rectangles) {
      expect(rect.height).toBeGreaterThanOrEqual(44);
      expect(rect.hit, "hero action unobscured by closed drawer/dock").toBe(
        true,
      );
    }
    hitTargets.push(hit);
  }
  records.push({ ...state, paint, hitTargets });
}
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundle.outputFiles.find((file) => file.path.endsWith(".js")).text);
  } else if (req.url === "/styles.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else if (
    /^\/(?:brand|images)\/[a-z0-9/-]+\.(svg|png|webp)$/.test(
      new URL(req.url, "http://localhost").pathname,
    ) &&
    existsSync(
      resolve("public", new URL(req.url, "http://localhost").pathname.slice(1)),
    )
  ) {
    const asset = resolve(
      "public",
      new URL(req.url, "http://localhost").pathname.slice(1),
    );
    res.setHeader(
      "Content-Type",
      extname(asset) === ".svg"
        ? "image/svg+xml"
        : "image/" + extname(asset).slice(1),
    );
    res.end(readFileSync(asset));
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
        [820, 1180],
        [1536, 960],
        [640, 400],
      ])
        for (const route of [
          "overview",
          "support",
          "creators",
          "catalogue",
          "venue",
          "admin",
        ]) {
          const page = await browser.newPage({ viewport: { width, height } });
          await page.route("**/*", (request) =>
            new URL(request.request().url()).origin === "http://127.0.0.1:3197"
              ? request.continue()
              : request.abort(),
          );
          const pageErrors = [];
          page.on("pageerror", (error) => pageErrors.push(error.message));
          const query = new URLSearchParams({
            route,
            theme,
            kind: "events",
            q: "Summer & sun",
            status: "published",
            error: "moderation",
            event: "20000000-0000-4000-8000-000000000001",
          });
          await page.goto(
            `http://127.0.0.1:3197/${locale}/${route === "admin" ? "admin" : route === "overview" ? "staff" : `staff/${route}`}?${query}`,
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
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
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
            const missingEventQuery = new URLSearchParams(query);
            missingEventQuery.set(
              "event",
              "30000000-0000-4000-8000-000000000001",
            );
            await page.goto(
              `http://127.0.0.1:3197/${locale}/staff/venue?${missingEventQuery}`,
            );
            await page.waitForFunction(() => window.__staffUIReady);
            await page.evaluate((value) => {
              document.documentElement.dataset.theme = value;
              document.documentElement.classList.toggle(
                "dark",
                value === "dark",
              );
            }, theme);
            await expect(page.locator("html")).toHaveAttribute(
              "data-theme",
              theme,
            );
            await expect(
              page.locator(".workspace-grid-body details[open]"),
            ).toHaveCount(0);
          } else if (route !== "overview") {
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
          if (route !== "admin" && route !== "overview") {
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
          if (route === "overview")
            await assertStaffOverview(page, { locale, theme, width, height });
          if (route === "overview" || width === 360 || width === 1536)
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
  expect(count, "preserve every original Staff/Admin case").toBe(120);
  console.log(`PASS ${count} Staff/Admin browser combinations`);
  for (const locale of ["en", "es"])
    for (const theme of ["light", "dark"])
      for (const width of [360, 390, 820, 1440])
        for (const route of ["support", "creators"])
          for (const state of ["populated", "empty"]) {
            const page = await browser.newPage({
              viewport: { width, height: 900 },
              reducedMotion: "reduce",
              ...(width < 700 ? { isMobile: true, hasTouch: true } : {}),
            });
            const pageErrors = [],
              externalRequests = [],
              mutationRequests = [];
            page.on("pageerror", (error) => pageErrors.push(error.message));
            await page.route("**/*", (request) => {
              const actual = request.request();
              if (new URL(actual.url()).origin !== "http://127.0.0.1:3197") {
                externalRequests.push(actual.url());
                return request.abort();
              }
              if (!["GET", "HEAD"].includes(actual.method())) {
                mutationRequests.push(actual.method());
                return request.abort();
              }
              return request.continue();
            });
            const query = new URLSearchParams({
              route,
              theme,
              fixture: `healthy-${state}`,
            });
            await page.goto(
              `http://127.0.0.1:3197/${locale}/staff/${route}?${query}`,
            );
            await page.waitForFunction(
              () => window.__staffUIReady || window.__staffUIError,
            );
            expect(
              await page.evaluate(() => window.__staffUIError || null),
            ).toBeNull();
            await page.evaluate((value) => {
              document.documentElement.dataset.theme = value;
              document.documentElement.classList.toggle(
                "dark",
                value === "dark",
              );
            }, theme);
            await expect(page.locator("html")).toHaveAttribute(
              "data-theme",
              theme,
            );
            await expect(page.locator(".staff-workspace h1")).toHaveCount(1);
            await expect(page.getByRole("alert")).toHaveCount(0);
            const forms = page.locator(".staff-workspace form");
            const decisionHeights = [];
            let localityBadgeContrast = null;
            await expect(forms).toHaveCount(state === "populated" ? 1 : 0);
            if (state === "empty") {
              await expect(
                page.getByText(
                  route === "support"
                    ? locale === "es"
                      ? "Sin casos abiertos"
                      : "No open cases"
                    : locale === "es"
                      ? "No hay solicitudes pendientes."
                      : "No pending requests.",
                  { exact: true },
                ),
              ).toBeVisible();
            } else {
              const form = forms.first();
              const field = form.locator(
                route === "support" ? '[name="resolution"]' : '[name="reason"]',
              );
              await expect(field).toHaveAttribute("required", "");
              await expect(field).toHaveAttribute("minlength", "3");
              await expect(form.locator('[name="locale"]')).toHaveValue(locale);
              await expect(
                form.locator(
                  route === "support"
                    ? '[name="reportId"]'
                    : '[name="profileId"]',
                ),
              ).toHaveValue(
                route === "support"
                  ? "95000000-0000-4000-8000-000000000081"
                  : "95000000-0000-4000-8000-000000000082",
              );
              expect(await form.evaluate((node) => node.checkValidity())).toBe(
                false,
              );
              await field.fill("no");
              expect(await form.evaluate((node) => node.checkValidity())).toBe(
                false,
              );
              await field.fill(
                "Detailed disposable review reason. No action is submitted.",
              );
              expect(await form.evaluate((node) => node.checkValidity())).toBe(
                true,
              );
              const decisions = form.locator('button[name="decision"]');
              expect(
                await decisions.evaluateAll((nodes) =>
                  nodes.map((node) => node.value),
                ),
              ).toEqual(
                route === "support"
                  ? ["resolved", "dismissed"]
                  : ["verified", "rejected"],
              );
              await field.focus();
              await page.keyboard.press("Tab");
              await expect(decisions.first()).toBeFocused();
              for (const button of await decisions.all()) {
                await button.scrollIntoViewIfNeeded();
                const hit = await button.evaluate((node) => {
                  const box = node.getBoundingClientRect();
                  return node.contains(
                    document.elementFromPoint(
                      box.x + box.width / 2,
                      box.y + box.height / 2,
                    ),
                  );
                });
                expect(
                  hit,
                  "decision button remains reachable without submitting",
                ).toBe(true);
                const size = await button.boundingBox();
                decisionHeights.push(size.height);
                expect(
                  size.height,
                  "native decision target minimum",
                ).toBeGreaterThanOrEqual(44);
                expect(
                  size.height,
                  "single-line decisions must not inflate into tall panels",
                ).toBeLessThanOrEqual(72);
              }
              if (route === "support") {
                await expect(
                  page.getByText(
                    "Disposable report: verify this submitted information before resolving.",
                  ),
                ).toBeVisible();
              } else {
                await expect(
                  page.getByRole("heading", {
                    name: "Disposable creator review",
                  }),
                ).toBeVisible();
                await expect(
                  page.getByText(
                    locale === "es"
                      ? "Biografía de prueba para revisar identidad y presencia pública."
                      : "Disposable biography for identity and public-presence review.",
                  ),
                ).toBeVisible();
                for (const link of await page
                  .locator(".creator-socials a")
                  .all()) {
                  expect(await link.getAttribute("href")).toMatch(
                    /^https:\/\/example\.invalid\//,
                  );
                  await expect(link).toHaveAttribute("target", "_blank");
                  await expect(link).toHaveAttribute("rel", "noreferrer");
                }
                const badgePaint = await page
                  .locator(".creator-review-queue .pill-muted")
                  .evaluate((badge) => {
                    const canvas = document.createElement("canvas");
                    canvas.width = canvas.height = 1;
                    const context = canvas.getContext("2d");
                    const style = getComputedStyle(badge);
                    context.fillStyle = getComputedStyle(
                      badge.closest(".panel"),
                    ).backgroundColor;
                    context.fillRect(0, 0, 1, 1);
                    context.fillStyle = style.backgroundColor;
                    context.fillRect(0, 0, 1, 1);
                    const background = [
                      ...context.getImageData(0, 0, 1, 1).data,
                    ].slice(0, 3);
                    context.clearRect(0, 0, 1, 1);
                    context.fillStyle = style.color;
                    context.fillRect(0, 0, 1, 1);
                    const foreground = [
                      ...context.getImageData(0, 0, 1, 1).data,
                    ];
                    foreground[3] /= 255;
                    return { foreground, background };
                  });
                localityBadgeContrast = contrast(
                  badgePaint.foreground,
                  badgePaint.background,
                );
                expect(
                  localityBadgeContrast,
                  "creator locality badge text contrast",
                ).toBeGreaterThanOrEqual(4.5);
              }
            }
            const geometry = await page.evaluate(() => ({
              width: innerWidth,
              document: document.documentElement.scrollWidth,
            }));
            expect(geometry.document).toBeLessThanOrEqual(width);
            expect(
              await page.evaluate(() => window.__staffFixtureWrites),
            ).toEqual([]);
            expect(pageErrors).toEqual([]);
            expect(externalRequests).toEqual([]);
            expect(mutationRequests).toEqual([]);
            const name = `${route}-${locale}-${theme}-${width}-healthy-${state}`;
            await page.screenshot({
              path: `${directory}/${name}-full.png`,
              fullPage: true,
            });
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.screenshot({ path: `${directory}/${name}-upper.png` });
            healthyQueueRecords.push({
              name,
              locale,
              theme,
              width,
              route,
              state,
              geometry,
              nativeValidityChecked: state === "populated",
              decisionHeights,
              localityBadgeContrast,
              writes: [],
              externalRequests,
              mutationRequests,
              pageErrors,
            });
            await page.close();
          }
  expect(healthyQueueRecords).toHaveLength(64);
  console.log(
    `PASS ${healthyQueueRecords.length} healthy Support/Creators cases; zero actions`,
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
  const finalHashes = sourceHashes();
  writeFileSync(
    resolve(directory, "staff-healthy-queues-evidence.json"),
    JSON.stringify(
      {
        fixtureOnly: true,
        actualNext: false,
        productionAuthRLS: false,
        physicalAndroid: false,
        sourceCommit: process.env.GITHUB_SHA || null,
        initialHashes,
        finalHashes,
        records: healthyQueueRecords,
        count: healthyQueueRecords.length,
        scope:
          "Actual Support/Creator page exports and AppShell/StaffLayout; synthetic DTOs and forbidden actions. Native form validity and focus only; no decisions submitted.",
      },
      null,
      2,
    ),
  );
  writeFileSync(
    resolve(directory, "staff-overview-evidence.json"),
    JSON.stringify(
      {
        fixtureOnly: true,
        actualNext: false,
        productionAuthRLS: false,
        physicalAndroid: false,
        initialHashes,
        finalHashes,
        records,
        count,
      },
      null,
      2,
    ),
  );
  expect(finalHashes, "source frozen during browser run").toEqual(
    initialHashes,
  );
}
