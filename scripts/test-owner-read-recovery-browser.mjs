// Disposable actual Owner page/AppShell UI acceptance only. Source actions throw;
// all external requests and non-GET/HEAD requests are rejected. This does not
// prove real Owner authorization, hosted RLS, private storage or physical Android.
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, extname, relative, isAbsolute } from "node:path";
import { createHash } from "node:crypto";
const root = process.cwd();
const out = resolve(root, "test-results/owner-read-recovery");
mkdirSync(out, { recursive: true });
// Explicit authority files are evidence inputs even where the browser adapters
// deliberately replace them. A mocked owner identity is never RLS/Auth proof.
const explicitFiles = [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "src/app/layout.tsx",
  "src/lib/owner-console.ts",
  "src/app/[locale]/owner/actions.ts",
  "src/app/[locale]/owner/page.tsx",
  "src/app/[locale]/owner/owner.css",
  "src/components/owner/OwnerAppearanceForm.tsx",
  "src/components/owner/OwnerToolboxLauncher.tsx",
];
const initialHashes = {};
const diskInputs = new Set();
const inputKey = (path) => relative(root, path).replaceAll("\\", "/");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
function trackFile(path) {
  const absolute = resolve(root, path);
  const value = sha256(readFileSync(absolute));
  const key = inputKey(absolute);
  if (initialHashes[key] && initialHashes[key] !== value)
    throw Error("Owner QA input changed during compilation: " + key);
  initialHashes[key] = value;
  diskInputs.add(absolute);
  return absolute;
}
const globalFiles = [
  ...readFileSync("src/app/layout.tsx", "utf8").matchAll(
    /import\s+["']([^"']+\.css)["'];/g,
  ),
].map((match) =>
  match[1].startsWith("@/")
    ? resolve(root, "src", match[1].slice(2))
    : resolve(root, "src/app", match[1]),
);
for (const file of [...explicitFiles, ...globalFiles]) trackFile(file);

