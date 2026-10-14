import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";

const directory = "test-results/support-ui-upgrades";
mkdirSync(directory, { recursive: true });
const output = await build({
  stdin: {
    contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {SupportAgentLauncher} from './src/components/support/SupportAgentLauncher';const query=new URLSearchParams(location.search);window.__supportRequests=[];window.fetch=async(url,options)=>{window.__supportRequests.push({url,options});if(window.__supportRequests.length===1)return{ok:false,json:async()=>({ok:false,message:'Fixture transport error'})};return {ok:true,json:async()=>({ok:true,text:'This is an inert fixture reply. '.repeat(24)+'LongToken'+ 'x'.repeat(150)})}};createRoot(document.getElementById('root')).render(<><button>Outside control</button><SupportAgentLauncher locale={query.get('locale')} surface="site_contact" label="Help" signedIn /></>);`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  outdir: directory + "/bundle",
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
const script = output.outputFiles.find((f) => f.path.endsWith(".js")).text;
const css = output.outputFiles
  .filter((f) => f.path.endsWith(".css"))
  .map((f) => f.text)
  .join("\n");
writeFileSync(directory + "/bundle.js", script);
writeFileSync(directory + "/styles.css", css);
const server = createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (url.pathname === "/bundle.js") {
    response.setHeader("Content-Type", "text/javascript");
    response.end(script);
    return;
  }
  if (url.pathname === "/styles.css") {
    response.setHeader("Content-Type", "text/css");
    response.end(css);
    return;
  }
  const dark = url.searchParams.get("theme") === "dark";
  response.end(
    `<html lang="${url.searchParams.get("locale")}"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/styles.css"><style>*{box-sizing:border-box}body{font:16px/1.5 system-ui;margin:0;--primary:#f5ae19;--text:${dark ? "#e9f1ee" : "#17272f"};--surface:${dark ? "#132725" : "#fff"};--line:${dark ? "#37544f" : "#d8d8d8"};--muted:${dark ? "#a9c0ba" : "#68707e"};color:var(--text);background:var(--surface)}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`,
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BOOKING_BROWSER_PATH
    ? { executablePath: process.env.BOOKING_BROWSER_PATH }
    : { channel: "chrome" }),
});
const page = await browser.newPage();
const findings = [];
try {
  for (const locale of ["en", "es"])
    for (const theme of ["light", "dark"])
      for (const [width, height] of [
        [360, 800],
        [600, 900],
        [768, 1024],
        [1536, 960],
        [640, 400],
        [390, 300],
      ]) {
        await page.setViewportSize({ width, height });
        await page.goto(origin + "/?locale=" + locale + "&theme=" + theme);
        const opener = page.getByRole("button", { name: "Help", exact: true });
        await opener.click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        const textarea = dialog.getByRole("textbox");
        await expect(textarea).toBeFocused();
        const bounds = await dialog.boundingBox();
        if (
          bounds.x < -0.5 ||
          bounds.y < -0.5 ||
          bounds.x + bounds.width > width + 0.5 ||
          bounds.y + bounds.height > height + 0.5
        )
          throw new Error(
            "Dialog bounds " + JSON.stringify({ width, height, bounds }),
          );
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          )
          .toBe(true);
        const close = dialog.getByRole("button", {
          name: locale === "es" ? "Cerrar ayuda" : "Close help",
        });
        await close.scrollIntoViewIfNeeded();
        const closeBounds = await close.boundingBox();
        if (closeBounds.width < 44 || closeBounds.height < 44)
          throw new Error("Close target too small");
        await close.focus();
        await page.keyboard.press("Shift+Tab");
        await expect(dialog.getByRole("link")).toBeFocused();
        await textarea.fill("Inert fixture question");
        const send = dialog.getByRole("button", {
          name: locale === "es" ? "Enviar" : "Send",
          exact: true,
        });
        await send.scrollIntoViewIfNeeded();
        await send.click();
        await expect(dialog.getByRole("alert")).toHaveText(
          "Fixture transport error",
        );
        await expect(textarea).toHaveValue("Inert fixture question");
        await expect
          .poll(() => page.evaluate(() => window.__supportRequests.length))
          .toBe(1);
        await dialog
          .getByRole("button", {
            name: locale === "es" ? "Reintentar" : "Retry",
            exact: true,
          })
          .click();
        await expect(
          dialog.getByText("This is an inert fixture reply.", { exact: false }),
        ).toBeVisible();
        await dialog.getByRole("link").focus();
        await page.keyboard.press("Tab");
        await expect(close).toBeFocused();
        await page.evaluate(() =>
          document.querySelector("#root > button").focus(),
        );
        await expect(textarea).toBeFocused();
        await page.screenshot({
          path:
            directory +
            "/" +
            locale +
            "-" +
            theme +
            "-" +
            width +
            "x" +
            height +
            ".png",
        });
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(opener).toBeFocused();
        if ((await page.evaluate(() => document.body.style.overflow)) !== "")
          throw new Error("Scroll state not restored");
        if ((await page.evaluate(() => window.__supportRequests.length)) !== 2)
          throw new Error("Unexpected support requests");
        findings.push({
          locale,
          theme,
          width,
          height,
          result: "pass",
          requestCount: 2,
        });
      }
  writeFileSync(directory + "/results.json", JSON.stringify(findings, null, 2));
  console.log(JSON.stringify({ passed: findings.length, directory }));
} finally {
  await browser.close();
  server.close();
}
