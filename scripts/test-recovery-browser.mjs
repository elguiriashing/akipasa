import { createHash } from "node:crypto";
import { build } from "esbuild";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { chromium, expect } from "@playwright/test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
const out = resolve("test-results/recovery-browser");
const sourceFiles = [
  "src/app/[locale]/auth/recover/page.tsx",
  "src/app/[locale]/auth/recover/recovery.module.css",
  "src/app/[locale]/auth/recover/actions.ts",
  "src/components/AuthBrand.tsx",
  "src/app/[locale]/auth/auth-surfaces.module.css",
  "src/app/globals.css",
  "src/app/compact-app.css",
  "src/app/brand.css",
  "src/app/appearance.css",
  "src/app/tablet-responsive.css",
  "src/app/portal-unity.css",
  "scripts/test-recovery-browser.mjs",
];
const sourceHashes = () =>
  Object.fromEntries(
    sourceFiles.map((p) => [
      p,
      createHash("sha256").update(readFileSync(p)).digest("hex"),
    ]),
  );
const initialHashes = sourceHashes();
mkdirSync(out, { recursive: true });
await build({
  stdin: {
    contents: `import React from'react';import{renderToStaticMarkup}from'react-dom/server';import Page from'./src/app/[locale]/auth/recover/page';export async function render(locale,error,product){globalThis.fixtureProduct=product;return renderToStaticMarkup(await Page({params:Promise.resolve({locale}),searchParams:Promise.resolve({next:'/'+locale+'/account?tab=saved',...(error?{error:'save'}:{})})}))}`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  outfile: out + "/render.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  packages: "external",
  external: ["/images/*"],
  alias: { "@": resolve("src") },
  loader: { ".css": "local-css" },
  plugins: [
    {
      name: "disposable-fixture",
      setup(b) {
        b.onResolve({ filter: /^next\/(headers|navigation)$/ }, (a) => ({
          path: a.path,
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
          contents: a.path.endsWith("headers")
            ? `export async function headers(){return new Headers({'host':'akipasa.com',...(globalThis.fixtureProduct?{'x-akipasa-product':globalThis.fixtureProduct}:{})})}`
            : `export function notFound(){throw Error('notfound')}export function redirect(p){throw Error('redirect:'+p)}`,
          loader: "js",
        }));
        b.onLoad({ filter: /[\\/]supabase[\\/]server\.ts$/ }, () => ({
          contents: `export async function createSupabaseServerClient(){return{auth:{getUser:async()=>({data:{user:{id:'disposable'}}})}}}`,
          loader: "js",
        }));
        b.onLoad({ filter: /[\\/]recover[\\/]actions\.ts$/ }, () => ({
          contents: `export async function updateRecoveredPassword(){throw Error('No fixture action may be submitted')}`,
          loader: "js",
        }));
      },
    },
  ],
});
const render = createRequire(import.meta.url)(out + "/render.cjs").render;
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
  ]
    .map((p) => readFileSync("src/app/" + p, "utf8"))
    .join("\n") +
  readFileSync(out + "/render.css", "utf8");