const auth = `
const id = "00000000-0000-4000-8000-000000000001";
export const defaultOwnerPreferences = {
  background: "aurora",
  accent: "teal",
  motion: true,
  glass: true,
  backgroundImagePath: null,
  backgroundImageUrl: null,
};
export function preferences() {
  return new URLSearchParams(location.search).get("scenario") === "photo"
    ? {
        background: "midnight",
        accent: "violet",
        motion: false,
        glass: false,
        backgroundImagePath: id + "/00000000-0000-4000-8000-000000000002.webp",
        backgroundImageUrl:
          location.origin + "/fixture/selected.webp?token=synthetic-only",
      }
    : defaultOwnerPreferences;
}
const scenario = () => new URLSearchParams(location.search).get("scenario");
const result = (table, head) => {
  window.__ownerReads = window.__ownerReads || [];
  window.__ownerReads.push({ table, head, scenario: scenario() });
  if (
    scenario() === "unavailable" ||
    (scenario() === "preferences-unavailable" &&
      table === "owner_console_preferences") ||
    (scenario() === "agents-unavailable" && table === "ai_agents") ||
    (scenario() === "counts-unavailable" && head) ||
    (scenario() === "activity-unavailable" && table === "ai_activity_log")
  )
    return {
      data: null,
      count: null,
      error: {
        code: "FIXTURE_UNAVAILABLE",
        message: "Disposable read unavailable",
      },
    };
  if (scenario() === "empty")
    return {
      data: table === "owner_console_preferences" ? null : [],
      count: head ? 0 : null,
      error: null,
    };
  return {
    data:
      table === "owner_console_preferences"
        ? preferences().backgroundImagePath
          ? {
              background: preferences().background,
              accent: preferences().accent,
              motion: false,
              glass: false,
              background_image_path: preferences().backgroundImagePath,
            }
          : null
        : table === "ai_agents"
          ? [
              {
                id: "00000000-0000-4000-8000-000000000010",
                agent_key: "synthetic_agent",
                display_name: "Synthetic review agent",
                status: "working",
              },
              {
                id: "00000000-0000-4000-8000-000000000011",
                agent_key: "synthetic_retry",
                display_name: "Synthetic retry agent",
                status: "failed",
              },
            ]
          : table === "ai_activity_log"
            ? [
                {
                  id: "00000000-0000-4000-8000-000000000012",
                  event_type: "fixture_review",
                  level: "info",
                  message: "Synthetic interface review — no live activity",
                  created_at: "2026-10-30T12:00:00Z",
                },
              ]
            : [],
    count: head ? 2 : 0,
    error: null,
  };
};
const supabase = {
  from(table) {
    let head = false;
    const q = {
      select(a, b) {
        head = b?.head || false;
        return q;
      },
      eq() {
        return q;
      },
      in() {
        return q;
      },
      order() {
        return q;
      },
      limit() {
        return q;
      },
      maybeSingle: async () => result(table, head),
      then: (r) => Promise.resolve(result(table, head)).then(r),
    };
    return q;
  },
  storage: {
    from(bucket) {
      return {
        list: async (uid) =>
          ["unavailable", "storage-unavailable"].includes(scenario())
            ? { data: null, error: { code: "FIXTURE_STORAGE_UNAVAILABLE" } }
            : {
                data: preferences().backgroundImagePath
                  ? [
                      { name: "00000000-0000-4000-8000-000000000002.webp" },
                      { name: "00000000-0000-4000-8000-000000000003.webp" },
                    ]
                  : [],
                error: null,
              },
        createSignedUrls: async (paths) => ({
          data: paths.map((path, i) => ({
            path,
            signedUrl:
              location.origin +
              "/fixture/" +
              (i ? "other" : "selected") +
              ".webp?token=synthetic-only",
          })),
          error: null,
        }),
      };
    },
  },
};
export async function requireOwnerConsole() {
  return { user: { id }, supabase };
}
`;
const entry = `
import React from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "./src/components/AppShell";
import Owner from "./src/app/[locale]/owner/page";
import { OwnerToolboxLauncher } from "./src/components/owner/OwnerToolboxLauncher";
import { preferences } from "@/lib/owner-console";
const q = new URLSearchParams(location.search),
  locale = q.get("locale") || location.pathname.split("/")[1] || "en";
document.documentElement.lang = locale;
document.documentElement.dataset.theme =
  q.get("theme") ||
  (matchMedia("(prefers-color-scheme:light)").matches ? "light" : "dark");
window.__ownerActions = [];
(async () => {
  try {
    const page = await Owner({
      params: Promise.resolve({ locale }),
      searchParams: Promise.resolve({}),
    });
    createRoot(document.getElementById("root")).render(
      <AppShell locale={locale} signedIn role="administrator" ownerConsole>
        {page}
        <OwnerToolboxLauncher
          locale={locale}
          userId="00000000-0000-4000-8000-000000000001"
          preferences={preferences()}
        />
      </AppShell>,
    );
    requestAnimationFrame(() =>
      requestAnimationFrame(() => (window.ready = true)),
    );
  } catch (e) {
    window.failure = String(e.stack);
  }
})();
`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: root, loader: "tsx" },
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
      name: "read-only-owner-adapters",
      setup(b) {
        b.onLoad({ filter: /.*/, namespace: "file" }, (args) => {
          trackFile(args.path);
          return null;
        });
        b.onResolve({ filter: /^@\/lib\/owner-console$/ }, () => ({
          path: "owner",
          namespace: "fixture",
        }));
        b.onResolve({ filter: /^next\/(link|navigation|image)$/ }, (a) => ({
          path: a.path,
          namespace: "fixture",
        }));
        b.onResolve({ filter: /(?:^|\/)actions$/ }, (a) => ({
          path:
            (a.path.startsWith("@/")
              ? resolve(root, "src", a.path.slice(2))
              : resolve(a.resolveDir, a.path)) + ".ts",
          namespace: "actions",
        }));
        b.onLoad({ filter: /.*/, namespace: "actions" }, (a) => {
          let p = a.path;
          if (!existsSync(p) && p.includes("/src/"))
            p = resolve(root, "src", p.split("/src/").at(-1));
          trackFile(p);
          return {
            contents: [
              ...readFileSync(p, "utf8").matchAll(
                /export\s+(?:async\s+)?function\s+(\w+)/g,
              ),
            ]
              .map(
                (x) =>
                  `export async function ${x[1]}(){window.__ownerActions.push('${x[1]}');throw Error('Read-only fixture forbids actions')}`,
              )
              .join("\n"),
            loader: "js",
          };
        });
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
          contents:
            a.path === "owner"
              ? auth
              : a.path === "next/navigation"
                ? `export function usePathname(){return location.pathname}export function useSearchParams(){return new URLSearchParams(location.search)}export function useRouter(){return{refresh(){},push(){}}}export function notFound(){throw Error('not-found')}export function redirect(href){throw Error('redirect:'+href)}`
                : `import React from'react';export default function Adapter({children,prefetch,fill,priority,unoptimized,replace,scroll,...p}){return React.createElement('${a.path === "next/image" ? "img" : "a"}',p,children)}`,
          loader: "jsx",
          resolveDir: root,
        }));
      },
    },
  ],
});
// esbuild's metadata is authoritative for its entire compiled disk closure,
// including package inputs. Virtual fixture modules are listed separately.
const virtualInputs = [];
for (const input of Object.keys(bundle.metafile.inputs)) {
  if (
    input === "<stdin>" ||
    input.startsWith("<define:") ||
    input.startsWith("fixture:")
  ) {
    virtualInputs.push(input);
    continue;
  }
  const diskPath = input.startsWith("actions:")
    ? input.slice("actions:".length)
    : isAbsolute(input)
      ? input
      : resolve(root, input);
  if (!existsSync(diskPath)) throw Error("Unbound esbuild input: " + input);
  trackFile(diskPath);
}
const processed = await postcss([tailwind()]).process(
  globalFiles.map((file) => readFileSync(file, "utf8")).join("\n") +
    "\n" +
    bundle.outputFiles
      .filter((file) => file.path.endsWith(".css"))
      .map((file) => file.text)
      .join("\n"),
  { from: resolve(root, "src/app/globals.css") },
);
for (const message of processed.messages) {
  if (message.type === "dependency" && message.file && existsSync(message.file))
    trackFile(message.file);
}
const css = processed.css;
const js = bundle.outputFiles.find((file) => file.path.endsWith(".js")).text;
const hashes = () =>
  Object.fromEntries(
    [...diskInputs]
      .sort()
      .map((path) => [inputKey(path), sha256(readFileSync(path))]),
  );
