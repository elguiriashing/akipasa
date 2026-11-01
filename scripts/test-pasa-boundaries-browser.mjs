import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  copyFile,
  writeFile,
  readFile,
  symlink,
  rm,
} from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve, join } from "node:path";

const directory = resolve("test-results/pasa-boundaries-framework");
await mkdir(directory, { recursive: true });
const fixture = await mkdtemp(join(tmpdir(), "akipasa-boundaries-next-"));
const sources = [
  "src/components/RouteBoundaryContext.tsx",
  "src/lib/suite-navigation.ts",
  "src/components/PasaRouteFallback.tsx",
  "src/components/PasaRouteFallback.module.css",
  "src/components/Icons.tsx",
  "src/components/PortalLogo.tsx",
  "src/components/BrandLogo.tsx",
  "src/components/PortalLogo.module.css",
  "src/app/not-found.tsx",
  "src/app/error.tsx",
  "src/app/[locale]/not-found.tsx",
  "src/app/[locale]/error.tsx",
  "src/app/[locale]/admin/loading.tsx",
  "src/app/[locale]/admin/layout.tsx",
  "src/app/[locale]/admin/admin-suite.css",
  "src/app/[locale]/admin/admin-compact.css",
  "src/components/WorkspaceShell.tsx",
  "src/lib/roles.ts",
  "src/app/globals.css",
  "src/app/discovery-redesign.css",
  "src/app/aki-app-first.css",
  "src/app/aki-event-cards.css",
  "src/app/compact-app.css",
  "src/app/brand.css",
  "src/app/appearance.css",
  "src/app/tablet-responsive.css",
  "src/app/portal-unity.css",
];
const hashes = {};
for (const path of sources) {
  hashes[path] = createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
  const target = join(fixture, path);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(path, target);
}
for (const path of [
  "public/brand/v3/pasa.svg",
  "public/brand/v3/pasa-2026.svg",
  "public/brand/pasa-2026-traced.svg",
  "public/brand/v3/business.svg",
  "public/brand/v3/coches.svg",
  "public/brand/duermo-icon.png",
]) {
  const target = join(fixture, path);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(path, target);
  hashes[path] = createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}
