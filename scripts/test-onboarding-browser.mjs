import { build } from "esbuild";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium } from "playwright";

const out = resolve("test-results/onboarding-browser");
if (!readFileSync("src/app/[locale]/onboarding/layout.tsx", "utf8").includes('import "./onboarding.css"'))
  throw new Error("Both onboarding routes must inherit the same stylesheet via layout");
mkdirSync(out, { recursive: true });
const bundle = resolve(out, "render.cjs");
await build({
  stdin: {
    contents: `import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import Page from './src/app/[locale]/onboarding/page';import Privacy from './src/app/[locale]/onboarding/privacy/page';export async function render(locale,status,route){globalThis.onboardingVisualStatus=status;if(route==='privacy')return renderToStaticMarkup(await Privacy({params:Promise.resolve({locale}),searchParams:Promise.resolve(status==='requested'?{requested:'1'}:{})}));return renderToStaticMarkup(await Page({params:Promise.resolve({locale}),searchParams:Promise.resolve({next:'/'+locale+'/account/subscription'})}));}`,
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
      ["underage", "requested"].includes(url.searchParams.get("status"))
        ? url.searchParams.get("status")
        : "pending";
    res.setHeader("Content-Type", "text/html;charset=utf-8");
    res.end(
      `<!doctype html><html lang="${locale}" data-theme="${url.searchParams.get("theme") || "light"}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${await renderer.render(locale, status, url.searchParams.get("route") || "onboarding")}</body></html>`,
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
    for (const { route, status } of [
      { route: "onboarding", status: "pending" },
      { route: "onboarding", status: "underage" },
      { route: "privacy", status: "default" },
      { route: "privacy", status: "requested" },
    ])
      for (const theme of ["light", "dark"])
        for (const [width, height] of [
          [360, 800],
          [800, 1280],
          [1280, 800],
          [1440, 900],
        ]) {
          const page = await browser.newPage({
            viewport: { width, height },
            ...(width === 360
              ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3 }
              : {}),
          });
          await page.goto(
            `http://127.0.0.1:${port}/?locale=${locale}&status=${status}&theme=${theme}&route=${route}`,
          );
          await page.locator("h1").waitFor();
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          );
          if (overflow)
            throw new Error(
              `Horizontal overflow ${locale}/${route}/${status}/${theme}/${width}`,
            );
          const inputs = await page.locator('input[name="adult"]').count();
          if (inputs !== (route === "onboarding" && status === "pending" ? 2 : 0))
            throw new Error("Unexpected declaration controls");
          if (route === "privacy") {
            const deleteForm = await page.locator('form input[name="confirmation"]').count();
            if (deleteForm !== (status === "requested" ? 0 : 1))
              throw new Error("Restricted deletion request controls changed");
            if (!(await page.getByRole("link", { name: locale === "es" ? "Exportar mis datos" : "Export my data" }).isVisible()))
              throw new Error("Data export must remain available to restricted accounts");
          }
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
          if (width === 360) {
            const shortTargets = await page.locator('button, input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), textarea').evaluateAll((elements) =>
              elements.filter((element) => {
                const rect = element.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && rect.height < 43.5;
              }).map((element) => element.outerHTML.slice(0, 140)),
            );
            if (shortTargets.length) throw new Error(`Undersized mobile controls: ${JSON.stringify(shortTargets)}`);
          }
          if (width === 360 || width === 1280) {
            await page.screenshot({
              path: resolve(out, `${locale}-${route}-${status}-${theme}-${width}.png`),
              fullPage: true,
            });
          }
          results.push({
            locale,
            route,
            status,
            theme,
            browserEnvironment: width === 360 ? "chromium-touch-mobile-emulation" : "chromium-desktop",
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
        "Actual onboarding and restricted-privacy server components and application CSS; disposable identity/action adapters; no live authentication or mutations",
      acceptance: "isolated-ui-fixture-not-authenticated-device-acceptance",
      sourceCommit: process.env.GITHUB_SHA || null,
      cases: results,
    },
    null,
    2,
  ),
);
console.log(`${results.length} onboarding responsive fixture cases passed`);
