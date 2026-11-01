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
// Actual BusinessApplications/Prestige pages, AdminLayout and AppShell.
// Canonical application/payment values are synthetic; failed reads may return
// stale rows. Every mutation and external request is forbidden. No actual hosted
// Auth/RLS, entitlement/private write, provider or physical-device claim.
const out = resolve(
  process.env.AKIPASA_ADMIN_A9_EVIDENCE_DIR ||
    "test-results/admin-a9-journey-repairs",
);
mkdirSync(out, { recursive: true });
const auth =
  "const mode=new URLSearchParams(location.search).get('fixture')||'ready',id='00000000-0000-4000-8000-000000000002',states=['submitted','under_review','awaiting_payment','active','rejected'],payments=['not_started','pending','paid','trial','waived','failed','cancelled'];const rows=payments.map((payment,i)=>({id:'00000000-0000-4000-8000-'+String(i+100).padStart(12,'0'),applicant_id:id,business_name:'Synthetic business '+i,contact_name:'Synthetic applicant',locality:'M\u00e1laga',website_url:null,message:'Synthetic application for isolated UI testing only.',state:states[i%5],payment_state:payment,review_reason:null,created_at:'2026-10-31T12:00:00Z'}));export async function requireUser(){return{user:{id},supabase:{from(table){let head=false,selectedStates=null;const q={select(_columns,options){head=Boolean(options?.head);return q},eq(){return q},in(_column,values){selectedStates=values;return q},order(){return q},limit(){return q},maybeSingle(){return Promise.resolve(result())},then(done){return Promise.resolve(result()).then(done)}};function result(){const failed=table==='business_applications'&&mode==='error';window.__fixtureReads.push({table,failed});const list=selectedStates?rows.filter(r=>selectedStates.includes(r.state)):rows;return{data:table==='profiles'?{id,app_role:'administrator'}:head?null:list,error:failed?{message:'Synthetic private backend detail'}:null,count:list.length}}return q},async rpc(name,payload){if(name!=='prestige_admin'||payload.p_action!=='read')throw Error('Unexpected RPC in read-only fixture');window.__fixtureReads.push({rpc:name,failed:mode!=='ready'});return{data:mode==='missing'?null:{enabled:false,programmes:[],requests:[],fulfilment_enabled:false},error:mode==='error'?{message:'Synthetic private RPC detail'}:null}}}}}";
