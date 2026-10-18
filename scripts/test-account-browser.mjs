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
const directory = resolve("test-results/account");
mkdirSync(directory, { recursive: true });
const routes = [
  "overview",
  "saved",
  "following",
  "bookings",
  "activity",
  "premium",
  "profile",
  "settings",
  "privacy",
  "subscription",
];
const viewports = [
  [360, 800],
  [600, 900],
  [768, 1024],
  [1024, 768],
  [1536, 960],
  [640, 400],
];
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
    root.render(React.createElement(React.Fragment,{key:location.href},shell));
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
    "Account browser bundle compiled: 10 actual pages + layout + disposable adapters",
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
const results = [];
let browser;

async function ready(page) {
  await expect
    .poll(
      () => page.evaluate(() => window.__accountError || window.__accountReady),
      { timeout: 15000 },
    )
    .toBe(true);
  await expect(page.locator(".account-workspace")).toBeVisible();
  await expect(page.locator(".workspace-content h1")).toHaveCount(1);
  await expect(page.locator(".workspace-page-heading")).toHaveCount(0);
}

async function resetScroll(page) {
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
}

async function checkBounds(page, context) {
  await resetScroll(page);
  const problems = await page.evaluate(() => {
    const failures = [];
    const width = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > width + 1)
      failures.push(
        `Page overflow: ${document.documentElement.scrollWidth} > ${width}`,
      );
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        !element.closest("[hidden],details:not([open]) > :not(summary)")
      );
    };
    const title = document.querySelector(".workspace-content h1");
    const navigation = [
      document.querySelector(".workspace-sidebar"),
      document.querySelector(".workspace-mobile-trigger"),
    ].find((element) => element && visible(element));
    if (title && navigation) {
      const titleBox = title.getBoundingClientRect();
      const navigationBox = navigation.getBoundingClientRect();
      if (titleBox.top < navigationBox.bottom - 2)
        failures.push("Page title is covered by account navigation");
    }
    const main = document.querySelector(".account-overview-main");
    const feature = main?.querySelector(".account-next-step");
    if (main && feature && width >= 1000) {
      const railWidth = main.getBoundingClientRect().width;
      const featureWidth = feature.getBoundingClientRect().width;
      if (featureWidth < railWidth * 0.9)
        failures.push("Overview leaves its main column mostly unused");
    }
    for (const control of document.querySelectorAll(
      '.workspace-content input:not([type="hidden"]):not([type="file"]), .workspace-content select, .workspace-content textarea, .workspace-content button, .workspace-content summary, .workspace-content .button',
    )) {
      if (!visible(control)) continue;
      const rect = control.getBoundingClientRect();
      if (rect.left < -1 || rect.right > width + 1)
        failures.push(
          `Control outside viewport: ${(control.textContent || control.getAttribute("name") || control.tagName).trim().slice(0, 80)}`,
        );
    }
    // Header text rectangles catch the original rounded clipping defect even when
    // document.scrollWidth is entirely normal. We inspect real text, not CSS rules.
    for (const heading of document.querySelectorAll(
      ".workspace-content header",
    )) {
      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent.trim() || !visible(node.parentElement)) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const rectangles = [...range.getClientRects()].filter(
          (rect) => rect.width > 0 && rect.height > 0,
        );
        const headerBox = heading.getBoundingClientRect();
        for (const rect of rectangles) {
          if (
            rect.left < headerBox.left - 2 ||
            rect.right > headerBox.right + 2 ||
            rect.top < headerBox.top - 2 ||
            rect.bottom > headerBox.bottom + 2
          )
            failures.push(
              `Text outside header bounds: ${node.textContent.trim().slice(0, 80)}`,
            );
        }
        for (
          let ancestor = node.parentElement;
          ancestor && ancestor !== document.body;
          ancestor = ancestor.parentElement
        ) {
          const style = getComputedStyle(ancestor);
          if (!/hidden|clip/.test(style.overflowX + " " + style.overflowY))
            continue;
          const box = ancestor.getBoundingClientRect();
          const rounding = Math.min(
            parseFloat(style.borderTopLeftRadius) || 0,
            parseFloat(style.borderBottomLeftRadius) || 0,
          );
          const safeInset = Math.min(8, rounding / 3);
          for (const rect of rectangles) {
            if (
              rect.left < box.left - 1 ||
              rect.right > box.right + 1 ||
              rect.top < box.top - 2 ||
              rect.bottom > box.bottom + 2 ||
              (safeInset > 0 &&
                rect.left < box.left + safeInset &&
                (rect.top < box.top + rounding ||
                  rect.bottom > box.bottom - rounding))
            )
              failures.push(
                `Clipped header text: ${node.textContent.trim().slice(0, 80)}`,
              );
          }
        }
      }
    }
    return [...new Set(failures)];
  });
  expect(problems, context).toEqual([]);
  const heading = await page.locator(".workspace-content h1").boundingBox();
  expect(
    heading.y,
    `${context}: useful heading is too far below navigation`,
  ).toBeLessThan(320);
}

