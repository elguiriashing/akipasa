import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
const directory = resolve("test-results/booking-read-boundary");
mkdirSync(directory, { recursive: true });
const entry = `import React from 'react';import{createRoot}from'react-dom/client';import{BookingManager}from'./src/components/BookingManager';import styles from './src/components/VenueDashboard.module.css';
const query=new URLSearchParams(location.search),failed=query.get('fixtureFailed'),locale=location.pathname.startsWith('/es/')?'es':'en';
document.documentElement.lang=locale;document.documentElement.dataset.theme=localStorage.getItem('booking-read-theme')||'light';window.__bookingActions=[];
const action=async form=>window.__bookingActions.push(Object.fromEntries(form));
const readErrors=failed&&failed!=='missing'?{[failed]:true}:{};
const settings=['settings','missing'].includes(failed)?null:{mode:'request',booking_template:'experience',notification_email:failed==='notificationSettings'?undefined:'fixture@example.invalid'};
const slot={id:'slot',starts_at:'2026-11-01T10:00:00Z',ends_at:'2026-11-01T11:00:00Z',capacity:4,active:true,resource_id:'resource',offering_id:'offering'};
createRoot(document.getElementById('root')).render(<div className='akibusiness-host'><main className={styles.dashboard}><section className={styles.section}><BookingManager locale={locale} venueId='f728f63d-8d57-443c-8f9b-777e2e271001' readErrors={readErrors} settings={settings} initialTab={query.get('bookingTab')||'inbox'} slots={failed==='slots'?[]:[slot]} resources={failed==='resources'?[]:[{id:'resource',name:'Own table',kind:'table',capacity:4,active:true}]} offerings={failed==='offerings'?[]:[{id:'offering',name:'Own service',kind:'experience',duration_minutes:60,capacity:4,active:true}]} requests={[{id:'request',contact_name:'Disposable guest',contact_email:'fixture@example.invalid',party_size:2,status:'requested',created_at:'2026-10-29T10:00:00Z',venue_availability_slots:slot}]} inbox={{search:'',status:'all',sort:'newest',page:1,total:1,pending:failed==='pending'?null:1}} save={action} createSlot={action} createRecurringSlots={action} createResource={action} createOffering={action} updateOffering={action} updateRequest={action} emailConfigured/></section></main></div>);`;
const built = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  outdir: "/tmp/booking-read-browser",
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "disposable-navigation",
      setup(builder) {
        builder.onResolve({ filter: /^next\/(link|navigation)$/ }, (args) => ({
          path: args.path,
          namespace: "fixture",
        }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
          contents: args.path.endsWith("navigation")
            ? "export function useRouter(){return {push(href){location.assign(href)}}}"
            : "import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}",
          loader: "jsx",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
const script = built.outputFiles.find((file) => file.path.endsWith(".js")).text;
const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const cssFiles = Array.from(
  rootLayout.matchAll(/import\s+["'](\.\/[^"']+\.css)["'];/g),
  (m) => resolve("src/app", m[1]),
);
const css = (
  await postcss([tailwind()]).process(
    cssFiles.map((file) => readFileSync(file, "utf8")).join("\n") +
      "\n" +
      built.outputFiles
        .filter((file) => file.path.endsWith(".css"))
        .map((file) => file.text)
        .join("\n"),
    { from: resolve("src/app/globals.css") },
  )
).css;
writeFileSync(resolve(directory, "bundle.js"), script);
writeFileSync(resolve(directory, "styles.css"), css);
const server = createServer((request, response) => {
  if (request.method !== "GET") {
    response.writeHead(405);
    response.end();
    return;
  }
  const path = new URL(request.url, "http://127.0.0.1").pathname;
  if (path === "/bundle.js") {
    response.setHeader("Content-Type", "application/javascript");
    response.end(script);
  } else if (path === "/styles.css") {
    response.setHeader("Content-Type", "text/css");
    response.end(css);
  } else {
    response.setHeader("Content-Type", "text/html");
    response.end(
      '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body data-product="akibusiness"><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BOOKING_BROWSER_PATH
    ? { executablePath: process.env.BOOKING_BROWSER_PATH }
    : {}),
});
const results = [],
  external = [],
  errors = [];
const cases = [
  ["settings", "setup"],
  ["notificationSettings", "setup"],
  ["slots", "calendar"],
  ["resources", "offerings"],
  ["offerings", "offerings"],
  ["pending", "inbox"],
];
async function checkReadNotice(page) {
  const boxes = await page
    .locator('.notice[role="alert"]')
    .evaluateAll((nodes) =>
      nodes.map((node) =>
        [...node.children].map((child) => {
          const r = child.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
        }),
      ),
    );
  for (const rows of boxes)
    for (let i = 1; i < rows.length; i++)
      expect(
        rows[i].top,
        "unavailable notice keeps each readable row below its predecessor",
      ).toBeGreaterThanOrEqual(rows[i - 1].bottom - 1);
}
try {
  for (const locale of ["en", "es"])
    for (const theme of ["light", "dark"])
      for (const width of [360, 390, 820, 1440]) {
        const es = locale === "es";
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          hasTouch: width <= 820,
          reducedMotion: "reduce",
        });
        await context.addInitScript(
          (value) => localStorage.setItem("booking-read-theme", value),
          theme,
        );
        await context.route("**/*", (route) => {
          if (new URL(route.request().url()).origin !== origin) {
            external.push(route.request().url());
            return route.abort();
          }
          return route.continue();
        });
        const page = await context.newPage();
        page.on("pageerror", (error) => errors.push(error.message));
        for (const [failed, tab] of cases) {
          await page.goto(
            `${origin}/${locale}/business/venue/f728f63d-8d57-443c-8f9b-777e2e271001?section=bookings&bookingTab=${tab}&fixtureFailed=${failed}`,
          );
          await expect(
            page.getByRole("heading", {
              name: es ? "Gestor de reservas" : "Booking manager",
              exact: true,
            }),
          ).toBeVisible();
          const nav = page.getByRole("navigation", {
            name: es ? "Secciones de reservas" : "Booking sections",
          });
          if (["settings", "notificationSettings"].includes(failed)) {
            await expect(
              page.getByRole("button", {
                name: es ? "Guardar configuración" : "Save booking setup",
              }),
            ).toHaveCount(0);
            await expect(page.getByRole("alert")).toBeVisible();
            if (failed === "settings")
              await expect(
                page
                  .locator(".booking-status-strip article")
                  .first()
                  .locator("strong"),
              ).toHaveText("—");
            await checkReadNotice(page);
            await page.screenshot({
              path: resolve(
                directory,
                `${failed}-${locale}-${theme}-${width}.png`,
              ),
              fullPage: true,
            });
            await page
              .getByRole("link", { name: es ? "Reintentar" : "Retry" })
              .click();
            await expect(
              page.locator('input[name="mode"][value="request"]'),
            ).toBeChecked();
            await expect(
              page.locator('input[name="notificationEmail"]'),
            ).toHaveValue("fixture@example.invalid");
          } else if (failed === "pending") {
            await expect(
              page
                .locator(".booking-status-strip article")
                .nth(2)
                .locator("strong"),
            ).toHaveText("—");
            await expect(page.getByText(/Disposable guest/)).toBeVisible();
            await expect(
              page.getByRole("link", { name: es ? "Reintentar" : "Retry" }),
            ).toHaveAttribute("href", /bookingTab=inbox/);
            await checkReadNotice(page);
            await page.screenshot({
              path: resolve(
                directory,
                `${failed}-${locale}-${theme}-${width}.png`,
              ),
              fullPage: true,
            });
          } else {
            if (failed === "resources") {
              await expect(
                page.getByRole("button", {
                  name: es ? "Crear servicio" : "Create offering",
                }),
              ).toBeVisible();
              await page
                .getByRole("button", {
                  name: es ? /Gestionar mesas/ : /Manage tables/,
                })
                .click();
              await expect(
                page.getByRole("button", {
                  name: es ? "Añadir recurso" : "Add resource",
                }),
              ).toHaveCount(0);
            } else if (failed === "offerings") {
              await expect(
                page.getByRole("button", {
                  name: es ? "Crear servicio" : "Create offering",
                }),
              ).toHaveCount(0);
              await page
                .getByRole("button", {
                  name: es ? /Gestionar mesas/ : /Manage tables/,
                })
                .click();
              await expect(
                page.getByRole("button", {
                  name: es ? "Añadir recurso" : "Add resource",
                }),
              ).toBeVisible();
            }
            await nav
              .getByRole("button", {
                name: es ? "Calendario" : "Calendar",
                exact: true,
              })
              .click();
            await expect(page.locator('input[name="startsAt"]')).toHaveCount(0);
            await expect(
              page.getByText(
                es ? "Aún no hay horarios creados." : "No booking slots yet.",
                { exact: true },
              ),
            ).toHaveCount(0);
            await expect(page.getByRole("alert")).toBeVisible();
            if (failed === "slots")
              await expect(
                page
                  .locator(".booking-status-strip article")
                  .nth(1)
                  .locator("strong"),
              ).toHaveText("—");
            else await expect(page.locator(".managed-row")).toContainText("4");
            await checkReadNotice(page);
            await page.screenshot({
              path: resolve(
                directory,
                `${failed}-${locale}-${theme}-${width}.png`,
              ),
              fullPage: true,
            });
          }
          await nav
            .getByRole("button", {
              name: es ? "Reservas" : "Bookings",
              exact: true,
            })
            .click();
          await expect(page.getByText(/Disposable guest/)).toBeVisible();
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 2,
            ),
          ).toBe(true);
          expect(await page.evaluate(() => window.__bookingActions)).toEqual(
            [],
          );
          results.push({ locale, theme, width, failed, pass: true });
        }
        await page.goto(
          `${origin}/${locale}/business/venue/f728f63d-8d57-443c-8f9b-777e2e271001?bookingTab=setup&fixtureFailed=missing`,
        );
        await expect(
          page.getByRole("button", {
            name: es ? "Guardar configuración" : "Save booking setup",
          }),
        ).toBeVisible();
        await expect(
          page.locator('input[name="mode"][value="external"]'),
        ).toBeChecked();
        await context.close();
      }
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  expect(results).toHaveLength(96);
  console.log(
    "PASS:96 independent booking read-failure scenarios +16 successful-missing defaults; no fixture saves/external requests.",
  );
} finally {
  writeFileSync(
    resolve(directory, "evidence.json"),
    JSON.stringify(
      {
        sourceCommit: process.env.GITHUB_SHA || "working-tree",
        bundleSha256: createHash("sha256").update(script).digest("hex"),
        results,
        external,
        errors,
        accepted: false,
        liveRoleAcceptance: false,
      },
      null,
      2,
    ),
  );
  await browser.close();
  await new Promise((done) => server.close(done));
}
