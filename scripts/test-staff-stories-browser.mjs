// Actual Staff page/layout/AppShell, requireUser, workspaceReturnPath and canModerate.
// Disposable Next headers, identity/read adapters and intercepted HTTP only.
// This does NOT certify real Auth/RLS/Storage, Next middleware or physical Android.
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, relative, extname } from "node:path";
import { createHash } from "node:crypto";
const root = process.cwd(),
  out = resolve(
    process.env.STAFF_STORIES_OUTPUT || "test-results/staff-stories",
  );
mkdirSync(out, { recursive: true });
const inputs = new Map();
const track = (path) => {
  const p = resolve(path);
  inputs.set(p, createHash("sha256").update(readFileSync(p)).digest("hex"));
  return p;
};
const explicit = [
  "scripts/test-staff-stories-browser.mjs",
  "src/lib/auth.ts",
  "src/lib/roles.ts",
  "src/lib/workspace-return-path.ts",
  "src/app/[locale]/staff/layout.tsx",
  "src/app/[locale]/staff/moderation/page.tsx",
  "src/components/community/StoryModeration.tsx",
  "src/components/community/StoryModeration.module.css",
  "src/app/[locale]/moderation/actions.ts",
  "src/lib/supabase/server.ts",
  "src/lib/account-onboarding-server.ts",
];
explicit.forEach(track);
const entry = `import React from 'react';import{createRoot}from'react-dom/client';import Page from './src/app/[locale]/staff/moderation/page';import Layout from './src/app/[locale]/staff/layout';import{AppShell}from'./src/components/AppShell';import{ThemeManager}from'./src/components/ThemeModeControls';
const q=new URLSearchParams(location.search),locale=location.pathname.startsWith('/es/')?'es':'en',role=q.get('fixture_role')||'moderator';document.documentElement.lang=locale;document.documentElement.dataset.theme=q.get('theme')||'dark';window.__reads=[];window.__authReads=0;window.__actions=[];
(async()=>{try{const props={params:Promise.resolve({locale}),searchParams:Promise.resolve({queue:q.get('fixture_queue')||'stories'})};let content;if(q.get('target')==='layout'){content=await Layout({...props,children:<p>Guard probe only</p>})}else{content=await Page(props);if(q.get('target')!=='page')content=await Layout({...props,children:content})}createRoot(document.getElementById('root')).render(<><ThemeManager/><AppShell locale={locale} signedIn role={role}>{content}</AppShell></>);requestAnimationFrame(()=>requestAnimationFrame(()=>window.__ready=true));}catch(error){window.__denial={message:error.message,destination:error.destination||null};window.__ready=true;}})();`;
const identity = `import{config}from'@/lib/config';const q=()=>new URLSearchParams(location.search);export function createSupabaseServerClient(){return{auth:{getUser:async()=>{window.__authReads++;return{data:{user:q().get('fixture_role')==='guest'?null:{id:'00000000-0000-4000-8000-000000000001'}}}}},from(table){window.__reads.push(table);if(table!=='profiles'&&!(q().get('fixture_queue')==='venues'&&['venues','automatic_moderation_settings'].includes(table)))throw Error('Stories loaded unrelated '+table);const result={data:table==='profiles'?{app_role:q().get('fixture_role')||'moderator',terms_version:config.currentTermsVersion}:table==='automatic_moderation_settings'?{enabled:false}:[],count:0,error:null};const request={select(){return request},eq(){return request},order(){return request},range(){return request},maybeSingle:async()=>result,then:resolve=>Promise.resolve(result).then(resolve)};return request},rpc(){throw Error('Stories must not invoke unrelated queue RPC')}}}export const createSupabasePublicClient=createSupabaseServerClient;`;
const virtual = {
  identity,
  onboarding: 'export async function readOnboardingStatus(){return "ready"}',
  headers: `export async function headers(){return new Headers({'x-akipasa-workspace-next':location.pathname+'?queue=stories'})}export async function cookies(){return{getAll(){return[]}}}`,
  navigation: `export function usePathname(){return location.pathname}export function useSearchParams(){return new URLSearchParams(location.search)}export function useRouter(){return{push(){},refresh(){}}}export function notFound(){throw Error('not-found')}export function redirect(destination){throw Object.assign(Error('redirect'),{destination})}`,
  link: `import React from'react';export default function Link({children,prefetch,replace,scroll,...props}){return <a {...props}>{children}</a>}`,
  actions: `const forbidden=()=>{window.__actions.push('forbidden-server-action');throw Error('Forbidden fixture server action')};export const signOut=forbidden,moderateItem=forbidden,reviewRentalCompany=forbidden,setAutomaticModeration=forbidden;`,
};
const buildFixture = (schemaReady) =>
  build({
    stdin: { contents: entry, resolveDir: root, loader: "tsx" },
    bundle: true,
    write: false,
    outdir: out,
    metafile: true,
    platform: "browser",
    format: "iife",
    jsx: "automatic",
    define: {
      "process.env.NODE_ENV": '"production"',
      "process.env.AKIPASA_COMMUNITY_STORIES_SCHEMA_READY": JSON.stringify(
        String(schemaReady),
      ),
      "process.env": "{}",
    },
    plugins: [
      {
        name: "staff-story-disposable-boundaries",
        setup(b) {
          b.onResolve({ filter: /(?:^|\/)supabase\/(server|public)$/ }, () => ({
            path: "identity",
            namespace: "fixture",
          }));
          b.onResolve({ filter: /account-onboarding-server$/ }, () => ({
            path: "onboarding",
            namespace: "fixture",
          }));
          b.onResolve({ filter: /^next\/headers$/ }, () => ({
            path: "headers",
            namespace: "fixture",
          }));
          b.onResolve({ filter: /^next\/navigation$/ }, () => ({
            path: "navigation",
            namespace: "fixture",
          }));
          b.onResolve({ filter: /^next\/link$/ }, () => ({
            path: "link",
            namespace: "fixture",
          }));
          b.onResolve({ filter: /(?:^|\/)actions$/ }, () => ({
            path: "actions",
            namespace: "fixture",
          }));
          b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
            contents: virtual[a.path],
            loader: "jsx",
            resolveDir: root,
          }));
          b.onLoad({ filter: /\.module\.css$/, namespace: "file" }, (a) => ({
            contents: readFileSync(track(a.path), "utf8"),
            loader: "local-css",
          }));
          b.onLoad({ filter: /.*/, namespace: "file" }, (a) => {
            track(a.path);
            return null;
          });
        },
      },
    ],
  });
