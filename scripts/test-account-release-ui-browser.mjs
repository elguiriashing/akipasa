import { build } from "esbuild";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { relative } from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";

// Real async page loaders, AccountLayout, client components and production CSS.
// Only Auth/database reads, Next routing/request headers and server actions are disposable adapters.
// This verifies UI behavior; it does not claim live authentication/payment acceptance.
const directory = resolve(
  process.env.ACCOUNT_RELEASE_EVIDENCE || "test-results/account-release-ui",
);
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
import {AppShell} from './src/components/AppShell';
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
    root.render(handoff?shell:React.createElement(AppShell,{key:locale,locale,signedIn:true,role:"consumer"},shell));
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
  metafile: true,
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
                ? actionNames
                    .map(
                      (name) =>
                        `export async function ${name}(){window.__accountActions.push('${name}');throw new Error('Forbidden disposable action: ${name}');}`,
                    )
                    .join("\n")
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
  } else if (
    /^\/(brand|pwa|images)\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(png|svg|webp)$/.test(
      pathname,
    )
  ) {
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
const controlProbes = [];
let browser;
const sourcePaths = [
  ...new Set([
    ...Object.keys(bundle.metafile.inputs).filter(
      (path) =>
        (path.startsWith("src/") || path.startsWith("tests/")) &&
        existsSync(path),
    ),
    "package.json",
    "package-lock.json",
    ...globalCssFiles.map((file) => relative(process.cwd(), file)),
    ...routes.map(
      (route) =>
        `src/app/[locale]/account/${route === "overview" ? "" : `${route}/`}page.tsx`,
    ),
    "src/app/[locale]/account/layout.tsx",
    "src/app/[locale]/account/AccountSectionLinks.tsx",
    ...[
      "account-consumer.css",
      "account-personal.module.css",
      "account-suite.css",
      "account-controls.css",
      "account-collections.css",
    ].map((file) => `src/app/[locale]/account/${file}`),
    ...[
      "AppShell.tsx",
      "WorkspaceShell.tsx",
      "GlobalSearch.tsx",
      "AkiSuiteMembershipGrid.tsx",
      "AkiSuiteMembershipGrid.module.css",
    ].map((file) => `src/components/${file}`),
    "src/lib/auth.ts",
    "src/middleware.ts",
    "src/app/[locale]/account/actions.ts",
    "tests/fixtures/account-browser-data.mjs",
    "scripts/test-account-release-ui-browser.mjs",
  ]),
];
const digest = (value) => createHash("sha256").update(value).digest("hex");
const hashes = () =>
  Object.fromEntries(
    sourcePaths.map((path) => [path, digest(readFileSync(path))]),
  );
const initialSourceHashes = hashes();
const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const sourceDirty =
  execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()
    .length > 0;
async function contextFor(locale, theme, width) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    colorScheme: theme,
    reducedMotion: "reduce",
  });
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort(),
  );
  await context.addInitScript((theme) => {
    localStorage.setItem("akipasa.theme", theme);
    document.addEventListener("DOMContentLoaded", () => {
      document.documentElement.dataset.theme = theme;
      document.documentElement.classList.toggle("dark", theme === "dark");
    });
  }, theme);
  return context;
}
async function open(context, locale, route, query = "") {
  const page = await context.newPage();
  page.on("pageerror", (error) => {
    page.fixtureErrors ||= [];
    page.fixtureErrors.push(error.message);
  });
  await page.goto(
    `${origin}/${locale}/account${route === "overview" ? "" : `/${route}`}${query}`,
  );
  await ready(page);
  return page;
}
async function noMutations(page) {
  expect(await page.evaluate(() => window.__accountActions)).toEqual([]);
  expect(page.fixtureErrors || []).toEqual([]);
}
async function capture(page, stem, lower = false) {
  if (lower)
    await page.evaluate(() => {
      for (const element of document.querySelectorAll("*")) {
        if (
          element.scrollHeight > element.clientHeight &&
          /(auto|scroll)/.test(getComputedStyle(element).overflowY)
        )
          element.scrollTop = element.scrollHeight;
      }
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "instant",
      });
    });
  const file = resolve(directory, `${stem}${lower ? "-lower" : "-upper"}.png`);
  await page.screenshot({ path: file, animations: "disabled" });
  return { image: file, imageSha256: digest(readFileSync(file)) };
}
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
      if (rect.left < -1 || rect.right > width + 1) {
        // Off-screen controls are valid only within a genuinely scrollable
        // horizontal comparison row, and must become visible when scrolled.
        let reachable = false;
        for (
          let ancestor = control.parentElement;
          ancestor && ancestor !== document.body;
          ancestor = ancestor.parentElement
        ) {
          const style = getComputedStyle(ancestor);
          if (
            !/auto|scroll/.test(style.overflowX) ||
            ancestor.scrollWidth <= ancestor.clientWidth + 1
          )
            continue;
          const previous = ancestor.scrollLeft;
          // Snap alignment can move a programmatic reachability probe
          // backwards before the target control is measured.
          const previousSnapType = ancestor.style.scrollSnapType;
          ancestor.style.scrollSnapType = "none";
          const parentBox = ancestor.getBoundingClientRect();
          ancestor.scrollLeft += rect.left - parentBox.left;
          const reached = control.getBoundingClientRect();
          reachable =
            reached.left >= Math.max(-1, parentBox.left - 1) &&
            reached.right <= Math.min(width + 1, parentBox.right + 1);
          ancestor.scrollLeft = previous;
          ancestor.style.scrollSnapType = previousSnapType;
          if (reachable) break;
        }
        if (!reachable)
          failures.push(
            `Control outside viewport: ${(control.textContent || control.getAttribute("name") || control.tagName).trim().slice(0, 80)}`,
          );
      }
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
  await expect(page.locator(".app-shell .account-workspace")).toBeVisible();
  const palette = await page
    .locator(".account-workspace")
    .evaluate((element) => ({
      surface: getComputedStyle(element).getPropertyValue("--surface").trim(),
      light: document.documentElement.dataset.theme === "light",
    }));
  expect(palette.surface, `${context}: actual Account palette`).toBe(
    palette.light ? "#ffffff" : "#131619",
  );
  const contrast = await page
    .locator(".account-collection-remove")
    .evaluateAll((elements) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const luminance = (color) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const rgba = ctx.getImageData(0, 0, 1, 1).data;
        return [0.2126, 0.7152, 0.0722].reduce((sum, weight, index) => {
          const value = rgba[index] / 255;
          return (
            sum +
            weight *
              (value <= 0.04045
                ? value / 12.92
                : ((value + 0.055) / 1.055) ** 2.4)
          );
        }, 0);
      };
      return elements.map((element) => {
        const ink = luminance(getComputedStyle(element).color);
        const panel = luminance(
          getComputedStyle(element.closest(".account-collection-card"))
            .backgroundColor,
        );
        return (Math.max(ink, panel) + 0.05) / (Math.min(ink, panel) + 0.05);
      });
    });
  for (const ratio of contrast)
    expect(
      ratio,
      `${context}: destructive label contrast`,
    ).toBeGreaterThanOrEqual(4.5);
  const remove = page.locator(".account-collection-remove:enabled").last();
  if (await remove.count()) {
    await remove.scrollIntoViewIfNeeded();
    expect(
      await remove.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return element.contains(
          document.elementFromPoint(
            box.x + box.width / 2,
            box.y + box.height / 2,
          ),
        );
      }),
      `${context}: removal remains reachable`,
    ).toBe(true);
    await remove.focus();
    await expect(remove).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    expect(
      await page.evaluate(() => document.activeElement?.tagName !== "BODY"),
    ).toBe(true);
    await resetScroll(page);
  }

  const heading = await page.locator(".workspace-content h1").boundingBox();
  expect(
    heading.y,
    `${context}: useful heading is too far below navigation`,
  ).toBeLessThan(320);
}

