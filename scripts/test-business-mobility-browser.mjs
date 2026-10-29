import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

// Real route presentation with isolated owner/session/data/action adapters.
// This does not establish production authentication, RLS or physical Android acceptance.
const dir = resolve("test-results/business-mobility");
mkdirSync(dir, { recursive: true });
const entry = `import React from "react";import{createRoot}from"react-dom/client";
import MobilityWorkspace from "./src/app/[locale]/business/mobility/page";
const q=new URLSearchParams(location.search),locale=q.get("lang")||"en";
document.documentElement.dataset.theme=q.get("theme")||"dark";
document.documentElement.lang=locale;
MobilityWorkspace({params:Promise.resolve({locale}),searchParams:Promise.resolve({})}).then(screen=>createRoot(document.getElementById("root")).render(screen));`;
const fixtureAuth = `export async function requireUser(){
const state=new URLSearchParams(location.search).get("state");
const vehicles=Array.from({length:2},(_,i)=>({id:"car-"+i,name:i?"Family car with a long descriptive name":"City car",category:"economy",seats:5,daily_price_cents:4500,deposit_cents:15000,active:true}));
const values={car_rental_companies:state==="new"?null:{id:"company-a",name:"Disposable Costa del Sol Rental",city:"Mijas",address:"Fixture pickup address",status:"pending_review"},car_rental_vehicles:vehicles,car_rental_calendar_blocks:[],car_rental_bookings:[{id:"booking-a",vehicle_id:"car-0",vehicle:{name:"City car"},start_date:"2027-01-01",end_date:"2027-01-03",status:"requested",contact_name:"Fixture Renter",contact_email:"renter@example.invalid",contact_phone:"+34 000 000 000",note:"Disposable browser evidence — no real booking."}]};
return{user:{id:"fixture-owner"},supabase:{from(table){const failed=state==="error"&&table!=="car_rental_companies";const response={data:failed?null:values[table],error:failed?{message:"Fixture unavailable"}:null};const query={select(){return query},eq(){return query},in(){return query},order(){return query},limit(){return Promise.resolve(response)},maybeSingle(){return Promise.resolve(response)}};return query}}}}
`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  outdir: "/tmp/mobility-browser-build",
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env": '{"NODE_ENV":"production"}',
  },
  plugins: [
    {
      name: "disposable-mobility-boundaries",
      setup(b) {
        b.onResolve({ filter: /^@\/lib\/auth$/ }, () => ({
          path: "auth",
          namespace: "fixture",
        }));
        b.onResolve({ filter: /^\.\/actions$/ }, (args) =>
          args.importer.includes("/business/mobility/")
            ? { path: "actions", namespace: "fixture" }
            : undefined,
        );
        b.onResolve(
          { filter: /^@\/components\/SpainAddressAutocomplete$/ },
          () => ({ path: "address", namespace: "fixture" }),
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
              ? fixtureAuth
              : args.path === "actions"
                ? "export async function createRentalBlock(){}export async function createRentalCompany(){}export async function createRentalVehicle(){}export async function updateRentalBookingStatus(){}export async function updateRentalVehicle(){}"
                : args.path === "address"
                  ? 'import React from "react";export function SpainAddressAutocomplete({label,name="address"}){return <label>{label}<input name={name} aria-label={label}/></label>}'
                  : args.path.endsWith("navigation")
                    ? 'export function notFound(){throw new Error("not-found")}'
                    : 'import React from "react";export default function Link({children,...props}){return <a {...props}>{children}</a>}',
        }));
      },
    },
  ],
});
const css =
  (
    await postcss([tailwind()]).process(
      readFileSync("src/app/globals.css", "utf8") +
        "\n" +
        readFileSync("src/app/appearance.css", "utf8"),
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
await new Promise((r) => server.listen(3194, "127.0.0.1", r));
let browser;
const results = [];
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
        for (const state of ["populated", "error"]) {
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
            `http://127.0.0.1:3194/?lang=${locale}&theme=${theme}&state=${state}`,
          );
          await expect(page.locator("h1")).toBeVisible();
          await expect(page.locator("header > a")).toHaveAttribute(
            "href",
            `https://akicoches.com/?lang=${locale}`,
          );
          await expect(page.locator("#availability")).toHaveCount(1);
          if (state === "error")
            await expect(
              page.locator("strong").filter({ hasText: "—" }),
            ).toHaveCount(4);
          const geometry = await page.evaluate(() => ({
            viewport: innerWidth,
            document: document.documentElement.scrollWidth,
            controls: [
              ...document.querySelectorAll(
                "button,input,select,nav a,header > a",
              ),
            ]
              .filter((e) => e.getBoundingClientRect().width > 0)
              .map((e) => ({
                tag: e.tagName,
                height: e.getBoundingClientRect().height,
                width: e.getBoundingClientRect().width,
              })),
          }));
          expect(geometry.document).toBeLessThanOrEqual(width + 1);
          expect(geometry.controls.every((c) => c.height >= 44)).toBe(true);
          expect(errors).toEqual([]);
          const name = `${locale}-${theme}-${width}-${state}`;
          await page.screenshot({
            path: resolve(dir, `${name}.png`),
            fullPage: true,
          });
          results.push({
            name,
            geometry,
            errors,
            androidEmulation: width === 390,
          });
          await context.close();
        }
  writeFileSync(
    resolve(dir, "results.json"),
    JSON.stringify(
      {
        sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        sourceState: "working-tree",
        sourceFiles: Object.fromEntries(
          [
            "src/app/[locale]/business/mobility/page.tsx",
            "src/app/[locale]/business/mobility/mobility-desk.module.css",
            "scripts/test-business-mobility-browser.mjs",
          ].map((path) => [
            path,
            createHash("sha256").update(readFileSync(path)).digest("hex"),
          ]),
        ),
        bundleSha256: createHash("sha256")
          .update(
            bundle.outputFiles.find((file) => file.path.endsWith(".js"))
              .contents,
          )
          .update(css)
          .digest("hex"),
        fixture: true,
        physicalAndroid: false,
        cases: results,
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS ${results.length} EN/ES dark/light responsive mobility fixture cases`,
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
