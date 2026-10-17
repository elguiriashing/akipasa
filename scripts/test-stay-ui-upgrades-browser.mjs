import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const cwd = process.cwd(),
  dir = resolve("test-results/stay-ui-upgrades");
mkdirSync(dir, { recursive: true });
const entry = `import React from 'react';import{createRoot}from'react-dom/client';
import{StayProperty}from'./src/components/StayProperty';import{AccommodationBookingWorkspace}from'./src/components/AccommodationBookingWorkspace';import dashboardStyles from './src/components/VenueDashboard.module.css';
const q=new URLSearchParams(location.search),locale=q.get('lang')||'en',manager=q.get('screen')==='manager';document.body.dataset.product=manager?'akibusiness':'akiduermo';
const stay={id:'00000000-0000-4000-8000-000000000001',slug:'example',name:'Example accommodation',address:'Synthetic test street, Málaga',city:'Málaga',website:null,accommodationType:'hotel',descriptionEs:'',descriptionEn:'',photos:[],bookingMode:'request'};
const reservations=['requested','confirmed','checked_in','completed','cancelled','declined'].map(status=>({id:status,unit_id:'unit',check_in:'2027-03-20',check_out:'2027-03-25',guests:2,status,contact_name:'Guest '+status,contact_email:status+'@example.com',quoted_total_cents:30000}));
createRoot(document.getElementById('root')).render(manager?<main className='akibusiness-host' style={{maxWidth:1100,margin:'auto',padding:16}}><div className={dashboardStyles.dashboard}><section className={dashboardStyles.section}><AccommodationBookingWorkspace locale={locale} venueId={stay.id} reservations={reservations} actions={{changeStatus:async()=>{}}}/></section></div></main>:<StayProperty stay={stay} initialLocale={locale}/>);`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: cwd, loader: "tsx" },
  bundle: true,
  write: false,
  outdir: resolve(dir, "bundle"),
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env": JSON.stringify({ NODE_ENV: "production" }),
  },
  plugins: [
    {
      name: "next-adapters",
      setup(b) {
        // Browser fixtures have no Next server-action runtime.
        b.onResolve(
          { filter: /\/app\/(?:akiduermo\/account|\[locale\]\/auth)\/actions$/ },
          () => ({ path: "sign-out", namespace: "test-auth" }),
        );
        b.onLoad({ filter: /.*/, namespace: "test-auth" }, () => ({
          contents: "export function signOutStay() {} export function signOut() {}",
          loader: "js",
        }));
        b.onResolve({ filter: /^next\/(link|image|navigation)$/ }, (args) => ({
          path: args.path,
          namespace: "test",
        }));
        b.onLoad({ filter: /.*/, namespace: "test" }, (args) => ({
          contents: args.path.endsWith("navigation")
            ? "export function usePathname(){return location.pathname}export function useRouter(){return{refresh(){}}}export function useSearchParams(){return new URLSearchParams(location.search)}"
            : args.path.endsWith("image")
              ? 'import React from "react";export default function Image({fill,priority,unoptimized,sizes,...props}){return React.createElement("img",props)}'
              : 'import React from "react";export default function Link({children,...props}){return React.createElement("a",props,children)}',
          loader: "jsx",
          resolveDir: cwd,
        }));
      },
    },
  ],
});
const css =
  (
    await postcss([tailwind()]).process(
      [
        "globals.css",
        "compact-app.css",
        "brand.css",
        "appearance.css",
        "tablet-responsive.css",
        "portal-unity.css",
      ]
        .map((file) => readFileSync(resolve(cwd, "src/app", file), "utf8"))
        .join("\n"),
      { from: resolve(cwd, "src/app/globals.css") },
    )
  ).css + (bundle.outputFiles.find((f) => f.path.endsWith(".css"))?.text || "");
