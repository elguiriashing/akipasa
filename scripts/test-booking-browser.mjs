import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve("test-results/booking-release");
mkdirSync(dir, { recursive: true });
// These are the real UI components with disposable client action adapters, not production routes.
const entry = `import React,{useState} from "react";import{createRoot}from"react-dom/client";
import{BookingWizard}from"./src/components/BookingWizard";
import{BookingManager}from"./src/components/BookingManager";
import{MyBookings}from"./src/components/MyBookings";
const q=new URLSearchParams(location.search),locale=q.get("locale")||"en",mode=q.get("screen")||"wizard";
const date=d=>new Date(Date.now()+d*86400000).toISOString();
const venueId="00000000-0000-4000-8000-000000000001",slotId="00000000-0000-4000-8000-000000000002";
const slots=[{id:slotId,starts_at:date(2),ends_at:date(2.1),capacity:50,remaining:2,active:true},{id:"00000000-0000-4000-8000-000000000003",starts_at:date(3),ends_at:date(3.1),capacity:2,remaining:0,active:true}];
function App(){const[tab,setTab]=useState("inbox");const action=async data=>{window.submitted=Object.fromEntries(data);setTab(data.get("requestId")?"inbox":data.get("startsAt")?"calendar":"offerings");};
const requests=[{id:slotId,slot_id:slotId,contact_name:"Test guest",contact_email:"guest@example.com",party_size:2,status:"requested",created_at:date(-1)}];
return <main style={{maxWidth:1000,margin:"0 auto",padding:16}}>
{mode==="wizard"?<BookingWizard locale={locale} slug="example" venueId={venueId} venueName="Example venue" slots={slots} offerings={{}} profile={{name:"Test guest",email:"guest@example.com",phone:""}} submit={async data=>{window.submitted=Object.fromEntries(data);return {error:locale==="es"?"Prueba: disponibilidad actualizada":"Test: availability refreshed",remaining:1};}}/>:
mode==="manager"?<BookingManager locale={locale} venueId={venueId} settings={{mode:"request",booking_template:"experience"}} slots={slots} resources={[]} offerings={[]} requests={requests} save={action} createSlot={action} createRecurringSlots={action} createResource={action} createOffering={action} updateRequest={action} initialTab={tab}/>:
<MyBookings locale={locale} bookings={[{...requests[0],venue:{name:"Example venue",slug:"example"},slot:slots[0]},{...requests[0],id:"past",status:"completed",venue:{name:"Previous venue",slug:"previous"},slot:{starts_at:date(-2),ends_at:date(-1)}}]}/>}
</main>;}createRoot(document.getElementById("root")).render(<App/>);`;
const js = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
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
const css = (
  await postcss([tailwind()]).process(
    readFileSync("src/app/globals.css", "utf8"),
    { from: resolve("src/app/globals.css") },
  )
).css;
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(js.outputFiles[0].text);
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
await new Promise((r) => server.listen(3199, "127.0.0.1", r));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BOOKING_BROWSER_PATH
    ? { executablePath: process.env.BOOKING_BROWSER_PATH }
    : {}),
});
const results = [];
try {
  for (const locale of ["en", "es"])
    for (const width of [360, 1365])
      for (const theme of ["dark", "light"]) {
        const page = await browser.newPage({
          viewport: { width, height: 850 },
          colorScheme: theme,
        });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        const url = (s) =>
          `http://127.0.0.1:3199/?screen=${s}&locale=${locale}`;
        const themeSet = () =>
          page.evaluate((t) => {
            document.documentElement.setAttribute("data-theme", t);
            document.documentElement.classList.toggle(
              "theme-light",
              t === "light",
            );
            document.documentElement.classList.toggle(
              "theme-dark",
              t === "dark",
            );
          }, theme);
        const overflow = async () =>
          expect(
            await page.evaluate(
              () =>
                document.documentElement.scrollWidth <= window.innerWidth + 1,
            ),
          ).toBe(true);
        await page.goto(url("wizard"));
        await themeSet();
        await page
          .getByRole("button", {
            name: locale === "es" ? /Continuar/ : /Continue/,
          })
          .click();
        const plus = page.getByRole("button", {
          name: locale === "es" ? "Añadir persona" : "Add guest",
        });
        await plus.click();
        await expect(plus).toBeDisabled();
        await expect(page.locator(".booking-guest-counter strong")).toHaveText(
          "2",
        );
        await page
          .getByRole("button", {
            name: locale === "es" ? /Continuar/ : /Continue/,
          })
          .click();
        await page
          .getByRole("button", {
            name: locale === "es" ? "Solicitar reserva" : "Request booking",
          })
          .click();
        await expect(page.getByRole("alert")).toContainText(
          locale === "es" ? "actualizada" : "refreshed",
        );
        expect(await page.evaluate(() => window.submitted.partySize)).toBe("2");
        expect(await page.evaluate(() => window.submitted.requestKey)).toMatch(
          /^[0-9a-f-]{36}$/,
        );
        await overflow();
        await page.screenshot({
          path: resolve(dir, `wizard-${locale}-${width}-${theme}.png`),
          fullPage: true,
        });
        await page.goto(url("manager"));
        await themeSet();
        const services = page.getByRole("button", {
          name: locale === "es" ? "Servicios" : "Services",
          exact: true,
        });
        await services.click();
        await page
          .getByRole("button", {
            name: locale === "es" ? "Mesas y restaurantes" : "Tables & dining",
          })
          .click();
        await page
          .locator('form input[name="name"]')
          .first()
          .fill("Test dining");
        await page
          .getByRole("button", {
            name: locale === "es" ? "Crear servicio" : "Create offering",
          })
          .click();
        await expect
          .poll(() => page.evaluate(() => window.submitted?.kind))
          .toBe("dining");
        await expect(services).toHaveAttribute("aria-current", "page");
        await overflow();
        await page.screenshot({
          path: resolve(dir, `manager-${locale}-${width}-${theme}.png`),
          fullPage: true,
        });
        const settings = page.getByRole("button", {
          name: locale === "es" ? "Ajustes" : "Settings",
          exact: true,
        });
        await settings.click();
        await page
          .getByRole("radio", {
            name: locale === "es" ? /Enlace externo/ : /External link/,
          })
          .check();
        await expect(page.locator('input[name="externalUrl"]')).toBeVisible();
        await expect(page.locator('input[name="depositEuros"]')).toHaveCount(0);
        await page.goto(url("account"));
        await themeSet();
        await expect(
          page.getByText("Example venue", { exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: locale === "es" ? /Historial/ : /Past/ })
          .click();
        await expect(
          page.getByText("Previous venue", { exact: true }),
        ).toBeVisible();
        await overflow();
        await page.screenshot({
          path: resolve(dir, `account-${locale}-${width}-${theme}.png`),
          fullPage: true,
        });
        expect(errors).toEqual([]);
        results.push({ locale, width, theme, result: "pass" });
        await page.close();
      }
  writeFileSync(resolve(dir, "results.json"), JSON.stringify(results, null, 2));
  console.log(
    "PASS: eight locale/viewport/theme combinations, real React components, capacity, stale availability, form persistence, offerings and history. Network email and DB actions are mocked here; role/inventory integration is tested separately in PostgreSQL.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