const entry =
  "import React from'react';import{createRoot}from'react-dom/client';import{AppShell}from'./src/components/AppShell';import Layout from'./src/app/[locale]/admin/layout';import Business from'./src/app/[locale]/admin/business-applications/page';import Prestige from'./src/app/[locale]/admin/passports/prestige/page';const locale=window.__fixtureLocale,theme=window.__fixtureTheme,q=new URLSearchParams(location.search);document.documentElement.lang=locale;document.documentElement.dataset.theme=theme;document.body.dataset.theme=theme;for(const node of [document.documentElement,document.body]){node.classList.remove('theme-light','theme-dark','theme-standard','theme-premium');node.classList.add('theme-'+theme)}window.__fixtureReads=[];window.__actions=[];(async()=>{try{const props={params:Promise.resolve({locale}),searchParams:Promise.resolve({page:q.get('page')||'7'})};const page=await(location.pathname.includes('/business-applications')?Business:Prestige)(props),content=await Layout({...props,children:page});createRoot(document.getElementById('root')).render(<AppShell locale={locale} signedIn role='administrator'>{content}</AppShell>);requestAnimationFrame(()=>requestAnimationFrame(()=>window.ready=true))}catch(e){window.failure=String(e.stack);window.ready=true}})();";
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
    "src/lib/auth.ts",
    "src/lib/roles.ts",
    "src/lib/passport-prestige.ts",
    "src/app/[locale]/admin/layout.tsx",
    "src/app/[locale]/admin/business-applications/actions.ts",
    "src/app/[locale]/admin/passports/prestige/actions.ts",
    "scripts/test-admin-a9-journeys-browser.mjs",
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
    /^\/fonts\/[a-zA-Z0-9_.-]+\.woff2$/.test(p) &&
    existsSync(resolve("public", p.slice(1)))
  ) {
    res.setHeader("Content-Type", "font/woff2");
    res.end(readFileSync(resolve("public", p.slice(1))));
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
const labelSets = {
  en: {
    states: [
      "Waiting for review",
      "Under review",
      "Awaiting payment",
      "Business active",
      "Rejected",
    ],
    payments: [
      "Not required yet",
      "Pending",
      "Paid",
      "Trial",
      "No charge",
      "Needs attention",
      "Cancelled",
    ],
    decisions: ["Under review", "Awaiting payment", "Rejected"],
    filter: "Filter Business applications by status",
    review: "Review application",
    retry: "Retry",
    draft: "Create draft",
  },
  es: {
    states: [
      "Pendiente de revisión",
      "En revisión",
      "Pendiente de pago",
      "Negocio activo",
      "Rechazada",
    ],
    payments: [
      "No se requiere todavía",
      "Pendiente",
      "Pagado",
      "Periodo de prueba",
      "Sin cargo",
      "Necesita atención",
      "Cancelado",
    ],
    decisions: ["En revisión", "Pendiente de pago", "Rechazada"],
    filter: "Filtrar Solicitudes de negocio por estado",
    review: "Revisar solicitud",
    retry: "Reintentar",
    draft: "Crear borrador",
  },
};
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : {}),
  });
  const origin = "http://127.0.0.1:" + server.address().port,
    jobs = [];
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const width of [360, 390, 820, 1440])
        for (const kind of ["business", "prestige-error", "prestige-ready"])
          jobs.push({ locale, theme, width, kind });
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      jobs.push({ locale, theme, width: 390, kind: "prestige-missing" });
  let index = 0;
  async function run({ locale, theme, width, kind }) {
    const c = await browser.newContext({
      viewport: { width, height: width < 600 ? 844 : 1000 },
      colorScheme: theme,
      reducedMotion: "reduce",
      hasTouch: width < 600,
    });
    await c.addInitScript(
      ({ locale, theme }) => {
        window.__fixtureLocale = locale;
        window.__fixtureTheme = theme;
      },
      { locale, theme },
    );
    const page = await c.newPage(),
      errors = [],
      requests = [],
      external = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await c.route("**/*", (route) => {
      const req = route.request(),
        u = new URL(req.url());
      if (u.origin !== origin) {
        external.push(req.url());
        return route.abort();
      }
      assert.equal(
        req.method(),
        "GET",
        "Read-only fixture forbids every write",
      );
      requests.push({
        method: req.method(),
        path: u.pathname,
        search: u.search,
        type: req.resourceType(),
      });
      return route.continue();
    });
    const stem = [locale, theme, width, kind].join("-"),
      path =
        "/" +
        locale +
        "/admin/" +
        (kind === "business" ? "business-applications" : "passports/prestige"),
      mode =
        kind === "prestige-error"
          ? "error"
          : kind === "prestige-missing"
            ? "missing"
            : "ready";
    let failure = null,
      nativeGetRecovery = false,
      formPayload = null;
    try {
      await page.goto(origin + path + "?fixture=" + mode + "&page=7", {
        waitUntil: "networkidle",
      });
      await page.waitForFunction(() => window.ready || window.failure);
      assert.equal(await page.evaluate(() => window.failure || null), null);
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      const labels = labelSets[locale];
      if (kind === "business") {
        const cards = page.locator("article.catalogue-card");
        assert.equal(await cards.count(), 7);
        assert.deepEqual(
          await cards.locator(".status-pill").allTextContents(),
          [0, 1, 2, 3, 4, 0, 1].map((i) => labels.states[i]),
        );
        const payment = await cards.evaluateAll((nodes) =>
          nodes.map((node) => node.querySelector("dd").textContent.trim()),
        );
        assert.deepEqual(payment, labels.payments);
        const filter = page.getByRole("combobox", { name: labels.filter });
        const values = await filter
          .locator("option")
          .evaluateAll((options) =>
            options.map((o) => ({ value: o.value, text: o.textContent })),
          );
        assert.deepEqual(
          values.slice(1).map((o) => o.value),
          [
            "submitted",
            "under_review",
            "awaiting_payment",
            "active",
            "rejected",
          ],
        );
        assert.deepEqual(
          values.slice(1).map((o) => o.text),
          labels.states,
        );
        await page.screenshot({
          path: out + "/" + stem + "-all-payments.png",
          fullPage: true,
        });
        await filter.selectOption("under_review");
        assert.equal(await cards.count(), 2);
        await page.getByText(labels.review, { exact: true }).first().click();
        const form = page.locator("details[open] form");
        assert.equal(await form.count(), 1);
        formPayload = await form.evaluate((f) => ({
          locale: f.elements.namedItem("locale").value,
          applicationId: f.elements.namedItem("applicationId").value,
          applicantId: f.elements.namedItem("applicantId").value,
          decision: f.elements.namedItem("state").value,
          decisions: [...f.elements.namedItem("state").options].map((o) => ({
            value: o.value,
            text: o.textContent,
          })),
          grant: f.elements.namedItem("grantKind").value,
          grantOptions: [...f.elements.namedItem("grantKind").options].map(
            (o) => o.value,
          ),
        }));
        assert.equal(formPayload.locale, locale);
        assert.equal(
          formPayload.applicationId,
          "00000000-0000-4000-8000-000000000101",
        );
        assert.equal(
          formPayload.applicantId,
          "00000000-0000-4000-8000-000000000002",
        );
        assert.equal(formPayload.decision, "under_review");
        assert.equal(formPayload.grant, "none");
        assert.deepEqual(
          formPayload.decisions.map((o) => o.value),
          ["under_review", "awaiting_payment", "rejected"],
        );
        assert.deepEqual(
          formPayload.decisions.map((o) => o.text),
          labels.decisions,
        );
        assert.deepEqual(formPayload.grantOptions, [
          "none",
          "trial_1_month",
          "trial_3_month",
          "waived",
        ]);
        await page.screenshot({
          path: out + "/" + stem + "-review-open.png",
          fullPage: true,
        });
      } else if (mode !== "ready") {
        const retry = page.getByRole("link", {
          name: labels.retry,
          exact: true,
        });
        assert.equal(await retry.count(), 1);
        assert.equal(await retry.getAttribute("href"), path + "?page=7");
        assert.equal(
          await page.locator(".workspace-grid-body > main form").count(),
          0,
          "Failed Prestige read withholds every route mutation form; unrelated GlobalSearch forms are outside this page",
        );
        assert.equal(await page.getByRole("alert").count(), 1);
        assert.ok(
          !(await page.locator("body").innerText()).includes(
            "Synthetic private RPC detail",
          ),
        );
        await page.screenshot({
          path: out + "/" + stem + "-failed.png",
          fullPage: true,
        });
        await retry.focus();
        await page.keyboard.press("Enter");
        await page.waitForURL(
          (u) => u.pathname === path && u.search === "?page=7",
        );
        await page.waitForFunction(() => window.ready || window.failure);
        assert.equal(await page.evaluate(() => window.failure || null), null);
        assert.equal(await page.getByRole("alert").count(), 0);
        assert.equal(
          await page
            .getByRole("button", { name: labels.draft, exact: true })
            .count(),
          1,
        );
        assert.ok(
          requests.some(
            (r) =>
              r.type === "document" &&
              r.path === path &&
              r.search === "?page=7" &&
              r.method === "GET",
          ),
        );
        nativeGetRecovery = true;
        await page.screenshot({
          path: out + "/" + stem + "-recovered.png",
          fullPage: true,
        });
      } else {
        assert.equal(await page.getByRole("alert").count(), 0);
        assert.equal(
          await page
            .getByRole("button", { name: labels.draft, exact: true })
            .count(),
          1,
        );
        await page.screenshot({
          path: out + "/" + stem + "-healthy.png",
          fullPage: true,
        });
      }
      assert.ok(
        (await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        )) <= 0,
        "No horizontal overflow",
      );
      assert.deepEqual(await page.evaluate(() => window.__actions), []);
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      results.push({
        locale,
        theme,
        width,
        kind,
        nativeGetRecovery,
        formPayload,
        errors,
        external,
        requests,
        failure,
      });
    } catch (e) {
      failure = String(e.stack);
      results.push({
        locale,
        theme,
        width,
        kind,
        failure,
        errors,
        external,
        requests,
      });
    }
    await c.close();
    console.log(stem, failure || "PASS");
  }
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (index < jobs.length) await run(jobs[index++]);
    }),
  );
  const finalSourceHashes = snapshot();
  writeFileSync(
    out + "/results.json",
    JSON.stringify(
      {
        sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        sourceDirty: Boolean(
          execFileSync("git", ["status", "--porcelain"], {
            encoding: "utf8",
          }).trim(),
        ),
        runnerSha256,
        initialSourceHashes,
        finalSourceHashes,
        contexts: results.length,
        nativeGetRecoveries: results.filter((x) => x.nativeGetRecovery).length,
        actualAppShellAndAdminLayoutAndPages: true,
        actualNext: false,
        fixtureAuth: true,
        productionRLS: false,
        productionWrites: false,
        physicalAndroid: false,
        results,
      },
      null,
      2,
    ),
  );
  assert.deepEqual(
    finalSourceHashes,
    initialSourceHashes,
    "Compiled source changed during proof",
  );
  assert.equal(results.length, 52);
  assert.equal(results.filter((x) => x.nativeGetRecovery).length, 20);
  for (const result of results)
    assert.equal(result.failure, null, JSON.stringify(result));
  console.log(
    "Admin A9 journeys:52 contexts/20 native safe GET recoveries PASS; zero mutations.",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