await symlink(resolve("node_modules"), join(fixture, "node_modules"), "dir");
async function file(path, text) {
  await mkdir(dirname(join(fixture, path)), { recursive: true });
  await writeFile(join(fixture, path), text);
}
await file(
  "package.json",
  JSON.stringify({
    name: "disposable-pasa-boundary-framework-test",
    private: true,
    type: "module",
  }),
);
await file(
  "next.config.mjs",
  `export default {outputFileTracingRoot:${JSON.stringify(fixture)},images:{unoptimized:true}};`,
);
await file(
  "tsconfig.json",
  JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      lib: ["dom", "esnext"],
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      jsx: "preserve",
      resolveJsonModule: true,
      paths: { "@/*": ["./src/*"] },
    },
    include: ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"],
  }),
);
await file(
  "postcss.config.mjs",
  `export default {plugins:{'@tailwindcss/postcss':{}}};`,
);
await file(
  "src/lib/config.ts",
  `export type Locale='en'|'es';export function isLocale(value:string):value is Locale{return value==='en'||value==='es'}`,
);
// Disposable authorization/reads only. The real Admin layout and role predicate
// execute against this explicit synthetic administrator, never customer data.
await file(
  "src/lib/auth.ts",
  `export async function requireUser(..._args:unknown[]){return {user:{id:'synthetic-admin-boundary-fixture'},supabase:{from(table:string){return {select(..._args:unknown[]){return {eq(..._args:unknown[]){return {async maybeSingle(){return {data:table==='profiles'?{app_role:'administrator'}:null}}}},async in(..._args:unknown[]){return {count:0,data:[]}}}}}}}}}`,
);
await file(
  "src/app/layout.tsx",
  `import{headers}from'next/headers';import{FixtureProvider}from'@/components/FixtureProvider';import './globals.css';import './compact-app.css';import './brand.css';import './appearance.css';import './tablet-responsive.css';import './portal-unity.css';import './fixture.css';export default async function Root({children}:{children:React.ReactNode}){const h=await headers(),locale=h.get('x-fixture-locale')==='en'?'en':'es',product=h.get('x-fixture-product');return <html lang={locale} data-theme={h.get('x-fixture-theme')==='light'?'light':'dark'}><body data-android-app={/AkiPasaAndroid\\//.test(h.get('user-agent')||'')?'true':undefined}><FixtureProvider locale={locale} product={product}>{children}</FixtureProvider></body></html>}`,
);
await file(
  "src/components/FixtureProvider.tsx",
  `'use client';import{useEffect}from'react';import{RouteBoundaryProvider}from'./RouteBoundaryContext';export function FixtureProvider({locale,product,children}:{locale:'en'|'es';product:string|null;children:React.ReactNode}){useEffect(()=>{const target=window as Window&{__providerMounts?:number};target.__providerMounts=(target.__providerMounts||0)+1;},[]);return <><output data-trusted-locale={locale} hidden/ ><RouteBoundaryProvider locale={locale} product={product}>{children}</RouteBoundaryProvider></>}`,
);
await file(
  "src/app/[locale]/navigate/page.tsx",
  `import Link from'next/link';export default function Navigate(){return <main className="fixture-content"><Link href="/es/missing">Go to Spanish missing</Link></main>}`,
);
await file(
  "src/app/query/page.tsx",
  `'use client';import{PasaRouteFallback}from'@/components/PasaRouteFallback';export default function Query(){return <><button onClick={()=>{history.replaceState(history.state,'','/query?lang=es&token=PRIVATE_QUERY');window.dispatchEvent(new CustomEvent('akipasa:locale-change',{detail:'es'}))}}>Switch query to Spanish</button><PasaRouteFallback kind="not-found" standalone/></>}`,
);
await file(
  "src/app/fixture.css",
  `body{margin:0;background:#142038;font-family:system-ui,sans-serif}a{color:inherit}html[data-theme=light] body{background:#f9f6ef}.fixture-shell{padding-block:1px}.fixture-shell>main{margin-block:1.5rem}.fixture-content{padding:2rem;color:#f5f7ff}html[data-theme=light] .fixture-content{color:#18283d}`,
);
await file(
  "src/middleware.ts",
  `import{NextResponse,type NextRequest}from'next/server';export function middleware(request:NextRequest){const headers=new Headers(request.headers);const path=request.nextUrl.pathname.split('/')[1],lang=request.nextUrl.searchParams.get('lang');headers.set('x-fixture-locale',path==='root-failure'?(lang==='en'?'en':'es'):path==='en'||path==='es'?path:headers.get('x-fixture-product')!=='akipasa'&&(lang==='en'||lang==='es')?lang:'es');return NextResponse.next({request:{headers}})}export const config={matcher:['/((?!_next|brand).*)']};`,
);
await file(
  "src/app/[locale]/layout.tsx",
  `export default function LocalLayout({children}:{children:React.ReactNode}){return <div className="fixture-shell">{children}</div>}`,
);
await file(
  "src/app/[locale]/page.tsx",
  `export default function Home(){return <main className="fixture-content"><h1>Disposable fixture home</h1></main>}`,
);
await file(
  "src/app/[locale]/missing/page.tsx",
  `import{notFound}from'next/navigation';export default function Missing(){notFound()}`,
);
await file(
  "src/app/[locale]/guard/page.tsx",
  `import{redirect}from'next/navigation';export default async function Guard({params}:{params:Promise<{locale:string}>}){const{locale}=await params;redirect('/'+locale+'/auth?next='+encodeURIComponent('/'+locale+'/guard'))}`,
);
await file(
  "src/app/[locale]/auth/page.tsx",
  `export default function Auth(){return <main className="fixture-content"><h1>Disposable sign-in fixture</h1></main>}`,
);
await file(
  "src/app/[locale]/failure/page.tsx",
  `export const dynamic='force-dynamic';export default async function Failure(){const response=await fetch(process.env.BOUNDARY_FIXTURE_BACKEND+'/failure',{cache:'no-store'});if((await response.text())==='fail')throw Error('PRIVATE_PROVIDER_SECRET private@example.test token=secret');return <main className="fixture-content"><h1>Recovered fixture page</h1></main>}`,
);
await file(
  "src/app/[locale]/slow/loading.tsx",
  `export {default} from '../admin/loading';`,
);
await file(
  "src/app/[locale]/slow/page.tsx",
  `export const dynamic='force-dynamic';export default async function Slow(){await fetch(process.env.BOUNDARY_FIXTURE_BACKEND+'/hold',{cache:'no-store'});return <main className="fixture-content"><h1>Loaded fixture page</h1></main>}`,
);
// Top-level failure bypasses [locale]/error.tsx so the copied root error
// boundary itself performs a native refresh/reset against a held GET read.
await file(
  "src/app/root-failure/page.tsx",
  `export const dynamic='force-dynamic';export default async function Failure(){const response=await fetch(process.env.BOUNDARY_FIXTURE_BACKEND+'/failure',{cache:'no-store'});if((await response.text())==='fail')throw Error('PRIVATE_ROOT_CHILD_ERROR token=secret');return <main className="fixture-content"><h1>Recovered root fixture page</h1></main>}`,
);
await file(
  "src/app/[locale]/admin/slow/page.tsx",
  `export const dynamic='force-dynamic';export default async function AdminSlow(){await fetch(process.env.BOUNDARY_FIXTURE_BACKEND+'/hold',{cache:'no-store'});return <section data-admin-loaded><h1>Loaded Admin fixture page</h1></section>}`,
);
const backendMethods = [];
let failed = true,
  held = [],
  recovering = false,
  recoveryHeld = [];
