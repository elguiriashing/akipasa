// Composed real CommunityLanding/AppShell + story viewer/orchestrator/composer.
// All story API responses and photo submissions are disposable loopback fixtures.
// No actual Next/Auth/RLS/storage/moderation/device or production acceptance claim.
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createHash } from "node:crypto";
const root = process.cwd();
const out = resolve(
  process.env.COMMUNITY_STORIES_EVIDENCE ||
    "test-results/community-stories-composed",
);
mkdirSync(out, { recursive: true });
const hash = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const globals = [
  ...readFileSync("src/app/layout.tsx", "utf8").matchAll(
    /import\s+["'](\.\/[^"']+\.css)["'];/g,
  ),
].map((m) => resolve("src/app", m[1]));
const entry = `import React from'react';import{createRoot}from'react-dom/client';import{CommunityLanding}from'./src/components/community/CommunityLanding';import{AppShell}from'./src/components/AppShell';const locale=location.pathname.startsWith('/es/')?'es':'en';window.fixtureActions=[];createRoot(document.getElementById('root')).render(<AppShell locale={locale} signedIn={true}><CommunityLanding locale={locale} initialCenter={{latitude:36.7213,longitude:-4.4214}} areaLabel="Málaga"/></AppShell>);requestAnimationFrame(()=>requestAnimationFrame(()=>window.fixtureReady=true));`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: root, loader: "tsx" },
  bundle: true,
  write: false,
  metafile: true,
  outdir: out,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [
    {
      name: "disposable-framework-adapters",
      setup(b) {
        b.onResolve(
          { filter: /^next\/(link|image|navigation|headers)$/ },
          (a) => ({ path: a.path, namespace: "fixture" }),
        );
        b.onResolve({ filter: /(?:^|\/)actions$/ }, () => ({
          path: "actions",
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
          contents:
            a.path === "actions"
              ? `export async function signOut(){window.fixtureActions.push('signOut');throw Error('Fixture forbids server actions')}`
              : a.path === "next/navigation"
                ? `export function usePathname(){return location.pathname}export function useSearchParams(){return new URLSearchParams(location.search)}export function useRouter(){return{push(href){location.href=href},replace(href){location.replace(href)},refresh(){location.reload()}}}`
                : a.path === "next/headers"
                  ? `export async function headers(){return new Headers()}export async function cookies(){return{get(){}}}`
                  : `import React from'react';export default function Adapter({children,prefetch,fill,priority,unoptimized,replace,scroll,sizes,...props}){return React.createElement('${a.path === "next/image" ? "img" : "a"}',props,children)}`,
          loader: "jsx",
          resolveDir: root,
        }));
      },
    },
  ],
});
const dependencyPaths = [
  ...new Set([
    ...Object.keys(bundle.metafile.inputs).filter((p) => existsSync(p)),
    ...globals,
    "src/app/layout.tsx",
    "src/lib/community-stories/contracts.ts",
    "src/app/[locale]/community/page.tsx",
    "scripts/test-community-stories-browser.mjs",
  ]),
];
const sourceHashes = () =>
  Object.fromEntries(
    dependencyPaths.map((p) => [
      p.startsWith(root) ? p.slice(root.length + 1) : p,
      hash(p),
    ]),
  );