async function checkNavigation(page, locale, width) {
  const trigger = page.locator(".workspace-mobile-trigger");
  const mobile = await trigger.isVisible();
  if (mobile) {
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
  }
  const nav = page.locator(
    mobile
      ? ".workspace-drawer .workspace-navigation"
      : ".workspace-sidebar .workspace-navigation",
  );
  await expect(nav.locator('a[href$="/rewards"]')).toHaveCount(0);
  await expect(
    nav.getByText(locale === "es" ? "Progreso" : "Progress", { exact: true }),
  ).toHaveCount(0);
  const hrefs = await nav
    .locator("a")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  for (const route of routes) {
    const href = `/${locale}/account${route === "overview" ? "" : `/${route}`}`;
    expect(hrefs).toContain(href);
    const link = nav.locator(`a[href="${href}"]`);
    await link.scrollIntoViewIfNeeded();
    await link.focus();
    const box = await link.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    expect(box.height).toBeGreaterThanOrEqual(36);
  }
  if (mobile) {
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
  }
  await resetScroll(page);
}

async function reveal(page, field) {
  const sections = page.locator("details").filter({ has: field });
  for (const section of await sections.all()) {
    if (!(await section.getAttribute("open"))) {
      const open = await section.evaluate((node) => node.open);
      if (!open) await section.locator(":scope > summary").click();
    }
  }
  await expect(field).toBeVisible();
}

async function lastAction(page, name, fields) {
  await expect
    .poll(() => page.evaluate(() => window.__accountAction?.name))
    .toBe(name);
  expect(
    await page.evaluate(() => window.__accountAction.fields),
  ).toMatchObject(fields);
}

