import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

// Actual workflow, draft and address components; disposable reads/actions only.
// Public landing is outside this fixture. No production account or mutation.
const dir = resolve("test-results/community-workflows");
mkdirSync(dir, { recursive: true });
const navFile = readFileSync(
  "src/components/community/CreatorDirectoryPage.tsx",
  "utf8",
);
const nav = navFile.slice(
  navFile.indexOf("export function communityCreatorItems("),
  navFile.indexOf("export async function CreatorDirectoryPage("),
);
const eventId = "95000000-0000-4000-8000-000000000009",
  categoryId = "95000000-0000-4000-8000-000000000003";
const target = `event:${eventId}`;
const address = {
  id: "fixture-address",
  kind: "address",
  label: "Calle de Prueba 1, Fuengirola",
  address: "Calle de Prueba 1, Fuengirola",
  locality: "Fuengirola",
  province: "Málaga",
  postalCode: "29640",
  latitude: 36.54,
  longitude: -4.62,
};
const auth = `export async function requireUser(){const q=new URLSearchParams(location.search),state=q.get('state');window.__reads=[];const values={events:[{id:'95000000-0000-4000-8000-000000000001',title_es:'Evento de prueba',title_en:'Disposable event'}],venues:[{id:'95000000-0000-4000-8000-000000000002',name:'Disposable venue'}],event_submissions:[{id:'suggestion-a',title:'Disposable proposed event',state:'pending',created_at:'2026-10-29T12:00:00Z'}],reports:[{id:'report-a',target_type:'event',reason:'incorrect',state:'open',created_at:'2026-10-29T12:00:00Z'}],categories:[{id:'${categoryId}',slug:'music',name_es:'Música',name_en:'Music'}],feature_flags:state==='paused'?[{key:'community_submissions',enabled:false}]:[]};return{user:{id:'fixture-user'},supabase:{from(table){const response={data:state==='empty'&&table!=='categories'?[]:values[table]||[],error:state==='unavailable'?{message:'Disposable unavailable'}:null};const query={select(fields){window.__reads.push({table,operation:'select',fields});return query},eq(field,value){window.__reads.push({table,operation:'eq',field,value});return query},order(){return query},limit(){return query},or(){return query},ilike(){return query},maybeSingle(){return Promise.resolve({data:table==='events'?{id:'${eventId}',title_es:'Evento enlazado de prueba',title_en:'Linked fixture event'}:null,error:response.error})},then(resolve){return Promise.resolve(response).then(resolve)}};return query}}}}`;
const entry = `import React from 'react';import{createRoot}from'react-dom/client';import Page from './src/app/[locale]/community/page';const q=new URLSearchParams(location.search),locale=q.get('lang')||location.pathname.split('/')[1]||'en';const theme=q.get('theme')||localStorage.getItem('fixture-theme')||'dark';localStorage.setItem('fixture-theme',theme);document.documentElement.dataset.theme=theme;document.body.dataset.theme=theme;document.documentElement.classList.add('theme-'+theme);document.body.classList.add('theme-'+theme);document.documentElement.lang=locale;window.__writes=[];Page({params:Promise.resolve({locale}),searchParams:Promise.resolve(Object.fromEntries(q))}).then(screen=>createRoot(document.getElementById('root')).render(<div className='app-shell'>{screen}</div>));`;
const files = [
  "src/app/[locale]/community/page.tsx",
  "src/app/[locale]/community/community-workflows.module.css",
  "src/components/community/ContributionDraftForm.tsx",
  "src/components/SpainAddressAutocomplete.tsx",
  "scripts/test-community-workflows-browser.mjs",
];
const sourceHashes = Object.fromEntries(
  files.map((f) => [
    f,
    createHash("sha256").update(readFileSync(f)).digest("hex"),
  ]),
);
const bundle = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  outdir: "/tmp/community-workflows-bundle",
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env": '{"NODE_ENV":"production"}',
  },
  plugins: [
    {
      name: "disposable-community-boundaries",
      setup(b) {
        b.onResolve({ filter: /^@\/lib\/auth$/ }, () => ({
          path: "auth",
          namespace: "fixture",
        }));
        b.onResolve({ filter: /^\.\/actions$/ }, (a) =>
          a.importer.endsWith("/community/page.tsx")
            ? { path: "actions", namespace: "fixture" }
            : undefined,
        );
        b.onResolve(
          { filter: /^@\/components\/community\/CommunityLanding$/ },
          () => ({ path: "unrendered-landing", namespace: "fixture" }),
        );
        b.onResolve(
          { filter: /^@\/components\/community\/CreatorDirectoryPage$/ },
          () => ({ path: "nav", namespace: "fixture" }),
        );
        b.onResolve({ filter: /^next\/(link|navigation)$/ }, (a) => ({
          path: a.path,
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
          loader: "tsx",
          resolveDir: process.cwd(),
          contents:
            a.path === "auth"
              ? auth
              : a.path === "actions"
                ? `function record(action,form){window.__writes.push({action,values:Object.fromEntries(form)});return new Promise(resolve=>window.__resolveAction=resolve)}export function submitCommunityEvent(form){return record('suggest',form)}export function submitReport(form){return record('report',form)}`
                : a.path === "unrendered-landing"
                  ? `export function CommunityLanding(){throw Error('Public landing outside workflow fixture')}`
                  : a.path === "nav"
                    ? nav
                    : a.path.endsWith("navigation")
                      ? `export function notFound(){throw Error('not-found')}export function usePathname(){return'/'+(new URLSearchParams(location.search).get('lang')||location.pathname.split('/')[1]||'en')+'/community'}export function useSearchParams(){return new URLSearchParams(location.search)}`
                      : `import React from'react';export default function Link({children,...props}){return<a {...props}>{children}</a>}`,
        }));
      },
    },
  ],
});
const rootStyles = [
  "globals.css",
  "compact-app.css",
  "brand.css",
  "appearance.css",
  "tablet-responsive.css",
  "portal-unity.css",
]
  .map((n) => readFileSync("src/app/" + n, "utf8"))
  .join("\n");
