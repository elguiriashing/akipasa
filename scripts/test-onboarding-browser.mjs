import { build } from "esbuild";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium } from "playwright";

const out = resolve("test-results/onboarding-browser");
mkdirSync(out, { recursive: true });
const bundle = resolve(out, "render.cjs");
await build({
  stdin: {
    contents: `import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import Page from './src/app/[locale]/onboarding/page';export async function render(locale,status){globalThis.onboardingVisualStatus=status;return renderToStaticMarkup(await Page({params:Promise.resolve({locale}),searchParams:Promise.resolve({next:'/'+locale+'/account/subscription'})}));}`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  outfile: bundle,
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  packages: "external",
  alias: { "@": resolve("src") },
  loader: { ".css": "empty" },
  plugins: [
    {
      name: "disposable-onboarding-adapters",
      setup(b) {
        b.onResolve({ filter: /^next\/(link|navigation)$/ }, (args) => ({
          path: args.path,
          namespace: "inert",
        }));
        b.onLoad({ filter: /.*/, namespace: "inert" }, (args) => ({
          contents: args.path.endsWith("link")
            ? `import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children);}`
            : `export function redirect(path){throw new Error('Unexpected redirect '+path)};export function notFound(){throw new Error('Unexpected not found')}`,
          loader: "jsx",
          resolveDir: process.cwd(),
        }));
        b.onLoad({ filter: /[\\/]lib[\\/]auth\.ts$/ }, () => ({
          contents:
            "export async function requireIdentity(){return {supabase:{},user:{id:'disposable-fixture'}}}",
          loader: "ts",
        }));
        b.onLoad({ filter: /account-onboarding-server\.ts$/ }, () => ({
          contents:
            "export async function readOnboardingStatus(){return globalThis.onboardingVisualStatus}",
          loader: "ts",
        }));
        b.onLoad({ filter: /[\\/](onboarding|auth)[\\/]actions\.ts$/ }, () => ({
          contents:
            "export async function completeAccount(){};export async function signOut(){}",
          loader: "ts",
        }));
      },
    },
  ],
});
const require = createRequire(import.meta.url);
const renderer = require(bundle);
const css =
  (
    await postcss([tailwind()]).process(
      readFileSync("src/app/globals.css", "utf8"),
      { from: resolve("src/app/globals.css") },
    )
  ).css +
  [
    "compact-app.css",
    "brand.css",
    "appearance.css",
    "tablet-responsive.css",
    "portal-unity.css",
    "[locale]/onboarding/onboarding.css",
  ]
    .map((p) => readFileSync(`src/app/${p}`, "utf8"))
    .join("\n");
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    const locale = url.searchParams.get("locale") === "es" ? "es" : "en";
    const status =
      url.searchParams.get("status") === "underage" ? "underage" : "pending";
    res.setHeader("Content-Type", "text/html;charset=utf-8");
    res.end(
      `<!doctype html><html lang="${locale}" data-theme="${url.searchParams.get("theme") || "light"}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${await renderer.render(locale, status)}</body></html>`,
    );
  } catch (e) {
    res.writeHead(500);
    res.end(e.message);
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.ONBOARDING_BROWSER_PATH || process.env.BOOKING_BROWSER_PATH
    ? {
        executablePath:
          process.env.ONBOARDING_BROWSER_PATH ||
          process.env.BOOKING_BROWSER_PATH,
      }
    : {}),
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});
const results = [];
try {
  for (const locale of ["en", "es"])
    for (const status of ["pending", "underage"])
      for (const theme of ["light", "dark"])
        for (const [width, height] of [
          [360, 800],
          [800, 1280],
          [1280, 800],
          [1440, 900],
        ]) {
          const page = await browser.newPage({ viewport: { width, height } });
          await page.goto(
            `http://127.0.0.1:${port}/?locale=${locale}&status=${status}&theme=${theme}`,
          );
          await page.locator("h1").waitFor();
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          );
          if (overflow)
            throw new Error(
              `Horizontal overflow ${locale}/${status}/${theme}/${width}`,
            );
          const inputs = await page.locator('input[name="adult"]').count();
          if (inputs !== (status === "pending" ? 2 : 0))
            throw new Error("Unexpected declaration controls");
          await page
            .getByRole("button", {
              name: locale === "es" ? "Cerrar sesión" : "Sign out",
            })
            .scrollIntoViewIfNeeded();
          if (
            !(await page
              .getByRole("button", {
                name: locale === "es" ? "Cerrar sesión" : "Sign out",
              })
              .isVisible())
          )
            throw new Error("Sign-out not reachable");
          await page.keyboard.press("Tab");
          const active = await page.evaluate(
            () => document.activeElement.tagName,
          );
          if (!["A", "BUTTON", "INPUT", "TEXTAREA", "BODY"].includes(active))
            throw new Error("Unexpected keyboard focus");
          if (width === 360 || width === 1280) {
            await page.screenshot({
              path: resolve(out, `${locale}-${status}-${theme}-${width}.png`),
              fullPage: true,
            });
          }
          results.push({
            locale,
            status,
            theme,
            width,
            height,
            overflow: false,
            controls: inputs,
          });
          await page.close();
        }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
writeFileSync(
  resolve(out, "evidence.json"),
  JSON.stringify(
    {
      source:
        "Actual onboarding server component and application CSS; disposable identity/action adapters; no live authentication or mutations",
      cases: results,
    },
    null,
    2,
  ),
);
console.log(`${results.length} onboarding responsive fixture cases passed`);