async function interactions(page, route, locale) {
  const es = locale === "es";
  if (route === "settings") {
    const email = page.locator('input[name="email"]');
    await expect(email).not.toBeVisible();
    await reveal(page, email);
    await email.fill("changed.disposable@example.test");
    await email
      .locator("xpath=ancestor::form")
      .getByRole("button", { name: /./ })
      .click();
    await lastAction(page, "requestAccountEmailChange", {
      locale,
      email: "changed.disposable@example.test",
    });
  } else if (route === "profile") {
    const name = page.locator('input[name="displayName"]');
    await reveal(page, name);
    await name.fill("María ÁÉÍÓÚ Ñ Ç");
    await page
      .getByRole("button", {
        name: es ? "Guardar cambios" : "Save changes",
        exact: true,
      })
      .click();
    await lastAction(page, "updateAccountProfile", {
      locale,
      displayName: "María ÁÉÍÓÚ Ñ Ç",
    });
  } else if (route === "privacy") {
    const checkbox = page.getByRole("checkbox", { name: /recom/ });
    await reveal(page, checkbox);
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    const request = await page.evaluate(() =>
      window.__accountRequests.find(
        (item) =>
          item.method === "POST" &&
          item.url.includes("personalisation/consent"),
      ),
    );
    expect(JSON.parse(request.body)).toMatchObject({
      analytics: false,
      marketing: false,
      personalisation: true,
    });
    const confirmation = page.locator('input[name="confirmation"]');
    await expect(confirmation).not.toBeVisible();
    await reveal(page, confirmation);
    await confirmation.fill(es ? "BORRAR" : "DELETE");
    // Only the local action recorder is invoked; no account is changed/deleted.
    await confirmation
      .locator("xpath=ancestor::form")
      .getByRole("button")
      .click();
    await lastAction(page, "requestAccountDeletion", {
      locale,
      confirmation: es ? "BORRAR" : "DELETE",
    });
    await expect(
      page.locator(`a[href="/${locale}/account/export"]`),
    ).toHaveCount(1);
  } else if (route === "subscription") {
    await expect(page.getByRole("tablist")).toHaveCount(0);
    await expect(page.locator('[id="aki_enterprise"]')).toBeVisible();
    const catalogue = page.locator(
      '[aria-labelledby="akisuite-catalogue-title"]',
    );
    await expect(catalogue.locator("article")).toHaveCount(4);
    await catalogue
      .getByRole("radio", { name: es ? /Anual/ : /Yearly/ })
      .check();
    const card = catalogue.locator("#akihq_pro");
    await expect(card).toContainText(es ? "576,00" : "576.00");
    const payload = await card
      .locator("form")
      .evaluate((form) => Object.fromEntries(new FormData(form)));
    expect(payload).toEqual({ locale, plan: "akihq_pro", interval: "year" });
    for (const button of await catalogue
      .locator("article form button[type=submit]")
      .all())
      await expect(button).toBeDisabled();
    expect(await page.evaluate(() => window.__accountActions)).toEqual([]);
  } else if (route === "bookings") {
    const cancel = page.locator(".booking-cancel").first();
    await cancel.locator("summary").click();
    await cancel
      .getByRole("button", {
        name: es ? "Sí, cancelar" : "Yes, cancel",
        exact: true,
      })
      .click();
    await lastAction(page, "cancelMyBooking", {
      locale,
      bookingId: "20000000-0000-4000-8000-000000000000",
    });
    const stay = page.locator(".account-stay-card").first();
    await stay.locator(".account-stay-options > summary").click();
    await stay.locator(".account-stay-cancel > summary").click();
    await stay
      .getByRole("button", {
        name: es ? "Sí, cancelar estancia" : "Yes, cancel stay",
        exact: true,
      })
      .click();
    await lastAction(page, "cancelMyStay", {
      locale,
      bookingId: "10000000-0000-4000-8000-000000000000",
    });
    const tabs = page.locator(".my-bookings-tabs");
    await tabs.locator('a[href*="tab=active"]').click();
    await ready(page);
    await expect(
      page.locator('.my-bookings-tabs a[aria-current="page"]'),
    ).toHaveAttribute("href", `/${locale}/account/bookings?tab=active`);
    await expect(page.locator(".my-booking-card")).toHaveCount(1);
  } else if (route === "saved") {
    await page
      .locator('form:has(input[name="enabled"])')
      .getByRole("button")
      .click();
    await lastAction(page, "setSavedEventReminder", {
      locale,
      enabled: "true",
    });
  }
}