async function checkDesktopSearchAndMenu(page, context) {
  const search = page.locator(".global-search-trigger");
  const menu = page.locator(".workspace-mobile-trigger");
  const panel = page.locator("#site-search-panel");
  await resetScroll(page);
  await expect(search).toBeEnabled();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  const geometry = await page.evaluate(() => {
    const search = document.querySelector(".global-search-trigger");
    const menu = document.querySelector(".workspace-mobile-trigger");
    const a = search.getBoundingClientRect();
    const b = menu.getBoundingClientRect();
    const hit = (element) => {
      const rect = element.getBoundingClientRect();
      return [0.2, 0.5, 0.8].map((fraction) => {
        const target = document.elementFromPoint(
          rect.left + rect.width * fraction,
          rect.top + rect.height / 2,
        );
        return target === element || element.contains(target);
      });
    };
    return {
      overlap:
        Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
        Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)),
      searchHits: hit(search),
      menuHits: hit(menu),
    };
  });
  expect(geometry.overlap, `${context}: Search/Menu overlap`).toBe(0);
  expect(geometry.searchHits, `${context}: Search pointer targets`).toEqual([
    true,
    true,
    true,
  ]);
  expect(geometry.menuHits, `${context}: Menu pointer targets`).toEqual([
    true,
    true,
    true,
  ]);
  await search.click();
  await expect(panel).toBeVisible();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await search.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toBeVisible();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".workspace-drawer")).toBeVisible();
  await expect(panel).not.toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toBeFocused();
  await resetScroll(page);
  return geometry;
}