const initialSourceHashes = sourceHashes();
const css = (
  await postcss([tailwind()]).process(
    globals.map((p) => readFileSync(p, "utf8")).join("\n") +
      "\n" +
      bundle.outputFiles
        .filter((f) => f.path.endsWith(".css"))
        .map((f) => f.text)
        .join("\n"),
    { from: resolve("src/app/globals.css") },
  )
).css;
const js = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text;
writeFileSync(resolve(out, "bundle.js"), js);
writeFileSync(resolve(out, "styles.css"), css);
const server = createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (path === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    return res.end(js);
  }
  if (path === "/styles.css") {
    res.setHeader("Content-Type", "text/css");
    return res.end(css);
  }
  if (
    /^\/(brand|pwa|images)\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(svg|png|webp)$/.test(
      path,
    ) &&
    existsSync(resolve("public", path.slice(1)))
  ) {
    res.setHeader(
      "Content-Type",
      extname(path) === ".svg"
        ? "image/svg+xml"
        : "image/" + extname(path).slice(1),
    );
    return res.end(readFileSync(resolve("public", path.slice(1))));
  }
  if (path.startsWith("/api/")) {
    res.statusCode = 500;
    return res.end("Unexpected unstubbed API");
  }
  res.setHeader("Content-Type", "text/html");
  res.end(
    '<!doctype html><html data-product="akipasa"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body data-product="akipasa"><div id="root"></div><script src="/bundle.js"></script></body></html>',
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const id = "00000000-0000-4000-8000-000000000001",
  storyId = "00000000-0000-4000-8000-000000000002",
  feedId = "00000000-0000-4000-8000-000000000003";
const story = (owned = false) => ({
  id: owned ? storyId : feedId,
  citySlug: "malaga",
  venueName: "Synthetic verified venue",
  caption: owned ? "Synthetic own pending story" : "Synthetic public moment",
  kind: "venue",
  status: owned ? "pending" : "approved",
  createdAt: new Date(Date.now() - 30 * 60_000).toISOString(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
  mediaUrl: `/api/community/stories/${owned ? storyId : feedId}/media`,
  reportCount: null,
});
const results = [];
let browser;
async function prepareRealPhoto(page) {
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1800;
    const context = canvas.getContext("2d");
    context.fillStyle = "#8f4b26";
    context.fillRect(0, 0, 2400, 1800);
    context.fillStyle = "#e1b783";
    context.fillRect(240, 200, 1600, 1100);
    const original = await new Promise((r) =>
      canvas.toBlob(r, "image/jpeg", 0.9),
    );
    const bytes = new Uint8Array(await original.arrayBuffer());
    const metadata = new TextEncoder().encode(
      "Exif\0\0II*\0\b\0\0\0\0\0\0\0\0\0PRIVATE-GPS-EXIF",
    );
    const size = metadata.length + 2;
    const file = new File(
      [
        bytes.slice(0, 2),
        new Uint8Array([255, 225, size >> 8, size & 255]),
        metadata,
        bytes.slice(2),
      ],
      "private-location.jpg",
      { type: "image/jpeg" },
    );
    const transfer = new DataTransfer();
    transfer.items.add(file);
    const input = document.querySelector('input[type="file"]:not([capture])');
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
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
          reducedMotion: "reduce",
          colorScheme: theme,
        });
        const attempts = [],
          requests = [],
          uploads = [],
          reports = [],
          deletions = [];
        let reportStep = 0,
          deleteStep = 0,
          uploadStep = 0,
          uploaded = false,
          emptyEligible = false,
          forbiddenEligible = false;
        await context.addInitScript((value) => {
          localStorage.setItem("akipasa.theme", value);
          window.geoCalls = 0;
          Object.defineProperty(navigator, "geolocation", {
            configurable: true,
            value: {
              getCurrentPosition(success) {
                window.geoCalls++;
                success({
                  coords: { latitude: 36.72, longitude: -4.42, accuracy: 50 },
                  timestamp: Date.now(),
                });
              },
            },
          });
        }, theme);
        await context.route("**/*", async (route) => {
          const req = route.request(),
            url = new URL(req.url());
          if (url.origin !== origin) {
            attempts.push({ method: req.method(), url: url.href });
            return route.abort();
          }
          requests.push({
            method: req.method(),
            path: url.pathname,
            query: url.search,
          });
          if (url.pathname === "/api/community/stories/cities")
            return route.fulfill({
              json: {
                available: true,
                cities: [
                  {
                    id: "malaga",
                    slug: "malaga",
                    nameEs: "Málaga",
                    nameEn: "Málaga",
                    latitude: 36.72,
                    longitude: -4.42,
                    approvedStories24h: 1,
                  },
                  {
                    id: "empty",
                    slug: "empty",
                    nameEs: "Ciudad vacía",
                    nameEn: "Empty city",
                    latitude: 36.6,
                    longitude: -4.5,
                    approvedStories24h: 1,
                  },
                ],
              },
            });
          if (
            url.pathname === "/api/community/stories/check-ins" &&
            forbiddenEligible
          )
            return route.fulfill({
              status: 403,
              json: { error: { code: "not_eligible" } },
            });
          if (url.pathname === "/api/community/stories/check-ins")
            return route.fulfill({
              json: {
                available: true,
                checkIns:
                  uploaded || emptyEligible
                    ? []
                    : [
                        {
                          id,
                          venueName: "Synthetic accepted visit",
                          citySlug: "malaga",
                          acceptedAt: new Date(
                            Date.now() - 15 * 60_000,
                          ).toISOString(),
                        },
                      ],
              },
            });
          if (url.pathname === "/api/community/stories/mine")
            return route.fulfill({
              json: {
                available: true,
                stories: uploaded ? [story(true)] : [],
                nextCursor: null,
              },
            });
          if (url.pathname.endsWith("/media"))
            return route.fulfill({
              contentType: "image/svg+xml",
              body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#793e26"/><text x="40" y="90" fill="#fff">Synthetic story fixture</text></svg>',
            });
          if (
            url.pathname === `/api/community/stories/${feedId}/report` &&
            req.method() === "POST"
          ) {
            reports.push(req.postDataJSON());
            return route.fulfill(
              ++reportStep === 1
                ? { status: 503, json: { error: { code: "unavailable" } } }
                : { json: { reported: true } },
            );
          }
          if (
            url.pathname === `/api/community/stories/${storyId}` &&
            req.method() === "DELETE"
          ) {
            deletions.push(url.pathname);
            deleteStep++;
            return route.fulfill(
              deleteStep === 1
                ? { status: 503, json: { error: { code: "unavailable" } } }
                : {
                    json: {
                      deleted: true,
                      mediaCleanup: deleteStep === 2 ? "pending" : "removed",
                    },
                  },
            );
          }
          if (
            url.pathname === "/api/community/stories" &&
            req.method() === "POST"
          ) {
            const bytes = req.postDataBuffer();
            const parsed = await new Request(origin + url.pathname, {
              method: "POST",
              headers: { "content-type": req.headers()["content-type"] },
              body: bytes,
            }).formData();
            const file = parsed.get("file"),
              encoded = Buffer.from(await file.arrayBuffer());
            const chunks = [];
            for (let at = 12; at + 8 <= encoded.length; ) {
              const length = encoded.readUInt32LE(at + 4);
              chunks.push(encoded.toString("ascii", at, at + 4));
              at += 8 + length + (length % 2);
            }
            uploads.push({
              keys: [...parsed.keys()].sort(),
              publicOptIn: parsed.get("publicOptIn"),
              checkInId: parsed.get("checkInId"),
              name: file.name,
              type: file.type,
              size: file.size,
              chunks,
              originalExifMarker: encoded.includes(
                Buffer.from("PRIVATE-GPS-EXIF"),
              ),
            });
            uploadStep++;
            if (uploadStep === 1)
              return route.fulfill({
                status: 503,
                json: { error: { code: "unavailable" } },
              });
            uploaded = true;
            return route.fulfill({
              status: 201,
              json: { moderation: "manual", story: story(true) },
            });
          }
          if (
            url.pathname === "/api/community/stories" &&
            req.method() === "GET"
          )
            return route.fulfill({
              json: {
                available: true,
                stories:
                  url.searchParams.get("city") === "empty" ? [] : [story()],
              },
            });
          if (req.method() !== "GET" && req.method() !== "HEAD") {
            attempts.push({ method: req.method(), url: url.href });
            return route.abort();
          }
          return route.continue();
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(String(error)));
        await page.goto(`${origin}/${locale}/community?theme=${theme}`);
        await page.waitForFunction(() => window.fixtureReady);
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
          document.documentElement.classList.toggle(
            "theme-light",
            value === "light",
          );
          document.documentElement.classList.toggle("dark", value === "dark");
        }, theme);
        await page.evaluate(
          () =>
            new Promise((r) =>
              requestAnimationFrame(() => requestAnimationFrame(r)),
            ),
        );
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        expect(await page.evaluate(() => window.geoCalls)).toBe(0);
        const add = page.getByRole("button", {
          name: locale === "es" ? "Añadir historia" : "Add story",
          exact: true,
        });
        await expect(add).toBeVisible();
        await expect(
          page.getByRole("button", { name: /Málaga/ }),
        ).toBeVisible();
        const creators = add
          .locator("..")
          .locator(`a[href="/${locale}/community/creators"]`);
        await expect(creators).toHaveCount(1);
        const rowMetrics = await add.evaluate((button) => {
          const row = button.parentElement;
          const creator = row?.querySelector('a[href$="/community/creators"]');
          const city = [...(row?.children || [])].find(
            (element) => element.tagName === "BUTTON" && element !== button,
          );
          const circle = button.querySelector('span[aria-hidden="true"]');
          return {
            sameParent:
              !!creator &&
              !!city &&
              creator.parentElement === row &&
              city.parentElement === row,
            display: row && getComputedStyle(row).display,
            nowrap: row && getComputedStyle(row).flexWrap,
            addBackground: getComputedStyle(button).backgroundColor,
            addBorder: getComputedStyle(button).borderTopWidth,
            addFontSize: getComputedStyle(button).fontSize,
            addCircleWidth: circle?.getBoundingClientRect().width,
            addCircleHeight: circle?.getBoundingClientRect().height,
          };
        });
        expect(rowMetrics.sameParent).toBe(true);
        expect(rowMetrics.display).toBe("flex");
        expect(rowMetrics.nowrap).toBe("nowrap");
        expect(rowMetrics.addBackground).toBe("rgba(0, 0, 0, 0)");
        expect(rowMetrics.addBorder).toBe("0px");
        expect(rowMetrics.addFontSize).toBe("12px");
        await expect(
          page.getByRole("button", { name: /Málaga/ }).locator("small"),
        ).toHaveText(locale === "es" ? "1 historia" : "1 story");
        expect(rowMetrics.addCircleWidth).toBe(76);
        expect(rowMetrics.addCircleHeight).toBe(76);
        const suggest = page
          .getByRole("navigation", {
            name: locale === "es" ? "Tu comunidad" : "Your community",
          })
          .locator(`a[href="/${locale}/community?view=suggest"]`);
        await expect(suggest).toHaveCount(1);
        await expect(
          page.getByRole("link", {
            name: locale === "es" ? "Cerca de ti" : "Nearby",
            exact: true,
          }),
        ).toHaveAttribute("href", "#city-stories");
        const tag = `${locale}-${theme}-${width}`;
        await page.screenshot({ path: resolve(out, tag + "-upper.png") });
        await page.evaluate(() =>
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: "instant",
          }),
        );
        await page.screenshot({ path: resolve(out, tag + "-lower.png") });
        await page
          .getByRole("link", {
            name: locale === "es" ? "Cerca de ti" : "Nearby",
            exact: true,
          })
          .click();
        await expect(page.locator("#city-stories")).toBeFocused();
        expect(new URL(page.url()).hash).toBe("#city-stories");
        await page
          .getByRole("button", {
            name: locale === "es" ? "Usar mi ubicación" : "Use my location",
          })
          .click();
        expect(await page.evaluate(() => window.geoCalls)).toBe(1);
        await page.getByRole("button", { name: /Málaga/ }).click();
        const viewer = page.getByRole("dialog");
        await expect(viewer).toBeVisible();
        await expect(page.getByText("Synthetic public moment")).toBeVisible();
        await page.screenshot({ path: resolve(out, tag + "-viewer.png") });
        await page
          .getByRole("button", {
            name: locale === "es" ? "Denunciar historia" : "Report story",
          })
          .click();
        const send = page.getByRole("button", {
          name: locale === "es" ? "Enviar denuncia" : "Send report",
        });
        await expect(send).toBeDisabled();
        await page
          .getByLabel(
            locale === "es" ? "Motivo de la denuncia" : "Report reason",
          )
          .selectOption("privacy");
        await send.click();
        await expect(viewer.getByRole("alert")).toBeVisible();
        await send.click();
        await expect(
          page.getByText(
            locale === "es"
              ? "Denuncia recibida. Nuestro equipo la revisará."
              : "Report received. Our team will review it.",
          ),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(viewer).not.toBeVisible();
        await page
          .getByRole("button", {
            name: locale === "es" ? /Ciudad vacía/ : /Empty city/,
          })
          .click();
        await expect(viewer).toBeVisible();
        await expect(
          viewer.getByRole("heading", {
            name:
              locale === "es"
                ? "El próximo momento puede ser tuyo"
                : "The next moment could be yours",
          }),
        ).toBeVisible();
        await expect(
          viewer.getByRole("link", {
            name: locale === "es" ? "Hacer check-in" : "Check in",
          }),
        ).toHaveAttribute("href", `/${locale}/check-in`);
        await page.screenshot({
          path: resolve(out, tag + "-public-empty.png"),
        });
        await page.keyboard.press("Escape");
        await expect(viewer).not.toBeVisible();
        await add.focus();
        await page.keyboard.press("Enter");
        const dialog = page.getByRole("dialog", {
          name: locale === "es" ? "Tus historias" : "Your stories",
        });
        await expect(dialog).toBeVisible();
        await page
          .getByRole("combobox", {
            name: locale === "es" ? "Lugar visitado" : "Place visited",
          })
          .selectOption(id);
        const optIn = dialog.getByRole("checkbox");
        await expect(optIn).not.toBeChecked();
        await prepareRealPhoto(page);
        await expect(dialog.getByRole("img")).toBeVisible();
        await expect(optIn).not.toBeChecked();
        const submit = dialog.getByRole("button", {
          name: locale === "es" ? "Enviar a revisión" : "Submit for review",
        });
        await expect(submit).toBeDisabled();
        expect(uploads).toHaveLength(0);
        await optIn.check();
        await submit.click();
        await expect(dialog.getByRole("alert")).toBeVisible();
        await dialog
          .getByRole("button", {
            name: locale === "es" ? "Reintentar envío" : "Retry submission",
          })
          .click();
        await expect(
          dialog.getByText(
            locale === "es" ? "Pendiente de revisión" : "Awaiting review",
            { exact: true },
          ),
        ).toBeVisible();
        const closeComposer = dialog.getByRole("button", {
          name: locale === "es" ? "Cerrar" : "Close",
          exact: true,
        });
        let closeTabs = 0;
        for (
          ;
          closeTabs < 100 &&
          !(await closeComposer.evaluate(
            (button) => button === document.activeElement,
          ));
          closeTabs++
        )
          await page.keyboard.press("Tab");
        expect(closeTabs).toBeLessThan(100);
        await expect(closeComposer).toBeFocused();
        const nativeCloseHits = await closeComposer.evaluate((button) => {
          const rect = button.getBoundingClientRect();
          return [
            [0.5, 0.5],
            [0.1, 0.1],
            [0.9, 0.1],
            [0.1, 0.9],
            [0.9, 0.9],
          ].map(([x, y]) => {
            const hit = document.elementFromPoint(
              rect.x + rect.width * x,
              rect.y + rect.height * y,
            );
            return hit === button || button.contains(hit);
          });
        });
        const closeProbe = await closeComposer.evaluate((button) => {
          const rect = button.getBoundingClientRect(),
            box = button.closest("dialog");
          const db = box.getBoundingClientRect();
          return {
            button: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            },
            dialog: {
              x: db.x,
              y: db.y,
              width: db.width,
              height: db.height,
              scrollTop: box.scrollTop,
              scrollWidth: box.scrollWidth,
              clientWidth: box.clientWidth,
            },
            viewport: { width: innerWidth, height: innerHeight },
            points: [
              [0.5, 0.5],
              [0.1, 0.1],
              [0.9, 0.1],
              [0.1, 0.9],
              [0.9, 0.9],
            ].map(([x, y]) => {
              const hit = document.elementFromPoint(
                rect.x + rect.width * x,
                rect.y + rect.height * y,
              );
              return {
                x: rect.x + rect.width * x,
                y: rect.y + rect.height * y,
                hit: hit?.tagName,
                className: hit?.className,
              };
            }),
          };
        });
        writeFileSync(
          resolve(out, tag + "-close-probe.json"),
          JSON.stringify(closeProbe, null, 2),
        );
        if (nativeCloseHits.some((value) => !value))
          await page.screenshot({
            path: resolve(out, tag + "-close-failure.png"),
          });
        expect(nativeCloseHits).toEqual([true, true, true, true, true]);
        await page.screenshot({ path: resolve(out, tag + "-pending.png") });
        await dialog
          .getByRole("button", {
            name:
              locale === "es" ? "Actualizar historias" : "Refresh your stories",
          })
          .click();
        const own = dialog
          .locator("article")
          .filter({ hasText: "Synthetic own pending story" });
        await expect(own).toBeVisible();
        forbiddenEligible = true;
        await dialog
          .getByRole("button", {
            name:
              locale === "es" ? "Actualizar historias" : "Refresh your stories",
          })
          .click();
        await expect(dialog.getByRole("alert")).toBeVisible();
        await expect(own).toBeVisible();
        forbiddenEligible = false;
        await dialog
          .getByRole("button", {
            name:
              locale === "es" ? "Actualizar historias" : "Refresh your stories",
          })
          .click();
        await expect(dialog.getByRole("alert")).toHaveCount(0);
        await expect(own).toBeVisible();
        await own
          .getByRole("button", {
            name: locale === "es" ? "Retirar historia" : "Remove story",
          })
          .click();
        expect(deletions).toHaveLength(0);
        await own
          .getByRole("button", {
            name: locale === "es" ? "Confirmar retirada" : "Confirm removal",
          })
          .click();
        await expect(own.getByRole("alert")).toBeVisible();
        await own
          .getByRole("button", {
            name: locale === "es" ? "Confirmar retirada" : "Confirm removal",
          })
          .click();
        const cleanup = dialog.getByRole("button", {
          name:
            locale === "es"
              ? "Reintentar limpieza del archivo"
              : "Retry media cleanup",
        });
        await expect(cleanup).toBeVisible();
        await cleanup.click();
        await expect(cleanup).toHaveCount(0);
        await expect(
          dialog.getByText(
            locale === "es" ? "Historia retirada." : "Story removed.",
          ),
        ).toBeVisible();
        const checkin = dialog.getByRole("link", {
          name: locale === "es" ? "Ir a Check-in" : "Go to Check-in",
        });
        await expect(checkin).toHaveAttribute("href", `/${locale}/check-in`);
        await page.screenshot({
          path: resolve(out, tag + "-removed-empty.png"),
        });
        await page.keyboard.press("Escape");
        await expect(dialog).not.toBeVisible();
        await expect(add).toBeFocused();
        expect(reports).toEqual([{ reason: "privacy" }, { reason: "privacy" }]);
        expect(deletions).toHaveLength(3);
        for (const photo of uploads) {
          expect(photo.keys).toEqual([
            "caption",
            "checkInId",
            "file",
            "kind",
            "publicOptIn",
          ]);
          expect(photo.checkInId).toBe(id);
          expect(photo.publicOptIn).toBe("true");
          expect(photo.chunks).toEqual(["VP8 "]);
          expect(photo.originalExifMarker).toBe(false);
          expect(photo.name).toBe("checkin-story.webp");
          expect(photo.size).toBeLessThanOrEqual(5 * 1024 * 1024);
        }
        expect(uploads).toHaveLength(2);
        expect(attempts).toEqual([]);
        expect(errors).toEqual([]);
        expect(await page.evaluate(() => window.fixtureActions)).toEqual([]);
        const metrics = await page.evaluate(() => ({
          theme: document.documentElement.dataset.theme,
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          geoCalls: window.geoCalls,
        }));
        expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width + 1);
        await Promise.all([
          page.waitForURL(`**/${locale}/community?view=suggest`),
          suggest.click(),
        ]);
        expect(new URL(page.url()).pathname).toBe(`/${locale}/community`);
        expect(new URL(page.url()).searchParams.get("view")).toBe("suggest");
        results.push({
          rowMetrics,
          nativeNearbyFocus: true,
          nativeSuggestLink: true,
          locale,
          theme,
          width,
          metrics,
          reports,
          uploads,
          deletions,
          closeTabs,
          nativeCloseHits,
          attempts,
          errors,
        });
        await context.close();
      }
  expect(sourceHashes()).toEqual(initialSourceHashes);
  console.log(
    `${results.length} actual composed Community story contexts PASS; synthetic API only`,
  );
} finally {
  writeFileSync(
    resolve(out, "results.json"),
    JSON.stringify(
      {
        actualNext: false,
        actualCommunityLanding: true,
        actualAppShell: true,
        realImageDecode: true,
        syntheticApiOnly: true,
        realAuthRLS: false,
        physicalDevice: false,
        initialSourceHashes,
        finalSourceHashes: sourceHashes(),
        results,
      },
      null,
      2,
    ),
  );
  await browser?.close();
  await new Promise((r) => server.close(r));
}