const backend = createServer((req, res) => {
  backendMethods.push(req.method);
  res.setHeader("Content-Type", "text/plain");
  if (req.url === "/hold") {
    held.push(res);
    return;
  }
  if (!failed && recovering) {
    recoveryHeld.push(res);
    return;
  }
  res.end(failed ? "fail" : "healthy");
});
await new Promise((done, reject) => {
  backend.once("error", reject);
  backend.listen(0, "127.0.0.1", done);
});
const backendOrigin = `http://127.0.0.1:${backend.address().port}`;
const probe = createServer();
await new Promise((done) => probe.listen(0, "127.0.0.1", done));
const port = probe.address().port;
await new Promise((done) => probe.close(done));
const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: "1",
  NODE_ENV: "production",
  BOUNDARY_FIXTURE_BACKEND: backendOrigin,
};
const next = resolve("node_modules/next/dist/bin/next");
let server, browser, activePage;
const results = [];
const adminMenuHydrationChecks = [];
const logs = createWriteStream(
  resolve(directory, `next-fixture-${Date.now()}.log`),
);
async function command(args) {
  const child = spawn(process.execPath, [next, ...args], {
    cwd: fixture,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.pipe(logs, { end: false });
  child.stderr.pipe(logs, { end: false });
  await new Promise((done, reject) => {
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? done()
        : reject(Error(`Next ${args.join(" ")} failed (${code})`)),
    );
  });
}
try {
  await command(["build", "--webpack"]);
  server = spawn(
    process.execPath,
    [next, "start", "--hostname", "127.0.0.1", "--port", String(port)],
    { cwd: fixture, env, stdio: ["ignore", "pipe", "pipe"] },
  );
  server.stdout.pipe(logs, { end: false });
  server.stderr.pipe(logs, { end: false });
  const origin = `http://127.0.0.1:${port}`;
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(origin + "/en");
      if (response.ok) break;
    } catch {}
    if (attempt > 120) throw Error("Isolated Next server did not start");
    await new Promise((done) => setTimeout(done, 250));
  }
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : {}),
  });
  for (const locale of ["en", "es"])
    for (const width of [360, 390, 820, 1440])
      for (const theme of ["dark", "light"]) {
        const page = await browser.newPage({
          viewport: { width, height: 1000 },
          hasTouch: width < 500,
          isMobile: width < 500,
          reducedMotion: width === 390 ? "reduce" : "no-preference",
          extraHTTPHeaders: {
            "x-fixture-product": "akipasa",
            "x-fixture-theme": theme,
          },
          ...(width === 390
            ? {
                userAgent:
                  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/149 Mobile Safari/537.36 AkiPasaAndroid/fixture",
              }
            : {}),
        });
        activePage = page;
        await page.route("**/*", (route) => {
          const url = new URL(route.request().url());
          if (
            url.origin !== origin &&
            !["data:", "blob:"].includes(url.protocol)
          )
            return route.abort();
          return route.continue();
        });
        const capture = async (state) => {
          await page.evaluate(async () => {
            await Promise.all(
              document
                .getAnimations()
                .filter((a) =>
                  Number.isFinite(a.effect?.getComputedTiming().endTime),
                )
                .map((a) => a.finished),
            );
          });
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          ).toBe(true);
          const name = `${locale}-${width}-${theme}-${state}.png`;
          if (state === "loading" || state === "admin-loading") {
            // FontFaceSet.ready waits for the held document to finish even with
            // no web fonts. Capture the actual in-flight pixels via CDP instead.
            expect(await page.evaluate(() => document.fonts.size)).toBe(0);
            const cdp = await page.context().newCDPSession(page);
            const { cssContentSize } = await cdp.send("Page.getLayoutMetrics");
            const { data } = await cdp.send("Page.captureScreenshot", {
              format: "png",
              captureBeyondViewport: true,
              fromSurface: true,
              clip: {
                x: 0,
                y: 0,
                width: Math.max(width, cssContentSize.width),
                height: Math.max(1000, cssContentSize.height),
                scale: 1,
              },
            });
            await writeFile(
              resolve(directory, name),
              Buffer.from(data, "base64"),
            );
            await cdp.detach();
          } else
            await page.screenshot({
              path: resolve(directory, name),
              fullPage: true,
            });
          results.push({
            locale,
            width,
            theme,
            state,
            screenshot: name,
            sha256: createHash("sha256")
              .update(await readFile(resolve(directory, name)))
              .digest("hex"),
          });
        };
        for (const path of ["missing", "not-a-route"]) {
          const response = await page.goto(`${origin}/${locale}/${path}`);
          expect(response.status()).toBe(404);
          await expect(
            page.locator('[data-route-fallback="not-found"]'),
          ).toBeVisible();
          await expect(
            page.getByRole("link", {
              name: locale === "es" ? "Volver al inicio" : "Back to the start",
              exact: true,
            }),
          ).toHaveAttribute("href", `/${locale}`);
          expect(
            await page
              .locator("meta[name=robots]")
              .evaluateAll((elements) =>
                elements.some((e) =>
                  e.getAttribute("content")?.includes("noindex"),
                ),
              ),
          ).toBe(true);
          await capture(path);
        }
        const guard = await page.request.get(`${origin}/${locale}/guard`, {
          maxRedirects: 0,
        });
        expect(guard.status()).toBe(307);
        expect(new URL(guard.headers().location, origin).pathname).toBe(
          `/${locale}/auth`,
        );
        failed = true;
        await page.goto(`${origin}/${locale}/failure`);
        await expect(
          page.locator('[data-route-fallback="error"]'),
        ).toBeVisible();
        await expect(page.locator("body")).not.toContainText(
          /PRIVATE_PROVIDER_SECRET|private@example|token=secret/,
        );
        const retry = page.getByRole("button", {
          name: locale === "es" ? "Reintentar" : "Try again",
          exact: true,
        });
        await retry.focus();
        await expect(retry).toBeFocused();
        await capture("error");
        failed = false;
        recovering = true;
        await page.keyboard.press("Enter");
        const pendingRetry = page.getByRole("button", {
          name: locale === "es" ? "Reintentando…" : "Trying again…",
          exact: true,
        });
        await expect(pendingRetry).toBeDisabled();
        await capture("retrying");
        recovering = false;
        recoveryHeld.splice(0).forEach((response) => response.end("healthy"));
        await expect(
          page.getByRole("heading", { name: "Recovered fixture page" }),
        ).toBeVisible();
        await page.goto(`${origin}/${locale}/slow`, { waitUntil: "commit" });
        await expect(page.getByRole("status")).toContainText(
          locale === "es" ? "Cargando página" : "Loading page",
        );
        await capture("loading");
        held.splice(0).forEach((response) => response.end("ready"));
        await expect(
          page.getByRole("heading", { name: "Loaded fixture page" }),
        ).toBeVisible();
        failed = true;
        await page.goto(`${origin}/root-failure?lang=${locale}`);
        await expect(
          page.locator('[data-route-fallback="error"]'),
        ).toBeVisible();
        await expect(page.locator("body")).not.toContainText(
          /PRIVATE_ROOT_CHILD_ERROR|token=secret/,
        );
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(
          page.getByRole("link", {
            name: locale === "es" ? "Volver al inicio" : "Back to the start",
            exact: true,
          }),
        ).toHaveAttribute("href", `/${locale}`);
        const rootRetry = page.getByRole("button", {
          name: locale === "es" ? "Reintentar" : "Try again",
          exact: true,
        });
        await rootRetry.focus();
        await expect(rootRetry).toBeFocused();
        await capture("root-error");
        failed = false;
        recovering = true;
        await page.keyboard.press("Enter");
        await expect(
          page.getByRole("button", {
            name: locale === "es" ? "Reintentando…" : "Trying again…",
            exact: true,
          }),
        ).toBeDisabled();
        await capture("root-retrying");
        recovering = false;
        recoveryHeld.splice(0).forEach((response) => response.end("healthy"));
        await expect(
          page.getByRole("heading", { name: "Recovered root fixture page" }),
        ).toBeVisible();
        await expect(page.locator('[data-route-fallback="error"]')).toHaveCount(
          0,
        );

        await page.goto(`${origin}/${locale}/admin/slow`, {
          waitUntil: "commit",
        });
        const adminShell = page.locator("main.admin-workspace");
        await expect(adminShell).toBeVisible();
        await expect(adminShell).toHaveAttribute(
          "aria-label",
          locale === "es" ? "Administración" : "Administration",
        );
        await expect(page.locator("main")).toHaveCount(1);
        const adminStatus = adminShell.getByRole("status");
        await expect(adminStatus).toContainText(
          locale === "es" ? "Cargando página" : "Loading page",
        );
        const adminMenu = adminShell.locator(".workspace-mobile-trigger");
        if (await adminMenu.isVisible()) {
          // commit + visible streamed HTML does not imply React has attached
          // native event handling. The existing fixture provider records its
          // mount without releasing the held Admin server read/loading state.
          await page.waitForFunction(() => window.__providerMounts > 0);
          await expect(adminStatus).toBeVisible();
          await adminMenu.focus();
          await expect(adminMenu).toBeFocused();
          adminMenuHydrationChecks.push({
            locale,
            width,
            theme,
            providerMounts: await page.evaluate(() => window.__providerMounts),
            loadingStillVisible: await adminStatus.isVisible(),
            focused: await adminMenu.evaluate(
              (element) => document.activeElement === element,
            ),
          });
          await page.keyboard.press("Enter");
          await expect(adminMenu).toHaveAttribute("aria-expanded", "true");
          await expect(
            adminShell.locator(".workspace-drawer").getByRole("link", {
              name: locale === "es" ? "Auditoría" : "Audit history",
              exact: true,
            }),
          ).toHaveAttribute("href", `/${locale}/admin/audit`);
          await page.keyboard.press("Escape");
          await expect(adminMenu).toHaveAttribute("aria-expanded", "false");
          await expect(adminMenu).toBeFocused();
          await expect(adminStatus).toBeVisible();
        } else {
          await expect(
            adminShell.getByRole("link", {
              name: locale === "es" ? "Auditoría" : "Audit history",
              exact: true,
            }),
          ).toHaveAttribute("href", `/${locale}/admin/audit`);
        }
        await capture("admin-loading");
        held.splice(0).forEach((response) => response.end("ready"));
        await expect(
          adminShell.getByRole("heading", {
            name: "Loaded Admin fixture page",
          }),
        ).toBeVisible();
        await expect(adminStatus).toHaveCount(0);
        await expect(adminShell).toBeVisible();
        await expect(page.locator("main")).toHaveCount(1);
        await page.close();
      }
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: {
        "x-fixture-product": "akipasa",
        "x-fixture-theme": "light",
      },
    });
    activePage = page;
    await page.goto(origin + "/en/navigate");
    await page.waitForFunction(() => window.__providerMounts === 1);
    await page.getByRole("link", { name: "Go to Spanish missing" }).click();
    await expect(
      page.getByRole("link", { name: "Volver al inicio", exact: true }),
    ).toHaveAttribute("href", "/es");
    expect(await page.evaluate(() => window.__providerMounts)).toBe(1);
    await expect(page.locator("[data-trusted-locale]")).toHaveAttribute(
      "data-trusted-locale",
      "en",
    );
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    const name = "persistent-provider-en-to-es.png";
    await page.screenshot({ path: resolve(directory, name), fullPage: true });
    results.push({
      state: "real-client-locale-navigation",
      screenshot: name,
      sha256: createHash("sha256")
        .update(await readFile(resolve(directory, name)))
        .digest("hex"),
    });
    await page.close();
  }
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: {
        "x-fixture-product": "akiduermo",
        "x-fixture-theme": "light",
      },
    });
    activePage = page;
    await page.goto(origin + "/query?lang=en");
    await expect(
      page.getByRole("link", { name: "Back to the start", exact: true }),
    ).toHaveAttribute("href", "https://akiduermo.com/?lang=en");
    await page.getByRole("button", { name: "Switch query to Spanish" }).click();
    await expect(
      page.getByRole("link", { name: "Volver al inicio", exact: true }),
    ).toHaveAttribute("href", "https://akiduermo.com/?lang=es");
    await expect(page.locator("[data-trusted-locale]")).toHaveAttribute(
      "data-trusted-locale",
      "en",
    );
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.locator("[data-route-fallback]")).not.toContainText(
      "PRIVATE_QUERY",
    );
    const name = "persistent-provider-query-en-to-es.png";
    await page.screenshot({ path: resolve(directory, name), fullPage: true });
    results.push({
      state: "sanitized-product-query-locale-navigation",
      screenshot: name,
      sha256: createHash("sha256")
        .update(await readFile(resolve(directory, name)))
        .digest("hex"),
    });
    await page.close();
  }
  for (const product of ["akibusiness", "akiduermo", "akiconduzco"])
    for (const locale of ["en", "es"]) {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        extraHTTPHeaders: {
          "x-fixture-product": product,
          "x-fixture-theme": "light",
        },
      });
      activePage = page;
      await page.goto(`${origin}/${locale}/unknown`);
      await expect(page.locator("[data-boundary-product]")).toHaveAttribute(
        "data-boundary-product",
        product,
      );
      const productHome = {
        akibusiness: `https://akibusiness.com/?locale=${locale}`,
        akiduermo: `https://akiduermo.com/?lang=${locale}`,
        akiconduzco: `https://akicoches.com/?lang=${locale}`,
      }[product];
      await expect(
        page.getByRole("link", {
          name: locale === "es" ? "Volver al inicio" : "Back to the start",
          exact: true,
        }),
      ).toHaveAttribute("href", productHome);
      await expect(
        page.getByRole("link", { name: /Explore the map|Explorar el mapa/ }),
      ).toHaveCount(0);
      const name = `${product}-${locale}-standalone.png`;
      await page.screenshot({ path: resolve(directory, name), fullPage: true });
      results.push({
        product,
        locale,
        state: "product-home",
        screenshot: name,
        sha256: createHash("sha256")
          .update(await readFile(resolve(directory, name)))
          .digest("hex"),
      });
      await page.close();
    }
  expect(backendMethods.length).toBeGreaterThan(0);
  expect(backendMethods.every((method) => method === "GET")).toBe(true);
  const receipt = {
    syntheticAdministratorOnly: true,
    realAuthenticatedAdminOrRlsAcceptance: false,
    backendReadMethods: [...new Set(backendMethods)],
    nativeRootErrorRecovery: true,
    nativeAdminShellLoadingRetained: true,
    adminMenuHydrationChecks,
    timestamp: new Date().toISOString(),
    scope:
      "Actual production Next routing/reset/loading with copied real boundary files and public-context fixture layouts. No production routes, provider credentials or data. Full-app/host/native acceptance remains separate.",
    sourceHashes: hashes,
    browser: browser.version(),
    results,
  };
  await writeFile(
    resolve(directory, "results.json"),
    JSON.stringify(receipt, null, 2),
  );
  console.log(`${results.length} real Next fallback states passed`);
} catch (error) {
  if (activePage && !activePage.isClosed())
    await activePage
      .screenshot({
        path: resolve(directory, `failure-${Date.now()}.png`),
        fullPage: true,
      })
      .catch(() => {});
  await writeFile(
    resolve(directory, `failure-${Date.now()}.json`),
    JSON.stringify(
      {
        status: "failed",
        message: String(error.stack || error),
        sourceHashes: hashes,
        completed: results,
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  held.forEach((response) => response.end("closed"));
  recoveryHeld.forEach((response) => response.end("closed"));
  await browser?.close();
  if (server) {
    server.kill("SIGTERM");
    await new Promise((done) => server.once("exit", done));
  }
  await new Promise((done) => backend.close(done));
  logs.end();
  if (process.env.KEEP_BOUNDARY_FIXTURE !== "true")
    await rm(fixture, { recursive: true, force: true });
}
