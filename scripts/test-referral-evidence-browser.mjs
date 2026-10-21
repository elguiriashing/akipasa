import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
// Real representative component and referral styles, explicit synthetic billing fixture.
// No provider/authentication/customer programme or money activity is exercised here.
const output = resolve("test-results/referral-evidence");
mkdirSync(output, { recursive: true });
const bundle = await build({
  stdin: {
    contents: `import React from 'react';import{createRoot}from'react-dom/client';import Panel from './src/app/[locale]/account/referrals/RepresentativeEvidence';const q=new URLSearchParams(location.search),locale=q.get('locale')==='es'?'es':'en';const invoice={reference:'b'.repeat(32),code:'AKIREVIEW01',product:'business',recorded_at:'2026-10-01T12:00:00Z',currency:'eur',proposed_cents:123,terms_version:'synthetic-test-only-unapproved-terms-version-'.repeat(4),blockers:['billing_hold'],review_state:'approved',effective_approval:false,status:'held',reviews:[{state:'approved',reviewed_at:'2026-10-01T12:00:00Z'},{state:'eligible',reviewed_at:'2026-09-30T12:00:00Z'}],reviews_truncated:false,payable:false,payouts_enabled:false};const data={days:90,since:'2026-07-01T00:00:00Z',subscriptions:[{reference:'a'.repeat(32),latest_evidence_at:'2026-10-01T12:00:00Z',invoice_count:1,invoices_truncated:false,invoices:[invoice]}],subscriptions_truncated:false,payable:false,payouts_enabled:false};createRoot(document.getElementById('root')).render(<main className="referral-workspace"><h1>Disposable referral fixture · no production activity</h1><Panel locale={locale} days={90} data={data}/></main>);`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
const script = bundle.outputFiles[0].text;
const css = readFileSync(
  "src/app/[locale]/account/referrals/referrals.css",
  "utf8",
);
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(script);
  } else {
    const theme = new URL(req.url, "http://localhost").searchParams.get(
      "theme",
    );
    res.setHeader("Content-Type", "text/html");
    res.end(
      `<!doctype html><html lang="en" data-theme="${theme === "dark" ? "dark" : "light"}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui;background:${theme === "dark" ? "#111c30" : "#fff"};color:${theme === "dark" ? "#eef4ff" : "#172130"}}h1{font-size:1.5rem;overflow-wrap:anywhere}${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`,
    );
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
let browser;
const results = [];
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.REFERRAL_BROWSER_PATH
      ? {
          executablePath: process.env.REFERRAL_BROWSER_PATH,
          args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        }
      : {}),
  });
  for (const locale of ["en", "es"])
    for (const theme of ["light", "dark"])
      for (const [width, height] of [
        [360, 780],
        [768, 1024],
        [1024, 768],
        [1440, 900],
      ]) {
        const page = await browser.newPage({
          viewport: { width, height },
          colorScheme: theme,
        });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.route("**/*", (route) =>
          new URL(route.request().url()).hostname === "127.0.0.1"
            ? route.continue()
            : route.abort(),
        );
        await page.goto(
          `http://127.0.0.1:${port}/?locale=${locale}&theme=${theme}`,
        );
        await expect(
          page.getByRole("heading", {
            name:
              locale === "es"
                ? "Tus suscripciones atribuidas"
                : "Your attributed subscriptions",
          }),
        ).toBeVisible();
        await expect(
          page.getByText(
            locale === "es"
              ? "No pagadero · pagos desactivados"
              : "Not payable · payouts disabled",
          ),
        ).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        );
        if (overflow) throw Error(`Overflow ${locale}/${theme}/${width}`);
        const select = page.getByRole("combobox");
        await select.focus();
        await expect(select).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(
          page.getByRole("button", {
            name: locale === "es" ? "Aplicar periodo" : "Apply period",
          }),
        ).toBeFocused();
        await page.keyboard.press("Tab");
        const summary = page.locator("summary");
        await expect(summary).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page.locator("details")).toHaveAttribute("open", "");
        for (const target of [select, page.getByRole("button"), summary]) {
          const box = await target.boundingBox();
          if (!box || box.height < 44) throw Error("Touch target below44px");
        }
        await select.selectOption("365");
        await expect(select).toHaveValue("365");
        expect(errors).toEqual([]);
        if (width === 360 && locale === "en")
          await page.screenshot({
            path: resolve(output, `phone-${theme}.png`),
            fullPage: true,
          });
        results.push({ locale, theme, width, height, passed: true });
        await page.close();
      }
  writeFileSync(
    resolve(output, "report.json"),
    JSON.stringify(
      {
        scope:
          "Synthetic component fixture only; no private provider acceptance",
        results,
      },
      null,
      2,
    ),
  );
  console.log(`${results.length} referral evidence browser cases passed`);
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
