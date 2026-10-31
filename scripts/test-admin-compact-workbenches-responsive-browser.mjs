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
// Actual pages/AdminLayout/AppShell with synthetic identity/read adapters only.
// No database, provider/customer writes, actual Auth/RLS or physical-device claim.
// DTO fixes preserve earlier failures: permissions[], achievement_keys[], nullable
// user fields and the native visible Awards search field match existing source.
const out = resolve("test-results/admin-compact-workbenches-responsive");
mkdirSync(out, { recursive: true });
const auth = `const q=new URLSearchParams(location.search),state=q.get('state'),id='00000000-0000-4000-8000-000000000002',now='2026-10-30T12:00:00Z';const member={profile_id:id,id,display_name:'Synthetic account',primary_email:'fixture@example.invalid',email:'fixture@example.invalid',google_email:null,last_sign_in_at:null,app_role:'consumer',account_status:'active',email_confirmed:true,created_at:now,venue_memberships:0,test_account:false};const row={id,name:'Synthetic review record',title:'Synthetic review record',title_en:'Synthetic review record',title_es:'Registro sintético',slug:'synthetic-review',key:'synthetic_review',active:true,status:'published',state:'pending',created_at:now,updated_at:now};const records={categories:[{...row,name_en:'Synthetic music',name_es:'Música sintética'}],cities:[{...row,name_en:'Synthetic city',name_es:'Ciudad sintética',timezone:'Europe/Madrid',center:{lat:36.7,lng:-4.4}}],venues:[{...row,name:'Synthetic venue',address:'Fixture street',venue_achievement_categories:[]}],achievements:[{...row,key:'synthetic_review',description_en:'Synthetic review only',description_es:'Solo prueba',minimum_xp:10,condition_type:'xp',target_count:10,icon:'star',tiers:[10,20,30]}],moderation_actions:[{...row,action:'catalogue_review',target_type:'venue',reason:'Synthetic audit row',target_id:id,actor_id:id}],business_applications:[{...row,business_name:'Synthetic business',contact_name:'Synthetic contact',applicant_id:id,locality:'Málaga',payment_state:'unpaid',message:'Synthetic review only'}],passports:[{...row,title_en:'Synthetic passport',title_es:'Pasaporte sintético',starts_at:now,ends_at:'2026-10-31T12:00:00Z'}],account_deletion_requests:[{...row,profile_id:id,state:'requested',requested_at:now,profiles:{display_name:'Synthetic privacy request'}}],feature_flags:[{key:'synthetic_review',enabled:false,label_en:'Synthetic flag',label_es:'Control sintético',updated_at:now}],promotion_requests:[{...row,event_id:id,requested_by:id,requested_slot:'featured',payment_state:'unpaid',events:{title_en:'Synthetic event',title_es:'Evento sintético'}}],events:[{...row,title_en:'Synthetic event',title_es:'Evento sintético',venue_id:id}],feature_slots:[{...row,event_id:id,label_en:'Synthetic slot',label_es:'Espacio sintético',starts_at:now,ends_at:'2026-10-31T12:00:00Z'}],suite_referral_programmes:[{...row,name:'Synthetic programme',programme_type:'ambassador',eligible_products:['akipasa']}],suite_referral_codes:[{code:'SYNTHETIC',owner_profile_id:id,revoked_at:null}],suite_referral_billing_events:[{stripe_event_id:'synthetic-only',event_kind:'subscription',eligibility:'pending',recorded_at:now}],suite_referral_cases:[{...row,code:'SYNTHETIC',case_type:'review',detail:'Synthetic case',resolution:null}],ai_agents:[{...row,agent_key:'synthetic-agent',display_name:'Synthetic agent',role:'research',enabled:false,permissions:[]}],ai_budget_settings:{singleton:true,monthly_limit_eur:0,monthly_budget_eur:0,enabled:false}};export async function requireUser(){return {user:{id},supabase:{from(table){let single=false;const result=()=>{window.__fixtureReads.push({table,state});if(table==='profiles')return{data:{...member,app_role:'administrator'},error:null};let data=state==='ready'?(records[table]||[]):[];if(single&&Array.isArray(data))data=data[0]||null;return{data,error:state==='error'?{message:'Synthetic read unavailable'}:null,count:Array.isArray(data)?data.length:0}};const c={select(){return c},eq(){return c},in(){return c},order(){return c},limit(){return c},range(){return c},neq(){return c},gte(){return c},lt(){return c},ilike(){return c},or(){return c},maybeSingle(){single=true;return Promise.resolve(result())},then(f){return Promise.resolve(result()).then(f)}};return c},async rpc(name){window.__fixtureReads.push({rpc:name,state});if(name==='admin_user_record')return{data:state==='ready'?[member]:[],error:state==='error'?{message:'Synthetic read unavailable'}:null};if(name==='personalisation_admin_metrics'){const keys=['behaviour_events','anonymous_events','preference_profiles','recommendation_requests','average_latency_ms','fallback_requests','impressions','opens','skips','quick_exits','saves','going','directions','verified_check_ins','not_interested'];return{data:Object.fromEntries(keys.map(k=>[k,state==='ready'?2:0])),error:state==='error'?{message:'Synthetic unavailable'}:null}}return{data:name==='prestige_admin'?{enabled:false,programmes:state==='ready'?[{...row,key:'synthetic',title_en:'Synthetic programme',title_es:'Programa sintético',active:false,achievement_keys:[]}]:[],requests:[],fulfilment_enabled:false,total:0}:[],error:state==='error'?{message:'Synthetic read unavailable'}:null}}}}}`;
const entry =
  "import React from'react';import{createRoot}from'react-dom/client';import{AppShell}from'./src/components/AppShell';import Layout from'./src/app/[locale]/admin/layout';import R0 from './src/app/[locale]/admin/achievements/page';import R1 from './src/app/[locale]/admin/achievements/venues/page';import R2 from './src/app/[locale]/admin/ai-team/page';import R3 from './src/app/[locale]/admin/audit/page';import R4 from './src/app/[locale]/admin/business-applications/page';import R5 from './src/app/[locale]/admin/catalogue/page';import R6 from './src/app/[locale]/admin/passports/awards/page';import R7 from './src/app/[locale]/admin/passports/page';import R8 from './src/app/[locale]/admin/passports/prestige/page';import R9 from './src/app/[locale]/admin/personalisation/page';import R10 from './src/app/[locale]/admin/privacy/page';import R11 from './src/app/[locale]/admin/promotions/page';import R12 from './src/app/[locale]/admin/referrals/page';import R13 from './src/app/[locale]/admin/selector-lab/page';import R14 from './src/app/[locale]/admin/settings/page';import R15 from './src/app/[locale]/admin/users/[id]/page';import R16 from './src/app/[locale]/admin/users/page';import R17 from './src/app/[locale]/admin/venue-relevance/page';const q=new URLSearchParams(location.search),locale=q.get('locale')||'en',route=q.get('route');document.documentElement.lang=locale;document.documentElement.dataset.theme=q.get('theme');window.__actions=[];window.__fixtureReads=[];(async()=>{try{const props={params:Promise.resolve({locale,id:'00000000-0000-4000-8000-000000000002'}),searchParams:Promise.resolve({})};const page=await({'achievements':R0,'achievements/venues':R1,'ai-team':R2,'audit':R3,'business-applications':R4,'catalogue':R5,'passports/awards':R6,'passports':R7,'passports/prestige':R8,'personalisation':R9,'privacy':R10,'promotions':R11,'referrals':R12,'selector-lab':R13,'settings':R14,'users/[id]':R15,'users':R16,'venue-relevance':R17}[route])(props);const content=await Layout({...props,children:page});createRoot(document.getElementById('root')).render(<AppShell locale={locale} signedIn role='administrator'>{content}</AppShell>);requestAnimationFrame(()=>requestAnimationFrame(()=>window.ready=true))}catch(e){window.failure=String(e.stack);document.getElementById('root').textContent=String(e.message);window.ready=true}})();";
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
  const jobs = [];
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const width of [360, 390, 820, 1440])
        for (const route of [
          "achievements",
          "achievements/venues",
          "ai-team",
          "audit",
          "business-applications",
          "catalogue",
          "passports/awards",
          "passports",
          "passports/prestige",
          "personalisation",
          "privacy",
          "promotions",
          "referrals",
          "selector-lab",
          "settings",
          "users/[id]",
          "users",
          "venue-relevance",
        ])
          for (const state of route === "selector-lab"
            ? ["ready"]
            : ["ready", "empty", "error"])
            jobs.push({ context: { locale, theme, width }, route, state });
  let nextJob = 0;
  async function runJob({ context, route, state }) {
    const c = await browser.newContext({
      viewport: {
        width: context.width,
        height: { 360: 800, 390: 844, 820: 1180, 1440: 900 }[context.width],
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
        if (req.request().method() !== "GET") throw Error("Mutation forbidden");
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
      const expectedDenial = route === "users/[id]" && state !== "ready";
      const renderFailure = await page.evaluate(() => window.failure || null);
      if (expectedDenial) {
        assert.match(renderFailure || "", /not-found/);
        assert.deepEqual(errors, []);
        results.push({
          ...context,
          route,
          state,
          expectedDenial: true,
          denial: "actual page called notFound for missing/unavailable record",
          screenshots: [],
          errors,
        });
        await c.close();
        return;
      }
      assert.equal(renderFailure, null);
      if (route === "users") {
        const input = page.locator("#admin-user-search");
        const hits = await input.evaluate((e) => {
          const r = e.getBoundingClientRect();
          return [r.left + 8, r.left + r.width / 2, r.right - 8].map((x) => {
            const h = document.elementFromPoint(x, r.top + r.height / 2);
            return h === e || e.contains(h);
          });
        });
        assert.deepEqual(
          hits,
          [true, true, true],
          "User search hit obstruction",
        );
        await input.fill("Synthetic");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(450);
      }
      if (route === "passports/awards") {
        await page
          .getByLabel(/Find member by name|Buscar usuario por nombre/)
          .fill("Synthetic");
        const searchButton = page.getByRole("button", {
          name: /^(Search|Buscar)$/,
        });
        await page.keyboard.press("Tab");
        assert.equal(
          await searchButton.evaluate((e) => e === document.activeElement),
          true,
          "Native Tab did not reach search",
        );
        await page.keyboard.press("Enter");
        await page.waitForTimeout(100);
      }
      const textContrast = await page.evaluate(collectAdminTextContrast);
      assert.ok(
        textContrast.every((x) => x.contrast >= 4.5),
        "Confirmed Admin text contrast regression: " +
          JSON.stringify(textContrast),
      );
      if (route === "achievements" && state === "ready")
        assert.equal(
          textContrast.filter(
            (x) => x.className === "" && ["STRONG", "SPAN"].includes(x.tag),
          ).length,
          2,
          "Expected threshold count and XP checks",
        );
      if (route === "selector-lab")
        assert.equal(
          textContrast.length,
          7,
          "Expected all seven surrounding Lab text checks",
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
      assert.deepEqual(errors, []);
      assert.deepEqual(check.actions, []);
      assert.ok(check.overflow <= 0, "Horizontal overflow");
      assert.ok(check.body.trim(), "Blank route render");
      const stateApplicable = route !== "selector-lab";
      const readyVerified =
        state !== "ready" ||
        ["selector-lab", "personalisation"].includes(route) ||
        /Synthetic|sintétic/i.test(check.body);
      assert.ok(readyVerified, "Populated ready row missing");
      if (state === "error" && stateApplicable)
        assert.match(
          check.body,
          /unavailable|failed|could not|error|no se|no disponible|no pudieron|no pudo|sin datos/i,
        );
      const popupScreenshots = [];
      if (route === "achievements" && state !== "error") {
        await page
          .getByRole("button", { name: /^(New achievement|Nuevo logro)$/ })
          .click();
        const popupContrast = await page.evaluate(collectAdminTextContrast);
        const preview = popupContrast.filter((e) => e.context === "dialog");
        assert.equal(preview.length, 1, "Editor XP preview must be checked");
        assert.ok(
          preview.every((e) => e.contrast >= 4.5),
          "Editor XP preview contrast",
        );
        textContrast.push(...preview);
        const name = stem + "-editor.png";
        await page.screenshot({ path: out + "/" + name });
        popupScreenshots.push(name);
        await page.keyboard.press("Escape");
        await page.waitForFunction(
          () => !document.querySelector("dialog[open]"),
        );
        assert.deepEqual(await page.evaluate(() => window.__actions), []);
      }
      let nativeMenuVerified = false;
      const menu = page.locator(".workspace-mobile-trigger");
      if (await menu.isVisible()) {
        const hits = await menu.evaluate((e) => {
          const r = e.getBoundingClientRect();
          return [r.left + 8, r.left + r.width / 2, r.right - 8].map((x) => {
            const h = document.elementFromPoint(x, r.top + r.height / 2);
            return h === e || e.contains(h);
          });
        });
        assert.deepEqual(
          hits,
          [true, true, true],
          "Native menu hit obstruction",
        );
        await menu.click();
        await page.waitForFunction(
          () =>
            document
              .querySelector(".workspace-mobile-trigger")
              .getAttribute("aria-expanded") === "true",
        );
        await page.keyboard.press("Escape");
        await page.waitForFunction(
          () =>
            document
              .querySelector(".workspace-mobile-trigger")
              .getAttribute("aria-expanded") === "false",
        );
        await menu.focus();
        await page.keyboard.press("Enter");
        await page.waitForFunction(
          () =>
            document
              .querySelector(".workspace-mobile-trigger")
              .getAttribute("aria-expanded") === "true",
        );
        await page.keyboard.press("Escape");
        await page.waitForFunction(
          () =>
            document
              .querySelector(".workspace-mobile-trigger")
              .getAttribute("aria-expanded") === "false",
        );
        nativeMenuVerified = true;
      }
      results.push({
        ...context,
        route,
        state,
        ...check,
        errors,
        stateApplicable,
        readyVerified,
        nativeMenuVerified,
        textContrast,
        screenshots: [
          stem + "-upper.png",
          stem + "-lower.png",
          ...popupScreenshots,
        ],
      });
    } catch (e) {
      failure = String(e);
      results.push({ ...context, route, state, failure, errors });
    }
    await c.close();
    console.log(results.length, stem, failure || "captured");
  }
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (nextJob < jobs.length) {
        const job = jobs[nextJob++];
        await runJob(job);
      }
    }),
  );
  results.sort((a, b) =>
    JSON.stringify([
      a.locale,
      a.theme,
      a.width,
      a.route,
      a.state,
    ]).localeCompare(
      JSON.stringify([b.locale, b.theme, b.width, b.route, b.state]),
    ),
  );
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
        runnerSha256,
        paletteSuite: {
          path: "scripts/test-admin-achievement-palette-browser.mjs",
          sha256: createHash("sha256")
            .update(
              readFileSync(
                "scripts/test-admin-achievement-palette-browser.mjs",
              ),
            )
            .digest("hex"),
          scope:
            "Separate maintained24cases/36contrastchecks; not included in108contexts",
        },
        contextCount: 832,
        renderedContexts: results.filter((r) => !r.expectedDenial).length,
        expectedDenials: results.filter((r) => r.expectedDenial).length,
        stateLimitations: [
          "SelectorLab has no read-data state; repeated inputs are not three distinct states.",
          "User detail missing/error intentionally calls notFound; no fabricated fallback screenshot.",
          "Prestige/referrals enabled ONLY in compile-local synthetic fixture; production gates unchanged.",
          "Personalisation empty is valid all-zero metrics, ranking remains unavailable.",
        ],
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
  assert.deepEqual(
    snapshot(),
    initialSourceHashes,
    "Compiled dependencies changed during proof",
  );
  assert.equal(results.length, 832);
  assert.equal(results.filter((r) => r.expectedDenial).length, 32);
  assert.equal(results.filter((r) => !r.expectedDenial).length, 800);
  for (const r of results) assert.ok(!r.failure, JSON.stringify(r));
  console.log(
    "Admin compact workbenches:832 contexts passed (800 rendered,32 expected missing-record denials).",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
function execHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

function collectAdminTextContrast() {
  const cache = new Map(),
    canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const painter = canvas.getContext("2d", { willReadFrequently: true });
  const rgb = (s) => {
    if (cache.has(s)) return cache.get(s);
    painter.clearRect(0, 0, 1, 1);
    painter.fillStyle = s;
    painter.fillRect(0, 0, 1, 1);
    const c = [...painter.getImageData(0, 0, 1, 1).data],
      value = [c[0], c[1], c[2], c[3] / 255];
    cache.set(s, value);
    return value;
  };
  const lum = (c) =>
    c
      .slice(0, 3)
      .map((v) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      })
      .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
  function bg(e) {
    const c = rgb(getComputedStyle(e).backgroundColor);
    if (c[3] < 1) {
      const under = e.parentElement
        ? bg(e.parentElement)
        : document.documentElement.dataset.theme === "light"
          ? [255, 255, 255]
          : [0, 0, 0];
      return c.slice(0, 3).map((v, i) => v * c[3] + under[i] * (1 - c[3]));
    }
    return c.slice(0, 3);
  }
  return [
    ...document.querySelectorAll(
      '.admin-workspace dialog[open] [class*="preview"] > div > span,.admin-workspace [class*="threshold"] strong,.admin-workspace [class*="threshold"] > span,.aks-lab__eyebrow,.aks-lab__intro h1,.aks-lab__intro p,.aks-selector__caption strong,.aks-selector__caption span,.aks-selector__caption small,.aks-lab__panel-heading h2,.admin-workspace .status-pill.badge-neutral,.admin-workspace .audit-time,.admin-workspace .workspace-disclosure > summary small',
    ),
  ]
    .filter(
      (e) =>
        e.checkVisibility() &&
        !e.closest(
          "[aria-hidden=true],[aria-disabled=true],:disabled,svg,canvas",
        ),
    )
    .map((e) => {
      const cs = getComputedStyle(e),
        fg = rgb(cs.color),
        back = bg(e),
        ink = fg.slice(0, 3).map((v, i) => v * fg[3] + back[i] * (1 - fg[3])),
        a = lum(ink),
        b = lum(back);
      return {
        tag: e.tagName,
        context: e.closest("dialog[open]") ? "dialog" : "page",
        className: e.className,
        text: e.textContent.trim().slice(0, 160),
        foreground: fg,
        background: back,
        contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      };
    });
}