const requests = [];
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundle.outputFiles.find((f) => f.path.endsWith(".js")).text);
  } else if (req.url === "/styles.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else if (req.url.startsWith("/api/stays/bookings")) {
    requests.push(req.url);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ rooms: [] }));
  } else if (req.url.startsWith("/brand/") || req.url.startsWith("/pwa/")) {
    try {
      const path = new URL(req.url, "http://localhost").pathname;
      if (!/^\/(brand|pwa)\/[a-z0-9-]+\.png$/.test(path))
        throw new Error("invalid");
      res.setHeader("Content-Type", "image/png");
      res.end(readFileSync(resolve(cwd, "public" + path)));
    } catch {
      res.statusCode = 404;
      res.end();
    }
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  }
});
await new Promise((r) => server.listen(3191, "127.0.0.1", r));
let browser;
const results = [];
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : { channel: "chrome" }),
  });
  for (const locale of ["en", "es"])
    for (const theme of ["light", "dark"])
      for (const [width, height] of [
        [360, 800],
        [390, 844],
        [600, 960],
        [820, 1180],
        [1536, 960],
        [640, 400],
      ])
        for (const screen of ["property", "manager"]) {
          const page = await browser.newPage({
            viewport: { width, height },
            colorScheme: theme,
          });
          const errors = [];
          page.on("pageerror", (error) => errors.push(error.message));
          await page.addInitScript((theme) => {
            localStorage.setItem("akipasa.theme", theme);
            document.addEventListener("DOMContentLoaded", () => {
              document.documentElement.dataset.theme = theme;
            });
          }, theme);
          const before = requests.length;
          await page.goto(
            "http://127.0.0.1:3191/stays/example?" +
              new URLSearchParams({
                lang: locale,
                screen,
                checkIn: "2027-03-20",
                checkOut: "2027-03-25",
                guests: "4",
              }),
          );
          const es = locale === "es";
          if (screen === "property") {
            await expect(
              page.getByLabel(es ? "Entrada" : "Check in", { exact: true }),
            ).toHaveValue("2027-03-20");
            await expect(
              page.getByLabel(es ? "Salida" : "Check out", { exact: true }),
            ).toHaveValue("2027-03-25");
            await expect(
              page.getByRole("spinbutton", {
                name: es ? "Huéspedes" : "Guests",
              }),
            ).toHaveValue("4");
            expect(requests.length).toBe(before);
            const region = page.getByRole("region", {
              name: es ? "Reserva una estancia" : "Reserve a stay",
            });
            await region.scrollIntoViewIfNeeded();
            await page
              .getByRole("spinbutton", { name: es ? "Huéspedes" : "Guests" })
              .fill("3");
            await page
              .getByRole("button", {
                name: es ? "Consultar disponibilidad" : "Check availability",
                exact: true,
              })
              .click();
            await expect(
              page.getByText(
                es
                  ? "No hay habitaciones para estas fechas y huéspedes."
                  : "No rooms available for these dates and guests.",
              ),
            ).toBeVisible();
            expect(requests.length).toBe(before + 1);
            const query = new URL(requests.at(-1), "http://localhost")
              .searchParams;
            expect(query.get("guests")).toBe("3");
            expect(query.get("checkIn")).toBe("2027-03-20");
          } else {
            const card = page.locator(".stay-reservation-card").first();
            const rows = await card.evaluate((el) => {
              const name = el.querySelector("strong").getBoundingClientRect();
              const date = el
                .querySelector("span:not(.badge)")
                .getBoundingClientRect();
              const amount = el.querySelector("small").getBoundingClientRect();
              return {
                gap1: date.top - name.bottom,
                gap2: amount.top - date.bottom,
              };
            });
            expect(rows.gap1).toBeGreaterThan(0);
            expect(rows.gap2).toBeGreaterThan(0);
            await expect(
              card.getByRole("button", {
                name: es ? "Confirmar" : "Confirm",
                exact: true,
              }),
            ).toBeVisible();
            const select = page.getByRole("combobox", {
              name: es ? "Estado" : "Status",
              exact: true,
            });
            await select.selectOption("checked_in");
            await expect(
              page.getByText("Guest checked_in", { exact: true }),
            ).toBeVisible();
            await page
              .getByRole("searchbox", {
                name: es ? "Buscar" : "Search",
                exact: true,
              })
              .fill("unmatched guest");
            await expect(
              page.getByText(
                es
                  ? "Ninguna reserva coincide con estos filtros."
                  : "No reservations match these filters.",
              ),
            ).toBeVisible();
            await page.getByRole("searchbox").fill("");
            await expect(
              page.getByText("Guest checked_in", { exact: true }),
            ).toBeVisible();
            expect(await select.inputValue()).toBe("checked_in");
          }
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
          ).toBeLessThanOrEqual(width + 1);
          expect(errors).toEqual([]);
          await page.screenshot({
            path:
              dir +
              "/" +
              screen +
              "-" +
              locale +
              "-" +
              theme +
              "-" +
              width +
              "x" +
              height +
              ".png",
            fullPage: true,
          });
          results.push({
            locale,
            theme,
            width,
            height,
            screen,
            status: "passed",
          });
          await page.close();
        }
  writeFileSync(
    dir + "/results.json",
    JSON.stringify(
      { cases: results.length, requests: requests.length, results },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ cases: results.length, requests: requests.length, dir }),
  );
} catch (error) {
  writeFileSync(
    dir + "/partial-results.json",
    JSON.stringify({ results, error: String(error) }, null, 2),
  );
  throw error;
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
