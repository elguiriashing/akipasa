import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";

// Actual async PassportPage + actual PassportBook and chapter components.
// Only identity, provider reads and server actions are disposable adapters.
// Synthetic appearances/stamps are fixture data, never real earned activity.
const directory = resolve("test-results/passport-protected-chapters");
mkdirSync(directory, { recursive: true });
const fixture = `export async function optionalUser(){
const params=new URLSearchParams(location.search),state=params.get('state');window.__reads=[];
const now=Date.now();const rows={passports:[{id:'fixture-route',slug:'synthetic-route',title_es:'Ruta sintética de prueba',title_en:'Synthetic fixture route',description_es:'Datos desechables para revisar el diseño.',description_en:'Disposable data for visual review.',reward_es:'Premio de prueba',reward_en:'Fixture reward',access_tier:'free',completion_window_days:7,starts_at:new Date(now-86400000).toISOString(),ends_at:new Date(now+2592000000).toISOString(),passport_steps:[{id:'fixture-step',label_es:'Parada de prueba',label_en:'Fixture stop',venues:{name:'Synthetic venue'}}],passport_rewards:[]}],loyalty_programs:[{id:'fixture-program',title_es:'Programa de prueba',title_en:'Fixture programme',reward_es:'Recompensa de prueba',reward_en:'Fixture reward',stamps_required:5,venues:{name:'Synthetic venue'},loyalty_program_rewards:[]}],loyalty_ledger:[{program_id:'fixture-program',delta:2}],xp_ledger:[{delta:40}],passport_progress:[{step_id:'fixture-step',enrollment_id:'fixture-enrollment'}],passport_enrollments:[{id:'fixture-enrollment',passport_id:'fixture-route',started_at:new Date(now-86400000).toISOString(),expires_at:new Date(now+518400000).toISOString(),state:'active',completed_at:null}],reward_claims:[],check_ins:[]};
return {user:{id:'fixture-explorer'},supabase:{from(table){const result={data:state==='unavailable'?null:state==='empty'?[]:rows[table]||[],error:state==='unavailable'?{message:'Private synthetic provider error, must never display'}:null};const filters={};const query={select(...args){window.__reads.push({table,method:'select',args});return query},eq(...args){window.__reads.push({table,method:'eq',args});filters[args[0]]=args[1];return query},in(){return query},not(){return query},lt(){return query},lte(){return query},gte(){return query},order(){return query},limit(){return query},maybeSingle(){if(table!=='check_ins'||filters.id!=='00000000-0000-4000-8000-000000000438'||filters.profile_id!=='fixture-explorer')throw Error('Fixture receipt read must constrain exact id and caller');window.__reads.push({table,method:'maybeSingle',args:[]});return Promise.resolve({data:params.get('receipt')==='owned'?{id:filters.id,state:'duplicate',risk_flags:['outside_geofence'],distance_meters:438,venues:{slug:'synthetic-venue'}}:null,error:null})},then(fn){return Promise.resolve(result).then(fn)}};return query}}};}`;
const entry = `import React from 'react';import{createRoot}from'react-dom/client';import Page from './src/app/[locale]/passports/page';
const q=new URLSearchParams(location.search),locale=q.get('lang')||'en';
async function resolveNode(node){if(Array.isArray(node))return Promise.all(node.map(resolveNode));if(!React.isValidElement(node))return node;if(typeof node.type==='function'&&node.type.constructor.name==='AsyncFunction')return resolveNode(await node.type(node.props));const props={};for(const[key,value]of Object.entries(node.props))props[key]=await resolveNode(value);return React.cloneElement(node,props)}
window.__textContrast=(element,overrideColour,opacity=1)=>{const rgba=value=>{if(!/^rgba?\\(/.test(value)){const canvas=document.createElement("canvas");canvas.width=canvas.height=1;const context=canvas.getContext("2d");context.fillStyle=value;context.fillRect(0,0,1,1);const pixel=context.getImageData(0,0,1,1).data;return[pixel[0],pixel[1],pixel[2],pixel[3]/255]}const result=(value.match(/[0-9.]+/g)||[]).map(Number);return result.length===3?[...result,1]:result};const mix=(top,bottom)=>top.slice(0,3).map((channel,i)=>channel*top[3]+bottom[i]*(1-top[3]));let colours=[[255,255,255]],node=element,chain=[];while(node){chain.unshift(node);node=node.parentElement}for(const layer of chain){const style=getComputedStyle(layer),colour=rgba(style.backgroundColor);if(colour.length===4)colours=colours.map(base=>mix(colour,base));if(style.backgroundImage!=='none'){const stops=[...style.backgroundImage.matchAll(/rgba?\\(([^)]+)\\)/g)].map(match=>rgba(match[0]));if(stops.length)colours=colours.flatMap(base=>stops.map(stop=>mix(stop,base)));}}const lum=rgb=>rgb.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);const ink=rgba(overrideColour||getComputedStyle(element).color);ink[3]*=opacity;return Math.min(...colours.map(base=>{const fg=lum(mix(ink,base)),bg=lum(base);return(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)}))};
window.__writes=[];const element=await Page({params:Promise.resolve({locale}),searchParams:Promise.resolve({view:q.get('view')||'progress',city:q.get('city')||undefined,checkin:q.get('checkin')||undefined,visit:q.get('visit')||undefined})});createRoot(document.getElementById('root')).render(await resolveNode(element));window.__fixtureReady=true;`;
const actions =
  "export const claimPassportReward=async input=>{window.__writes.push('claimPassportReward');throw Error('Fixture never submits rewards')};export const claimStampReward=claimPassportReward;export const enrollPassport=claimPassportReward;";
