import { createHash } from "node:crypto";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";

// Actual page exports, WorkspaceShell, StudioTabs, review draft component and
// creator server actions. Only Next/Auth/database/media adapters are disposable.
// This is isolated UI/action-contract evidence, never live Auth/RLS acceptance.
// AppShell and its real navigation/dock are rendered; Next server runtime,
// OAuth, backend RLS and physical devices remain outside this isolated fixture.
const output = resolve("test-results/creator-routes");
mkdirSync(output, { recursive: true });
const adapter = resolve("tests/fixtures/creator-route-browser-data.mjs");
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';
import {AppShell} from './src/components/AppShell';
import Detail from './src/app/[locale]/community/creators/[slug]/page';
import Studio from './src/app/[locale]/community/creator/page';
import Directory from './src/app/[locale]/community/creators/page';
import './src/components/PasaCinematic.css';import './src/components/PasaSharedSurfaces.css';
import {resetFixture} from '${adapter}';
window.__creatorDocumentId=crypto.randomUUID();const root=createRoot(document.getElementById('root'));resetFixture();
window.__creatorNavigate=async href=>{const target=new URL(href,location.href);if(target.origin!==location.origin)throw new Error('External fixture navigation rejected');const existing=new URLSearchParams(location.search);for(const key of ['fixture','user'])if(existing.has(key)&&!target.searchParams.has(key))target.searchParams.set(key,existing.get(key));history.pushState({},'',target.pathname+target.search);await render();};
async function render(){window.__creatorReady=false;window.__creatorRedirect=null;window.__creatorMissing=false;window.__creatorError=null;const locale=location.pathname.startsWith('/es/')?'es':'en';document.documentElement.lang=locale;
try{if(location.pathname.endsWith('/auth')){window.__creatorRedirect=window.__creatorActionResults.at(-1)?.href||location.pathname+location.search;root.render(<p data-fixture-auth-handoff>Actual creator action requested authentication. Auth is outside this disposable route fixture.</p>);requestAnimationFrame(()=>requestAnimationFrame(()=>window.__creatorReady=true));return;}const directory=location.pathname.endsWith('/community/creators');const detail=location.pathname.includes('/creators/');const query=Object.fromEntries(new URLSearchParams(location.search));const props={params:Promise.resolve({locale,slug:'ana-fixture'}),searchParams:Promise.resolve(query)};const content=await (directory?Directory:detail?Detail:Studio)(props);root.render(<AppShell locale={locale} signedIn={query.user!=="guest"} role="consumer"><p className="fixture-notice">Disposable creator fixture · no real people, activity or database</p>{content}</AppShell>);}
catch(error){if(error.fixtureRedirect){window.__creatorRedirect=error.fixtureRedirect;root.render(<p data-fixture-redirect>{error.fixtureRedirect}</p>);}else if(error.fixtureNotFound){window.__creatorMissing=true;root.render(<p data-fixture-missing>Fixture observed actual notFound()</p>);}else{window.__creatorError=String(error.stack||error);console.error(error);}}
requestAnimationFrame(()=>requestAnimationFrame(()=>window.__creatorReady=true));}
window.addEventListener('popstate',render);render();`;
const actions = `import * as actual from '${resolve("src/app/[locale]/community/creator-actions.ts")}';
async function invoke(name,form){try{await actual[name](form);}catch(error){if(!error.fixtureRedirect)throw error;window.__creatorActionResults.push({name,href:error.fixtureRedirect});const target=new URL(error.fixtureRedirect,location.origin);const current=new URLSearchParams(location.search);for(const key of ['fixture','user','theme','write'])if(current.has(key))target.searchParams.set(key,current.get(key));sessionStorage.setItem('creator-fixture-redirect-trace',JSON.stringify({reads:window.__creatorReads,writes:window.__creatorWrites,auth:window.__creatorAuth,actions:window.__creatorActionResults}));window.__creatorReady=false;location.assign(target.href);await new Promise(()=>{});}}
export const submitCreatorReview=form=>invoke('submitCreatorReview',form);
export const saveCreatorProfile=form=>invoke('saveCreatorProfile',form);
export const requestCreatorVerification=form=>invoke('requestCreatorVerification',form);`;
const link = `import React from 'react';export default function Link({href,children,prefetch,replace,scroll,onClick,...props}){return <a {...props} href={href} onClick={event=>{onClick?.(event);if(!event.defaultPrevented&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&event.button===0){event.preventDefault();window.__creatorOutbound=href;}}}>{children}</a>}`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  outdir: resolve(output, "bundle"),
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [
    {
      name: "disposable-creator-route-adapters",
      setup(builder) {
        builder.onResolve(
          { filter: /^@\/lib\/(?:auth|supabase\/public)$/ },
          () => ({ path: adapter }),
        );
        builder.onResolve({ filter: /creator-actions(?:\.ts)?$/ }, (args) =>
          args.importer === "creator-actions-wrapper"
            ? undefined
            : { path: "creator-actions-wrapper", namespace: "creator-fixture" },
        );
        builder.onResolve({ filter: /account\/actions$/ }, () => ({
          path: "uploads",
          namespace: "creator-fixture",
        }));
        builder.onResolve(
          { filter: /^next\/(?:link|image|navigation|cache)$/ },
          (args) => ({ path: args.path, namespace: "creator-fixture" }),
        );
        builder.onResolve({ filter: /(?:^|\/)auth\/actions$/ }, () => ({
          path: "shell-actions",
          namespace: "creator-fixture",
        }));
        builder.onLoad(
          { filter: /.*/, namespace: "creator-fixture" },
          (args) => ({
            contents:
              args.path === "creator-actions-wrapper"
                ? actions
                : args.path === "shell-actions"
                  ? "export async function signOut(){throw new Error('Sign-out is outside creator fixture scope')}"
                  : args.path === "uploads"
                    ? "export async function uploadProfileMedia(){throw new Error('Upload is outside isolated creator fixture scope')}"
                    : args.path === "next/link"
                      ? link
                      : args.path === "next/image"
                        ? "import React from 'react';export default function Image({fill,priority,sizes,unoptimized,...props}){return <img {...props}/>}"
                        : args.path === "next/cache"
                          ? "export const unstable_cache=fn=>fn"
                          : "export function useRouter(){return {refresh(){},push(href){window.__creatorOutbound=href},replace(href){window.__creatorOutbound=href},prefetch(){}}}export function usePathname(){return location.pathname}export function useSearchParams(){return new URLSearchParams(location.search)}export function notFound(){throw Object.assign(new Error('Fixture not-found'),{fixtureNotFound:true})}export function redirect(href){throw Object.assign(new Error('Fixture redirect'),{fixtureRedirect:href})}",
            loader: "jsx",
            resolveDir: process.cwd(),
          }),
        );
      },
    },
  ],
});
const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const globalFiles = Array.from(
  rootLayout.matchAll(/import\s+["'](\.\/[^"']+\.css)["'];/g),
  (match) => resolve("src/app", match[1]),
);
const styles = (
  await postcss([tailwind()]).process(
    globalFiles.map((file) => readFileSync(file, "utf8")).join("\n") +
      "\n" +
      bundle.outputFiles
        .filter((file) => file.path.endsWith(".css"))
        .map((file) => file.text)
        .join("\n"),
    { from: resolve("src/app/globals.css") },
  )
).css;
const script = bundle.outputFiles.find((file) =>
  file.path.endsWith(".js"),
).text;
writeFileSync(resolve(output, "bundle.js"), script);
writeFileSync(resolve(output, "styles.css"), styles);
if (process.argv.includes("--build-only")) {
  console.log(
    "Creator routes fixture compiled: actual detail/studio and actions",
  );
  process.exit(0);
}
const sourceFiles = [
  "scripts/test-creator-routes-browser.mjs",
  "tests/fixtures/creator-route-browser-data.mjs",
  "src/app/[locale]/community/creators/page.tsx",
  "src/app/[locale]/community/creators/creator-public.module.css",
  "src/app/[locale]/community/creator/page.tsx",
  "src/app/[locale]/community/creator/creator.module.css",
  "src/app/[locale]/community/creator-actions.ts",
  "src/app/[locale]/community/creators/[slug]/page.tsx",
  "src/components/community/CreatorProfilePage.tsx",
  "src/components/community/CreatorDirectoryPage.tsx",
  "src/components/community/ContributionDraftForm.tsx",
  "src/components/community/StudioTabs.tsx",
  "src/components/community/creators.css",
  "src/components/WorkspaceShell.tsx",
  "src/components/AppShell.tsx",
  "src/components/PasaBottomDock.tsx",
  "src/components/PasaCinematic.css",
  "src/components/PasaSharedSurfaces.css",
  ...globalFiles,
];
const sourceHashes = Object.fromEntries(
  sourceFiles.map((file) => [
    file,
    createHash("sha256").update(readFileSync(file)).digest("hex"),
  ]),
);

const server = createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (url.pathname === "/bundle.js") {
    response.setHeader("Content-Type", "text/javascript");
    response.end(script);
  } else if (url.pathname === "/styles.css") {
    response.setHeader("Content-Type", "text/css");
    response.end(styles);
  } else if (url.pathname === "/fixture.svg") {
    response.setHeader("Content-Type", "image/svg+xml");
    response.end(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="#25201b"/><circle cx="400" cy="180" r="100" fill="#fb7624"/><text x="80" y="400" fill="white" font-size="40">Synthetic test illustration</text></svg>',
    );
  } else if (
    /^\/(?:brand|images)\/[a-z0-9/-]+\.(svg|png|webp)$/.test(url.pathname) &&
    existsSync(resolve("public", url.pathname.slice(1)))
  ) {
    response.setHeader(
      "Content-Type",
      extname(url.pathname) === ".svg"
        ? "image/svg+xml"
        : "image/" + extname(url.pathname).slice(1),
    );
    response.end(readFileSync(resolve("public", url.pathname.slice(1))));
  } else {
    response.setHeader("Content-Type", "text/html");
    response.end(
      `<!doctype html><html data-theme="${url.searchParams.get("theme") === "light" ? "light" : "dark"}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body data-product="akipasa"><div id="root"></div><script src="/bundle.js"></script></body></html>`,
    );
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const cases = [],
  failures = [],
  external = [];
