import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

// Actual route/layout/form components, disposable auth/RPC/action adapters only.
// No production auth, RLS, customer decisions or physical-device acceptance.
const dir = resolve("test-results/admin-review");
mkdirSync(dir, { recursive: true });
const entry = `import React from "react";import{createRoot}from"react-dom/client";
import Layout from "./src/app/[locale]/admin/layout";
import Accommodation from "./src/app/[locale]/admin/accommodation-review/page";
import Listing from "./src/app/[locale]/admin/listing-review/page";
const q=new URLSearchParams(location.search),locale=q.get("lang")||"en";
document.documentElement.dataset.theme=q.get("theme")||"dark";
document.documentElement.lang=locale;
(async()=>{try{const params=Promise.resolve({locale});const outer=await Layout({params,children:null});const content=await(q.get("kind")==="listing"?Listing({params}):Accommodation({params,searchParams:Promise.resolve({page:q.get("page")||"0"})}));createRoot(document.getElementById("root")).render(<div className="app-shell">{React.cloneElement(outer,{},content)}</div>);}catch(e){createRoot(document.getElementById("root")).render(<p role="alert" data-fixture-denied>{e.message}</p>);}})();`;
const auth = `export async function requireUser(){const q=new URLSearchParams(location.search),role=q.get("role")||"administrator",state=q.get("state")||"populated";if(role==="guest")throw Error("fixture-sign-in-required");
const row={id:"95000000-0000-4000-8000-000000000001",name:"Disposable coastal apartment — long name with room for a careful review",status:"pending",revision_id:"95000000-0000-4000-8000-000000000002",city:"Fuengirola",address:"Fixture address, Costa del Sol",description_es:"Descripción de prueba.\\nSegunda línea para revisar la versión enviada.",description_en:"Disposable description.\\nSecond line for reviewing the submitted revision.",orphaned:false};
const rows=[row,{...row,id:"95000000-0000-4000-8000-000000000003",name:"Fixture property without an owner",orphaned:true}];const event={venue_id:"95000000-0000-4000-8000-000000000004",event_id:"95000000-0000-4000-8000-000000000005",signal:"continuous_multiday",detected_at:"2026-10-29T12:00:00Z",venue_name:"Disposable venue",event_title:"A long-running fixture festival — a signal is not proof of abuse"};
window.__reads=[];return{user:{id:"fixture-admin"},supabase:{from(table){const query={select(){return query},eq(){return query},in(){return Promise.resolve({count:2,error:null})},maybeSingle(){return Promise.resolve({data:{app_role:role},error:null})}};return query},async rpc(name,args){window.__reads.push({name,args});if(role!=="administrator")return{data:null,error:{message:"Administrator required"}};if(state==="error")return{data:null,error:{message:"Disposable read failure"}};if(state==="empty")return{data:[],error:null};return{data:name==="listing_event_review_queue"?[event,{...event,event_id:"95000000-0000-4000-8000-000000000006",signal:"unknown",event_title:null,venue_name:null}]:rows,error:null}}}}}`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  outdir: "/tmp/admin-review-browser",
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env":
      '{"NODE_ENV":"production","AKISUITE_ACCOMMODATION_READY":"true"}',
  },
  plugins: [
    {
      name: "disposable-review-boundaries",
      setup(b) {
        b.onResolve({ filter: /^@\/lib\/auth$/ }, () => ({
          path: "auth",
          namespace: "fixture",
        }));
        b.onResolve(
          {
            filter:
              /^@\/app\/\[locale\]\/admin\/accommodation-review\/actions$/,
          },
          () => ({ path: "actions", namespace: "fixture" }),
        );
        b.onResolve({ filter: /^next\/(link|navigation)$/ }, (args) => ({
          path: args.path,
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
          loader: "jsx",
          resolveDir: process.cwd(),
          contents:
            args.path === "auth"
              ? auth
              : args.path === "actions"
                ? "export function reviewNativeAccommodation(input){(window.__decisions??=[]).push(input);return new Promise(resolve=>window.__resolveReview=resolve)}"
                : args.path.endsWith("navigation")
                  ? 'export function notFound(){throw Error("fixture-access-denied")}export function usePathname(){const q=new URLSearchParams(location.search);return "/"+(q.get("lang")||"en")+"/admin/"+(q.get("kind")==="listing"?"listing-review":"accommodation-review")}export function useSearchParams(){return new URLSearchParams()}'
                  : 'import React from "react";export default function Link({children,...props}){return <a {...props}>{children}</a>}',
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
  .map((name) => readFileSync(`src/app/${name}`, "utf8"))
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
  } else if (/^\/(brand|fonts)\/[a-zA-Z0-9_./-]+$/.test(req.url || "")) {
    const file = resolve("public", req.url.slice(1));
    if (file.startsWith(resolve("public") + "/") && existsSync(file)) {
      res.setHeader(
        "Content-Type",
        file.endsWith(".svg") ? "image/svg+xml" : "font/woff2",
      );
      res.end(readFileSync(file));
    } else {
      res.statusCode = 404;
      res.end();
    }
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
async function fullCapture(page, path) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path, fullPage: true });
}
async function focusGeometry(control) {
  return control.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const header = document
      .querySelector(".workspace-mobile-trigger")
      ?.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return {
      top: rect.top,
      bottom: rect.bottom,
      headerBottom: header?.bottom || 0,
      overlapsHeader: Boolean(
        header?.width &&
          header.bottom > rect.top &&
          header.top < rect.bottom &&
          header.right > rect.left &&
          header.left < rect.right,
      ),
      centerReceivesInput: hit === el || el.contains(hit),
      fullyInViewport: rect.top >= 0 && rect.bottom <= innerHeight,
    };
  });
}
const results = [];
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : {}),
  });
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const width of [360, 390, 820, 1440])
        for (const kind of ["accommodation", "listing"]) {
          const context = await browser.newContext({
            viewport: { width, height: 900 },
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
          const errors = [];
          page.on("pageerror", (e) => errors.push(e.message));
          await page.goto(
            `${origin}/?lang=${locale}&theme=${theme}&kind=${kind}`,
          );
          await expect(page.locator("h1")).toBeVisible();
          await expect(page.locator("article")).toHaveCount(2);
          const prefix = `${locale}-${theme}-${width}-${kind}`;
          const geometry = await page.evaluate(() => ({
            viewport: innerWidth,
            document: document.documentElement.scrollWidth,
            controls: [
              ...document.querySelectorAll("textarea,fieldset button"),
            ].map((e) => ({
              width: e.getBoundingClientRect().width,
              height: e.getBoundingClientRect().height,
            })),
            formFields: [...document.querySelectorAll("textarea")].map((e) => ({
              background: getComputedStyle(e).backgroundColor,
              color: getComputedStyle(e).color,
            })),
          }));
          expect(geometry.document).toBeLessThanOrEqual(width + 1);
          expect(geometry.controls.every((c) => c.height >= 44)).toBe(true);
          if (kind === "accommodation") {
            const input = page.getByRole("textbox");
            await expect(input).toHaveCount(1);
            const approve = page.getByRole("button", {
              name:
                locale === "es" ? "Aprobar publicación" : "Approve publication",
            });
            const reject = page.getByRole("button", {
              name:
                locale === "es" ? "Rechazar publicación" : "Reject publication",
            });
            await expect(approve).toBeDisabled();
            if (width === 390) await input.tap();
            else await input.focus();
            await expect(input).toBeFocused();
            const inputFocus = await focusGeometry(input);
            expect(inputFocus.fullyInViewport).toBe(true);
            expect(inputFocus.overlapsHeader).toBe(false);
            expect(inputFocus.centerReceivesInput).toBe(true);
            geometry.focusChecks = { input: inputFocus };
            if (width <= 390)
              await page.screenshot({
                path: resolve(dir, prefix + "-reason-focus-viewport.png"),
              });
            expect(
              await input.evaluate((e) => getComputedStyle(e).outlineStyle),
            ).not.toBe("none");
            await input.fill("Detailed disposable review reason");
            await page.keyboard.press("Tab");
            await expect(approve).toBeFocused();
            geometry.focusChecks.approve = await focusGeometry(approve);
            expect(geometry.focusChecks.approve.fullyInViewport).toBe(true);
            expect(geometry.focusChecks.approve.overlapsHeader).toBe(false);
            expect(geometry.focusChecks.approve.centerReceivesInput).toBe(true);
            if (width <= 390)
              await page.screenshot({
                path: resolve(dir, prefix + "-decision-focus-viewport.png"),
              });
            await page.keyboard.press("Tab");
            await expect(reject).toBeFocused();
            geometry.focusChecks.reject = await focusGeometry(reject);
            expect(geometry.focusChecks.reject.fullyInViewport).toBe(true);
            expect(geometry.focusChecks.reject.overlapsHeader).toBe(false);
            expect(geometry.focusChecks.reject.centerReceivesInput).toBe(true);
            await page.keyboard.press("Shift+Tab");
            await expect(approve).toBeFocused();
            await page.keyboard.press("Enter");
            await expect(page.locator("fieldset")).toHaveAttribute(
              "disabled",
              "",
            );
            await expect(approve).toBeDisabled();
            await expect(reject).toBeDisabled();
            await expect(
              page.getByText(
                locale === "es"
                  ? "Registrando la revisión…"
                  : "Recording the review…",
              ),
            ).toBeVisible();
            await expect(
              page.getByText(
                locale === "es" ? "Revisión registrada." : "Review recorded.",
              ),
            ).toHaveCount(0);
            await fullCapture(page, resolve(dir, prefix + "-pending.png"));
            await page.evaluate(() =>
              window.__resolveReview({ ok: false, error: "stale" }),
            );
            await expect(page.getByRole("alert")).toBeVisible();
            await expect(input).toHaveValue(
              "Detailed disposable review reason",
            );
            await expect(approve).toBeEnabled();
            await fullCapture(page, resolve(dir, prefix + "-stale.png"));
            if (width === 390) await reject.tap();
            else await reject.click();
            await page.evaluate(() => window.__resolveReview({ ok: true }));
            await expect(
              page.getByText(
                locale === "es" ? "Revisión registrada." : "Review recorded.",
              ),
            ).toBeVisible();
            await expect(page.locator("fieldset")).toHaveAttribute(
              "disabled",
              "",
            );
            await expect(approve).toBeDisabled();
            await expect(reject).toBeDisabled();
            const calls = await page.evaluate(() => window.__decisions);
            expect(calls).toEqual([
              {
                property: "95000000-0000-4000-8000-000000000001",
                revision: "95000000-0000-4000-8000-000000000002",
                locale,
                publish: true,
                reason: "Detailed disposable review reason",
              },
              {
                property: "95000000-0000-4000-8000-000000000001",
                revision: "95000000-0000-4000-8000-000000000002",
                locale,
                publish: false,
                reason: "Detailed disposable review reason",
              },
            ]);
          } else {
            await expect(
              page.getByRole("link", {
                name:
                  locale === "es"
                    ? "Revisar ficha y evento"
                    : "Review listing and event",
              }),
            ).toHaveCount(2);
          }
          await fullCapture(page, resolve(dir, prefix + ".png"));
          expect(errors).toEqual([]);
          results.push({
            name: prefix,
            geometry,
            errors,
            androidEmulation: width === 390,
          });
          if (width === 390 || width === 1440)
            for (const state of ["empty", "error"]) {
              await page.goto(
                `${origin}/?lang=${locale}&theme=${theme}&kind=${kind}&state=${state}`,
              );
              await expect(page.locator("h1")).toBeVisible();
              await expect(page.locator("article")).toHaveCount(0);
              if (state === "error") {
                await expect(page.getByRole("alert")).toBeVisible();
                await expect(
                  page.getByRole("link", {
                    name: locale === "es" ? "Reintentar" : "Retry",
                  }),
                ).toBeVisible();
              } else await expect(page.getByRole("alert")).toHaveCount(0);
              await fullCapture(
                page,
                resolve(dir, prefix + "-" + state + ".png"),
              );
              results.push({ name: prefix + "-" + state, errors });
            }
          await context.close();
        }
  for (const locale of ["en", "es"])
    for (const role of ["guest", "user", "staff"]) {
      const page = await browser.newPage();
      await page.goto(`${origin}/?lang=${locale}&role=${role}`);
      await expect(page.locator("[data-fixture-denied]")).toBeVisible();
      await expect(page.locator("textarea,article")).toHaveCount(0);
      results.push({ name: `${locale}-${role}-denied` });
      await page.close();
    }
  const files = [
    "src/components/NativeAccommodationReviewForm.tsx",
    "src/components/NativeReviewSurfaces.module.css",
    "src/app/[locale]/admin/accommodation-review/page.tsx",
    "src/app/[locale]/admin/listing-review/page.tsx",
    "scripts/test-admin-review-browser.mjs",
  ];
  const sourceDirty = Boolean(
    execFileSync("git", ["status", "--porcelain"], {
      encoding: "utf8",
    }).trim(),
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
        sourceHashes: Object.fromEntries(
          files.map((f) => [
            f,
            createHash("sha256").update(readFileSync(f)).digest("hex"),
          ]),
        ),
        fixtureOnly: true,
        physicalAndroid: false,
        productionRLS: false,
        results,
      },
      null,
      2,
    ),
  );
  console.log(`Admin review browser: ${results.length} cases passed.`);
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