const bundle = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  outdir: "/tmp/passport-protected-chapters",
  platform: "browser",
  format: "esm",
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env": '{"NODE_ENV":"production"}',
  },
  plugins: [
    {
      name: "disposable-passport-boundaries",
      setup(b) {
        b.onResolve({ filter: /^@\/lib\/auth$/ }, () => ({
          path: "auth",
          namespace: "fixture",
        }));
        b.onResolve({ filter: /supabase\/server$/ }, () => ({
          path: "server",
          namespace: "fixture",
        }));
        b.onResolve({ filter: /^@\/lib\/passport-repository$/ }, () => ({
          path: "collection",
          namespace: "fixture",
        }));
        b.onResolve({ filter: /^@\/lib\/achievement-repository$/ }, () => ({
          path: "achievements",
          namespace: "fixture",
        }));
        b.onResolve({ filter: /^next\/(image|link|navigation)$/ }, (a) => ({
          path: a.path,
          namespace: "fixture",
        }));
        b.onResolve({ filter: /\/actions$|^\.\/actions$/ }, (a) =>
          a.importer.includes("passports/page")
            ? { path: "actions", namespace: "fixture" }
            : undefined,
        );
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
          resolveDir: process.cwd(),
          loader: "jsx",
          contents:
            a.path === "auth"
              ? fixture
              : a.path === "server"
                ? fixture +
                  "export async function createSupabaseServerClient(){return (await optionalUser()).supabase;}"
                : a.path === "collection"
                  ? `export async function myPassportCollection(){const q=new URLSearchParams(location.search);if(q.get('state')!=='populated')return undefined;const milestones=[{key:'synthetic-bronze',tier:1,target:1,title_es:'Bronce sintético',title_en:'Synthetic bronze',unlocked_at:'2026-10-01T00:00:00Z',manual_at:null},{key:'synthetic-silver',tier:2,target:5,title_es:'Plata sintética',title_en:'Synthetic silver',unlocked_at:null,manual_at:null}];return {updated_at:'2026-10-01T00:00:00Z',families:[{family_key:'city:malaga',city_key:'malaga',category_key:null,archived:false,current_count:2,available:10,remaining:8,milestones},{family_key:'city:malaga:cafe',city_key:'malaga',category_key:'cafe',archived:false,current_count:2,available:10,remaining:8,milestones}]}}`
                  : a.path === "achievements"
                    ? `export async function myAchievements(){if(new URLSearchParams(location.search).get("state")==="unavailable")throw Error("Synthetic read failure");return new URLSearchParams(location.search).get("state")==="empty"?[]:[{key:"fixture_earned",title_en:"Synthetic earned badge",title_es:"Logro sintético obtenido",description_en:"Disposable fixture achievement, not real activity.",description_es:"Logro de prueba desechable, no actividad real.",condition_type:"xp",target_count:40,minimum_xp:40,icon:"discover",active:true,updated_at:"2026-10-29T00:00:00Z",current_count:40,unlocked_at:"2026-10-29T00:00:00Z",city_key:null,category_key:null},{key:"fixture_locked",title_en:"Synthetic locked badge",title_es:"Logro sintético pendiente",description_en:"Disposable future milestone.",description_es:"Meta futura de prueba.",condition_type:"xp",target_count:250,minimum_xp:250,icon:"star",active:true,updated_at:"2026-10-29T00:00:00Z",current_count:40,unlocked_at:null,city_key:null,category_key:null}]}`
                    : a.path === "actions"
                      ? actions
                      : a.path.endsWith("navigation")
                        ? "export function useRouter(){return {refresh(){window.__refreshes=(window.__refreshes||0)+1}}}export function notFound(){throw Error('not-found')}"
                        : a.path.endsWith("image")
                          ? `import React from 'react';export default function Image({fill,priority,unoptimized,sizes,...props}){return <img {...props} style={fill?{position:'absolute',inset:0,width:'100%',height:'100%',...props.style}:props.style}/>} `
                          : `import React from 'react';export default function Link({children,prefetch,...props}){return <a {...props}>{children}</a>}`,
        }));
      },
    },
  ],
});
const css =
  (
    await postcss([tailwind()]).process(
      readFileSync("src/app/globals.css", "utf8"),
      { from: resolve("src/app/globals.css") },
    )
  ).css +
  readFileSync("src/app/appearance.css", "utf8") +
  (bundle.outputFiles.find((f) => f.path.endsWith(".css"))?.text || "");