const css =
  (
    await postcss([tailwind()]).process(rootStyles, {
      from: resolve("src/app/globals.css"),
    })
  ).css +
  "\n" +
  readFileSync("src/components/PasaCinematic.css", "utf8") +
  "\n" +
  readFileSync("src/components/PasaSharedSurfaces.css", "utf8") +
  "\n" +
  (bundle.outputFiles.find((f) => f.path.endsWith(".css"))?.text || "");
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundle.outputFiles.find((f) => f.path.endsWith(".js")).text);
  } else if (req.url === "/styles.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else if (req.url?.startsWith("/api/locations/search?")) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ suggestions: [address] }));
  } else if (/^\/(fonts|brand)\/[a-zA-Z0-9_./-]+$/.test(req.url || "")) {
    const f = resolve("public", req.url.slice(1));
    if (f.startsWith(resolve("public") + "/") && existsSync(f)) {
      res.setHeader(
        "Content-Type",
        f.endsWith(".svg") ? "image/svg+xml" : "font/woff2",
      );
      res.end(readFileSync(f));
    } else {
      res.statusCode = 404;
      res.end();
    }
  } else {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(
      '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const results = [];
async function capture(page, name) {
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: resolve(dir, name + ".png"), fullPage: true });
}
async function ready(page) {
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const size = await page.evaluate(() => ({
    width: innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(size.document).toBeLessThanOrEqual(size.width + 1);
  const placeholderContrast = await page
    .locator("input[placeholder],textarea[placeholder]")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const rgba = (value) => {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 1;
          const context = canvas.getContext("2d");
          context.fillStyle = value;
          context.fillRect(0, 0, 1, 1);
          const pixel = context.getImageData(0, 0, 1, 1).data;
          return [pixel[0], pixel[1], pixel[2], pixel[3] / 255];
        };
        const style = getComputedStyle(node, "::placeholder"),
          ink = rgba(style.color);
        let bg = [255, 255, 255],
          current = node;
        const chain = [];
        while (current) {
          chain.unshift(current);
          current = current.parentElement;
        }
        for (const layer of chain) {
          const surface = rgba(getComputedStyle(layer).backgroundColor);
          bg = surface
            .slice(0, 3)
            .map((v, i) => v * surface[3] + bg[i] * (1 - surface[3]));
        }
        ink[3] *= Number(style.opacity);
        const lum = (rgb) =>
          rgb
            .slice(0, 3)
            .map((v) => v / 255)
            .map((v) =>
              v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
            )
            .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
        const fg = lum(
            ink.slice(0, 3).map((v, i) => v * ink[3] + bg[i] * (1 - ink[3])),
          ),
          back = lum(bg);
        return {
          placeholder: node.getAttribute("placeholder"),
          color: style.color,
          background: getComputedStyle(node).backgroundColor,
          ratio: (Math.max(fg, back) + 0.05) / (Math.min(fg, back) + 0.05),
        };
      }),
    );
  for (const text of placeholderContrast)
    expect(text.ratio, JSON.stringify(text)).toBeGreaterThanOrEqual(4.5);
  const ownReads = await page.evaluate(() =>
    window.__reads.filter((read) => read.operation === "eq"),
  );
  for (const [table, field] of [
    ["event_submissions", "submitter_id"],
    ["reports", "reporter_id"],
  ])
    expect(
      ownReads.some(
        (read) =>
          read.table === table &&
          read.field === field &&
          read.value === "fixture-user",
      ),
      `${table} must retain caller filter`,
    ).toBe(true);
  return size;
}
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
        const es = locale === "es",
          context = await browser.newContext({
            viewport: { width, height: 900 },
            locale: es ? "es-ES" : "en-GB",
            timezoneId: "Europe/Madrid",
            reducedMotion: "reduce",
            ...(width === 390
              ? {
                  isMobile: true,
                  hasTouch: true,
                  userAgent:
                    "Mozilla/5.0 (Linux; Android 13; AkiPasaWebView) AppleWebKit/537.36 Chrome/153.0.0.0 Mobile Safari/537.36",
                }
              : {}),
          });
        const page = await context.newPage();
        const externalRequests = [],
          unexpectedHttpMutations = [];
        await page.route("**/*", async (route) => {
          const request = route.request(),
            url = new URL(request.url());
          if (
            !["data:", "blob:"].includes(url.protocol) &&
            url.origin !== origin
          ) {
            externalRequests.push(request.url());
            return route.abort();
          }
          if (!["GET", "HEAD"].includes(request.method())) {
            unexpectedHttpMutations.push({
              url: request.url(),
              method: request.method(),
            });
            return route.abort();
          }
          return route.continue();
        });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        const prefix = `${locale}-${theme}-${width}`;
        for (const view of ["suggest", "report", "suggestions", "reports"]) {
          await page.goto(
            `${origin}/?lang=${locale}&theme=${theme}&view=${view}`,
          );
          await ready(page);
          if (view === "reports") {
            await expect(
              page.getByText(
                es ? "Evento · Datos incorrectos" : "Event · Incorrect details",
              ),
            ).toBeVisible();
            await expect(
              page.getByText(es ? "Abierto" : "Open", { exact: true }),
            ).toBeVisible();
          }
          const controls = await page
            .locator("input:not([type=hidden]),select,textarea,form button")
            .evaluateAll((nodes) =>
              nodes.map((e) => ({
                name: e.name,
                height: e.getBoundingClientRect().height,
              })),
            );
          expect(controls.every((c) => c.height >= 44)).toBe(true);
          await capture(page, prefix + "-" + view + "-populated");
          results.push({
            name: prefix + "-" + view + "-populated",
            controls,
            errors,
          });
        }
        for (const state of ["empty", "unavailable"])
          for (const view of ["suggest", "report", "suggestions", "reports"]) {
            await page.goto(
              `${origin}/?lang=${locale}&theme=${theme}&view=${view}&state=${state}`,
            );
            await ready(page);
            if (state === "unavailable")
              await expect(page.getByRole("alert")).toBeVisible();
            else if (view === "report") {
              await expect(page.locator("select[name=target]")).toBeDisabled();
              await expect(
                page.getByRole("button", {
                  name: es ? "Enviar aviso" : "Submit report",
                }),
              ).toBeDisabled();
            }
            await capture(page, prefix + "-" + view + "-" + state);
            results.push({ name: prefix + "-" + view + "-" + state, errors });
          }
        await page.goto(
          `${origin}/?lang=${locale}&theme=${theme}&view=suggest&state=paused`,
        );
        await ready(page);
        await expect(
          page.getByText(
            es
              ? "Las sugerencias están pausadas temporalmente."
              : "Event suggestions are temporarily paused.",
          ),
        ).toBeVisible();
        await expect(page.locator("input[name=title]")).toHaveCount(0);
        await capture(page, prefix + "-suggest-paused");
        results.push({ name: prefix + "-suggest-paused", errors });
        await page.goto(
          `${origin}/?lang=${locale}&theme=${theme}&view=suggest`,
        );
        await ready(page);
        await page.locator("[name=venueName]").fill("Disposable venue");
        const combobox = page.getByRole("combobox", {
          name: es ? "Dirección" : "Address",
          exact: true,
        });
        await combobox.fill("Calle de Prueba");
        await page.getByRole("option", { name: /Calle de Prueba/ }).click();
        await page.locator("[name=categoryId]").selectOption(categoryId);
        await page.locator("[name=title]").fill("Disposable community event");
        await page
          .locator("[name=description]")
          .fill("Detailed disposable event description for moderated review.");
        await page.locator("[name=startsAt]").fill("2026-11-02T18:00");
        await page.locator("[name=endsAt]").fill("2026-11-02T22:00");
        await page
          .locator("[name=sourceUrl]")
          .fill("https://example.invalid/fixture");
        const submit = page.getByRole("button", {
          name: es ? "Enviar a revisión" : "Submit for review",
        });
        if (width === 390) await submit.tap();
        else await submit.click();
        await page.waitForFunction(() => window.__writes.length === 1);
        await expect(
          page.getByRole("button", {
            name: es ? "Enviando a revisión…" : "Submitting for review…",
            exact: true,
          }),
        ).toBeDisabled();
        await capture(page, prefix + "-suggest-pending");
        results.push({
          name: prefix + "-suggest-pending",
          syntheticActionPending: true,
        });
        await page.evaluate(() => window.__resolveAction());
        await expect(
          page.getByRole("button", {
            name: es ? "Enviar a revisión" : "Submit for review",
            exact: true,
          }),
        ).toBeEnabled();
        const suggestion = await page.evaluate(() => window.__writes[0]);
        expect(suggestion).toEqual({
          action: "suggest",
          values: {
            locale,
            venueName: "Disposable venue",
            venueAddress: address.address,
            addressSelection: "selected",
            locality: address.locality,
            province: address.province,
            postalCode: address.postalCode,
            latitude: String(address.latitude),
            longitude: String(address.longitude),
            addressProviderId: address.id,
            categoryId,
            title: "Disposable community event",
            description:
              "Detailed disposable event description for moderated review.",
            startsAt: "2026-11-02T18:00",
            endsAt: "2026-11-02T22:00",
            sourceUrl: "https://example.invalid/fixture",
          },
        });
        await page.goto(
          `${origin}/?lang=${locale}&theme=${theme}&view=suggest&error=submission`,
        );
        await ready(page);
        await expect(page.getByRole("status")).toHaveText(
          /restored|restaurado/,
        );
        await expect(page.locator("[name=title]")).toHaveValue(
          "Disposable community event",
        );
        await expect(combobox).toHaveValue(address.address);
        await expect(page.locator("[name=addressProviderId]")).toHaveValue(
          address.id,
        );
        await expect(page.locator("[name=latitude]")).toHaveValue(
          String(address.latitude),
        );
        await capture(page, prefix + "-suggest-recovered");
        results.push({
          name: prefix + "-suggest-recovered",
          payload: suggestion,
          errors,
        });
        const query = 'Café 100% "central"';
        await page.goto(
          `${origin}/?lang=${locale}&theme=${theme}&view=report&target=${encodeURIComponent(target)}`,
        );
        await ready(page);
        await page.locator("[name=target_q]").fill(query);
        await Promise.all([
          page.waitForURL(
            (u) =>
              u.pathname === `/${locale}/community` &&
              u.searchParams.get("target_q") === query,
          ),
          page
            .getByRole("button", {
              name: es ? "Buscar" : "Search",
              exact: true,
            })
            .click(),
        ]);
        await ready(page);
        expect(new URL(page.url()).searchParams.get("target")).toBe(target);
        await expect(page.locator("select[name=target]")).toHaveValue(target);
        await page.locator("select[name=reason]").selectOption("incorrect");
        const details = page.locator("[name=details]");
        await details.focus();
        expect(
          await details.evaluate((e) => getComputedStyle(e).outlineStyle),
        ).not.toBe("none");
        await details.fill("Detailed disposable report reason.");
        await page.keyboard.press("Tab");
        const reportButton = page.getByRole("button", {
          name: es ? "Enviar aviso" : "Submit report",
        });
        await expect(reportButton).toBeFocused();
        if (width === 390) await reportButton.tap();
        else await page.keyboard.press("Enter");
        await page.waitForFunction(() => window.__writes.length === 1);
        await expect(
          page.getByRole("button", {
            name: es ? "Enviando aviso…" : "Submitting report…",
            exact: true,
          }),
        ).toBeDisabled();
        await capture(page, prefix + "-report-pending");
        results.push({
          name: prefix + "-report-pending",
          syntheticActionPending: true,
        });
        await page.evaluate(() => window.__resolveAction());
        await expect(
          page.getByRole("button", {
            name: es ? "Enviar aviso" : "Submit report",
            exact: true,
          }),
        ).toBeEnabled();
        const report = await page.evaluate(() => window.__writes[0]);
        expect(report).toEqual({
          action: "report",
          values: {
            locale,
            target_q: query,
            target,
            reason: "incorrect",
            details: "Detailed disposable report reason.",
          },
        });
        await page.goto(
          `${origin}/?lang=${locale}&theme=${theme}&view=report&target=${encodeURIComponent(target)}&target_q=${encodeURIComponent(query)}&error=rate-limit`,
        );
        await ready(page);
        await expect(page.getByRole("status")).toHaveText(
          /restored|restaurado/,
        );
        await expect(details).toHaveValue("Detailed disposable report reason.");
        await expect(page.locator("select[name=target]")).toHaveValue(target);
        await expect(page.locator("select[name=reason]")).toHaveValue(
          "incorrect",
        );
        await capture(page, prefix + "-report-recovered");
        results.push({
          name: prefix + "-report-recovered",
          payload: report,
          externalRequests,
          unexpectedHttpMutations,
          errors,
        });
        expect(errors).toEqual([]);
        expect(externalRequests).toEqual([]);
        expect(unexpectedHttpMutations).toEqual([]);
        await context.close();
      }
  const sourceDirty = Boolean(
    execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
  );
  writeFileSync(
    resolve(dir, "results.json"),
    JSON.stringify(
      {
        sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        sourceDirty,
        testedWorkingTree: sourceDirty,
        sourceHashes,
        fixtureOnly: true,
        physicalAndroid: false,
        productionAuthRLS: false,
        results,
      },
      null,
      2,
    ),
  );
  console.log(`Community workflows: ${results.length} cases passed.`);
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