const before = hashes();
for (const [file, hash] of Object.entries(initialHashes))
  if (before[file] !== hash)
    throw Error("Owner input changed before browser run: " + file);
const sourceClosure = {
  metafileInputs: Object.keys(bundle.metafile.inputs),
  diskInputs: [...diskInputs].map(inputKey).sort(),
  virtualInputs,
  globalStylesheets: globalFiles.map(inputKey),
  explicitAuthorityFiles: explicitFiles,
};
writeFileSync(
  resolve(out, "source-closure.json"),
  JSON.stringify(sourceClosure, null, 2),
);
writeFileSync(
  resolve(out, "metafile.json"),
  JSON.stringify(bundle.metafile, null, 2),
);
writeFileSync(resolve(out, "styles.css"), css);
writeFileSync(resolve(out, "bundle.js"), js);

const server = createServer((req, res) => {
  const p = new URL(req.url, "http://local").pathname;
  if (p === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(js);
  } else if (p === "/style.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else if (p.startsWith("/fixture/")) {
    res.setHeader("Content-Type", "image/webp");
    res.end(readFileSync("public/images/akipasa/nightlife-editorial.webp"));
  } else if (
    /^\/(?:brand|images|fonts)\/[a-zA-Z0-9_./-]+\.(svg|webp|png|woff2?)$/.test(
      p,
    ) &&
    !p.includes("..") &&
    existsSync(resolve("public", p.slice(1)))
  ) {
    res.setHeader(
      "Content-Type",
      p.endsWith(".woff2")
        ? "font/woff2"
        : extname(p) === ".svg"
          ? "image/svg+xml"
          : "image/" + extname(p).slice(1),
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
const origin = "http://127.0.0.1:" + server.address().port;
let browser;
const results = [];
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : {}),
  });
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const width of [360, 390, 820, 1440])
        for (const scenario of [
          "empty",
          "populated",
          "unavailable",
          "photo",
          "preferences-unavailable",
          "storage-unavailable",
          "agents-unavailable",
          "counts-unavailable",
          "activity-unavailable",
        ]) {
          if (
            scenario.endsWith("-unavailable") &&
            !(locale === "en" && theme === "dark" && width === 390)
          )
            continue;
          const context = await browser.newContext({
            viewport: { width, height: width === 820 ? 1180 : 900 },
            colorScheme: theme,
            reducedMotion: "reduce",
          });
          const externalRequests = [],
            mutationRequests = [];
          await context.route("**/*", (route) => {
            const request = route.request();
            if (new URL(request.url()).origin !== origin) {
              externalRequests.push(new URL(request.url()).origin);
              return route.abort();
            }
            if (!["GET", "HEAD"].includes(request.method())) {
              mutationRequests.push(request.method());
              return route.abort();
            }
            return route.continue();
          });
          const page = await context.newPage();
          const pageErrors = [];
          page.on("pageerror", (e) => pageErrors.push(e.message));
          await page.goto(
            `${origin}/${locale}/owner?locale=${locale}&theme=${theme}&scenario=${scenario}`,
            { waitUntil: "networkidle" },
          );
          await page.waitForFunction(() => window.ready || window.failure);
          const failure = await page.evaluate(() => window.failure);
          if (failure) throw Error(failure);
          await page.waitForFunction(
            () => document.documentElement.dataset.ownerAccent,
          );
          const state = await page.evaluate(() => {
            const root = document.documentElement,
              hero = document.querySelector(".owner-hero");
            return {
              metrics: [
                ...document.querySelectorAll(".owner-metric-grid strong"),
              ].map((e) => e.textContent.trim()),
              readErrorNotices: [
                ...document.querySelectorAll("[role=alert]"),
              ].map((e) => e.textContent.trim()),
              privateBackgroundMessage: document
                .querySelector(".owner-background-empty")
                ?.textContent.trim(),
              applyEnabled: Boolean(
                document.querySelector(
                  ".owner-preferences-form button[type=submit]",
                ) &&
                  !document.querySelector(
                    ".owner-preferences-form button[type=submit]",
                  ).disabled,
              ),
              preferenceForms: document.querySelectorAll(
                ".owner-preferences-form",
              ).length,
              backgroundMutationForms: document.querySelectorAll(
                ".owner-private-backgrounds form",
              ).length,
              retryLinks: [...document.querySelectorAll("[role=alert] a")].map(
                (e) => e.getAttribute("href"),
              ),
              observedReads: window.__ownerReads || [],
              overflow: document.documentElement.scrollWidth - innerWidth,
              accent: root.dataset.ownerAccent,
              background: root.dataset.ownerBackground,
              motion: root.dataset.ownerMotion,
              glass: root.dataset.ownerGlass,
              photo: root.dataset.ownerCustomBackground,
              imageVar: root.style.getPropertyValue("--owner-background-image"),
              bodyBackground: getComputedStyle(document.body).backgroundImage,
              shellBackground: getComputedStyle(
                document.querySelector(".app-shell"),
              ).backgroundImage,
              shellColor: getComputedStyle(document.querySelector(".app-shell"))
                .backgroundColor,
              hero: getComputedStyle(hero).backgroundColor,
              panels: [
                ...document.querySelectorAll(".owner-console-grid>section"),
              ].map((x) => ({
                bg: getComputedStyle(x).backgroundColor,
                color: getComputedStyle(x).color,
              })),
              selectedAccent: document.querySelector(
                "input[name=accent]:checked",
              )?.value,
              selectedBackground: document.querySelector(
                "input[name=background]:checked",
              )?.value,
              links: [...document.querySelectorAll(".owner-launch-grid a")].map(
                (x) => x.getAttribute("href"),
              ),
            };
          });
          if (
            state.shellBackground !== "none" ||
            state.shellColor !== "rgba(0, 0, 0, 0)"
          )
            throw Error("Shellcoversownercanvas " + JSON.stringify(state));
          if (state.overflow > 1)
            throw Error("Owneroverflow " + JSON.stringify(state));
          const formExpected = ![
            "unavailable",
            "preferences-unavailable",
            "storage-unavailable",
          ].includes(scenario);
          if (
            state.accent !== (scenario === "photo" ? "violet" : "teal") ||
            (formExpected && state.selectedAccent !== state.accent)
          )
            throw Error("Accentnotrestored");
          if (formExpected && state.selectedBackground !== state.background)
            throw Error("Backgroundnotrestored");
          if (
            scenario === "photo" &&
            (!state.bodyBackground.includes("/fixture/selected.webp") ||
              state.photo !== "true")
          )
            throw Error("Privateselectionnotrestored");
          if (scenario === "default" && (state.photo || state.imageVar))
            throw Error("Staleprivatephoto");
          const stem = `${locale}-${theme}-${width}-${scenario}`;
          const screenshots = [];
          if (
            (locale === "en" && theme === "dark" && width === 390) ||
            (locale === "es" && theme === "light" && width === 1440)
          ) {
            for (const position of ["upper", "full", "lower"]) {
              if (position === "lower")
                await page
                  .locator(".owner-shortcut-note")
                  .scrollIntoViewIfNeeded();
              const file = out + "/" + stem + "-" + position + ".png";
              await page.screenshot({
                path: file,
                fullPage: position === "full",
              });
              screenshots.push({
                path: file,
                sha256: createHash("sha256")
                  .update(readFileSync(file))
                  .digest("hex"),
              });
            }
          }
          let nativeMenu = false;
          const more = page.getByRole("button", {
            name: locale === "es" ? "Más opciones" : "More options",
            exact: true,
          });
          if (await more.isVisible()) {
            await more.click();
            const dialog = page.locator("#app-more-sheet");
            if (!(await dialog.isVisible()))
              throw Error("Native owner menu did not open");
            await page.keyboard.press("Escape");
            if (await dialog.isVisible())
              throw Error("Owner menu failed Escape");
            if (!(await more.evaluate((e) => document.activeElement === e)))
              throw Error("Owner menu focus not restored");
            nativeMenu = true;
          }
          const expectedLinks = [
            "/" + locale + "/admin/ai-team",
            "/" + locale + "/staff/moderation",
            "/" + locale + "/admin/personalisation",
            "/" + locale + "/admin/catalogue",
            "/" + locale + "/admin/audit",
          ];
          for (const href of expectedLinks)
            if (!state.links.includes(href))
              throw Error("Missing real owner destination " + href);
          if (!state.links.some((h) => /^https:\/\/akibusiness\.com\//.test(h)))
            throw Error("Standalone AkiBusiness destination lost");

          const healthyMetrics = ["1", "2", "6", "1", "2"];
          const expectedMetrics =
            scenario === "empty"
              ? ["0", "0", "0", "0", "0"]
              : scenario === "unavailable"
                ? ["—", "—", "—", "—", "—"]
                : scenario === "agents-unavailable"
                  ? ["—", "2", "6", "—", "2"]
                  : scenario === "counts-unavailable"
                    ? ["1", "—", "—", "1", "—"]
                    : healthyMetrics;
          if (JSON.stringify(state.metrics) !== JSON.stringify(expectedMetrics))
            throw Error(
              "Unknown/healthy owner metric mismatch " +
                JSON.stringify({
                  scenario,
                  actual: state.metrics,
                  expected: expectedMetrics,
                }),
            );
          if (Boolean(state.preferenceForms) !== formExpected)
            throw Error("Preferences controls do not match read readiness");
          if (
            !formExpected &&
            (state.applyEnabled ||
              state.backgroundMutationForms ||
              state.privateBackgroundMessage)
          )
            throw Error("Unavailable appearance exposed writes or false empty");
          const expectedAlerts =
            scenario === "unavailable"
              ? 4
              : scenario === "agents-unavailable"
                ? 2
                : scenario.endsWith("-unavailable")
                  ? 1
                  : 0;
          if (state.readErrorNotices.length !== expectedAlerts)
            throw Error(
              "Missing independent owner read notices " +
                JSON.stringify({ scenario, notices: state.readErrorNotices }),
            );
          if (
            state.retryLinks.length !== expectedAlerts ||
            state.retryLinks.some(
              (h) => !h.startsWith("/" + locale + "/owner#"),
            )
          )
            throw Error("Read retry must remain localized same-owner GET");
          if (scenario === "empty") {
            const t = await page.locator(".owner-agent-radar").innerText(),
              a = await page.locator(".owner-activity-stream").innerText();
            if (
              !t.includes(
                locale === "es"
                  ? "Todavía no hay agentes configurados."
                  : "No agents are configured yet.",
              ) ||
              !a.includes(
                locale === "es"
                  ? "Todavía no hay actividad reciente."
                  : "No recent activity yet.",
              )
            )
              throw Error("Healthy empty sections lost explicit empty states");
          }
          const backgroundPreviews = [];
          for (const background of scenario === "photo"
            ? ["default", "aurora", "midnight", "synthwave", "paper", "none"]
            : []) {
            await page.locator("label.owner-swatch-" + background).click();
            const b = await page.evaluate(() => ({
              background: document.documentElement.dataset.ownerBackground,
              shell: getComputedStyle(document.querySelector(".app-shell"))
                .backgroundColor,
              image: document.documentElement.style.getPropertyValue(
                "--owner-background-image",
              ),
            }));
            if (b.background !== background || b.shell !== "rgba(0, 0, 0, 0)")
              throw Error("Basebackgroundhidden");
            if (
              scenario === "photo" &&
              !b.image.includes("/fixture/selected.webp")
            )
              throw Error("Basereplacedselectedphoto");
            backgroundPreviews.push(b);
            if (background === "midnight" && scenario === "default") {
              await page.evaluate(() => scrollTo(0, 0));
              await page.screenshot({
                path:
                  out +
                  "/" +
                  locale +
                  "-" +
                  theme +
                  "-" +
                  width +
                  "-midnight-upper.png",
              });
            }
          }
          const previews = [];
          for (const accent of scenario === "populated"
            ? ["orange", "teal", "violet", "pink", "gold"]
            : []) {
            await page
              .locator("label.owner-accent-" + accent)
              .scrollIntoViewIfNeeded();
            await page.locator("label.owner-accent-" + accent).click();
            const v = await page.evaluate(() => ({
              accent: document.documentElement.dataset.ownerAccent,
              selected: document.querySelector("input[name=accent]:checked")
                ?.value,
              primary: getComputedStyle(
                document.documentElement,
              ).getPropertyValue("--primary"),
              imageVar: document.documentElement.style.getPropertyValue(
                "--owner-background-image",
              ),
            }));
            if (v.accent !== accent || v.selected !== accent)
              throw Error("Accentpreviewfailed");
            if (
              scenario === "photo" &&
              !v.imageVar.includes("/fixture/selected.webp")
            )
              throw Error("Accenterasedprivateimage");
            previews.push(v);
          }
          if (formExpected) {
            await page.locator("label.owner-accent-teal").click();
            await page.locator("input[name=accent]:checked").focus();
            await page.keyboard.press("ArrowRight");
            if (
              (await page.evaluate(
                () => document.documentElement.dataset.ownerAccent,
              )) !== "violet"
            )
              throw Error("Nativeaccentkeyboardfailed");
          }
          if ((await page.evaluate(() => window.__ownerActions)).length)
            throw Error("Unexpectedaction");
          let nativeRetryRecovery = null;
          if (scenario === "unavailable") {
            await Promise.all([
              page.waitForNavigation({ waitUntil: "networkidle" }),
              page.locator("[role=alert] a").first().click(),
            ]);
            await page.waitForFunction(() => window.ready || window.failure);
            const recovered = await page.evaluate(() => ({
              metrics: [
                ...document.querySelectorAll(".owner-metric-grid strong"),
              ].map((e) => e.textContent.trim()),
              alerts: document.querySelectorAll("[role=alert]").length,
              form: document.querySelectorAll(".owner-preferences-form").length,
              actions: window.__ownerActions || [],
            }));
            if (
              JSON.stringify(recovered.metrics) !==
                JSON.stringify(healthyMetrics) ||
              recovered.alerts ||
              recovered.form !== 1 ||
              recovered.actions.length
            )
              throw Error(
                "Native owner GET retry did not restore independent healthy content",
              );
            nativeRetryRecovery = recovered;
          }
          if (pageErrors.length)
            throw Error("Unhandled fixture page error " + pageErrors.join(";"));
          if (externalRequests.length || mutationRequests.length)
            throw Error("Unexpected external or mutating request");
          results.push({
            locale,
            theme,
            width,
            scenario,
            ...state,
            screenshots,
            nativeMenu,
            nativeRetryRecovery,
            backgroundPreviews,
            accentPreviews: previews,
            keyboardAccent: formExpected,
            actions: 0,
            pageErrors,
            externalRequests,
            mutationRequests,
          });
          await context.close();
        }
  if (results.length !== 69)
    throw Error("Owner QA must complete all69 declared cases");
  const after = hashes();
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw Error("Sourceadvancedduringcapture");
  writeFileSync(
    out + "/results.json",
    JSON.stringify(
      {
        sourceCommit: process.env.GITHUB_SHA || null,
        fixtureOnly: true,
        productionAuthRLS: false,
        testedWorkingTree: !process.env.GITHUB_SHA,
        sourceClosure,
        initialInputHashes: initialHashes,
        bundleSha256: createHash("sha256").update(js).digest("hex"),
        cssSha256: createHash("sha256").update(css).digest("hex"),
        actualPageAndAppearanceAndLauncher: true,
        actualNext: false,
        fixtureOwnerAuth: true,
        privatePhotoIsSyntheticLicensedFixture: true,
        healthyEmptyPopulatedUnavailablePhoto: true,
        physicalAndroid: false,
        authorizationNotExercised: true,
        productionWrites: false,
        beforeSourceHashes: before,
        afterSourceHashes: after,
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS",
    results.length,
    "Owner read-recovery states including64core+5independent failures; zero actions",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
