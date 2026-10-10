import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
const dir = resolve("test-results/staff-claims");
mkdirSync(dir, { recursive: true });
const bundle = await build({
  stdin: {
    contents: `import React from 'react';import{createRoot}from'react-dom/client';import{StaffQueue}from'./src/app/[locale]/staff/StaffQueue';const locale=new URLSearchParams(location.search).get('lang')||'en';createRoot(document.getElementById('root')).render(<main className="staff-workspace" style={{padding:16,maxWidth:1100,margin:'auto'}}><StaffQueue locale={locale} targetType="venue_claim" approve="approved" claimPage={2} items={[{id:'claim-test',claimant_id:'applicant-test',created_at:'2026-10-10T10:00:00Z',evidence:'I manage this venue.\\nPlease verify my business documents.',status:'pending',claimant:{display_name:'Test Applicant',email:'very-long-applicant-address@example.test',phone:'+34600000000',created_at:'2026-09-01T10:00:00Z'},venues:{name:'Test Venue',address:'Example Street 1, Fuengirola, Málaga',slug:'test-venue',contact_phone:'+34900000000',website_url:'https://example.test',timezone:'Europe/Madrid'}}]}/></main>);`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [
    {
      name: "disposable-adapters",
      setup(b) {
        b.onResolve({ filter: /moderation\/actions$/ }, () => ({
          path: "actions",
          namespace: "test",
        }));
        b.onResolve({ filter: /^next\/link$/ }, () => ({
          path: "link",
          namespace: "test",
        }));
        b.onLoad({ filter: /.*/, namespace: "test" }, (args) => ({
          contents:
            args.path === "actions"
              ? "export async function moderateItem(form){window.review=Object.fromEntries(form)}"
              : 'import React from "react";export default function Link(props){return React.createElement("a",props)}',
          loader: "jsx",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
const css = (
  await postcss([tailwind()]).process(
    ["globals.css", "compact-app.css", "brand.css", "appearance.css"]
      .map((f) => readFileSync(`src/app/${f}`, "utf8"))
      .join("\n"),
    { from: resolve("src/app/globals.css") },
  )
).css;
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundle.outputFiles[0].text);
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
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : {}),
  });
  for (const locale of ["en", "es"])
    for (const theme of ["light", "dark"])
      for (const [width, height] of [
        [360, 800],
        [600, 960],
        [1536, 960],
        [640, 400],
      ]) {
        const page = await browser.newPage({ viewport: { width, height } });
        await page.goto(`http://127.0.0.1:3198/?lang=${locale}`);
        await page.evaluate((t) => {
          document.documentElement.dataset.theme = t;
          document.documentElement.classList.toggle("dark", t === "dark");
        }, theme);
        await expect(
          page.getByRole("heading", { name: "Test Venue" }),
        ).toBeVisible();
        await expect(page.getByText("Test Applicant")).toBeVisible();
        await expect(
          page.getByRole("link", {
            name: "very-long-applicant-address@example.test",
          }),
        ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
        await page.getByRole("textbox").fill("Ownership evidence verified");
        await page
          .getByRole("button", {
            name: locale === "es" ? "Aprobar" : "Approve",
          })
          .click();
        await expect
          .poll(() => page.evaluate(() => window.review?.decision))
          .toBe("approved");
        expect(await page.evaluate(() => window.review)).toMatchObject({
          targetType: "venue_claim",
          targetId: "claim-test",
          reason: "Ownership evidence verified",
          claimPage: "2",
        });
        await page
          .getByRole("button", {
            name: locale === "es" ? "Rechazar" : "Reject",
          })
          .click();
        await expect
          .poll(() => page.evaluate(() => window.review?.decision))
          .toBe("rejected");
        await page.screenshot({
          path: `${dir}/${locale}-${theme}-${width}.png`,
          fullPage: true,
        });
        await page.close();
        console.log(`PASS claims ${locale} ${theme} ${width}x${height}`);
      }
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