let browser;
const ownerId = "10000000-0000-4000-8000-000000000001",
  otherId = "10000000-0000-4000-8000-000000000002";
const draftKey = `akipasa:creator-review:${ownerId}`;
async function ready(page) {
  await page.waitForFunction(
    () => window.__creatorReady || window.__creatorError,
  );
  expect(await page.evaluate(() => window.__creatorError)).toBeNull();
}
async function submitAndWaitForNewDocument(page, button) {
  const previous = await page.evaluate(() => window.__creatorDocumentId);
  expect(previous).toBeTruthy();
  await button.click();
  // The adapter records its redirect before location.assign. Neither the old
  // ready flag nor its last-action record proves the destination has rendered.
  await page.waitForFunction(
    (id) =>
      Boolean(window.__creatorDocumentId) && window.__creatorDocumentId !== id,
    previous,
  );
  await ready(page);
}
async function capture(page, name) {
  await page.screenshot({
    path: resolve(output, name + ".png"),
    fullPage: true,
  });
  return name + ".png";
}
async function geometry(page) {
  const state = await page.evaluate(() => ({
    width: innerWidth,
    document: document.documentElement.scrollWidth,
    unlabeled: [
      ...document.querySelectorAll(
        'input:not([type="hidden"]),textarea,select',
      ),
    ].filter(
      (el) =>
        el.getClientRects().length &&
        !el.closest("label") &&
        !el.getAttribute("aria-label") &&
        !(el.id && document.querySelector(`label[for="${el.id}"]`)),
    ).length,
    failedImages: [...document.images]
      .filter(
        (el) =>
          el.getClientRects().length && (!el.complete || !el.naturalWidth),
      )
      .map((el) => el.getAttribute("src")),
  }));
  const venueContrast = await page
    .locator(".creator-event-venue")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const card = element.closest(".creator-event-grid > a");
        if (!card) throw new Error("Venue label has no containing event card");
        const foreground = getComputedStyle(element).color;
        const cardStyle = getComputedStyle(card);
        const background = cardStyle.backgroundColor;
        const parse = (value) => {
          if (!/^rgba?\(/.test(value))
            throw new Error("Unsupported computed contrast colour: " + value);
          const parts = value.match(/[\d.]+/g).map(Number);
          return [...parts.slice(0, 3), parts[3] ?? 1];
        };
        const fg = parse(foreground),
          bg = parse(background);
        // These card surfaces are solid; do not silently substitute a background
        // when future image/transparency changes make this comparison invalid.
        if (bg[3] !== 1 || cardStyle.backgroundImage !== "none")
          throw new Error(
            "Venue card no longer has an opaque solid contrast background",
          );
        const rendered = fg
          .slice(0, 3)
          .map((channel, index) => channel * fg[3] + bg[index] * (1 - fg[3]));
        const luminance = (channels) =>
          channels
            .map((value) => {
              const srgb = value / 255;
              return srgb <= 0.04045
                ? srgb / 12.92
                : ((srgb + 0.055) / 1.055) ** 2.4;
            })
            .reduce(
              (sum, value, index) =>
                sum + value * [0.2126, 0.7152, 0.0722][index],
              0,
            );
        const first = luminance(rendered),
          second = luminance(bg.slice(0, 3));
        return {
          foreground,
          background,
          ratio:
            (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05),
        };
      }),
    );
  for (const sample of venueContrast)
    expect(sample.ratio, JSON.stringify(sample)).toBeGreaterThanOrEqual(4.5);
  state.venueContrast = venueContrast;
  expect(state.document).toBeLessThanOrEqual(state.width + 1);
  expect(state.unlabeled).toBe(0);
  expect(state.failedImages).toEqual([]);
  return state;
}
async function run(page, { route, fixture, locale, width, theme, user }) {
  const base = `/${locale}/community/${route === "detail" ? "creators/ana-fixture" : route === "directory" ? "creators" : "creator"}`;
  const query = new URLSearchParams({
    fixture,
    theme,
    ...(user ? { user } : {}),
    ...(route === "directory"
      ? {
          q: "Synthetic",
          locality: "Fixture area",
          ...(fixture === "empty" ? { category: "no-matches" } : {}),
        }
      : {}),
  });
  await page.goto(origin + base + "?" + query);
  await ready(page);
  const name = `${locale}-${theme}-${width}-${route}-${fixture}${user ? "-" + user : ""}`;
  if (user === "guest" && route === "studio") {
    const redirect = await page.evaluate(() => window.__creatorRedirect);
    expect(new URL(redirect, origin).pathname).toBe(`/${locale}/auth`);
    expect(new URL(redirect, origin).searchParams.get("next")).toBe(
      `/${locale}/community/creator`,
    );
    expect(await page.locator("form").count()).toBe(0);
    return { name, redirect, screenshot: await capture(page, name) };
  }
  if (fixture === "missing") {
    expect(await page.evaluate(() => window.__creatorMissing)).toBe(true);
    return { name, screenshot: await capture(page, name) };
  }
  await expect(
    page.locator('.app-content[data-pasa-surface="creators"]'),
  ).toHaveCount(1);
  if (width <= 850) {
    await expect(page.locator(".pasa-dock")).toHaveCount(1);
    await expect(page.locator(".pasa-dock")).toBeVisible();
  }
  const errors = page.getByRole("alert");
  if (route === "directory") {
    if (fixture === "profile-error") {
      await expect(errors).toContainText(
        locale === "es"
          ? "No se pudo cargar el directorio"
          : "directory could not be loaded",
      );
      const retry = page.getByRole("link", {
        name: locale === "es" ? "Reintentar" : "Retry",
        exact: true,
      });
      const href = new URL(await retry.getAttribute("href"), origin);
      expect(href.pathname).toBe(base);
      expect(href.searchParams.get("q")).toBe("Synthetic");
      expect(href.searchParams.get("locality")).toBe("Fixture area");
      await expect(page.locator(".creator-card")).toHaveCount(0);
    } else {
      await expect(page.locator('.creator-search input[name="q"]')).toHaveValue(
        "Synthetic",
      );
      await expect(
        page.locator('.creator-search input[name="locality"]'),
      ).toHaveValue("Fixture area");
      if (fixture === "empty") {
        await expect(page.locator(".creator-empty")).toBeVisible();
        await expect(
          page.locator(".creator-card-grid .creator-card"),
        ).toHaveCount(0);
        await expect(
          page.locator('.creator-search input[name="category"]'),
        ).toHaveValue("no-matches");
      } else {
        await expect(
          page.locator(".creator-card-grid .creator-card"),
        ).toHaveCount(1);
        await expect(
          page.locator(".creator-card-grid .creator-card"),
        ).toHaveAttribute("href", `/${locale}/community/creators/ana-fixture`);
        for (const link of await page
          .locator(".creator-category-nav a")
          .all()) {
          const href = new URL(await link.getAttribute("href"), origin);
          expect(href.searchParams.get("q")).toBe("Synthetic");
          expect(href.searchParams.get("locality")).toBe("Fixture area");
        }
      }
    }
    expect(await page.evaluate(() => window.__creatorWrites)).toEqual([]);
    const reads = await page.evaluate(() =>
      window.__creatorReads.filter((read) => read.table === "creator_profiles"),
    );
    expect(reads.length).toBeGreaterThan(0);
    for (const read of reads) {
      expect(read.publicRead).toBe(true);
      expect(read.filters).toContainEqual(["state", "published"]);
    }
  } else if (route === "detail") {
    if (fixture === "profile-error") {
      await expect(errors).toContainText(
        locale === "es" ? "No se pudo cargar" : "could not be loaded",
      );
      await expect(
        page.getByRole("link", {
          name: locale === "es" ? "Reintentar" : "Retry",
          exact: true,
        }),
      ).toHaveAttribute("href", base);
      await expect(page.locator(".creator-profile")).toHaveCount(0);
    } else {
      await expect(
        page.getByRole("heading", {
          name: "Synthetic creator Ana",
          exact: true,
        }),
      ).toBeVisible();
      const summary = page.locator(".creator-faq-list summary").first();
      await summary.focus();
      await page.keyboard.press("Enter");
      await expect(
        page.locator(".creator-faq-list details").first(),
      ).toHaveAttribute("open", "");
      if (fixture === "empty") {
        await expect(page.locator(".creator-events-empty")).toContainText(
          locale === "es" ? "No hay próximos" : "No upcoming",
        );
        await expect(page.locator(".creator-event-grid")).toHaveCount(0);
      } else {
        await expect(
          page.locator(".creator-event-grid a").first(),
        ).toHaveAttribute("href", `/${locale}/events/synthetic-event`);
      }
      const review = page.locator(".creator-review-form");
      await review.locator("summary").focus();
      await page.keyboard.press("Enter");
      await expect(review).toHaveAttribute("open", "");
      const body = page.locator('textarea[name="body"]');
      await body.fill(
        "Synthetic private review draft for browser-only testing.",
      );
      await page.locator('select[name="rating"]').selectOption("4");
      if (user === "guest") {
        await submitAndWaitForNewDocument(
          page,
          page.getByRole("button", {
            name: locale === "es" ? "Enviar valoración" : "Submit review",
            exact: true,
          }),
        );
        const expected = `/${locale}/community/creators/ana-fixture?review=draft`;
        await expect
          .poll(() => page.evaluate(() => window.__creatorRedirect))
          .toBe(`/${locale}/auth?${new URLSearchParams({ next: expected })}`);
        expect(await page.evaluate(() => window.__creatorWrites.length)).toBe(
          0,
        );
        const stored = await page.evaluate(
          (key) => JSON.parse(sessionStorage.getItem(key)),
          draftKey,
        );
        expect(stored.body).toBe(
          "Synthetic private review draft for browser-only testing.",
        );
        await page.goto(
          origin +
            base +
            "?" +
            new URLSearchParams({
              fixture: "ready",
              user: "owner",
              theme,
              review: "draft",
            }),
        );
        await ready(page);
        await expect(body).toHaveValue(
          "Synthetic private review draft for browser-only testing.",
        );
        await expect(review).toHaveAttribute("open", "");
        return {
          name,
          safeAuthReturn: expected,
          ...(await geometry(page)),
          screenshot: await capture(page, name),
        };
      }
      await page.evaluate(() => {
        const q = new URLSearchParams(location.search);
        q.set("write", "error");
        history.replaceState({}, "", location.pathname + "?" + q);
      });
      await submitAndWaitForNewDocument(
        page,
        page.getByRole("button", {
          name: locale === "es" ? "Enviar valoración" : "Submit review",
          exact: true,
        }),
      );
      await expect
        .poll(() =>
          page.evaluate(() => window.__creatorActionResults?.at(-1)?.href),
        )
        .toBe(`/${locale}/community/creators/ana-fixture?review=unavailable`);
      await ready(page);
      await expect(body).toHaveValue(
        "Synthetic private review draft for browser-only testing.",
      );
      const saved = await page.evaluate(
        (key) => JSON.parse(sessionStorage.getItem(key)),
        draftKey,
      );
      expect(saved.body).toBe(
        "Synthetic private review draft for browser-only testing.",
      );
      expect(new URL(page.url()).searchParams.has("body")).toBe(false);
      await expect(page.getByRole("status")).toContainText(
        locale === "es" ? "Hemos restaurado" : "We restored",
      );
      await page.evaluate(
        (mode) =>
          window.__creatorNavigate(
            location.pathname + "?" + new URLSearchParams({ fixture: mode }),
          ),
        fixture,
      );
      await ready(page);
      expect(
        await page.evaluate((key) => sessionStorage.getItem(key), draftKey),
      ).toBeNull();
    }
  } else {
    if (
      ["profile-error", "categories-error", "selected-error"].includes(fixture)
    ) {
      await expect(errors).toContainText(
        locale === "es" ? "perfil completo" : "complete profile",
      );
      await expect(
        page.getByRole("button", {
          name: locale === "es" ? "Guardar perfil" : "Save profile",
          exact: true,
        }),
      ).toHaveCount(0);
    } else {
      const profileTab = page.getByRole("tab", {
        name: locale === "es" ? "Perfil" : "Profile",
        exact: true,
      });
      await expect(profileTab).toHaveAttribute("aria-selected", "true");
      await profileTab.focus();
      await page.keyboard.press("ArrowRight");
      await expect(
        page.getByRole("tab", {
          name: locale === "es" ? "Imágenes" : "Images",
          exact: true,
        }),
      ).toBeFocused();
      await page.keyboard.press("End");
      const eventsTab = page.getByRole("tab", {
        name: locale === "es" ? "Eventos" : "Events",
        exact: true,
      });
      await expect(eventsTab).toBeFocused();
      await expect(eventsTab).toHaveAttribute("aria-selected", "true");
      if (fixture === "empty")
        await expect(
          page.locator(".creator-event-manager .empty-state"),
        ).toContainText(
          locale === "es" ? "Aun no has creado" : "You have not created",
        );
      else if (fixture === "events-error") {
        await expect(
          page.locator('.creator-event-manager [role="alert"]'),
        ).toContainText(
          locale === "es" ? "No se pudo cargar" : "could not be loaded",
        );
        await expect(
          page.locator(".creator-event-manager .empty-state"),
        ).toHaveCount(0);
      } else
        await expect(
          page.locator(".creator-event-manager .managed-row").first(),
        ).toHaveAttribute("href", `/${locale}/events/synthetic-event`);
      await page.keyboard.press("Home");
      await expect(profileTab).toBeFocused();
      if (fixture === "eligibility-error")
        await expect(
          page.getByRole("heading", {
            name:
              locale === "es"
                ? "No se pudo comprobar la verificación"
                : "Verification eligibility could not be checked",
            exact: true,
          }),
        ).toBeVisible();
      if (
        fixture === "session-expired-save" ||
        fixture === "session-expired-verify"
      ) {
        await page.evaluate(() => {
          const q = new URLSearchParams(location.search);
          q.set("user", "guest");
          history.replaceState({}, "", location.pathname + "?" + q);
        });
        const name =
          fixture === "session-expired-save"
            ? locale === "es"
              ? "Guardar perfil"
              : "Save profile"
            : locale === "es"
              ? "Enviar solicitud"
              : "Submit request";
        const button = page.getByRole("button", { name, exact: true });
        await expect(button).toBeEnabled();
        await submitAndWaitForNewDocument(page, button);
        const expected = `/${locale}/auth?${new URLSearchParams({ next: `/${locale}/community/creator` })}`;
        await expect
          .poll(() => page.evaluate(() => window.__creatorRedirect))
          .toBe(expected);
        expect(await page.evaluate(() => window.__creatorWrites)).toEqual([]);
      }
      if (fixture === "ready") {
        await expect(page.locator('input[name="displayName"]')).toHaveValue(
          user === "other"
            ? "Second synthetic creator"
            : "Synthetic creator Ana",
        );
        await page
          .locator("details.studio-optional")
          .filter({ has: page.locator('input[name="headlineEn"]') })
          .locator("summary")
          .focus();
        await page.keyboard.press("Enter");
        await expect(page.locator('input[name="headlineEn"]')).toBeVisible();
        await page.evaluate(() => {
          const f = document.querySelector("#profile");
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = "profile_id";
          input.value = "99999999-9999-4999-8999-999999999999";
          f.append(input);
        });
        await submitAndWaitForNewDocument(
          page,
          page.getByRole("button", {
            name: locale === "es" ? "Guardar perfil" : "Save profile",
            exact: true,
          }),
        );
        await expect
          .poll(() =>
            page.evaluate(() => window.__creatorActionResults?.at(-1)?.href),
          )
          .toBe(`/${locale}/community/creator?updated=1`);
        await ready(page);
        const writes = await page.evaluate(() => window.__creatorWrites);
        const own = user === "other" ? otherId : ownerId;
        expect(
          writes.find(
            (w) => w.table === "creator_profiles" && w.operation === "upsert",
          ).data.profile_id,
        ).toBe(own);
        expect(
          writes.find((w) => w.table === "profiles" && w.operation === "update")
            .filters,
        ).toEqual([["id", own]]);
        expect(
          writes.find(
            (w) => w.table === "creator_categories" && w.operation === "delete",
          ).filters,
        ).toEqual([["creator_profile_id", own]]);
      }
      const reads = await page.evaluate(() =>
        window.__creatorReads.filter(
          (r) => r.operation === "select" && !r.publicRead,
        ),
      );
      const own = user === "other" ? otherId : ownerId;
      for (const [table, column] of [
        ["creator_profiles", "profile_id"],
        ["creator_categories", "creator_profile_id"],
        ["events", "creator_profile_id"],
        ["event_submissions", "submitter_id"],
      ]) {
        const relevant = reads.filter((r) => r.table === table);
        expect(relevant.length, table + " observed read").toBeGreaterThan(0);
        expect(
          relevant.every((r) =>
            r.filters.some(([key, id]) => key === column && id === own),
          ),
          table + " caller scope",
        ).toBe(true);
      }
    }
  }
  expect(await page.locator("body").innerText()).not.toContain(
    "Private synthetic",
  );
  const state = await geometry(page);
  if (route === "detail" && fixture === "ready")
    expect(state.venueContrast.length, "rendered venue labels").toBeGreaterThan(
      0,
    );
  return { name, ...state, screenshot: await capture(page, name) };
}
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
          colorScheme: theme,
          reducedMotion: "reduce",
          serviceWorkers: "block",
        });
        await context.route("**/*", (route) => {
          const request = route.request();
          if (new URL(request.url()).origin === origin) return route.continue();
          external.push({
            origin: new URL(request.url()).origin,
            path: new URL(request.url()).pathname,
          });
          return route.abort();
        });
        const page = await context.newPage();
        const pageErrors = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        const matrix = [
          ["directory", "ready"],
          ["directory", "empty"],
          ["directory", "profile-error"],
          ["detail", "ready"],
          ["detail", "empty"],
          ["detail", "profile-error"],
          ["studio", "ready"],
          ["studio", "empty"],
          ["studio", "profile-error"],
          ["studio", "events-error"],
          ["studio", "eligibility-error"],
        ];
        if (width === 360 && theme === "dark")
          matrix.push(
            ["detail", "missing"],
            ["studio", "categories-error"],
            ["studio", "selected-error"],
            ["studio", "ready", "guest"],
            ["studio", "ready", "other"],
            ["detail", "ready", "guest"],
            ["studio", "session-expired-save"],
            ["studio", "session-expired-verify"],
          );
        for (const [route, fixture, user] of matrix) {
          const args = { route, fixture, locale, width, theme, user };
          try {
            const result = await run(page, args);
            expect(pageErrors).toEqual([]);
            cases.push({ ...args, ...result, pass: true });
          } catch (error) {
            const screenshot = await capture(
              page,
              `${locale}-${theme}-${width}-${route}-${fixture}-failure`,
            ).catch(() => null);
            failures.push({
              ...args,
              error: String(error.stack || error),
              screenshot,
              pageErrors: [...pageErrors],
            });
            console.error(
              `FAIL ${locale}/${theme}/${width}/${route}/${fixture}: ${error.message}`,
            );
            pageErrors.length = 0;
          }
        }
        await context.close();
      }
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
  const currentHashes = Object.fromEntries(
    sourceFiles.map((file) => [
      file,
      createHash("sha256").update(readFileSync(file)).digest("hex"),
    ]),
  );
  const sourceDrift = sourceFiles.filter(
    (file) => currentHashes[file] !== sourceHashes[file],
  );
  if (sourceDrift.length)
    failures.push({ kind: "source-drift-during-run", files: sourceDrift });
  writeFileSync(
    resolve(output, "evidence.json"),
    JSON.stringify(
      {
        observedAt: new Date().toISOString(),
        fixtureOnly: true,
        actualAsyncPageExports: true,
        actualCreatorActions: true,
        authDatabaseAndNextAdapters: true,
        productionAuthRLS: false,
        physicalAndroid: false,
        integratedAppShell: true,
        actualNextServer: false,
        accepted: false,
        sourceHashes,
        cases,
        failures,
        external,
      },
      null,
      2,
    ),
  );
}
console.log(
  `Creator routes: ${cases.length} passed, ${failures.length} failed; disposable browser/action fixtures only.`,
);
if (failures.length || external.length) process.exitCode = 1;