try {
  const executablePath =
    process.env.BOOKING_BROWSER_PATH || process.env.ACCOUNT_BROWSER_PATH;
  browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"]) {
      for (const width of [360, 390, 820, 1440]) {
        const context = await contextFor(locale, theme, width);
        try {
          for (const route of [
            "overview",
            "profile",
            "settings",
            ...([390, 1440].includes(width) ? ["subscription"] : []),
          ]) {
            const page = await open(context, locale, route);
            const tag = `${route}-${locale}-${theme}-${width}`;
            try {
              await checkBounds(page, tag);
              if (width === 1440)
                controlProbes.push({
                  route,
                  locale,
                  theme,
                  width,
                  ...(await checkDesktopSearchAndMenu(page, tag)),
                });
              if (route === "overview") {
                await expect(
                  page.locator("[data-personal-account]"),
                ).toBeVisible();
                await expect(
                  page.locator(".account-pulse strong").first(),
                ).toHaveText("13");
                await expect(page.locator('a[href*="/pals"]')).toHaveCount(0);
              }
              if (route === "profile") {
                await expect(
                  page.locator('input[name="displayName"]'),
                ).toHaveValue("María Ángeles");
                await expect(
                  page.locator(".account-profile-save-button"),
                ).toBeAttached();
              }
              if (route === "settings")
                await expect(page.locator(".account-email-card")).toBeVisible();
              const upper = await capture(page, tag);
              const lower = await capture(page, tag, true);
              await noMutations(page);
              results.push({
                route,
                locale,
                theme,
                width,
                upper,
                lower,
                pass: true,
              });
            } finally {
              await page.close();
            }
          }
        } finally {
          await context.close();
        }
      }
      // Existing core1440 cases cover four routes; complete all ten routes without duplicate probes.
      for (const width of [851, 1024, 1440, 1536]) {
        const context = await contextFor(locale, theme, width);
        try {
          for (const route of routes.filter(
            (route) =>
              width !== 1440 ||
              !["overview", "profile", "settings", "subscription"].includes(
                route,
              ),
          )) {
            const page = await open(context, locale, route);
            try {
              controlProbes.push({
                route,
                locale,
                theme,
                width,
                ...(await checkDesktopSearchAndMenu(
                  page,
                  `${route}-${locale}-${theme}-${width}`,
                )),
              });
              await noMutations(page);
            } finally {
              await page.close();
            }
          }
        } finally {
          await context.close();
        }
      }
    }
  for (const locale of ["en", "es"]) {
    const context = await contextFor(locale, "dark", 390);
    const page = await open(context, locale, "overview");
    try {
      await page.evaluate(
        (href) => window.__accountNavigate(href),
        `/${locale}/account/profile`,
      );
      await expect(page.locator(".account-profile-form")).toBeVisible();
      const menu = page.locator(".workspace-mobile-trigger");
      await menu.click();
      await expect(menu).toHaveAttribute("aria-expanded", "true");
      await page.goBack();
      await expect(page.locator(".account-overview")).toBeVisible();
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await menu.click();
      await page.goForward();
      await expect(page.locator(".account-profile-form")).toBeVisible();
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await menu.click();
      await page.evaluate(() =>
        window.dispatchEvent(new PopStateEvent("popstate")),
      );
      await expect(menu).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Escape");
      await expect(menu).toBeFocused();
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await noMutations(page);
      results.push({ route: "native-history", locale, pass: true });
    } finally {
      await context.close();
    }
  }
  {
    for (const locale of ["en", "es"])
      for (const theme of ["light", "dark"])
        for (const width of [390, 1440])
          for (const [query, role, message] of [
            [
              "email=confirmed",
              "status",
              locale === "es"
                ? "Correo actualizado correctamente."
                : "Email updated successfully.",
            ],
            [
              "password=sent",
              "status",
              locale === "es"
                ? "Enlace enviado. Revisa tu correo para cambiar la contraseña."
                : "Link sent. Check your email to change your password.",
            ],
            [
              "error=password-provider",
              "alert",
              locale === "es"
                ? "No pudimos enviar el enlace de cambio de contraseña."
                : "We could not send the password-change link.",
            ],
            [
              "error=email-validation",
              "alert",
              locale === "es"
                ? "Introduce una dirección de correo válida."
                : "Enter a valid email address.",
            ],
          ]) {
            const page = await browser.newPage({
              viewport: { width, height: 900 },
              colorScheme: theme,
              reducedMotion: "reduce",
            });
            await page.route("**/*", (request) =>
              new URL(request.request().url()).origin === origin
                ? request.continue()
                : request.abort(),
            );
            await page.addInitScript((value) => {
              localStorage.setItem("akipasa.theme", value);
              document.addEventListener("DOMContentLoaded", () => {
                document.documentElement.dataset.theme = value;
                document.documentElement.classList.toggle(
                  "dark",
                  value === "dark",
                );
              });
            }, theme);
            const tag = `settings-${locale}-${theme}-${width}-${query.replace("=", "-")}`;
            try {
              await page.goto(`${origin}/${locale}/account/settings?${query}`);
              await ready(page);
              await checkBounds(page, tag);
              const notice = page.getByRole(role).filter({ hasText: message });
              await expect(notice).toHaveText(message);
              await notice.scrollIntoViewIfNeeded();
              await expect(notice).toBeVisible();
              const contrast = await notice.evaluate((element) => {
                const canvas = document.createElement("canvas");
                canvas.width = canvas.height = 1;
                const context = canvas.getContext("2d", {
                  willReadFrequently: true,
                });
                const rgba = (color) => {
                  context.clearRect(0, 0, 1, 1);
                  context.fillStyle = color;
                  context.fillRect(0, 0, 1, 1);
                  return Array.from(context.getImageData(0, 0, 1, 1).data);
                };
                const over = (foreground, background) =>
                  foreground
                    .slice(0, 3)
                    .map(
                      (value, index) =>
                        (value * foreground[3]) / 255 +
                        background[index] * (1 - foreground[3] / 255),
                    );
                const chain = [];
                for (let node = element; node; node = node.parentElement)
                  chain.push(node);
                let background = [255, 255, 255];
                for (const node of chain.reverse())
                  background = over(
                    rgba(getComputedStyle(node).backgroundColor),
                    background,
                  );
                const foreground = over(
                  rgba(getComputedStyle(element).color),
                  background,
                );
                const luminance = (color) =>
                  color.reduce((sum, value, index) => {
                    const channel = value / 255;
                    return (
                      sum +
                      [0.2126, 0.7152, 0.0722][index] *
                        (channel <= 0.04045
                          ? channel / 12.92
                          : ((channel + 0.055) / 1.055) ** 2.4)
                    );
                  }, 0);
                const a = luminance(foreground),
                  b = luminance(background);
                return {
                  ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
                  foreground,
                  background,
                };
              });
              expect(
                contrast.ratio,
                `${tag}: actual alpha-composited notice ${JSON.stringify(contrast)}`,
              ).toBeGreaterThanOrEqual(4.5);
              expect(
                await notice.evaluate((element) => {
                  const rect = element.getBoundingClientRect();
                  const target = document.elementFromPoint(
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2,
                  );
                  return target === element || element.contains(target);
                }),
              ).toBe(true);
              const editor = page.locator(".account-email-card details");
              if (query === "error=email-validation") {
                await expect(editor).toHaveAttribute("open", "");
                await expect(page.locator('input[name="email"]')).toBeVisible();
              } else await expect(editor).not.toHaveAttribute("open");
              expect(
                await page.evaluate(() => window.__accountActions),
              ).toEqual([]);
              await page.screenshot({ path: resolve(directory, `${tag}.png`) });
              results.push({
                route: "settings-notice",
                locale,
                theme,
                width,
                query,
                contrast,
                pass: true,
              });
            } finally {
              await page.close();
            }
          }
  }

  expect(controlProbes).toHaveLength(160);
  expect(results).toHaveLength(90);
  console.log(
    `Account release UI: ${results.length} states + ${controlProbes.length} native Search/Menu probes passed; actions forbidden`,
  );
} finally {
  const finalSourceHashes = hashes();
  const stable =
    JSON.stringify(initialSourceHashes) === JSON.stringify(finalSourceHashes);
  writeFileSync(
    resolve(directory, "results.json"),
    JSON.stringify(
      {
        scope:
          "Actual async Account pages/AccountLayout/AppShell and candidate CSS; disposable identity/database/navigation. Actions throw. Not Next HTTP/liveAuth/RLS/billing/provider/device acceptance.",
        sourceHead,
        sourceDirty,
        actualNext: false,
        physicalDevice: false,
        initialSourceHashes,
        finalSourceHashes,
        sourceStable: stable,
        results,
        controlProbes,
        complete: results.length === 90 && controlProbes.length === 160,
      },
      null,
      2,
    ) + "\n",
  );
  await browser?.close();
  await new Promise((done) => server.close(done));
  expect(stable, "Candidate source changed while the fixture ran").toBe(true);
}