const server = createServer(async (req, res) => {
  if (req.url === "/brand/pasa-2026-traced.svg") {
    res.setHeader("Content-Type", "image/svg+xml");
    return res.end(readFileSync("public/brand/pasa-2026-traced.svg"));
  }
  if (req.url === "/images/akipasa/nightlife-editorial.webp") {
    res.setHeader("Content-Type", "image/webp");
    return res.end(
      readFileSync("public/images/akipasa/nightlife-editorial.webp"),
    );
  }
  try {
    const u = new URL(req.url, "http://localhost");
    res.setHeader("Content-Type", "text/html;charset=utf-8");
    res.end(
      `<!doctype html><html data-theme="${u.searchParams.get("theme")}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${await render(u.searchParams.get("locale"), u.searchParams.get("error"), u.searchParams.get("product"))}</body></html>`,
    );
  } catch (e) {
    res.writeHead(500);
    res.end(e.stack);
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  ...(process.env.RECOVERY_BROWSER_PATH || process.env.BOOKING_BROWSER_PATH
    ? {
        executablePath:
          process.env.RECOVERY_BROWSER_PATH || process.env.BOOKING_BROWSER_PATH,
      }
    : {}),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  headless: true,
});
const results = [];
try {
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const width of [360, 390, 820, 1440])
        for (const error of [false, true]) {
          const page = await browser.newPage({
            viewport: { width, height: 900 },
            reducedMotion: "reduce",
          });
          await page.goto(
            `http://127.0.0.1:${server.address().port}/?locale=${locale}&theme=${theme}${error ? "&error=save" : ""}`,
          );
          await expect(page.locator("h1")).toHaveText(
            locale === "es"
              ? "Crea una nueva contraseña"
              : "Create a new password",
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          await expect(page.locator("[role=alert]")).toHaveCount(error ? 1 : 0);
          const pass = page.locator("input[name=password]"),
            confirm = page.locator("input[name=confirmPassword]");
          await pass.fill("DisposablePassword42");
          await pass.focus();
          await page.keyboard.press("Tab");
          await expect(confirm).toBeFocused();
          await confirm.fill("DisposablePassword42");
          await page.keyboard.press("Tab");
          await expect(page.getByRole("button")).toBeFocused();
          const hit = await page.getByRole("button").evaluate((el) => {
            const r = el.getBoundingClientRect();
            return (
              document.elementFromPoint(
                r.x + r.width / 2,
                r.y + r.height / 2,
              ) === el
            );
          });
          expect(hit).toBe(true);
          const data = await page
            .locator("form")
            .evaluate((f) => Object.fromEntries(new FormData(f)));
          expect(data).toEqual({
            locale,
            next: `/${locale}/account?tab=saved`,
            password: "DisposablePassword42",
            confirmPassword: "DisposablePassword42",
          });
          await page.screenshot({
            path: `${out}/${locale}-${theme}-${width}${error ? "-error" : ""}.png`,
            fullPage: true,
          });
          const geometry = await page.evaluate(() => ({
            theme: document.documentElement.dataset.theme,
            innerWidth,
            clientWidth: document.documentElement.clientWidth,
            mainRight: document.querySelector("main").getBoundingClientRect()
              .right,
            bodyBackground: getComputedStyle(document.body).backgroundColor,
            htmlScrollbarWidth: getComputedStyle(document.documentElement)
              .scrollbarWidth,
          }));
          expect(geometry.theme).toBe(theme);
          results.push({
            locale,
            theme,
            width,
            error,
            image: `${locale}-${theme}-${width}${error ? "-error" : ""}.png`,
            imageSha256: createHash("sha256")
              .update(
                readFileSync(
                  `${out}/${locale}-${theme}-${width}${error ? "-error" : ""}.png`,
                ),
              )
              .digest("hex"),
            keyboard: true,
            buttonHit: true,
            fields: true,
            geometry,
          });
          await page.close();
        }
  for (const product of ["akibusiness", "akiduermo", "akiconduzco"]) {
    const page = await browser.newPage();
    await page.goto(
      `http://127.0.0.1:${server.address().port}/?locale=en&theme=dark&product=${product}`,
    );
    expect(await page.locator("main").getAttribute("class")).toBe("shell");
    await page.close();
  }
  if (JSON.stringify(initialHashes) !== JSON.stringify(sourceHashes()))
    throw Error("Recovery sources changed during capture");
  writeFileSync(
    out + "/results.json",
    JSON.stringify(
      {
        sourceCommit: process.env.GITHUB_SHA || null,
        sourceHashes: initialHashes,
        scriptSha256: initialHashes["scripts/test-recovery-browser.mjs"],
        actualNext: false,
        syntheticIdentity: true,
        actions: "throw-only; no forms submitted",
        physicalDevice: false,
        providerMutation: false,
        render:
          "Actual protected server component, CSS module and shared production CSS; no LocaleLayout",
        source: "current source-bound disposable fixture",
        limitations:
          "Actual protected component+CSS with disposable session/actions; no real provider mutation, LocaleLayout, token or physical device proof",
        cases: results,
        productSkinsPreserved: 3,
      },
      null,
      2,
    ),
  );
  console.log(
    results.length +
      " recovery browser cases passed +3 sibling product skins preserved",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
