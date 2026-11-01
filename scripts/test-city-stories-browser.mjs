// Actual unintegrated CityStories component. Synthetic local GET API/media only.
// No real public story, provider/RLS, upload, Next transport or physical device proof.
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createHash } from "node:crypto";
const root = process.cwd();
const out = resolve("/tmp/akipasa-city-stories-compact-browser-20261031");
mkdirSync(out, { recursive: true });
const globals = [
  ...readFileSync("src/app/layout.tsx", "utf8").matchAll(
    /import\s+["'](\.\/[^"']+\.css)["'];/g,
  ),
].map((m) => resolve("src/app", m[1]));
const files = [
  "scripts/test-prestige-routes-browser.mjs",
  "scripts/test-city-stories-browser.mjs",
  "src/components/community/CityStories.tsx",
  "src/components/community/CityStories.module.css",
  "src/lib/city-photos.json",
  "src/app/[locale]/passports/prestige/page.tsx",
  "src/app/[locale]/passports/prestige/hall/page.tsx",
  "src/app/[locale]/passports/prestige/certificate/[publicId]/page.tsx",
  "src/app/[locale]/privacy/prestige/page.tsx",
  "src/app/[locale]/passports/prestige/PrestigeControls.tsx",
  "src/components/PassportPrestigeCard.tsx",
  "src/components/PassportPrestigeDownload.tsx",
  "src/components/PassportPrestigePrivacy.tsx",
  "src/components/PassportPrestigeShipping.tsx",
  "src/components/passport-prestige.module.css",
  "src/lib/passport-prestige.ts",
  "src/lib/passport-prestige-identity.ts",
  "src/components/AppShell.tsx",
  "src/components/PasaCinematic.css",
  "src/components/PasaSharedSurfaces.css",
  ...globals.map((f) => f.slice(root.length + 1)),
];
const hashes = () =>
  Object.fromEntries(
    files.map((f) => [
      f,
      createHash("sha256").update(readFileSync(f)).digest("hex"),
    ]),
  );
const initial = hashes();
const adapter = `const q=new URLSearchParams(location.search),state=q.get('state')||'ready',route=q.get('route');const award={id:'10000000-0000-4000-8000-000000000001',programme_key:'city_master',public_id:'10000000-0000-4000-8000-000000000002',serial:42,title_es:'Reconocimiento sintético para revisar la interfaz',title_en:'Synthetic achievement for interface review',public_alias:'Synthetic fixture explorer',awarded_at:'2026-10-20T12:00:00Z',shared:false,hall_of_fame:false,revoked_at:null,physical_status:null,delivery_status:'disabled',has_shipping_address:route==='privacy'};const programmes=[{key:'city_master',title_es:'Logro sintético obtenido',title_en:'Synthetic earned achievement',physical_eligible:false,active:true,definition_current:true,requirements:[]},{key:'coastal_explorer',title_es:'Próximo hito sintético',title_en:'Next synthetic milestone',physical_eligible:false,active:true,definition_current:true,requirements:[{key:'fixture_checkin',title_es:'Visitas sintéticas verificadas',title_en:'Synthetic verified visits',current:1,target:3}]}];const publicAward={public_id:award.public_id,serial:award.serial,title_es:award.title_es,title_en:award.title_en,public_alias:award.public_alias,awarded_at:award.awarded_at};const supabase={async rpc(name,input){window.fixtureReads.push({name,input});if(state==='error')return{data:null,error:{message:'Synthetic unavailable'}};if(name==='prestige_member')return{data:input.p_action==='export'?{awards:state==='empty'?[]:[award],shipping_addresses:state==='empty'?[]:[{award_id:award.id,delete_after:'2026-11-30T12:00:00Z'}]}:{awards:state==='empty'?[]:[award],programmes:state==='empty'?[]:programmes,fulfilment_enabled:false,shipping_intake_enabled:false},error:null};if(name==='prestige_public')return{data:state==='empty'?[]:[publicAward],error:null};throw Error('Unexpected synthetic RPC '+name)}};const user={id:'10000000-0000-4000-8000-000000000099'};export async function requireUser(locale,next){window.fixtureAuth.push({kind:'requireUser',locale,next});return{supabase,user}}export async function optionalUser(){window.fixtureAuth.push({kind:'optionalUser'});return{supabase,user}}export async function createSupabaseServerClient(){return supabase};`;
const entry = `import React from 'react';import{createRoot}from'react-dom/client';import{CityStories}from'./src/components/community/CityStories';const q=new URLSearchParams(location.search);document.documentElement.dataset.theme=q.get('theme')||'dark';createRoot(document.getElementById('root')).render(<CityStories locale={q.get('locale')||'en'} leadingContent={<button aria-label="Fixture add story">+</button>}/>);`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: root, loader: "tsx" },
  bundle: true,
  write: false,
  outdir: out,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.AKIPASA_PRESTIGE_ENABLED": '"true"',
    "process.env.AKIPASA_PRESTIGE_SCHEMA_READY": '"true"',
    "process.env": "{}",
  },
  plugins: [
    {
      name: "disposable-read-only-prestige-page-adapters",
      setup(b) {
        b.onResolve({ filter: /^@\/lib\/(auth|supabase\/server)$/ }, () => ({
          path: "auth",
          namespace: "fixture",
        }));
        b.onLoad({ filter: /[\\/]lib[\\/]auth\.ts$/ }, () => ({
          contents: adapter,
          loader: "js",
        }));
        b.onResolve({ filter: /^next\/(link|navigation|image)$/ }, (a) => ({
          path: a.path,
          namespace: "fixture",
        }));
        b.onResolve({ filter: /(?:^|\/)actions$/ }, (a) => ({
          path: resolve(a.resolveDir, a.path.replace(/^@\//, "src/")) + ".ts",
          namespace: "actions",
        }));
        b.onLoad({ filter: /.*/, namespace: "actions" }, (a) => {
          let path = a.path;
          if (!existsSync(path) && path.includes("/src/"))
            path = resolve(root, "src", path.split("/src/").at(-1));
          const source = readFileSync(path, "utf8");
          const names = [
            ...source.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g),
          ].map((x) => x[1]);
          return {
            contents: names
              .map(
                (n) =>
                  `export async function ${n}(){window.fixtureActions.push('${n}');throw Error('Read-only fixture forbids actions')}`,
              )
              .join("\n"),
            loader: "js",
          };
        });
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
          contents:
            a.path === "auth"
              ? adapter
              : a.path === "next/navigation"
                ? `export function usePathname(){return location.pathname}export function useSearchParams(){return new URLSearchParams(location.search)}export function useRouter(){return{refresh(){},push(){}}}export function notFound(){throw Object.assign(new Error('not-found'),{kind:'not-found'})}export function redirect(href){throw new Error('redirect:'+href)}`
                : `import React from'react';export default function Adapter({children,prefetch,fill,priority,unoptimized,replace,scroll,...p}){return React.createElement('${a.path === "next/image" ? "img" : "a"}',p,children)}`,
          loader: "jsx",
          resolveDir: root,
        }));
      },
    },
  ],
});
const css = (
  await postcss([tailwind()]).process(
    globals.map((f) => readFileSync(f, "utf8")).join("\n") +
      "\n" +
      bundle.outputFiles
        .filter((f) => f.path.endsWith(".css"))
        .map((f) => f.text)
        .join("\n"),
    { from: resolve("src/app/globals.css") },
  )
).css;
const js = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text;
writeFileSync(out + "/bundle.js", js);
writeFileSync(out + "/styles.css", css);
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