try {
  const executablePath =
    process.env.ACCOUNT_BROWSER_PATH || process.env.BOOKING_BROWSER_PATH;
  browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    ...(process.env.ACCOUNT_BROWSER_ARGS
      ? { args: JSON.parse(process.env.ACCOUNT_BROWSER_ARGS) }
      : {}),
  });
  const selected = process.env.ACCOUNT_BROWSER_ROUTES?.split(",") || routes;
  // An explicit fixture list runs only the selected boundary states.
  const selectedFixtures = process.env.ACCOUNT_BROWSER_FIXTURES?.split(",");
  const sizes = selectedFixtures
    ? []
    : process.env.ACCOUNT_BROWSER_SMOKE
      ? [viewports[0], viewports[4]]
      : viewports;
  for (const locale of ["en", "es"]) {
    for (const theme of ["light", "dark"]) {
      for (const [width, height] of sizes) {
        const context = await browser.newContext({
          viewport: { width, height },
          colorScheme: theme,
          reducedMotion: "reduce",
        });
        await context.route("**/*", (route) =>
          new URL(route.request().url()).origin === origin
            ? route.continue()
            : route.abort(),
        );
        await context.addInitScript((value) => {
          localStorage.setItem("akipasa.theme", value);
          document.addEventListener("DOMContentLoaded", () => {
            document.documentElement.dataset.theme = value;
            document.documentElement.classList.toggle("dark", value === "dark");
          });
        }, theme);
        for (const route of selected) {
          const tag = `${route}-${locale}-${theme}-${width}x${height}`;
          const page = await context.newPage();
          const errors = [];
          page.on("pageerror", (error) => errors.push(error.message));
          console.log(`Checking account ${tag}`);
          try {
            await page.goto(
              `${origin}/${locale}/account${route === "overview" ? "" : `/${route}`}`,
            );
            await ready(page);
            await checkBounds(page, tag);
            await expect(
              page.locator('a[href$="/account/rewards"]'),
            ).toHaveCount(0);
            if (route === "overview") {
              await checkNavigation(page, locale, width);
              await expect(
                page.locator(
                  `.account-shortcuts a[href="/${locale}/passports"]`,
                ),
              ).toBeVisible();
            }
            if (["saved", "following", "activity"].includes(route))
              await expect(
                page.getByText("Málaga · poesía · Tradición · ÁÉÍÓÚ Ñ Ç", {
                  exact: true,
                }),
              ).toBeVisible();
            if ([360, 1536].includes(width)) {
              await interactions(page, route, locale);
              await checkBounds(page, `${tag} after interaction`);
            }
            expect(errors).toEqual([]);
            await resetScroll(page);
            await page.screenshot({
              path: resolve(directory, `${tag}.png`),
              fullPage: false,
            });
            results.push({ route, locale, theme, width, height, pass: true });
          } catch (error) {
            await page
              .screenshot({
                path: resolve(directory, `FAILED-${tag}.png`),
                fullPage: true,
              })
              .catch(() => {});
            writeFileSync(
              resolve(directory, `FAILED-${tag}.json`),
              JSON.stringify(
                {
                  message: error.message,
                  errors,
                  fixtureError: await page
                    .evaluate(() => window.__accountError)
                    .catch(() => null),
                },
                null,
                2,
              ),
            );
            throw error;
          } finally {
            await page.close();
          }
        }
        await context.close();
      }
    }
  }
  // Separate boundary cases keep the main matrix focused and the run bounded.
  for (const locale of ["en", "es"]) {
    const page = await browser.newPage({
      viewport: { width: 360, height: 800 },
    });
    for (const fixture of selectedFixtures || [
      "empty",
      "error",
      "profile-error",
      "privacy-error",
      "billing-error",
      "free",
      "long",
      "pending",
    ]) {
      const subset =
        fixture === "privacy-error"
          ? ["privacy"]
          : fixture === "billing-error"
            ? ["subscription"]
            : fixture === "error"
              ? [
                  "overview",
                  "premium",
                  "saved",
                  "following",
                  "activity",
                  "bookings",
                ]
              : fixture === "profile-error"
                ? ["overview", "profile"]
                : fixture === "empty"
                  ? ["saved", "following", "activity", "bookings"]
                  : fixture === "pending"
                    ? ["settings", "privacy"]
                    : ["overview", "premium", "profile", "subscription"];
      for (const route of subset.filter((route) => selected.includes(route))) {
        const planReadError =
          ["error", "profile-error"].includes(fixture) &&
          ["overview", "premium"].includes(route);
        const profileReadError =
          fixture === "profile-error" && route === "profile";
        const controlsReadError = ["privacy-error", "billing-error"].includes(
          fixture,
        );
        const boundarySizes =
          planReadError || profileReadError || controlsReadError
            ? [viewports[0], viewports[4]]
            : [viewports[0]];
        for (const [width, height] of boundarySizes) {
          const tag = `${route}-${locale}-${fixture}-${width}x${height}`;
          console.log(`Checking account boundary ${tag}`);
          await page.setViewportSize({ width, height });
          await page.goto(
            `${origin}/${locale}/account${route === "overview" ? "" : `/${route}`}?fixture=${fixture}`,
          );
          await ready(page);
          await checkBounds(page, tag);
          if (planReadError && route === "overview") {
            await expect(page.getByRole("status")).toContainText(
              locale === "es"
                ? "Algunos datos de tu cuenta no están disponibles."
                : "Some account details are unavailable.",
            );
            await expect(page.getByRole("status")).toBeVisible();
            if (fixture === "error") {
              await expect(
                page.locator(".account-pulse strong").nth(0),
              ).toHaveText("—");
              await expect(
                page.locator(".account-pulse strong").nth(1),
              ).toHaveText("—");
            } else {
              await expect(page.locator(".account-welcome-copy p")).toHaveText(
                locale === "es" ? "Plan no disponible" : "Plan unavailable",
              );
              await expect(
                page.locator(".account-pulse strong").nth(2),
              ).toHaveText("—");
              await expect(
                page.locator(".account-membership-strip h2"),
              ).toHaveText(
                locale === "es"
                  ? "Revisa tu membresía"
                  : "Check your membership",
              );
            }
          } else if (fixture === "error")
            await expect(page.getByRole("alert").first()).toBeVisible();
          if (profileReadError) {
            await expect(page.getByRole("alert")).toContainText(
              locale === "es"
                ? "Tu perfil no está disponible"
                : "Your profile is unavailable",
            );
            await expect(page.getByRole("alert")).toBeVisible();
            await expect(
              page
                .locator(".workspace-content")
                .locator("form,input,textarea,select"),
            ).toHaveCount(0);
            await page
              .getByRole("button", {
                name: locale === "es" ? "Reintentar" : "Try again",
                exact: true,
              })
              .click();
            await expect
              .poll(() => page.evaluate(() => window.__accountRefreshes))
              .toBe(1);
            expect(await page.evaluate(() => window.__accountActions)).toEqual(
              [],
            );
          }
          if (controlsReadError) {
            const alerts = page.getByRole("alert");
            await expect(alerts).toHaveCount(
              fixture === "privacy-error" ? 2 : 1,
            );
            for (const alert of await alerts.all())
              await expect(alert).toBeVisible();
            if (fixture === "billing-error") {
              const catalogue = page.locator(
                '[aria-labelledby="akisuite-catalogue-title"]',
              );
              await expect(catalogue.locator("article")).toHaveCount(7);
              await expect(catalogue.locator("form")).toHaveCount(7);
              for (const button of await catalogue
                .locator("article button[type=submit]")
                .all())
                await expect(button).toBeDisabled();
              await expect(page.locator(".workspace-content form")).toHaveCount(
                7,
              );
            } else
              await expect(page.locator(".workspace-content form")).toHaveCount(
                0,
              );
            await expect(page.getByRole("checkbox")).toHaveCount(0);
            if (fixture === "privacy-error") {
              await expect(
                page.getByRole("link", {
                  name:
                    locale === "es"
                      ? "Descargar mis datos"
                      : "Download my data",
                }),
              ).toHaveAttribute("href", `/${locale}/account/export`);
            } else {
              await expect(page.getByRole("tablist")).toHaveCount(0);
            }
            await page
              .getByRole("button", {
                name: locale === "es" ? "Reintentar" : "Try again",
                exact: true,
              })
              .first()
              .click();
            await expect
              .poll(() => page.evaluate(() => window.__accountRefreshes))
              .toBe(1);
            expect(await page.evaluate(() => window.__accountActions)).toEqual(
              [],
            );
          }
          if (fixture === "error" && route === "premium") {
            await expect(
              page.locator(".account-membership-card .status-pill"),
            ).toHaveText(
              locale === "es" ? "Plan no disponible" : "Plan unavailable",
            );
            await expect(
              page.locator('a[href$="premium/calendar"]'),
            ).toHaveCount(0);
          }
          if (planReadError) {
            await expect(
              page
                .locator(".workspace-content")
                .getByText(
                  /^(Free account|Cuenta gratuita|Free plan|Plan gratuito|Free|Gratis)$/,
                ),
            ).toHaveCount(0);
            await expect(page.locator('a[href*="?plan=premium"]')).toHaveCount(
              0,
            );
            await expect(
              page.getByRole("link", {
                name: /^(Get Premium|Activar Premium)$/,
              }),
            ).toHaveCount(0);
          }
          if (planReadError || profileReadError || controlsReadError) {
            await resetScroll(page);
            await page.screenshot({
              path: resolve(directory, `${tag}.png`),
              fullPage: false,
            });
          }
          if (fixture === "empty")
            await expect(
              page
                .locator(
                  ".workspace-empty,.my-bookings-empty,.account-collection-state",
                )
                .first(),
            ).toBeVisible();
          if (fixture === "free")
            await expect(
              page.locator('.workspace-navigation a[href$="/premium"]'),
            ).toHaveCount(0);
          results.push({
            route,
            locale,
            fixture,
            width,
            height,
            pass: true,
          });
        }
      }
    }
    if (!selectedFixtures) {
      await page.goto(`${origin}/${locale}/account/rewards`);
      await expect
        .poll(() => page.evaluate(() => window.__accountRedirect))
        .toBe(`/${locale}/passports`);
      results.push({ route: "rewards-redirect", locale, pass: true });
    }
    await page.close();
  }
  // Exercise the pre-activation public handoff with a disposable ready flag only.
  // No runtime environment flags, authenticated reads or real checkout calls are enabled.
  for (const locale of ["en", "es"])
    for (const theme of ["light", "dark"])
      for (const width of [360, 1536]) {
        const page = await browser.newPage({
          viewport: { width, height: 900 },
          colorScheme: theme,
        });
        await page.addInitScript((theme) => {
          document.addEventListener("DOMContentLoaded", () => {
            document.documentElement.dataset.theme = theme;
            document.documentElement.classList.add(`theme-${theme}`);
          });
        }, theme);
        try {
          await page.goto(
            `${origin}/${locale}/account/membership-handoff?ready=true`,
          );
          await expect
            .poll(() => page.evaluate(() => window.__accountReady))
            .toBe(true);
          if (width === 360) {
            const cards = page.getByRole("article");
            await expect(cards).toHaveCount(7);
            for (const card of await cards.all()) {
              // Card order stays stable when the button changes its name on expansion.
              const button = card.locator("button[aria-expanded]");
              await expect(button).toHaveAttribute("aria-expanded", "false");
              await button.click();
              await expect(button).toHaveAttribute("aria-expanded", "true");
            }
            await expect(
              page.locator('article button[aria-expanded="true"]'),
            ).toHaveCount(7);
          }
          const links = page.getByRole("link", {
            name:
              locale === "es"
                ? "Continuar en mi cuenta"
                : "Continue in my account",
          });
          await expect(links).toHaveCount(7);
          for (const link of await links.all()) {
            await expect(link).toBeVisible();
            await expect(link).toHaveAttribute(
              "href",
              `/${locale}/account/subscription?from=akiduermo`,
            );
            const geometry = await link.evaluate((el) => {
              const r = el.getBoundingClientRect();
              const range = document.createRange();
              range.selectNodeContents(el);
              return {
                height: r.height,
                width: r.width,
                left: r.left,
                right: r.right,
                viewport: innerWidth,
                text: [...range.getClientRects()].map((t) => ({
                  left: t.left,
                  right: t.right,
                  top: t.top,
                  bottom: t.bottom,
                })),
                top: r.top,
                bottom: r.bottom,
                overflow: el.scrollWidth > el.clientWidth,
              };
            });
            expect(geometry.height).toBeGreaterThanOrEqual(44);
            expect(geometry.width).toBeGreaterThanOrEqual(44);
            expect(geometry.left).toBeGreaterThanOrEqual(0);
            expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
            expect(geometry.overflow).toBe(false);
            for (const text of geometry.text) {
              expect(text.left).toBeGreaterThanOrEqual(geometry.left - 1);
              expect(text.right).toBeLessThanOrEqual(geometry.right + 1);
              expect(text.top).toBeGreaterThanOrEqual(geometry.top - 1);
              expect(text.bottom).toBeLessThanOrEqual(geometry.bottom + 1);
            }
          }
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          await page.screenshot({
            path: resolve(
              directory,
              `membership-handoff-${locale}-${theme}-${width}.png`,
            ),
            fullPage: true,
          });
          await links.first().click();
          await expect
            .poll(() => new URL(page.url()).pathname)
            .toBe(`/${locale}/account/subscription`);
          expect(await page.evaluate(() => window.__accountActions)).toEqual(
            [],
          );
          await page.goto(
            `${origin}/${locale}/account/membership-handoff?ready=false`,
          );
          await expect
            .poll(() => page.evaluate(() => window.__accountReady))
            .toBe(true);
          await expect(page.locator("article a")).toHaveCount(0);
          await expect(
            page.locator("article form button:disabled"),
          ).toHaveCount(7);
          results.push({
            route: "membership-handoff",
            locale,
            theme,
            width,
            pass: true,
          });
        } finally {
          await page.close();
        }
      }
  console.log(`Account browser acceptance: ${results.length} cases passed`);
} finally {
  writeFileSync(
    resolve(directory, "results.json"),
    JSON.stringify(
      { cases: results, completedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
  await browser?.close();
  await new Promise((done) => server.close(done));
}
