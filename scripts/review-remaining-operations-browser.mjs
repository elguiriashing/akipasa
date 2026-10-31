import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname, relative } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

// Bounded review capture for previously uncovered route compositions. The real
// page exports, StaffLayout/AppShell and CSS render; every identity/read is an
// explicitly synthetic adapter, every mutation throws, and external requests fail.
const directory = resolve("test-results/remaining-operations-review");
mkdirSync(directory, { recursive: true });
const sources = new Set(["scripts/review-remaining-operations-browser.mjs"]);
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';
import {AppShell} from './src/components/AppShell';
import StaffLayout from './src/app/[locale]/staff/layout';
import AccountLayout from './src/app/[locale]/account/layout';
import Audit from './src/app/[locale]/staff/audit/page';
import Moderation from './src/app/[locale]/staff/moderation/page';
import Promotions from './src/app/[locale]/staff/promotions/page';
import Apply from './src/app/[locale]/business/apply/page';
import Partner from './src/app/[locale]/business/early-partner/page';
import Venue from './src/app/[locale]/business/venue/[id]/page';
import Referrals from './src/app/[locale]/account/referrals/page';
import Operations from './src/app/[locale]/account/subscription/operations/page';
import {requireUser} from '@/lib/auth';
const q=new URLSearchParams(location.search),locale=location.pathname.split('/')[1];
const route=q.get('reviewRoute')||window.__reviewRoute;const pages={audit:Audit,moderation:Moderation,promotions:Promotions,apply:Apply,partner:Partner,venue:Venue,referrals:Referrals,operations:Operations};
window.__reviewWrites=[];window.__reviewReads=[];
document.documentElement.lang=locale;document.documentElement.dataset.theme=q.get('theme')||window.__reviewTheme||'dark';document.documentElement.classList.toggle('dark',document.documentElement.dataset.theme==='dark');
(async()=>{try{const props={params:Promise.resolve({locale,id:'f728f63d-8d57-443c-8f9b-777e2e271001'}),searchParams:Promise.resolve(Object.fromEntries(q))};
 const content=await pages[route](props);const {supabase,user}=await requireUser();
 const p=await supabase.from('profiles').select('app_role').eq('id',user.id).maybeSingle();
 const inside=['audit','moderation','promotions'].includes(route)?await StaffLayout({...props,children:content}):['referrals','operations'].includes(route)?await AccountLayout({...props,children:content}):content;
 createRoot(document.getElementById('root')).render(<AppShell locale={locale} signedIn={true} role={p.data.app_role}>{inside}</AppShell>);
 requestAnimationFrame(()=>requestAnimationFrame(()=>window.__reviewReady=true));
}catch(e){if(e.kind)window.__reviewContract={kind:e.kind,href:e.href||null};else window.__reviewError=String(e.stack||e);window.__reviewReady=true;}})();`;

const authAdapter = `
const uid='10000000-0000-4000-8000-000000000001',venue='10000000-0000-4000-8000-000000000003',claim='10000000-0000-4000-8000-000000000004';
function fixture(){const q=new URLSearchParams(location.search),state=q.get('state')||'populated',route=q.get('reviewRoute')||window.__reviewRoute,role=q.get('role')||(['audit','moderation','promotions'].includes(route)?'administrator':'consumer');
 const empty=state==='empty',failed=state==='failed';
 function data(table){
  if(table==='profiles')return {id:uid,app_role:role,full_name:'Disposable review operator',account_type:'business',email:'review@example.invalid'};
  if(table==='crm_workspaces')return empty?[]:[{id:venue,name:'Disposable venue workspace'}];
  if(route==='venue'){
   if(table==='venues')return {id:'f728f63d-8d57-443c-8f9b-777e2e271001',name:'Disposable owned venue',slug:'disposable-owned-venue',status:'published',discovery_vertical:'activities',description_es:'Local de prueba',description_en:'Disposable venue',address:'Fixture address',accessibility:{}};
   if(table==='venue_catalogues')return null;
   if(table==='venue_booking_settings')return empty?null:{mode:'request',external_url:null,booking_template:'experience'};
   if(table==='booking_notification_settings')return empty?null:{notification_email:'fixture@example.invalid'};
   return [];
  }
  if(table==='automatic_moderation_settings')return {enabled:false};
  if(table==='venue_claims')return empty?null:{id:claim,venue_id:venue,claimant_id:uid,status:'approved',venues:{id:venue,name:'Disposable approved venue',slug:'disposable-approved-venue',discovery_vertical:'activities'}};
  if(table==='claim_owner_feedback')return null;
  if(table==='business_applications')return empty?[]:[{id:claim,profile_id:uid,applicant_id:uid,business_name:'Disposable application',status:'pending',state:'pending',created_at:'2026-10-30T12:00:00Z'}];
  if(table==='promotion_requests')return empty?[]:[{id:claim,venue_id:venue,service:'featured_listing',message:'Disposable promotion request for a live music event.',state:'new',operator_notes:null,created_at:'2026-10-30T12:00:00Z',venues:{name:'Disposable review venue'}},{id:venue,venue_id:venue,service:'sponsored_event',message:'Disposable follow-up request.',state:'contacted',operator_notes:'Waiting for fixture artwork.',created_at:'2026-10-29T12:00:00Z',venues:{name:'Second disposable venue'}}];
  if(['venues','events','offers','event_submissions','car_rental_companies'].includes(table))return empty?[]:Array.from({length:2},(_,i)=>({id:'20000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),name:'Disposable venue '+i,title_en:'Disposable event '+i,title_es:'Evento de prueba '+i,title:'Disposable suggestion '+i,venue_name:'Fixture venue',address:'Fixture address',venue_address:'Fixture address',city:'Fixture city',created_at:'2026-10-29T10:00:00Z',submitted_by:uid,status:'pending',state:'pending'}));
  if(table==='venue_members')return [{venue_id:venue,profile_id:uid,role:'owner'}];
  throw Error('Unmodelled review table: '+table);
 }
 const supabase={from(table){const call={table,filters:[]};window.__reviewReads.push(call);const result=()=>{const value=data(table);const err=failed&&!['profiles','automatic_moderation_settings'].includes(table)&&(route!=='venue'||table==='venue_catalogues');return{data:err?null:value,error:err?{message:'Private fixture read error'}:null,count:err?null:Array.isArray(value)?value.length:0}};const chain={select(...a){call.select=a;return chain},eq(...a){call.filters.push(a);return chain},in(...a){call.filters.push(a);return chain},order(){return chain},limit(){return chain},range(){return chain},or(){return chain},ilike(){return chain},maybeSingle:async()=>{const r=result();if(Array.isArray(r.data))r.data=r.data[0]||null;return r},single:async()=>{const r=result();if(Array.isArray(r.data))r.data=r.data[0]||null;return r},then:r=>Promise.resolve(result()).then(r)};return chain},async rpc(name,args){window.__reviewReads.push({rpc:name,args});if(route==='venue')return {data:name==='is_venue_member',error:null};if(name==='claim_partner_reward_status')return {data:state==='granted'?{state:'granted',expires_at:'2027-01-30T12:00:00Z'}:{state:'pending'},error:null};if(name==='crm_operations_initial_state')return {data:{initial_open:state!=='scheduled',tools:['pos']},error:null};if(name==='crm_operations_scheduled_change')return{data:state==='scheduled'?{tier:'standard',effective_at:'2026-12-01T00:00:00Z',state:'scheduled'}:null,error:null};if(name==='crm_operations_migration_status')return{data:{tier:'basico'},error:null};if(/claim.*review|review.*claim|claim.*queue/.test(name))return {data:[],error:null};throw Error('Unmodelled review RPC: '+name)}};
 return{user:{id:uid,email:'review@example.invalid',email_confirmed_at:'2026-10-29T12:00:00Z'},supabase};
}
export async function requireUser(locale,next){const role=new URLSearchParams(location.search).get('role');if(role==='guest')throw Object.assign(new Error('redirect'),{kind:'redirect',href:'/'+locale+'/auth?next='+encodeURIComponent(next||location.pathname)});return fixture()}
export const requireBusinessAccess=requireUser;
export function getReviewClient(){return fixture().supabase}
`;

function actionModule(args) {
  const source = readFileSync(args.importer, "utf8");
  const escaped = args.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `import\\s*\\{([^}]+)\\}\\s*from\\s*["']${escaped}["']`,
    "gs",
  );
  const names = [...source.matchAll(pattern)].flatMap((m) =>
    m[1]
      .split(",")
      .map((n) => n.trim().split(/\s+as\s+/)[0])
      .filter((n) => n && !n.startsWith("type ")),
  );
  const path = args.path.startsWith("@/")
    ? resolve("src", args.path.slice(2))
    : resolve(args.resolveDir, args.path);
  for (const suffix of [".ts", ".tsx", "/index.ts"])
    if (existsSync(path + suffix))
      sources.add(relative(process.cwd(), path + suffix));
  if (!names.length)
    throw Error(`Could not bind action exports for ${args.path}`);
  return names
    .map(
      (name) =>
        `export async function ${name}(){window.__reviewWrites.push('${name}');throw Error('Review mutations are forbidden')}`,
    )
    .join("\n");
}
const replacements = new Map();
const bundle = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  metafile: true,
  outdir: resolve(directory, "bundle"),
  platform: "browser",
  format: "esm",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [
    {
      name: "remaining-operations-disposable-adapters",
      setup(b) {
        b.onResolve({ filter: /^@\/lib\/auth$/ }, () => ({
          path: "auth",
          namespace: "review-fixture",
        }));
        b.onResolve({ filter: /^@\/lib\/entitlements$/ }, (a) =>
          a.importer.includes("/business/venue/")
            ? { path: "entitlements", namespace: "review-fixture" }
            : null,
        );
        b.onResolve(
          { filter: /^next\/(link|navigation|image|headers)$/ },
          (a) => ({ path: a.path, namespace: "review-fixture" }),
        );
        b.onResolve({ filter: /^server-only$/ }, () => ({
          path: "empty",
          namespace: "review-fixture",
        }));
        b.onResolve({ filter: /(?:^|\/)(?:[a-z-]*actions)$/ }, (a) => {
          const key = "action:" + a.importer + ":" + a.path;
          replacements.set(key, actionModule(a));
          return { path: key, namespace: "review-fixture" };
        });
        b.onLoad({ filter: /.*/, namespace: "review-fixture" }, (a) => ({
          contents:
            a.path === "auth"
              ? authAdapter
              : a.path === "entitlements"
                ? `export {requireBusinessAccess} from '@/lib/auth'`
                : a.path.startsWith("action:")
                  ? replacements.get(a.path)
                  : a.path === "empty"
                    ? ""
                    : a.path === "next/link"
                      ? `import React from 'react';export default function Link({children,prefetch,replace,scroll,...p}){return <a {...p}>{children}</a>}`
                      : a.path === "next/image"
                        ? `import React from 'react';export default function Image({fill,priority,sizes,unoptimized,...p}){return <img {...p}/>} `
                        : a.path === "next/headers"
                          ? `export async function headers(){return new Headers({host:'akipasa.com'})}export async function cookies(){return{get(){},getAll(){return[]}}}`
                          : `export function usePathname(){return location.pathname}export function useSearchParams(){return new URLSearchParams(location.search)}export function useRouter(){return{push(h){location.assign(h)},refresh(){location.reload()}}}export function redirect(href){throw Object.assign(new Error('redirect'),{kind:'redirect',href})}export function notFound(){throw Object.assign(new Error('not-found'),{kind:'not-found'})}`,
          loader: "jsx",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
for (const p of Object.keys(bundle.metafile.inputs))
  if (existsSync(p) && !p.includes("node_modules/")) sources.add(p);
const cssPaths = [
  ...readFileSync("src/app/layout.tsx", "utf8").matchAll(
    /import\s+["'](\.\/[^"']+\.css)["'];/g,
  ),
].map((m) => resolve("src/app", m[1]));
for (const p of cssPaths) sources.add(relative(process.cwd(), p));
const css =
  (
    await postcss([tailwind()]).process(
      cssPaths.map((p) => readFileSync(p, "utf8")).join("\n"),
      { from: resolve("src/app/globals.css") },
    )
  ).css + (bundle.outputFiles.find((f) => f.path.endsWith(".css"))?.text || "");
const script = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text;
const hashes = () =>
  Object.fromEntries(
    [...sources]
      .sort()
      .map((p) => [
        p,
        createHash("sha256").update(readFileSync(p)).digest("hex"),
      ]),
  );
const initialHashes = hashes();
const sourceChangesFromBase = Object.fromEntries(
  Object.entries(initialHashes).flatMap(([path, hash]) => {
    try {
      const baseHash = createHash("sha256")
        .update(
          execFileSync("git", ["show", `HEAD:${path}`], {
            stdio: ["ignore", "pipe", "ignore"],
          }),
        )
        .digest("hex");
      return baseHash === hash ? [] : [[path, { baseHash, testedHash: hash }]];
    } catch {
      return [[path, { baseHash: null, testedHash: hash }]];
    }
  }),
);
writeFileSync(resolve(directory, "bundle.js"), script);
writeFileSync(resolve(directory, "styles.css"), css);
if (process.argv.includes("--build-only")) {
  console.log(
    "Compiled actual review pages and layouts with",
    sources.size,
    "source bindings",
  );
  process.exit(0);
}
const server = createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (path === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(script);
    return;
  }
  if (path === "/styles.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
    return;
  }
  const file = resolve("public", "." + path);
  if (file.startsWith(resolve("public") + "/") && existsSync(file)) {
    res.setHeader(
      "Content-Type",
      { ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" }[
        extname(file)
      ] || "application/octet-stream",
    );
    res.end(readFileSync(file));
    return;
  }
  res.setHeader("Content-Type", "text/html");
  res.end(
    '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>',
  );
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = "http://127.0.0.1:" + server.address().port;
const results = [];
let browser;
let browserVersion;
const contexts = [
  { locale: "en", theme: "light", width: 360 },
  { locale: "es", theme: "dark", width: 390 },
  { locale: "en", theme: "dark", width: 1440 },
  { locale: "es", theme: "light", width: 820 },
];
const selected = (
  process.env.REVIEW_ROUTES ||
  "audit,moderation,promotions,apply,partner,venue,referrals,operations"
).split(",");
try {
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : {}),
  });
  browserVersion = browser.version();
  for (const route of selected) {
    const states = ["audit", "referrals", "apply"].includes(route)
      ? ["populated"]
      : route === "operations"
        ? ["populated", "empty", "failed", "scheduled"]
        : ["populated", "empty", "failed"];
    for (const config of contexts)
      for (const state of states) {
        const name = [
          route,
          config.locale,
          config.theme,
          config.width,
          state,
        ].join("-");
        const context = await browser.newContext({
          viewport: { width: config.width, height: 900 },
          reducedMotion: "reduce",
          isMobile: config.width < 500,
          hasTouch: config.width < 500,
        });
        const page = await context.newPage();
        await page.addInitScript(
          ({ route, theme }) => {
            window.__reviewRoute = route;
            window.__reviewTheme = theme;
          },
          { route, theme: config.theme },
        );
        const errors = [],
          external = [],
          mutations = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.route("**/*", (r) => {
          const req = r.request();
          if (new URL(req.url()).origin !== origin) {
            external.push(req.url());
            return r.abort();
          }
          if (!["GET", "HEAD"].includes(req.method())) {
            mutations.push(req.method());
            return r.abort();
          }
          return r.continue();
        });
        const pathname = ["audit", "moderation", "promotions"].includes(route)
          ? "/staff/" + route
          : route === "referrals"
            ? "/account/referrals"
            : route === "operations"
              ? "/account/subscription/operations"
              : route === "venue"
                ? "/business/venue/f728f63d-8d57-443c-8f9b-777e2e271001"
                : "/business/" +
                  (route === "partner" ? "early-partner" : "apply");
        const q = new URLSearchParams({
          reviewRoute: route,
          theme: config.theme,
          state,
          queue: "venues",
          section:
            route === "venue" && state !== "populated"
              ? "catalogue"
              : "overview",
          claim: "10000000-0000-4000-8000-000000000004",
        });
        if (route === "operations" && state === "failed") {
          q.set("workspace", "10000000-0000-4000-8000-000000000003");
          q.set("tier", "standard");
        }
        await page.goto(origin + "/" + config.locale + pathname + "?" + q);
        await page.waitForFunction(() => window.__reviewReady, null, {
          timeout: 15000,
        });
        const error = await page.evaluate(() => window.__reviewError || null);
        expect(error, name).toBeNull();
        const contract = await page.evaluate(
          () => window.__reviewContract || null,
        );
        let controls = [];
        let nativeChecks = {};
        let retryRecovery = null;
        let readsBeforeRecovery = null;
        if (route === "audit")
          expect(contract).toEqual({
            kind: "redirect",
            href: "/" + config.locale + "/admin/audit",
          });
        else if (route === "partner" && ["empty", "failed"].includes(state)) {
          expect(
            contract,
            "No approved readable claim means no private feedback form",
          ).toEqual({ kind: "not-found", href: null });
        } else {
          expect(contract, name).toBeNull();
          await expect(page.locator(".app-shell")).toBeVisible();
          await expect(
            page.locator("main").getByRole("heading").first(),
          ).toBeVisible();
          const trigger = page.locator(".workspace-mobile-trigger");
          if (await trigger.isVisible()) {
            await trigger.focus();
            await page.keyboard.press("Enter");
            await expect(trigger).toHaveAttribute("aria-expanded", "true");
            await page.keyboard.press("Escape");
            await expect(trigger).toHaveAttribute("aria-expanded", "false");
            await expect(trigger).toBeFocused();
          }
          const geometry = await page.evaluate(() => ({
            viewport: innerWidth,
            document: document.documentElement.scrollWidth,
          }));
          expect(geometry.document, name).toBeLessThanOrEqual(
            geometry.viewport + 2,
          );
          if (route === "promotions" && state === "populated") {
            const cards = page.locator(".staff-promotions-card");
            await expect(cards).toHaveCount(2);
            const search = page.getByRole("searchbox");
            await search.fill("Second disposable");
            await expect(cards).toHaveCount(1);
            await search.fill("");
            await expect(cards).toHaveCount(2);
            const detail = cards.first().locator("summary");
            await detail.focus();
            await page.keyboard.press("Enter");
            await expect(cards.first()).toHaveAttribute("open", "");
            await page.keyboard.press("Enter");
            await expect(cards.first()).not.toHaveAttribute("open", "");
          }
          if (route === "referrals") {
            await expect(page.locator("main form")).toHaveCount(0);
            expect(
              (await page.evaluate(() => window.__reviewReads)).filter((x) =>
                /referral/i.test(x.table || x.rpc || ""),
              ),
            ).toEqual([]);
          }
          if (route === "apply") {
            const address = page.locator('main input[role="combobox"]');
            await expect(address).toBeVisible();
            const form = page.locator("main form").first();
            expect(
              await form.evaluate((element) => element.checkValidity()),
            ).toBe(false);
            nativeChecks.requiredFieldsRejectEmptySubmission = true;
          }
          if (route === "partner") {
            const optIn = page.locator('main input[type="checkbox"]');
            await expect(optIn).toHaveCount(1);
            await expect(optIn).not.toBeChecked();
            nativeChecks.contactOptInDefaultsUnchecked = true;
          }
          if (route === "operations") {
            if (state === "failed") {
              await expect(page.locator('main [role="alert"]')).toContainText(
                config.locale === "en"
                  ? "We couldn’t load your locations. Retry before choosing a package."
                  : "No se pudieron cargar tus ubicaciones. Vuelve a intentarlo antes de elegir un paquete.",
              );
              await expect(page.locator("main form")).toHaveCount(0);
              await expect(page.locator('main a[href*="/hq"]')).toHaveCount(0);
              await expect(
                page.getByRole("link", {
                  name: /private location|ubicación privada/i,
                }),
              ).toHaveCount(0);
              expect(
                (await page.evaluate(() => window.__reviewReads)).filter(
                  (read) => /crm_operations_/.test(read.rpc || ""),
                ),
              ).toEqual([]);
              nativeChecks.failedReadWithholdsDependentFormsAndRpc = true;
            }
            const checkout = page.getByRole("button", {
              name:
                config.locale === "en"
                  ? "Confirm package and continue"
                  : "Confirmar paquete y continuar",
              exact: true,
            });
            if (await checkout.count()) await expect(checkout).toBeDisabled();
            const checkbox = page
              .locator('main input[type="checkbox"]')
              .first();
            if (await checkbox.count()) {
              const before = await checkbox.isChecked();
              await checkbox.focus();
              await page.keyboard.press("Space");
              await expect(checkbox).toBeChecked({ checked: !before });
              await page.keyboard.press("Space");
              await expect(checkbox).toBeChecked({ checked: before });
              nativeChecks.keyboardCheckboxToggleRestored = true;
            }
            nativeChecks.checkoutDisabledOrAbsent = true;
          }
          controls = await page
            .locator("main input, main select, main textarea, main button")
            .evaluateAll((elements) =>
              elements.map((element) => ({
                tag: element.tagName.toLowerCase(),
                type: element.getAttribute("type"),
                name: element.getAttribute("name"),
                label:
                  Array.from(element.labels || [])
                    .map((label) => label.textContent.trim())
                    .join(" ") ||
                  element.getAttribute("aria-label") ||
                  (element.tagName === "BUTTON"
                    ? element.textContent.trim()
                    : null),
                required: element.required || false,
                disabled: element.disabled || false,
                checked:
                  element.type === "checkbox" || element.type === "radio"
                    ? element.checked
                    : null,
              })),
            );
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({
            path: resolve(directory, name + ".png"),
            fullPage: true,
          });
          if (route === "operations" && state === "failed") {
            readsBeforeRecovery = await page.evaluate(
              () => window.__reviewReads,
            );
            const retry = page.getByRole("link", {
              name: config.locale === "en" ? "Retry" : "Reintentar",
              exact: true,
            });
            const retryTextLines = await retry.evaluate((element) => {
              const range = document.createRange();
              range.selectNodeContents(element);
              return range.getClientRects().length;
            });
            expect(retryTextLines, "Retry label remains on one line").toBe(1);
            nativeChecks.retryLabelDoesNotWrap = true;
            const href = await retry.getAttribute("href");
            const target = new URL(href, origin);
            expect(target.pathname).toBe("/" + config.locale + pathname);
            expect([...target.searchParams.entries()].sort()).toEqual([
              ["tier", "standard"],
              ["workspace", "10000000-0000-4000-8000-000000000003"],
            ]);
            // The next read is deliberately healthy. Native link navigation and
            // actual rerender are exercised; no provider recovery is inferred.
            await Promise.all([page.waitForURL(target.href), retry.click()]);
            await page.waitForFunction(() => window.__reviewReady);
            expect(
              await page.evaluate(() => window.__reviewError || null),
            ).toBeNull();
            await expect(page.locator('main [role="alert"]')).toHaveCount(0);
            await expect(
              page.getByRole("button", {
                name:
                  config.locale === "en"
                    ? "Confirm package and continue"
                    : "Confirmar paquete y continuar",
                exact: true,
              }),
            ).toBeDisabled();
            await page.screenshot({
              path: resolve(directory, name + "-recovered.png"),
              fullPage: true,
            });
            retryRecovery = {
              href,
              fixtureNextRead: "healthy",
              screenshot: name + "-recovered.png",
              reads: await page.evaluate(() => window.__reviewReads),
              checkoutRemainsDisabled: true,
              pass: true,
            };
          }
        }
        expect(await page.evaluate(() => window.__reviewWrites)).toEqual([]);
        expect(errors).toEqual([]);
        expect(external).toEqual([]);
        expect(mutations).toEqual([]);
        results.push({
          name,
          route,
          ...config,
          state,
          contract,
          screenshot: contract ? null : name + ".png",
          reads:
            readsBeforeRecovery ||
            (await page.evaluate(() => window.__reviewReads)),
          controls,
          nativeChecks,
          retryRecovery,
          pass: true,
        });
        console.log("PASS", name);
        await context.close();
      }
  }
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
  const finalHashes = hashes();
  const receipt = {
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    reviewedAt: new Date().toISOString(),
    browserVersion,
    qaSourceState:
      "sourceCommit identifies the checkout base; initial/final hashes identify all tested working-tree bytes. sourceChangesFromBase explicitly records new QA and any runtime corrections before capture.",
    sourceChangesFromBase,
    fixtureOnly: true,
    actualNext: false,
    actualAppShell: true,
    physicalAndroid: false,
    productionAuthRls: false,
    forbiddenMutations: true,
    scope:
      "Current actual async page exports, StaffLayout/AccountLayout/AppShell, SpainAddressAutocomplete and CSS; synthetic role/read adapters, no customer data, provider requests or mutations. Redirects are contracts, not screenshot acceptance of destinations.",
    initialHashes,
    finalHashes,
    results,
  };
  writeFileSync(
    resolve(directory, "results.json"),
    JSON.stringify(receipt, null, 2) + "\n",
  );
  expect(finalHashes, "source unchanged during review").toEqual(initialHashes);
}
