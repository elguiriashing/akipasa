import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createHash } from "node:crypto";
const out = resolve("test-results/terms-accept-browser");
mkdirSync(out, { recursive: true });
const entry = `import React from'react';import{createRoot}from'react-dom/client';import{AppShell}from'./src/components/AppShell';import Page from'./src/app/[locale]/terms/accept/page';const q=new URLSearchParams(location.search),locale=q.get('locale')||'en';document.documentElement.lang=locale;document.documentElement.dataset.theme=q.get('theme')||'dark';window.__actions=[];(async()=>{try{const page=await Page({params:Promise.resolve({locale}),searchParams:Promise.resolve({next:q.get('next')||'/'+locale+'/account?tab=saved',...(q.get('state')==='error'?{error:'save'}:{})})});createRoot(document.getElementById('root')).render(<AppShell locale={locale} signedIn role='consumer'>{page}</AppShell>);requestAnimationFrame(()=>requestAnimationFrame(()=>window.ready=true))}catch(e){window.failure=String(e.stack)}})();`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  metafile: true,
  write: false,
  outdir: out,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [
    {
      name: "disposable-terms-adapters",
      setup(b) {
        b.onLoad({ filter: /[\\/]supabase[\\/]server\.ts$/ }, () => ({
          contents: `export async function createSupabaseServerClient(){return{auth:{getUser:async()=>({data:{user:{id:'synthetic-terms-member'}}})}}}`,
          loader: "js",
        }));
        b.onResolve(
          { filter: /^next\/(link|navigation|image|headers)$/ },
          (a) => ({
            path: a.path,
            namespace: "fixture",
          }),
        );
        b.onResolve({ filter: /(?:^|\/)actions$/ }, (a) => ({
          path: resolve(a.resolveDir, a.path.replace(/^@\//, "src/")) + ".ts",
          namespace: "actions",
        }));
        b.onLoad({ filter: /.*/, namespace: "actions" }, (a) => {
          let path = a.path;
          if (!existsSync(path) && path.includes("/src/"))
            path = resolve(process.cwd(), "src", path.split("/src/").at(-1));
          const source = readFileSync(path, "utf8");
          const names = [
            ...source.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g),
          ].map((x) => x[1]);
          return {
            contents: names
              .map(
                (n) =>
                  `export async function ${n}(){window.__actions.push('forbidden');throw new Error('Read-only fixture forbids actions')}`,
              )
              .join("\n"),
            loader: "js",
          };
        });
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
          contents:
            a.path === "next/headers"
              ? `export async function headers(){return new Headers({'x-akipasa-product':new URLSearchParams(location.search).get('product')||'akipasa'})}`
              : a.path === "next/navigation"
                ? `export function usePathname(){return location.pathname}export function useSearchParams(){return new URLSearchParams(location.search)}export function useRouter(){return{refresh(){},push(){}}}export function notFound(){throw new Error('not-found')}export function redirect(href){throw new Error('redirect:'+href)}`
                : `import React from'react';export default function Adapter({children,prefetch,fill,priority,unoptimized,replace,scroll,...p}){return React.createElement('${a.path === "next/image" ? "img" : "a"}',p,children)}`,
          loader: "jsx",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
const globalFiles = [
  ...readFileSync("src/app/layout.tsx", "utf8").matchAll(
    /import\s+["'](\.\/[^"']+\.css)["'];/g,
  ),
].map((m) => resolve("src/app", m[1]));
const css = (
  await postcss([tailwind()]).process(
    globalFiles.map((f) => readFileSync(f, "utf8")).join("\n") +
      "\n" +
      bundle.outputFiles
        .filter((f) => f.path.endsWith(".css"))
        .map((f) => f.text)
        .join("\n"),
    { from: resolve("src/app/globals.css") },
  )
).css;
const js = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text;
const server = createServer((req, res) => {
  const p = new URL(req.url, "http://localhost").pathname;
  if (p === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(js);
  } else if (p === "/style.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else if (
    /^\/(?:brand|images)\/[a-z0-9/-]+\.(svg|webp|png)$/.test(p) &&
    existsSync(resolve("public", p.slice(1)))
  ) {
    res.setHeader(
      "Content-Type",
      extname(p) === ".svg" ? "image/svg+xml" : "image/" + extname(p).slice(1),
    );
    res.end(readFileSync(resolve("public", p.slice(1))));
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const sourceFiles = [
  ...new Set([
    ...Object.keys(bundle.metafile.inputs).filter(
      (p) => p.startsWith("src/") && existsSync(p),
    ),
    ...globalFiles,
    "src/app/[locale]/terms/accept/actions.ts",
    "scripts/test-terms-accept-browser.mjs",
  ]),
].sort();
const hashes = () =>
  Object.fromEntries(
    sourceFiles.map((p) => [
      p.startsWith(process.cwd() + "/") ? p.slice(process.cwd().length + 1) : p,
      createHash("sha256").update(readFileSync(p)).digest("hex"),
    ]),
  );
const initial = hashes();
let browser;
const results = [];
const destinationCases = [];
const externalRequests = [];
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.TERMS_BROWSER_PATH || process.env.BOOKING_BROWSER_PATH
      ? {
          executablePath:
            process.env.TERMS_BROWSER_PATH || process.env.BOOKING_BROWSER_PATH,
        }
      : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const origin = "http://127.0.0.1:" + server.address().port;
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const width of [360, 390, 820, 1440])
        for (const state of ["unchecked", "error"]) {
          const context = await browser.newContext({
            viewport: { width, height: 900 },
            colorScheme: theme,
            reducedMotion: "reduce",
          });
          await context.route("**/*", (route) => {
            const u = new URL(route.request().url());
            if (
              u.origin !== origin &&
              !["data:", "blob:"].includes(u.protocol)
            ) {
              externalRequests.push(u.origin);
              return route.abort();
            }
            return route.continue();
          });
          const page = await context.newPage();
          await page.goto(
            `${origin}/${locale}/terms/accept?locale=${locale}&theme=${theme}&state=${state}`,
            { waitUntil: "networkidle" },
          );
          await page.waitForFunction(() => window.ready || window.failure);
          expect(await page.evaluate(() => window.failure)).toBeUndefined();
          const main = page.locator("main.pasa-terms-accept-page");
          await expect(main).toBeVisible();
          await expect(page.locator(".app-shell")).toBeVisible();
          await expect(main.getByRole("heading", { level: 1 })).toHaveText(
            locale === "es"
              ? "Confirma las condiciones actuales"
              : "Accept the current terms",
          );
          await expect(main.getByRole("alert")).toHaveCount(
            state === "error" ? 1 : 0,
          );
          const checkbox = main.getByRole("checkbox");
          await expect(checkbox).not.toBeChecked();
          await expect(checkbox).toHaveAttribute("required", "");
          expect(await checkbox.evaluate((e) => e.validity.valueMissing)).toBe(
            true,
          );
          expect(await main.locator("input[name=next]").inputValue()).toBe(
            `/${locale}/account?tab=saved`,
          );
          expect(await main.locator("input[name=locale]").inputValue()).toBe(
            locale,
          );
          const stem = `${locale}-${theme}-${width}-${state}`;
          const images = [];
          for (const position of ["upper", "lower"]) {
            await page.evaluate(
              (position) =>
                scrollTo(
                  0,
                  position === "upper"
                    ? 0
                    : document.documentElement.scrollHeight,
                ),
              position,
            );
            const image = stem + "-" + position + ".png";
            await page.screenshot({
              path: resolve(out, image),
              animations: "disabled",
            });
            images.push({
              image,
              sha256: createHash("sha256")
                .update(readFileSync(resolve(out, image)))
                .digest("hex"),
            });
          }
          const heroPaint = await main
            .locator(".pasa-terms-accept-hero")
            .evaluate((element) => {
              const rules = [];
              function visit(list) {
                for (const rule of list) {
                  if (
                    rule.selectorText &&
                    element.matches(rule.selectorText) &&
                    rule.style.background
                  )
                    rules.push({
                      selector: rule.selectorText,
                      background: rule.style.background,
                    });
                  if (rule.cssRules) visit(rule.cssRules);
                }
              }
              for (const sheet of document.styleSheets) visit(sheet.cssRules);
              return {
                computedBackground: getComputedStyle(element).backgroundImage,
                matchingBackgroundRules: rules,
              };
            });
          const heroColor = await main
            .locator(".pasa-terms-accept-hero")
            .evaluate((element) => getComputedStyle(element).backgroundColor);
          if (theme === "light") {
            expect(heroPaint.computedBackground).toBe("none");
            expect(heroColor).toBe("rgb(255, 249, 242)");
          } else {
            expect(heroPaint.computedBackground).toContain("rgb(41, 29, 21)");
            expect(heroPaint.computedBackground).not.toContain(
              "rgb(26, 36, 53)",
            );
          }
          const heroContrast = await main
            .locator(".pasa-terms-accept-hero")
            .evaluate((element) => {
              const style = getComputedStyle(element);
              const luminance = (rgb) =>
                rgb
                  .map((n) => n / 255)
                  .map((n) =>
                    n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4,
                  )
                  .reduce(
                    (sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i],
                    0,
                  );
              const rgb = (value) =>
                value
                  .match(/[\d.]+/g)
                  .slice(0, 3)
                  .map(Number);
              const stops = [
                ...style.backgroundImage.matchAll(/rgb\(([^)]+)\)/g),
              ].map((match) => rgb(match[1]));
              if (!stops.length) stops.push(rgb(style.backgroundColor));
              return [
                ...element.querySelectorAll(
                  "h1,.lede,.eyebrow,.pasa-terms-accept-version",
                ),
              ].map((node) => {
                const color = getComputedStyle(node).color,
                  foreground = luminance(rgb(color));
                return {
                  text: node.textContent,
                  color,
                  backgroundStops: stops,
                  minimumContrast: Math.min(
                    ...stops.map((stop) => {
                      const background = luminance(stop);
                      return (
                        (Math.max(foreground, background) + 0.05) /
                        (Math.min(foreground, background) + 0.05)
                      );
                    }),
                  ),
                };
              });
            });
          expect(
            heroContrast.every((item) => item.minimumContrast >= 4.5),
            JSON.stringify(heroContrast),
          ).toBe(true);
          await checkbox.focus();
          await page.keyboard.press("Space");
          await expect(checkbox).toBeChecked();
          await page.keyboard.press("Space");
          await expect(checkbox).not.toBeChecked();
          await page.keyboard.press("Tab");
          await expect(main.locator(".consent-row a").nth(0)).toBeFocused();
          await page.keyboard.press("Tab");
          await expect(main.locator(".consent-row a").nth(1)).toBeFocused();
          await page.keyboard.press("Tab");
          const submit = main.getByRole("button", {
            name:
              locale === "es" ? "Aceptar y continuar" : "Accept and continue",
            exact: true,
          });
          await expect(submit).toBeFocused();
          expect(
            await submit.evaluate((e) => {
              const r = e.getBoundingClientRect();
              return [0.25, 0.5, 0.75].every((v) =>
                e.contains(
                  document.elementFromPoint(
                    r.x + r.width * v,
                    r.y + r.height / 2,
                  ),
                ),
              );
            }),
          ).toBe(true);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          expect(await page.evaluate(() => window.__actions.length)).toBe(0);
          results.push({
            locale,
            theme,
            width,
            state,
            requiredUnchecked: true,
            nativeCheckboxToggle: true,
            heroPaint,
            heroContrast,
            nativeTab: true,
            submitHit: true,
            overflow: false,
            images,
          });
          await context.close();
        }
  for (const [product, next, expected] of [
    ["akipasa", "/es/account?tab=saved", "/es/account?tab=saved"],
    [
      "akiduermo",
      "/stays/synthetic-stay?step=dates",
      "/stays/synthetic-stay?step=dates",
    ],
    [
      "akiconduzco",
      "/rentals/synthetic-car?step=dates",
      "/rentals/synthetic-car?step=dates",
    ],
    ["akipasa", "https://attacker.invalid", "/es/account"],
    ["akiduermo", "https://attacker.invalid", "/account"],
    ["akiconduzco", "https://attacker.invalid", "/account"],
  ]) {
    const page = await browser.newPage();
    await page.route("**/*", (r) =>
      new URL(r.request().url()).origin === origin ? r.continue() : r.abort(),
    );
    await page.goto(
      `${origin}/es/terms/accept?locale=es&theme=dark&product=${product}&next=${encodeURIComponent(next)}`,
    );
    await page.waitForFunction(() => window.ready || window.failure);
    expect(await page.evaluate(() => window.failure)).toBeUndefined();
    expect(await page.locator("main input[name=next]").inputValue()).toBe(
      expected,
    );
    expect(await page.evaluate(() => window.__actions.length)).toBe(0);
    destinationCases.push({ product, expected });
    await page.close();
  }
  expect(externalRequests).toEqual([]);
  const final = hashes();
  expect(final).toEqual(initial);
  writeFileSync(
    resolve(out, "results.json"),
    JSON.stringify(
      {
        sourceCommit: process.env.GITHUB_SHA || null,
        sourceHashes: initial,
        fixture:
          "Actual async Terms Page + hydrated AppShell and imported production CSS. Disposable signed identity/router/headers; action exports throw-only. Not actual Next, provider consent, RLS or physical device acceptance.",
        priorProof:
          "terms-waitlist-fixture-final-theme-20261030 historical24 states retained externally; new actualAppShell adds360 for32.",
        actualNext: false,
        actualAppShell: true,
        syntheticIdentity: true,
        providerMutation: false,
        physicalDevice: false,
        actionsSubmitted: 0,
        externalRequests,
        results,
        destinationCases,
      },
      null,
      2,
    ),
  );
  console.log(
    `${results.length} Terms acceptance browser states +${destinationCases.length} safe destination cases passed`,
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