const script = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text;
const server = createServer((req, res) => {
  const u = new URL(req.url, "http://localhost");
  if (req.method !== "GET") {
    res.writeHead(405).end();
    return;
  }
  if (u.pathname === "/bundle.js") {
    res.setHeader("content-type", "text/javascript");
    res.end(script);
    return;
  }
  const file = resolve("public", "." + u.pathname);
  if (
    file.startsWith(resolve("public") + "/") &&
    existsSync(file) &&
    extname(file)
  ) {
    res.setHeader(
      "content-type",
      extname(file) === ".svg"
        ? "image/svg+xml"
        : extname(file) === ".webp"
          ? "image/webp"
          : "application/octet-stream",
    );
    res.end(readFileSync(file));
    return;
  }
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css} .fixture-label{position:fixed;z-index:100;bottom:0;left:0;background:#fff4d6;color:#382719;font:10px sans-serif;padding:3px 8px;pointer-events:none}</style></head><body><div class="fixture-label">Synthetic protected chapter fixture · no real awards or provider session</div><div class="app-shell app-shell--passport"><main class="app-content"><div id="root"></div></main></div><script type="module" src="/bundle.js"></script></body></html>`,
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  executablePath: process.env.BOOKING_BROWSER_PATH,
  headless: true,
  args: ["--no-sandbox"],
});
const results = [],
  blocked = [],
  pageErrors = [];