const bundle = await buildFixture(true);
const disabledBundle = await buildFixture(false);
const disabledJS = disabledBundle.outputFiles.find((f) =>
  f.path.endsWith(".js"),
).text;
const js = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text;
const globalFiles = [
  ...readFileSync(track("src/app/layout.tsx"), "utf8").matchAll(
    /import\s+["']([^"']+\.css)["'];/g,
  ),
].map((m) =>
  m[1].startsWith("@/")
    ? resolve("src", m[1].slice(2))
    : resolve("src/app", m[1]),
);
const css =
  (
    await postcss([tailwind()]).process(
      globalFiles.map((p) => readFileSync(track(p), "utf8")).join("\n"),
      { from: resolve("src/app/globals.css") },
    )
  ).css + (bundle.outputFiles.find((f) => f.path.endsWith(".css"))?.text || "");
writeFileSync(out + "/bundle.js", js);
writeFileSync(out + "/styles.css", css);
const server = createServer((req, res) => {
  const u = new URL(req.url, "http://local");
  if (u.pathname === "/bundle-disabled.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(disabledJS);
  } else if (u.pathname === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(js);
  } else if (u.pathname === "/styles.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else if (
    /^\/(brand|images|fonts)\/[a-zA-Z0-9_./-]+\.(svg|webp|png|woff2?)$/.test(
      u.pathname,
    ) &&
    !u.pathname.includes("..") &&
    existsSync(resolve("public", u.pathname.slice(1)))
  ) {
    res.setHeader(
      "Content-Type",
      u.pathname.endsWith(".svg")
        ? "image/svg+xml"
        : u.pathname.endsWith(".woff2")
          ? "font/woff2"
          : "image/" + extname(u.pathname).slice(1),
    );
    res.end(readFileSync(resolve("public", u.pathname.slice(1))));
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(
      `<html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><body><div id="root"></div><script src="${u.searchParams.get("fixture_schema_ready") === "false" ? "/bundle-disabled.js" : "/bundle.js"}"></script></body></html>`,
    );
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = "http://127.0.0.1:" + server.address().port;
let browser;
const results = [],
  guards = [],
  disabledGate = [],
  legacyNavigation = [];
const id = "00000000-0000-4000-8000-000000000041";
async function capture(page, name, state) {
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: `${out}/${name}-${state}-upper.png` });
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.screenshot({ path: `${out}/${name}-${state}-lower.png` });
}
async function contrastSamples(page) {
  return page
    .locator('[aria-labelledby="story-moderation-title"]')
    .evaluate((section) => {
      const rgba = (value) => {
        const v = value.match(/[\d.]+/g)?.map(Number);
        if (!v || v.length < 3) throw Error("Unsupported color " + value);
        return [...v.slice(0, 3), v[3] ?? 1];
      };
      const luminance = (color) =>
        color
          .map((v) => {
            const c = v / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      return [
        ...section.querySelectorAll(
          "header h2,header p,header span,article h3,article p,article label,article button",
        ),
      ]
        .filter((el) => el.textContent.trim() && !el.disabled)
        .map((el) => {
          const foreground = rgba(getComputedStyle(el).color);
          let background = [255, 255, 255];
          const chain = [];
          for (let p = el; p; p = p.parentElement) {
            chain.unshift(p);
            const c = rgba(getComputedStyle(p).backgroundColor);
            if (c[3] === 1) break;
          }
          for (const p of chain) {
            const c = rgba(getComputedStyle(p).backgroundColor);
            background = c
              .slice(0, 3)
              .map((v, i) => v * c[3] + background[i] * (1 - c[3]));
          }
          const painted = foreground
            .slice(0, 3)
            .map(
              (v, i) => v * foreground[3] + background[i] * (1 - foreground[3]),
            );
          const a = luminance(painted),
            b = luminance(background);
          return {
            text: el.textContent.trim().slice(0, 100),
            tag: el.tagName,
            foreground,
            background,
            contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
          };
        });
    });
}
async function decoded(page) {
  await page.waitForFunction(() => {
    const img = document.querySelector("article img");
    return img?.complete && img?.naturalWidth > 0;
  });
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : {}),
  });
  for (const schemaReady of [true, false])
    for (const locale of ["en", "es"])
      for (const role of ["consumer", "organiser", "owner", "guest"])
        for (const target of ["page", "layout"]) {
          const context = await browser.newContext({
              viewport: { width: 390, height: 900 },
            }),
            page = await context.newPage();
          let api = 0;
          await context.route("**/*", (route) => {
            const u = new URL(route.request().url());
            if (u.origin !== origin) return route.abort();
            if (u.pathname.startsWith("/api/")) {
              api++;
              return route.fulfill({ status: 403, json: { available: false } });
            }
            return route.continue();
          });
          await page.goto(
            `${origin}/${locale}/staff/moderation?queue=stories&fixture_role=${role}&target=${target}&fixture_schema_ready=${schemaReady}`,
            { waitUntil: "networkidle" },
          );
          await page.waitForFunction(() => window.__ready);
          const state = await page.evaluate(() => ({
            denial: window.__denial,
            reads: window.__reads,
            actions: window.__actions,
          }));
          if (!state.denial || api || state.actions.length)
            throw Error("Unauthorized fixture rendered/accessed Story queue");
          if (role === "guest") {
            const destination = new URL(state.denial.destination, origin);
            if (
              destination.searchParams.get("next") !==
              `/${locale}/staff/moderation?queue=stories`
            )
              throw Error("Stories auth return lost");
          } else if (state.denial.message !== "not-found")
            throw Error("Unexpected denial");
          if (
            role !== "guest" &&
            (state.reads.length < 2 ||
              state.reads.some((table) => table !== "profiles"))
          )
            throw Error("Role guard was bypassed by schema gate");
          guards.push({ locale, role, target, schemaReady, ...state, api });
          await context.close();
        }
  // Default-off schema readiness must withhold the new route after actual role
  // checks; legacy Staff layout remains usable without a Photos navigation item.
  // The Photos link belongs to the legacy moderation page, not StaffLayout.
  for (const schemaReady of [true, false])
    for (const locale of ["en", "es"])
      for (const role of ["moderator", "administrator"]) {
        const context = await browser.newContext({
            viewport: { width: 390, height: 900 },
          }),
          page = await context.newPage();
        let api = 0;
        await context.route("**/*", (route) => {
          const url = new URL(route.request().url());
          if (url.origin !== origin) return route.abort();
          if (url.pathname.startsWith("/api/")) {
            api++;
            return route.fulfill({ status: 403, json: { available: false } });
          }
          return route.continue();
        });
        await page.goto(
          `${origin}/${locale}/staff/moderation?queue=venues&fixture_queue=venues&fixture_role=${role}&fixture_schema_ready=${schemaReady}`,
          { waitUntil: "networkidle" },
        );
        await page.waitForFunction(() => window.__ready);
        const actual = await page.evaluate(() => ({
          denial: window.__denial || null,
          reads: window.__reads,
          actions: window.__actions,
          photos: document.querySelectorAll(
            'a[href$="/staff/moderation?queue=stories"]',
          ).length,
          story: document.querySelectorAll(
            '[aria-labelledby="story-moderation-title"]',
          ).length,
        }));
        if (
          actual.denial ||
          api ||
          actual.story ||
          actual.actions.length ||
          Boolean(actual.photos) !== schemaReady ||
          !actual.reads.includes("venues") ||
          !actual.reads.includes("automatic_moderation_settings")
        )
          throw Error("Legacy queue/schema gated link regression");
        legacyNavigation.push({ schemaReady, locale, role, api, ...actual });
        await context.close();
      }
  for (const locale of ["en", "es"])
    for (const role of ["moderator", "administrator"])
      for (const target of ["page", "layout"]) {
        const context = await browser.newContext({
          viewport: { width: 390, height: 900 },
        });
        const page = await context.newPage();
        let api = 0;
        await context.route("**/*", (route) => {
          const url = new URL(route.request().url());
          if (url.origin !== origin) return route.abort();
          if (url.pathname.startsWith("/api/")) {
            api++;
            return route.fulfill({ status: 403, json: { available: false } });
          }
          return route.continue();
        });
        await page.goto(
          `${origin}/${locale}/staff/moderation?queue=stories&fixture_role=${role}&target=${target}&fixture_schema_ready=false`,
          { waitUntil: "networkidle" },
        );
        await page.waitForFunction(() => window.__ready);
        const actual = await page.evaluate(() => ({
          denial: window.__denial || null,
          reads: window.__reads,
          actions: window.__actions,
          photos: document.querySelectorAll(
            'a[href$="/staff/moderation?queue=stories"]',
          ).length,
          story: document.querySelectorAll(
            '[aria-labelledby="story-moderation-title"]',
          ).length,
        }));
        if (
          api ||
          actual.actions.length ||
          actual.story ||
          actual.photos ||
          actual.reads.some((table) => table !== "profiles")
        )
          throw Error("Disabled schema leaked stories/API/unrelated data");
        if (target === "page" && actual.denial?.message !== "not-found")
          throw Error("Disabled Stories page did not404 after authorization");
        if (target === "layout" && actual.denial)
          throw Error("Disabled schema broke legacy Staff layout");
        disabledGate.push({
          locale,
          role,
          target,
          schemaReady: false,
          api,
          ...actual,
        });
        await context.close();
      }
  for (const role of ["moderator", "administrator"])
    for (const locale of ["en", "es"])
      for (const theme of ["dark", "light"])
        for (const width of [360, 390, 820, 1440]) {
          const context = await browser.newContext({
            viewport: { width, height: width === 820 ? 1180 : 900 },
            colorScheme: theme,
            reducedMotion: "reduce",
          });
          const page = await context.newPage();
          let state = "ready",
            removed = false;
          const decisions = [],
            external = [],
            errors = [],
            otherAPI = [];
          await context.route("**/*", async (route) => {
            const req = route.request(),
              u = new URL(req.url());
            if (u.origin !== origin) {
              external.push(u.origin);
              return route.abort();
            }
            if (u.pathname === `/api/community/stories/${id}/media`)
              return route.fulfill({
                contentType: "image/svg+xml",
                body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="800"><rect width="640" height="800" fill="#513020"/><text x="40" y="400" fill="white" font-size="30">Synthetic review only</text></svg>',
              });
            if (u.pathname === `/api/community/stories/${id}/moderate`) {
              decisions.push(req.postDataJSON());
              removed = true;
              return route.fulfill({ json: { available: true } });
            }
            if (u.pathname === "/api/community/stories/moderation") {
              if (state === "error")
                return route.fulfill({
                  status: 503,
                  json: { available: false },
                });
              const reported = u.searchParams.get("queue") === "reported";
              return route.fulfill({
                json: {
                  available: true,
                  stories: removed
                    ? []
                    : [
                        {
                          id,
                          citySlug: "malaga",
                          venueName: "Disposable composed Staff venue",
                          caption:
                            "Synthetic moderated content — not a public visitor story.",
                          kind: "venue",
                          status: reported ? "approved" : "pending",
                          createdAt: "2026-10-31T12:00:00Z",
                          expiresAt: "2026-11-01T12:00:00Z",
                          mediaUrl: `/api/community/stories/${id}/media`,
                          reportCount: reported ? 2 : 0,
                        },
                      ],
                },
              });
            }
            if (u.pathname.startsWith("/api/")) {
              otherAPI.push({ path: u.pathname, method: req.method() });
              return route.fulfill({ status: 404, json: { available: false } });
            }
            if (!["GET", "HEAD"].includes(req.method()))
              throw Error("Unexpected nonfixture mutation");
            return route.continue();
          });
          page.on("pageerror", (e) => errors.push(e.message));
          const name = `${role}-${locale}-${theme}-${width}`;
          await page.goto(
            `${origin}/${locale}/staff/moderation?queue=stories&fixture_role=${role}&theme=${theme}`,
            { waitUntil: "networkidle" },
          );
          await page.waitForFunction(() => window.__ready);
          if (await page.evaluate(() => !!window.__denial))
            throw Error("Allowed moderator denied");
          const approve = page.getByRole("button", {
            name:
              locale === "es" ? "Aprobar publicación" : "Approve publication",
          });
          await approve.waitFor();
          await decoded(page);
          await page.waitForFunction(
            (theme) =>
              document.documentElement.classList.contains(`theme-${theme}`) &&
              document.body.classList.contains(`theme-${theme}`),
            theme,
          );
          const initial = await page.evaluate(
            (theme) => ({
              reads: window.__reads,
              actions: window.__actions,
              theme: document.documentElement.dataset.theme,
              themeClass: document.documentElement.classList.contains(
                `theme-${theme}`,
              ),
              bodyTheme: document.body.dataset.theme,
              bodyThemeClass: document.body.classList.contains(
                `theme-${theme}`,
              ),
              overflow: document.documentElement.scrollWidth > innerWidth,
            }),
            theme,
          );
          if (
            initial.reads.some((t) => t !== "profiles") ||
            initial.actions.length ||
            initial.theme !== theme ||
            !initial.themeClass ||
            initial.bodyTheme !== theme ||
            !initial.bodyThemeClass ||
            initial.overflow
          )
            throw Error("Composition guard/theme/overflow failed " + name);
          if (width <= 820) {
            const menu = page.locator(".workspace-mobile-trigger");
            await menu.click();
            await page.locator(".workspace-drawer").waitFor();
            await page.keyboard.press("Escape");
            if (await page.locator(".workspace-drawer").count())
              throw Error("Menu Escape failed");
            if (!(await menu.evaluate((el) => el === document.activeElement)))
              throw Error("Menu focus not restored");
          }
          const contrasts = await contrastSamples(page);
          if (contrasts.some((sample) => sample.contrast < 4.5)) {
            await capture(page, name, "contrast-failure");
            writeFileSync(
              out + "/contrast-failure.json",
              JSON.stringify({ name, contrasts }, null, 2),
            );
            throw Error("Composed story text contrast below4.5 " + name);
          }
          await capture(page, name, "pending");
          await approve.scrollIntoViewIfNeeded();
          const hits = await approve.evaluate((el) => {
            const b = el.getBoundingClientRect();
            return [0.15, 0.5, 0.85].map((x) => {
              const hit = document.elementFromPoint(
                b.x + b.width * x,
                b.y + b.height / 2,
              );
              return !!hit && (hit === el || el.contains(hit));
            });
          });
          if (hits.some((h) => !h)) throw Error("Approval obscured " + name);
          await approve.click();
          await page
            .getByRole("alert")
            .filter({
              hasText: locale === "es" ? "Escribe un motivo" : "Enter a reason",
            })
            .waitFor();
          if (decisions.length) throw Error("Empty reason sent decision");
          await page
            .getByRole("textbox", {
              name:
                locale === "es"
                  ? "Motivo de la decisión (obligatorio)"
                  : "Decision reason (required)",
            })
            .fill("Synthetic staff content policy review");
          await approve.focus();
          await page.keyboard.press("Shift+Tab");
          await page.keyboard.press("Tab");
          if (!(await approve.evaluate((el) => el === document.activeElement)))
            throw Error("Native Tab approval failed");
          await page.keyboard.press("Enter");
          await page
            .getByRole("heading", {
              name:
                locale === "es"
                  ? "No hay historias pendientes"
                  : "No stories awaiting review",
            })
            .waitFor();
          await capture(page, name, "empty");
          removed = false;
          await page
            .getByRole("button", {
              name:
                locale === "es"
                  ? "Denuncias y retirada"
                  : "Reports and takedown",
            })
            .click();
          const remove = page.getByRole("button", {
            name: locale === "es" ? "Retirar publicación" : "Take down story",
          });
          await remove.waitFor();
          await decoded(page);
          await capture(page, name, "reported");
          await page
            .getByRole("textbox", {
              name:
                locale === "es"
                  ? "Motivo de la decisión (obligatorio)"
                  : "Decision reason (required)",
            })
            .fill("Synthetic reported content requires removal");
          await remove.click();
          await page
            .getByRole("heading", {
              name:
                locale === "es"
                  ? "No hay denuncias pendientes"
                  : "No reports awaiting review",
            })
            .waitFor();
          state = "error";
          await page
            .getByRole("button", {
              name: locale === "es" ? "Actualizar" : "Refresh",
              exact: true,
            })
            .click();
          const retry = page.getByRole("button", {
            name: locale === "es" ? "Reintentar" : "Retry",
            exact: true,
          });
          await retry.waitFor();
          await capture(page, name, "error");
          state = "ready";
          removed = false;
          await retry.click();
          await remove.waitFor();
          await decoded(page);
          if (
            decisions.length !== 2 ||
            decisions[0].decision !== "approve" ||
            decisions[1].decision !== "remove" ||
            errors.length ||
            external.length ||
            otherAPI.some((x) => x.method !== "GET")
          )
            throw Error(
              JSON.stringify({ name, decisions, errors, external, otherAPI }),
            );
          results.push({
            role,
            locale,
            theme,
            width,
            ...initial,
            hits,
            contrasts,
            decisions,
            nativeReasonGuard: true,
            nativeTabEnter: true,
            reportTakedown: true,
            retryRecovery: true,
            errors,
            external,
            otherAPI,
          });
          await context.close();
        }
  const changed = [...inputs]
    .filter(
      ([p, h]) =>
        createHash("sha256").update(readFileSync(p)).digest("hex") !== h,
    )
    .map(([p]) => relative(root, p));
  if (changed.length)
    throw Error("Source advanced during composed QA: " + changed.join(","));
  writeFileSync(
    out + "/results.json",
    JSON.stringify(
      {
        fixtureOnly: true,
        actualStaffPageLayoutAppShell: true,
        actualRequireUserAndCanModerate: true,
        actualNext: false,
        realAuthRLS: false,
        physicalAndroid: false,
        headerAdapterIsNotMiddlewareProof: true,
        sourceHashes: Object.fromEntries(
          [...inputs].map(([p, h]) => [relative(root, p), h]),
        ),
        fixtureSchemaReady: true,
        disabledGate,
        legacyNavigation,
        guards,
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS32 enabled composed contexts/32 role denials/8 disabled schema checks/8 legacy Photos navigation checks/256 upper-lower captures; native guarded decisions and recovery; synthetic only",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
