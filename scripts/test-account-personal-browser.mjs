import { createHash } from "node:crypto";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";

// Real async page loaders, AccountLayout, client components and production CSS.
// Only Auth/database reads, Next routing/request headers and server actions are disposable adapters.
// This verifies UI behavior; it does not claim live authentication/payment acceptance.
const directory = resolve("test-results/account-personal");
mkdirSync(directory, { recursive: true });
const routes = ["overview", "profile"];
const accountRoot = "./src/app/[locale]/account";
const routeImports = routes
  .map(
    (route, index) =>
      `import Page${index} from '${accountRoot}/${route === "overview" ? "" : `${route}/`}page';`,
  )
  .join("\n");
const entry = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import AccountLayout from '${accountRoot}/layout';
import RewardsPage from '${accountRoot}/rewards/page';
import {AkiSuiteMembershipGrid} from './src/components/AkiSuiteMembershipGrid';
${routeImports}
const pages={${routes.map((route, index) => `${JSON.stringify(route)}:Page${index}`).join(",")},rewards:RewardsPage};
const root=createRoot(document.getElementById('root'));
window.__accountActions=[];
window.__accountRequests=[];
window.__accountReadiness=0;
const originalFetch=window.fetch.bind(window);
window.fetch=(url,options)=>{window.__accountRequests.push({url:String(url),method:options?.method||'GET',body:options?.body});return originalFetch(url,options)};
async function renderRoute(){
  const locale=location.pathname.startsWith('/es/')?'es':'en';
  const route=location.pathname.split('/')[3]||'overview';
  const page=pages[route];
  document.documentElement.lang=locale;
  window.__accountReady=false;
  try{
    if(!page&&route!=='membership-handoff')throw new Error('Unknown account fixture route '+route);
    const props={params:Promise.resolve({locale}),searchParams:Promise.resolve(Object.fromEntries(new URLSearchParams(location.search)))};
    const handoff=route==='membership-handoff';
    const content=handoff?<main style={{padding:16}}><AkiSuiteMembershipGrid locale={locale} purchaseMode="account" checkoutReady={new URLSearchParams(location.search).get("ready")==="true"} originatingApp="akiduermo" /></main>:await page(props);
    const shell=handoff?content:await AccountLayout({...props,children:content});
    // Next preserves a shared localized layout across child-route navigation.
    root.render(React.createElement(React.Fragment,{key:locale},shell));
    requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__accountReady=true;window.__accountReadiness++}));
  }catch(error){
    if(error.redirect){window.__accountRedirect=error.redirect;root.render(<p data-testid="redirect">{error.redirect}</p>);window.__accountReady=true;return}
    window.__accountError=String(error.stack||error);console.error(error);root.render(<pre role="alert">{String(error)}</pre>);
  }
}
window.__accountNavigate=async(href)=>{
  const url=new URL(href,location.href);
  if(!/^\\/(es|en)\\/account(?:\\/|$)/.test(url.pathname)){window.__accountOutbound=href;return;}
  const fixture=new URLSearchParams(location.search).get('fixture');
  if(fixture&&!url.searchParams.has('fixture'))url.searchParams.set('fixture',fixture);
  history.pushState({},'',url.pathname+url.search);await renderRoute();
};
window.addEventListener('popstate',renderRoute);
renderRoute();
`;

const actionNames = [
  "updateAccountProfile",
  "uploadProfileMedia",
  "requestAccountEmailChange",
  "requestAccountPasswordReset",
  "requestAccountDeletion",
  "signOut",
  "setSavedEventReminder",
  "cancelMyBooking",
  "cancelMyStay",
  "startSubscriptionCheckout",
  "startAkiSuiteCheckout",
  "changeAkiSuiteSubscription",
  "prepareAkiSuiteWorkspace",
  "openBillingPortal",
  "removeAccountCollectionItem",
];
const navigationAdapter = `
const router={refresh(){window.__accountRefreshes=(window.__accountRefreshes||0)+1},push(href){return window.__accountNavigate(href)},replace(href){return window.__accountNavigate(href)},prefetch(){}};
export function useRouter(){return router}
export function usePathname(){return location.pathname}
export function useSearchParams(){return new URLSearchParams(location.search)}
export function notFound(){throw new Error('Fixture route returned notFound')}
export function redirect(href){throw Object.assign(new Error('redirect'),{redirect:href})}
`;
const linkAdapter = `
import React from 'react';
export default function Link({href,children,prefetch,replace,scroll,onClick,...props}){
  return <a {...props} href={href} onClick={event=>{
    onClick?.(event);
    if(!event.defaultPrevented&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&event.button===0){event.preventDefault();void window.__accountNavigate(String(href));}
  }}>{children}</a>
}
`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  outdir: resolve(directory, "bundle"),
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env": JSON.stringify({ NODE_ENV: "production" }),
  },
  plugins: [
    {
      name: "account-disposable-adapters",
      setup(builder) {
        builder.onResolve({ filter: /^@\/lib\/auth$/ }, () => ({
          path: resolve("tests/fixtures/account-browser-data.mjs"),
        }));
        builder.onResolve(
          { filter: /^next\/(link|image|navigation|headers)$/ },
          (args) => ({ path: args.path, namespace: "account-fixture" }),
        );
        builder.onResolve(
          { filter: /(?:^|\/)(?:(?:akisuite-)?actions|collection-actions)$/ },
          (args) => {
            if (
              !args.importer.includes("account") &&
              !args.importer.includes("auth") &&
              !args.path.includes("/account/")
            )
              return;
            return { path: "actions", namespace: "account-fixture" };
          },
        );
        builder.onLoad(
          { filter: /.*/, namespace: "account-fixture" },
          (args) => ({
            contents:
              args.path === "actions"
                ? `import {recordAction} from '${resolve("tests/fixtures/account-browser-data.mjs")}';\n${actionNames.map((name) => `export const ${name}=form=>recordAction('${name}',form);`).join("\n")}`
                : args.path.endsWith("navigation")
                  ? navigationAdapter
                  : args.path.endsWith("headers")
                    ? "export async function headers(){return new Headers()} export async function cookies(){return {get(){return undefined}}}"
                    : args.path.endsWith("image")
                      ? `import React from 'react';export default function Image({fill,priority,sizes,...props}){return <img {...props}/>}`
                      : linkAdapter,
            loader: "jsx",
            resolveDir: process.cwd(),
          }),
        );
      },
    },
  ],
});

// Match root CSS order, then append route imports emitted by esbuild.
const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const globalCssFiles = Array.from(
  rootLayout.matchAll(/import\s+["'](\.\/[^"']+\.css)["'];/g),
  (match) => resolve("src/app", match[1]),
);
const routeCss = bundle.outputFiles
  .filter((file) => file.path.endsWith(".css"))
  .map((file) => file.text)
  .join("\n");
const styles = (
  await postcss([tailwind()]).process(
    globalCssFiles.map((file) => readFileSync(file, "utf8")).join("\n") +
      "\n" +
      routeCss,
    { from: resolve("src/app/globals.css") },
  )
).css;
const script = bundle.outputFiles.find((file) =>
  file.path.endsWith(".js"),
).text;
writeFileSync(resolve(directory, "bundle.js"), script);
writeFileSync(resolve(directory, "styles.css"), styles);
if (process.argv.includes("--build-only")) {
  console.log(
    "Account browser bundle compiled: 2 actual pages + layout + disposable adapters",
  );
  process.exit(0);
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  if (pathname === "/bundle.js") {
    response.setHeader("Content-Type", "text/javascript");
    response.end(script);
  } else if (pathname === "/styles.css") {
    response.setHeader("Content-Type", "text/css");
    response.end(styles);
  } else if (pathname === "/api/v1/personalisation/consent") {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ ok: true }));
  } else if (pathname.startsWith("/api/")) {
    response.statusCode = 500;
    response.end(`Unexpected fixture API request: ${pathname}`);
  } else if (/^\/(brand|pwa)\/[a-z0-9-]+\.(png|svg|webp)$/.test(pathname)) {
    const file = resolve("public", pathname.slice(1));
    response.setHeader(
      "Content-Type",
      extname(file) === ".svg"
        ? "image/svg+xml"
        : `image/${extname(file).slice(1)}`,
    );
    if (existsSync(file)) response.end(readFileSync(file));
    else {
      response.statusCode = 404;
      response.end();
    }
  } else {
    response.setHeader("Content-Type", "text/html");
    response.end(
      '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body data-product="akipasa"><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const cases = [];
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : {}),
  });
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const width of [360, 390, 820, 1440]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          hasTouch: width < 500,
          reducedMotion: width === 390 ? "reduce" : "no-preference",
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.addInitScript((theme) => {
          document.addEventListener("DOMContentLoaded", () =>
            document.documentElement.setAttribute("data-theme", theme),
          );
          localStorage.setItem("akipasa-theme", theme);
        }, theme);
        await page.route("**/*", (route) =>
          new URL(route.request().url()).origin === origin
            ? route.continue()
            : route.abort(),
        );
        for (const route of routes) {
          await page.goto(
            `${origin}/${locale}/account${route === "overview" ? "" : `/${route}`}`,
          );
          await expect
            .poll(() =>
              page.evaluate(
                () => window.__accountError || window.__accountReady,
              ),
            )
            .toBe(true);
          await page.evaluate(
            (theme) =>
              document.documentElement.setAttribute("data-theme", theme),
            theme,
          );
          await page.evaluate(async () => {
            await Promise.all(
              document
                .getAnimations()
                .filter((a) =>
                  Number.isFinite(a.effect?.getTiming().iterations),
                )
                .map((a) => a.finished.catch(() => {})),
            );
          });
          await expect(page.locator(".workspace-content h1")).toHaveCount(1);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          ).toBe(true);
          if (route === "overview") {
            await expect(page.locator("[data-personal-account]")).toBeVisible();
            await expect(
              page.getByRole("link", {
                name: locale === "es" ? "Editar perfil" : "Edit profile",
                exact: true,
              }),
            ).toHaveAttribute("href", `/${locale}/account/profile`);
            await expect(
              page.locator(".account-pulse strong").nth(0),
            ).not.toHaveText("—");
            await expect(page.locator("#account-about-title")).toHaveText(
              locale === "es" ? "Sobre mí" : "About me",
            );
            await expect(
              page.locator("[data-personal-account]"),
            ).not.toContainText(/320 XP|14 Friends|48 Venues|gacha/i);
          } else {
            await expect(page.locator(".account-profile-form")).toBeVisible();
            await expect(page.locator('input[name="displayName"]')).toHaveValue(
              "María Ángeles",
            );
          }
          await page.keyboard.press("Tab");
          expect(
            await page.evaluate(
              () => document.activeElement?.tagName !== "BODY",
            ),
          ).toBe(true);
          const name = `${locale}-${width}-${theme}-${route}.png`;
          await page.screenshot({
            path: resolve(directory, name),
            fullPage: true,
          });
          cases.push({
            locale,
            width,
            theme,
            route,
            screenshot: name,
            sha256: createHash("sha256")
              .update(readFileSync(resolve(directory, name)))
              .digest("hex"),
          });
        }
        await page.goto(`${origin}/${locale}/account?fixture=profile-error`);
        await expect
          .poll(() => page.evaluate(() => window.__accountReady))
          .toBe(true);
        await expect(page.getByRole("status")).toBeVisible();
        await expect(page.locator(".account-pulse strong").nth(2)).toHaveText(
          "—",
        );
        expect(errors).toEqual([]);
        expect(await page.evaluate(() => window.__accountActions)).toEqual([]);
        await context.close();
      }
  const sources = [
    "src/app/[locale]/account/page.tsx",
    "src/app/[locale]/account/profile/page.tsx",
    "src/app/[locale]/account/account-personal.module.css",
  ];
  writeFileSync(
    resolve(directory, "results.json"),
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        scope:
          "Actual async pages/layout with disposable Auth/read/action adapters; no live identity/backend acceptance",
        sourceHashes: Object.fromEntries(
          sources.map((path) => [
            path,
            createHash("sha256").update(readFileSync(path)).digest("hex"),
          ]),
        ),
        cases,
      },
      null,
      2,
    ),
  );
  console.log(`${cases.length} actual account/profile renders passed`);
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