try {
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const width of [360, 390, 820, 1440])
        for (const state of ["populated", "empty", "unavailable"]) {
          const context = await browser.newContext({
            viewport: { width, height: 900 },
            hasTouch: width === 390,
            reducedMotion: "reduce",
            colorScheme: theme,
            locale: locale === "es" ? "es-ES" : "en-GB",
          });
          await context.route("**/*", (route) => {
            const request = route.request();
            if (
              new URL(request.url()).origin !== origin ||
              request.method() !== "GET"
            ) {
              blocked.push({ url: request.url(), method: request.method() });
              return route.abort();
            }
            return route.continue();
          });
          await context.addInitScript((theme) => {
            document.addEventListener("DOMContentLoaded", () => {
              for (const node of [document.documentElement, document.body]) {
                node.dataset.theme = theme;
                node.classList.add("theme-" + theme);
              }
            });
          }, theme);
          const page = await context.newPage();
          page.on("pageerror", (e) => pageErrors.push(String(e)));
          for (const chapter of [
            "progress",
            "passports",
            "stamps",
            "badges",
            ...(width === 1440 &&
            state === "populated" &&
            ((locale === "en" && theme === "dark") ||
              (locale === "es" && theme === "light"))
              ? ["city"]
              : []),
          ]) {
            await page.goto(
              `${origin}/?lang=${locale}&view=${chapter}&state=${state}${chapter === "city" ? "&city=malaga" : ""}`,
            );
            await page.waitForFunction(() => window.__fixtureReady === true);
            await expect(page.locator("h2").first()).toBeVisible();
            expect(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            ).toBe(true);
            expect(
              await page
                .getByText(
                  "Private synthetic provider error, must never display",
                  { exact: true },
                )
                .count(),
            ).toBe(0);
            expect(await page.evaluate(() => window.__writes)).toEqual([]);
            const own = await page.evaluate(() =>
              window.__reads.filter(
                (x) =>
                  [
                    "loyalty_ledger",
                    "xp_ledger",
                    "passport_progress",
                    "passport_enrollments",
                    "reward_claims",
                    "check_ins",
                  ].includes(x.table) && x.method === "eq",
              ),
            );
            for (const table of [
              "loyalty_ledger",
              "xp_ledger",
              "passport_progress",
              "passport_enrollments",
              "reward_claims",
              "check_ins",
            ])
              expect(
                own.some(
                  (x) =>
                    x.table === table &&
                    x.args[0] === "profile_id" &&
                    x.args[1] === "fixture-explorer",
                ),
              ).toBe(true);
            if (chapter === "progress" && state === "populated")
              await expect(
                page.locator(".metrics-grid").getByText("40", { exact: true }),
              ).toBeVisible();
            if (chapter === "passports" && state === "populated")
              await expect(
                page.getByRole("heading", {
                  name:
                    locale === "es"
                      ? "Ruta sintética de prueba"
                      : "Synthetic fixture route",
                  exact: true,
                }),
              ).toBeVisible();
            if (chapter === "stamps" && state === "populated")
              await expect(
                page.getByRole("heading", {
                  name:
                    locale === "es"
                      ? "Programa de prueba"
                      : "Fixture programme",
                  exact: true,
                }),
              ).toBeVisible();
            if (chapter === "progress") {
              const metrics = await page
                .locator(".metric-card")
                .evaluateAll((cards) =>
                  cards.flatMap((card) =>
                    [
                      ...card.querySelectorAll(
                        ":scope > span, :scope > strong, :scope > small",
                      ),
                    ].map((label) => {
                      const channels = (value) =>
                        value
                          .match(/[\d.]+/g)
                          .map(Number)
                          .slice(0, 3);
                      const lum = (rgb) =>
                        rgb
                          .map((x) => x / 255)
                          .map((x) =>
                            x <= 0.04045
                              ? x / 12.92
                              : ((x + 0.055) / 1.055) ** 2.4,
                          )
                          .reduce(
                            (sum, x, i) =>
                              sum + x * [0.2126, 0.7152, 0.0722][i],
                            0,
                          );
                      const foreground = lum(
                          channels(getComputedStyle(label).color),
                        ),
                        background = lum(
                          channels(getComputedStyle(card).backgroundColor),
                        );
                      return {
                        label: label.textContent,
                        contrast:
                          (Math.max(foreground, background) + 0.05) /
                          (Math.min(foreground, background) + 0.05),
                      };
                    }),
                  ),
                );
              for (const metric of metrics)
                expect(metric.contrast, metric.label).toBeGreaterThanOrEqual(
                  4.5,
                );
            }
            if (chapter === "progress") {
              const weekly = await page
                .locator("#weekly-quests-heading")
                .locator("xpath=ancestor::section[1]")
                .evaluate((section) =>
                  [...section.querySelectorAll("h2,h3,p")].map((label) => {
                    const rgba = (value) =>
                      (value.match(/[\d.]+/g) || []).map(Number);
                    const lum = (rgb) =>
                      rgb
                        .slice(0, 3)
                        .map((x) => x / 255)
                        .map((x) =>
                          x <= 0.04045
                            ? x / 12.92
                            : ((x + 0.055) / 1.055) ** 2.4,
                        )
                        .reduce(
                          (sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i],
                          0,
                        );
                    let parent = label,
                      background;
                    while (parent) {
                      const color = rgba(
                        getComputedStyle(parent).backgroundColor,
                      );
                      if (color.length === 3 || color[3] === 1) {
                        background = color;
                        break;
                      }
                      parent = parent.parentElement;
                    }
                    if (!background) throw Error("Weekly background missing");
                    const fg = lum(rgba(getComputedStyle(label).color)),
                      bg = lum(background);
                    return {
                      label: label.textContent,
                      contrast:
                        (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05),
                    };
                  }),
                );
              for (const label of weekly)
                expect(label.contrast, label.label).toBeGreaterThanOrEqual(4.5);
            }
            if (chapter === "badges" && state === "populated")
              await expect(
                page.getByRole("heading", {
                  name:
                    locale === "es"
                      ? "Logro sintético obtenido"
                      : "Synthetic earned badge",
                  exact: true,
                }),
              ).toBeVisible();
            await expect(
              page.locator("#passport-mobile-menu [role='status']"),
            ).toHaveText(
              locale === "es"
                ? "Movimiento reducido activado."
                : "Reduced motion is enabled.",
            );
            const nestedText = await page
              .locator(
                ".console-section-header h2,.console-section-header > div > p,.console-section-header > div > span,section[aria-labelledby='badge-collection-heading'] h3,section[aria-labelledby='badge-collection-heading'] h4,section[aria-labelledby='badge-collection-heading'] p,section[aria-labelledby='badge-collection-heading'] > a,.stamp-card .card-title-row h3,#passport-mobile-menu [role='status']",
              )
              .evaluateAll((labels) =>
                labels.map((label) => ({
                  label: label.textContent,
                  target: label.matches(".stamp-card .card-title-row h3")
                    ? "loyalty-title"
                    : label.matches("#passport-mobile-menu [role='status']")
                      ? "motion-status"
                      : "chapter-label",
                  contrast: window.__textContrast(label),
                })),
              );
            for (const label of nestedText) {
              if (label.contrast < 4.5) {
                const failureStem = `${directory}/${locale}-${theme}-${width}-${state}-${chapter}-contrast-failure`;
                await page.screenshot({
                  path: `${failureStem}.png`,
                  fullPage: true,
                  animations: "disabled",
                });
                writeFileSync(
                  `${failureStem}.json`,
                  JSON.stringify(
                    {
                      locale,
                      theme,
                      width,
                      state,
                      chapter,
                      ...label,
                      sourceHashes: Object.fromEntries(
                        [
                          "src/components/PassportBook.module.css",
                          "scripts/test-passport-chapter-browser.mjs",
                        ].map((file) => [
                          file,
                          createHash("sha256")
                            .update(readFileSync(file))
                            .digest("hex"),
                        ]),
                      ),
                    },
                    null,
                    2,
                  ),
                );
              }
              expect(label.contrast, label.label).toBeGreaterThanOrEqual(4.5);
            }
            const placeholders = await page
              .locator(
                "section[aria-labelledby='badge-collection-heading'] input[placeholder]",
              )
              .evaluateAll((inputs) =>
                inputs.map((input) => {
                  const pseudo = getComputedStyle(input, "::placeholder");
                  return {
                    colour: pseudo.color,
                    opacity: pseudo.opacity,
                    background: getComputedStyle(input).backgroundColor,
                    contrast: window.__textContrast(
                      input,
                      pseudo.color,
                      Number(pseudo.opacity),
                    ),
                  };
                }),
              );
            for (const placeholder of placeholders)
              expect(
                placeholder.contrast,
                JSON.stringify(placeholder),
              ).toBeGreaterThanOrEqual(4.5);
            if (chapter === "city") {
              const collection = page.getByRole("region", {
                name:
                  locale === "es"
                    ? "Colección de la ciudad"
                    : "City collection",
                exact: true,
              });
              await collection.getByRole("combobox").selectOption("cafe");
              await expect(
                collection
                  .getByRole("heading", {
                    name: locale === "es" ? /Bronce/ : /Bronze/,
                  })
                  .first(),
              ).toBeVisible();
              const journal = collection.locator("..");
              const contrast = await journal
                .locator("h3,h4,p,span,small,label,a,select,strong")
                .evaluateAll((nodes) =>
                  nodes
                    .filter(
                      (node) =>
                        node.getBoundingClientRect().width &&
                        node.textContent.trim() &&
                        node.getAttribute("aria-hidden") !== "true",
                    )
                    .map((node) => {
                      let opacity = 1,
                        current = node;
                      while (current) {
                        opacity *= Number(getComputedStyle(current).opacity);
                        current = current.parentElement;
                      }
                      return {
                        text: node.textContent,
                        ratio: window.__textContrast(node, undefined, opacity),
                      };
                    }),
                );
              for (const text of contrast)
                expect(text.ratio, JSON.stringify(text)).toBeGreaterThanOrEqual(
                  4.5,
                );
              await expect(collection.getByRole("combobox")).toHaveCSS(
                "color-scheme",
                "light",
              );
            }
            const file = `${directory}/${locale}-${theme}-${width}-${state}-${chapter}.png`;
            await page.screenshot({
              path: file,
              fullPage: true,
              animations: "disabled",
            });
            results.push({
              locale,
              theme,
              width,
              state,
              chapter,
              file,
              readability: nestedText.filter(
                (label) => label.target !== "chapter-label",
              ),
            });
          }
          await context.close();
        }
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const width of [390, 820, 1440])
        for (const receipt of ["owned", "missing"]) {
          const context = await browser.newContext({
            viewport: { width, height: 900 },
            hasTouch: width === 390,
            reducedMotion: "reduce",
            colorScheme: theme,
          });
          await context.route("**/*", (route) => {
            const request = route.request();
            if (
              new URL(request.url()).origin !== origin ||
              request.method() !== "GET"
            ) {
              blocked.push({ url: request.url(), method: request.method() });
              return route.abort();
            }
            return route.continue();
          });
          await context.addInitScript((theme) => {
            document.addEventListener("DOMContentLoaded", () => {
              for (const node of [document.documentElement, document.body]) {
                node.dataset.theme = theme;
                node.classList.add("theme-" + theme);
              }
            });
          }, theme);
          const page = await context.newPage();
          page.on("pageerror", (error) => pageErrors.push(String(error)));
          await page.goto(
            `${origin}/?lang=${locale}&view=progress&state=populated&checkin=outside_geofence&visit=00000000-0000-4000-8000-000000000438&receipt=${receipt}`,
          );
          await page.waitForFunction(() => window.__fixtureReady === true);
          const failure = page.getByRole("status").filter({
            has: page.getByRole("heading", {
              level: 2,
              name:
                receipt === "owned"
                  ? locale === "en"
                    ? "Move closer to the venue"
                    : "Acércate al local"
                  : locale === "en"
                    ? "We cannot confirm this check-in"
                    : "No podemos confirmar este check-in",
            }),
          });
          await expect(failure).toBeVisible();
          if (receipt === "owned") {
            await expect(failure).toContainText("438 m");
            await expect(
              failure.getByRole("link", {
                name: locale === "en" ? "View venue" : "Ver el local",
              }),
            ).toHaveAttribute("href", `/${locale}/venues/synthetic-venue`);
            await expect(
              failure.getByRole("link", {
                name:
                  locale === "en" ? "Scan official QR" : "Escanear QR oficial",
              }),
            ).toHaveAttribute("href", `/${locale}/check-in`);
          } else {
            await expect(failure).not.toContainText("438 m");
            await expect(failure).not.toContainText(
              locale === "en" ? "Distance checked" : "Distancia comprobada",
            );
            await expect(
              failure.getByRole("link", {
                name: locale === "en" ? "Check my progress" : "Ver mi progreso",
              }),
            ).toHaveAttribute("href", `/${locale}/passports?view=progress`);
            await expect(
              failure.getByRole("link", {
                name: locale === "en" ? "Explore the map" : "Explorar el mapa",
              }),
            ).toHaveAttribute("href", `/${locale}/map`);
          }
          await expect(
            page.getByRole("heading", {
              name:
                locale === "en" ? "You’re checked in!" : "¡Ya estás dentro!",
              exact: true,
            }),
          ).toHaveCount(0);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          expect(await page.evaluate(() => window.__writes)).toEqual([]);
          const reads = await page.evaluate(() => window.__reads);
          expect(
            reads.some(
              (read) =>
                read.table === "check_ins" &&
                read.method === "eq" &&
                read.args[0] === "id" &&
                read.args[1] === "00000000-0000-4000-8000-000000000438",
            ),
          ).toBe(true);
          expect(
            reads.some(
              (read) =>
                read.table === "check_ins" &&
                read.method === "eq" &&
                read.args[0] === "profile_id" &&
                read.args[1] === "fixture-explorer",
            ),
          ).toBe(true);
          expect(
            reads.filter((read) => read.method === "maybeSingle"),
          ).toHaveLength(1);
          const chapterTitle = page.getByRole("heading", {
            name: locale === "en" ? "My journey" : "Mi viaje",
            exact: true,
          });
          await expect(chapterTitle).toBeVisible();
          const failureBounds = await failure.boundingBox(),
            titleBounds = await chapterTitle.boundingBox();
          expect(failureBounds.y).toBeGreaterThanOrEqual(
            titleBounds.y + titleBounds.height,
          );
          const file = `${directory}/${locale}-${theme}-${width}-rejected-${receipt}`;
          await page.screenshot({
            path: `${file}-viewport.png`,
            animations: "disabled",
          });
          await page.screenshot({
            path: `${file}-full.png`,
            fullPage: true,
            animations: "disabled",
          });
          const contrast = await failure
            .locator("h2,p,a")
            .evaluateAll((nodes) =>
              nodes.map((node) => ({
                text: node.textContent,
                contrast: window.__textContrast(node),
              })),
            );
          for (const text of contrast)
            expect(text.contrast, JSON.stringify(text)).toBeGreaterThanOrEqual(
              4.5,
            );
          const weekly = page.locator("#weekly-quests-heading");
          await weekly.scrollIntoViewIfNeeded();
          await expect(weekly).toBeVisible();
          const weeklyBounds = await weekly.boundingBox(),
            scrolledFailure = await failure.boundingBox();
          expect(weeklyBounds.y).toBeGreaterThanOrEqual(
            scrolledFailure.y + scrolledFailure.height,
          );
          await page.screenshot({
            path: `${file}-belowfold.png`,
            animations: "disabled",
          });
          results.push({
            locale,
            theme,
            width,
            state: `rejected-${receipt}`,
            chapter: "progress",
            file: `${file}-full.png`,
            screenshots: [
              `${file}-viewport.png`,
              `${file}-full.png`,
              `${file}-belowfold.png`,
            ],
            realFailureComponent: true,
            ownedReceiptFixture: receipt === "owned",
            persistedDistance: receipt === "owned" ? 438 : null,
            noCelebration: true,
            noWrites: true,
            contrast,
          });
          await context.close();
        }
  expect(blocked).toEqual([]);
  expect(pageErrors).toEqual([]);
  const files = [
    "src/app/[locale]/passports/page.tsx",
    "src/components/PassportBook.tsx",
    "src/components/PassportBook.module.css",
    "src/components/CheckInFailure.tsx",
    "src/components/CheckInFailure.module.css",
    "src/lib/checkin-feedback.ts",
    "scripts/test-passport-chapter-browser.mjs",
  ];
  writeFileSync(
    `${directory}/results.json`,
    JSON.stringify(
      {
        sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        sourceDirty: Boolean(
          execFileSync("git", ["status", "--porcelain"], {
            encoding: "utf8",
          }).trim(),
        ),
        sourceHashes: Object.fromEntries(
          files.map((file) => [
            file,
            createHash("sha256").update(readFileSync(file)).digest("hex"),
          ]),
        ),
        actualPageAndBook: true,
        identityAndReadsAreDisposableAdapters: true,
        physicalAndroid: false,
        providerRLSAcceptance: false,
        blocked,
        pageErrors,
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    `Protected Passport chapters: ${results.length} actual-page/book fixture cases PASS`,
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