let browser;
const results = [];
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : {}),
  });
  const origin = "http://127.0.0.1:" + server.address().port;
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const width of [360, 390, 820, 1440]) {
        const c = await browser.newContext({
          viewport: { width, height: 900 },
          reducedMotion: "reduce",
        });
        const attempts = [];
        const reports = [];
        const reportStatus = { 360: 200, 390: 401, 820: 429, 1440: 503 }[width];
        await c.route("**/*", async (r) => {
          const u = new URL(r.request().url());
          if (
            u.origin === origin &&
            u.pathname === "/api/community/stories/0/report" &&
            r.request().method() === "POST"
          ) {
            reports.push(r.request().postDataJSON());
            return r.fulfill({
              status: reportStatus,
              json:
                reportStatus === 200
                  ? { reported: true }
                  : { error: "synthetic" },
            });
          }
          if (u.origin !== origin || r.request().method() !== "GET") {
            attempts.push(u.href);
            return r.abort();
          }
          if (u.pathname === "/api/community/stories/cities")
            return r.fulfill({
              json: {
                available: true,
                cities: [
                  {
                    id: "malaga",
                    slug: "malaga",
                    nameEn: locale === "en" ? null : "Malaga",
                    nameEs: "Málaga",
                    latitude: 36.7,
                    longitude: -4.4,
                    approvedStories24h: 2,
                  },
                  {
                    id: "empty",
                    slug: "empty",
                    nameEn: "Empty",
                    nameEs: "Vacía",
                    latitude: 36.6,
                    longitude: -4.5,
                    approvedStories24h: 1,
                  },
                ],
              },
            });
          if (u.pathname === "/api/community/stories")
            return r.fulfill({
              json: {
                available: true,
                stories:
                  u.searchParams.get("city") === "empty"
                    ? []
                    : [0, 1].map((i) => ({
                        id: String(i),
                        citySlug: "malaga",
                        venueName: "Synthetic fixture venue",
                        caption: "Synthetic moment " + i,
                        kind: "venue",
                        expiresAt: new Date(Date.now() + 60000).toISOString(),
                        mediaUrl: "/api/community/stories/" + i + "/media",
                      })),
              },
            });
          if (u.pathname.endsWith("/media"))
            return r.fulfill({
              contentType: "image/svg+xml",
              body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#38251b"/><text x="20" y="80" fill="white">Synthetic test image</text></svg>',
            });
          return r.continue();
        });
        const p = await c.newPage();
        const errors = [];
        p.on("pageerror", (e) => errors.push(String(e)));
        await p.goto(origin + "/?" + new URLSearchParams({ locale, theme }));
        const city = p.getByRole("button", {
          name: /Málaga/,
        });
        await expect(city).toBeVisible();
        await p.screenshot({
          path: out + "/" + [locale, theme, width, "row"].join("-") + ".png",
        });
        let tabs = 0;
        for (; tabs < 30; tabs++) {
          await p.keyboard.press("Tab");
          if (await city.evaluate((el) => el === document.activeElement)) break;
        }
        expect(tabs).toBeLessThan(30);
        await expect(city).toBeFocused();
        await p.keyboard.press("Enter");
        const dialog = p.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expect(p.getByText("Synthetic moment 0")).toBeVisible();
        await p.keyboard.press("ArrowRight");
        await expect(p.getByText("Synthetic moment 1")).toBeVisible();
        await p.keyboard.press("ArrowLeft");
        await expect(p.getByText("Synthetic moment 0")).toBeVisible();
        const media = p.getByRole("img", { name: "Synthetic moment 0" });
        await media.evaluate((element) => {
          for (const [type, clientX] of [
            ["touchstart", 200],
            ["touchend", 100],
          ]) {
            const touch = new Touch({
              identifier: 1,
              target: element,
              clientX,
            });
            element.dispatchEvent(
              new TouchEvent(type, { bubbles: true, changedTouches: [touch] }),
            );
          }
        });
        await expect(p.getByText("Synthetic moment 1")).toBeVisible();
        await p.keyboard.press("ArrowLeft");
        const image =
          out + "/" + [locale, theme, width, "viewer"].join("-") + ".png";
        await p.screenshot({ path: image });
        await p
          .getByRole("button", {
            name: locale === "es" ? "Denunciar historia" : "Report story",
          })
          .click();
        const send = p.getByRole("button", {
          name: locale === "es" ? "Enviar denuncia" : "Send report",
        });
        await expect(send).toBeDisabled();
        await p
          .getByLabel(
            locale === "es" ? "Motivo de la denuncia" : "Report reason",
          )
          .selectOption("privacy");
        await send.focus();
        await p.keyboard.press("Enter");
        if (reportStatus === 200)
          await expect(
            p.getByText(
              locale === "es"
                ? "Denuncia recibida. Nuestro equipo la revisará."
                : "Report received. Our team will review it.",
            ),
          ).toBeVisible();
        else {
          await expect(p.getByRole("alert")).toBeVisible();
          await expect(
            p.getByText(
              locale === "es"
                ? "Denuncia recibida. Nuestro equipo la revisará."
                : "Report received. Our team will review it.",
            ),
          ).toHaveCount(0);
        }
        expect(reports).toEqual([{ reason: "privacy" }]);
        await expect(dialog).toBeVisible();
        if (reportStatus === 401)
          await expect(
            p.getByRole("link", {
              name: locale === "es" ? "Iniciar sesión" : "Sign in",
            }),
          ).toHaveAttribute(
            "href",
            `/${locale}/auth?next=${encodeURIComponent(`/${locale}/community`)}`,
          );
        await p.screenshot({
          path: out + "/" + [locale, theme, width, "report"].join("-") + ".png",
        });
        await p.keyboard.press("Escape");
        await expect(dialog).not.toBeVisible();
        await expect(city).toBeFocused();
        await p
          .getByRole("button", { name: locale === "es" ? /Vacía/ : /Empty/ })
          .click();
        await expect(
          p.getByRole("link", {
            name: locale === "es" ? "Hacer check-in" : "Check in",
          }),
        ).toHaveAttribute("href", "/" + locale + "/check-in");
        await p.keyboard.press("Escape");
        expect(
          await p.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        ).toBeLessThanOrEqual(1);
        expect(errors).toEqual([]);
        expect(attempts).toEqual([]);
        results.push({
          locale,
          theme,
          width,
          image,
          errors,
          attempts,
          nativeKeyboard: true,
          reportStatus,
          reports,
          emptyViewer: true,
        });
        await c.close();
      }
  console.log(
    "PASS " + results.length + " actual browser story viewer matrices",
  );
} finally {
  writeFileSync(
    out + "/results.json",
    JSON.stringify(
      {
        scope:
          "Unintegrated actual CityStories component with synthetic API/media/report POST only; no provider, real public stories, RLS or device proof",
        initialSourceHashes: initial,
        finalSourceHashes: hashes(),
        results,
      },
      null,
      2,
    ),
  );
  if (browser) await browser.close();
  await new Promise((r) => server.close(r));
}
