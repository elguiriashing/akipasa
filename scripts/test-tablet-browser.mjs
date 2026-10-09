import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve("test-results/tablet-components");
mkdirSync(dir, { recursive: true });
// These are the real UI components with disposable client action adapters, not production routes.
const entry = `import React from "react";import{createRoot}from"react-dom/client";
import{VenueDeleteControl}from"./src/components/VenueDeleteControl";
import{VenueDashboard}from"./src/components/VenueDashboard";
import{BookingManager}from"./src/components/BookingManager";
const locale=new URLSearchParams(location.search).get("locale")||(location.pathname.startsWith("/es/")?"es":"en"),es=locale==="es";
const action=async()=>{window.submitted=true};
const query=new URLSearchParams(location.search), search=query.get("bookingSearch")||"", status=query.get("bookingStatus")||"all", sort=query.get("bookingSort")||"newest", currentPage=Number(query.get("bookingPage")||1);
const allRequests=Array.from({length:65},(_,i)=>({id:"00000000-0000-4000-8000-"+String(i).padStart(12,"0"),contact_name:"Test Guest "+i,contact_email:"guest"+i+"@example.invalid",party_size:2,status:i%2?"confirmed":"requested",created_at:"2026-10-09T12:00:00Z",venue_availability_slots:{starts_at:"2026-11-01T10:00:00Z",ends_at:"2026-11-01T11:00:00Z",offering_id:"breakfast"}}));
const filtered=allRequests.filter(r=>(!search||r.contact_name.includes(search))&&(status==="all"||r.status===status));
const booking=<BookingManager locale={locale} venueId="00000000-0000-4000-8000-000000000001" settings={{mode:"request",booking_template:"experience"}} slots={[{id:"slot",starts_at:"2026-11-01T10:00:00Z",ends_at:"2026-11-01T11:00:00Z",capacity:50,active:true}]} resources={[]} offerings={[{id:"breakfast",name:"Breakfast for two and a very long accessible service description",kind:"dining",duration_minutes:90,capacity:2,active:true}]} requests={filtered.slice((currentPage-1)*20,currentPage*20)} inbox={{search,status,sort,page:currentPage,total:filtered.length,pending:33}} emailConfigured={true} save={action} createSlot={action} createRecurringSlots={action} createResource={action} createOffering={action} updateRequest={action}/>;
createRoot(document.getElementById("root")).render(<div className="akibusiness-host"><div className="business-workspace" style={{padding:16}}>
<div className="managed-row"><div><strong>Beasty Bites · AkiDuermo HQ long property name</strong><span>owner · published</span></div><div className="business-venue-row-actions"><a className="button secondary business-venue-action" href="#managed">{es?"Gestionar local":"Manage venue"}</a><VenueDeleteControl locale={locale} venueId="test" venueName="AkiDuermo HQ" action={action}/></div></div>
<VenueDashboard locale={locale} name="AkiDuermo HQ" status="published" verified={true} publicHref="#public" initialSection={query.get("section")||"overview"} counts={{photos:0,events:0,programs:0,credentials:0,requests:33,members:1}} sections={{profile:<form><label>{es?"Nombre":"Name"}<input defaultValue="Test"/></label></form>,bookings:booking,events:<p>Events</p>,photos:<p>Photos</p>,catalogue:<p>Catalogue</p>,rewards:<p>Rewards</p>,checkin:<p>Checkin</p>,team:<p>Team</p>}}/>
</div></div>);`;
const js = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  outdir: "/tmp/booking-browser-build",
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "next-link-browser-adapter",
      setup(b) {
        b.onResolve({ filter: /^next\/link$/ }, () => ({
          path: "next/link",
          namespace: "test",
        }));
        b.onLoad({ filter: /.*/, namespace: "test" }, () => ({
          contents:
            'import React from "react";export default function Link({children,...props}){return React.createElement("a",props,children)}',
          loader: "jsx",
          resolveDir: process.cwd(),
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
        readFileSync("src/app/compact-app.css", "utf8") +
        "\n" +
        readFileSync("src/app/brand.css", "utf8") +
        "\n" +
        readFileSync("src/app/appearance.css", "utf8") +
        "\n" +
        readFileSync("src/app/tablet-responsive.css", "utf8"),
      { from: resolve("src/app/globals.css") },
    )
  ).css +
  (js.outputFiles.find((file) => file.path.endsWith(".css"))?.text || "");
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(js.outputFiles.find((file) => file.path.endsWith(".js")).text);
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
await new Promise((r) => server.listen(3198, "127.0.0.1", r));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BOOKING_BROWSER_PATH
    ? { executablePath: process.env.BOOKING_BROWSER_PATH }
    : {}),
});
const results = [];
try {
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const [width, height] of [
        [390, 844],
        [600, 960],
        [768, 1024],
        [820, 1180],
        [1024, 768],
        [1280, 800],
        [960, 1536],
        [1536, 960],
        [640, 400],
      ]) {
        const page = await browser.newPage({
          viewport: { width, height },
          colorScheme: theme,
        });
        console.log(`Tablet ${locale} ${theme} ${width}×${height}`);
        await page.addInitScript((theme) => {
          document.addEventListener("DOMContentLoaded", () => {
            document.documentElement.dataset.theme = theme;
            document.documentElement.classList.add(`theme-${theme}`);
          });
        }, theme);
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(`http://127.0.0.1:3198/?locale=${locale}`);
        await page.locator("html").evaluate((e, t) => {
          e.dataset.theme = t;
          e.classList.add(`theme-${t}`);
        }, theme);
        await expect(page.locator(".managed-row strong")).toBeVisible();
        const check = async () => {
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
          ).toBeLessThanOrEqual(width + 1);
          for (const el of await page
            .locator(
              ".business-venue-row-actions > a, .business-venue-row-actions > button",
            )
            .all()) {
            const r = await el.boundingBox();
            expect(r.x).toBeGreaterThanOrEqual(0);
            expect(r.x + r.width).toBeLessThanOrEqual(width + 1);
          }
        };
        await check();
        await page
          .getByRole("button", {
            name:
              locale === "es" ? "Eliminar AkiDuermo HQ" : "Delete AkiDuermo HQ",
            exact: true,
          })
          .click();
        await expect(page.locator("dialog")).toBeVisible();
        await page
          .locator("dialog textarea")
          .fill("Disposable browser acceptance");
        await page.locator("dialog input[name=confirmation]").fill("DELETE");
        await expect(page.locator("dialog button[type=submit]")).toBeEnabled();
        await page
          .getByRole("button", {
            name: locale === "es" ? "Cancelar" : "Cancel",
            exact: true,
          })
          .click();
        await expect(page.locator("dialog")).not.toBeVisible();
        for (const tab of await page.getByRole("tab").all()) {
          await tab.click();
          await check();
          if (await page.locator(".booking-manager-tabs").isVisible()) {
            for (const bookingTab of await page
              .locator(".booking-manager-tabs button")
              .all()) {
              await bookingTab.click();
              await check();
              const panel = page.locator(".booking-manager-body");
              expect(
                await panel.evaluate((el) => getComputedStyle(el).overflowY),
              ).toBe("visible");
              if (await page.locator(".booking-inbox").isVisible()) {
                await expect(page.locator(".booking-request-card")).toHaveCount(
                  20,
                );
                await page
                  .getByRole("link", {
                    name: locale === "es" ? "Siguiente" : "Next",
                    exact: true,
                  })
                  .click();
                await expect(
                  page.locator(".booking-request-card").first(),
                ).toContainText("Test Guest 20");
                await page.getByRole("searchbox").fill("Test Guest 64");
                await page
                  .getByRole("button", {
                    name: locale === "es" ? "Buscar" : "Search",
                    exact: true,
                  })
                  .click();
                await expect(page.locator(".booking-request-card")).toHaveCount(
                  1,
                );
                await expect(
                  page.locator(".booking-request-card"),
                ).toContainText("Test Guest 64");
                await page
                  .getByRole("link", {
                    name: locale === "es" ? "Limpiar" : "Reset",
                    exact: true,
                  })
                  .click();
                await page
                  .locator('select[name="bookingStatus"]')
                  .selectOption("confirmed");
                await page
                  .getByRole("button", {
                    name: locale === "es" ? "Buscar" : "Search",
                    exact: true,
                  })
                  .click();
                await expect(page.locator(".booking-request-card")).toHaveCount(
                  20,
                );
                await expect(
                  page.locator(".booking-request-card").first(),
                ).toContainText("Test Guest 1");
                await page
                  .getByRole("link", {
                    name: locale === "es" ? "Limpiar" : "Reset",
                    exact: true,
                  })
                  .click();
                await check();
                await page
                  .locator(".booking-inbox-toolbar")
                  .scrollIntoViewIfNeeded();
                await page.screenshot({
                  path: resolve(dir, `inbox-${locale}-${theme}-${width}.png`),
                });
              }
              if (
                await page
                  .locator('[data-booking-panel="offerings"]')
                  .isVisible()
              ) {
                const last = page.getByRole("button", {
                  name: /Manage tables|Gestionar mesas/,
                });
                await last.scrollIntoViewIfNeeded();
                const buttonBounds = await last.boundingBox();
                const hubBounds = await page
                  .locator(".booking-hub")
                  .boundingBox();
                expect(
                  buttonBounds.y + buttonBounds.height,
                ).toBeLessThanOrEqual(hubBounds.y + hubBounds.height);
                await page.screenshot({
                  path: resolve(
                    dir,
                    `services-${locale}-${theme}-${width}.png`,
                  ),
                  fullPage: true,
                });
              }
              for (const field of await page
                .locator(
                  ".booking-manager-form input:not([type=hidden]), .booking-manager-form select, .booking-manager-form textarea, .booking-manager-form .button",
                )
                .all()) {
                const bounds = await field.boundingBox();
                if (bounds) {
                  expect(bounds.x).toBeGreaterThanOrEqual(0);
                  expect(bounds.x + bounds.width).toBeLessThanOrEqual(
                    width + 1,
                  );
                }
              }
            }
          }
        }
        expect(errors).toEqual([]);
        await page.screenshot({
          path: resolve(dir, `${locale}-${theme}-${width}.png`),
          fullPage: true,
        });
        results.push({ locale, theme, width, height, status: "pass" });
        await page.close();
      }
  writeFileSync(resolve(dir, "results.json"), JSON.stringify(results, null, 2));
  console.log(`${results.length} tablet component combinations passed`);
} finally {
  await browser.close();
  server.close();
}
