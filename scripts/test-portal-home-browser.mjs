import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Real components and styles; disposable data/actions, never production records.
const dir = resolve("test-results/portal-home");
mkdirSync(dir, { recursive: true });
const entry = `import React from "react";import{createRoot}from"react-dom/client";
import{BusinessHeader}from"./src/components/BusinessHeader";
import{BusinessHome}from"./src/components/BusinessHome";
import{AkiDuermo}from"./src/components/AkiDuermo";
const query=new URLSearchParams(location.search),locale=query.get("lang")||"en",es=locale==="es",stay=query.get("product")==="stay";
const places=Array.from({length:35},(_,i)=>({id:String(i),name:i===34?"Málaga HQ":"Place "+String(i).padStart(2,"0"),slug:"place-"+i,role:i%2?"manager":"owner",status:i%2?"draft":"published",product:i>=20?"stay":"venue"}));
document.body.dataset.product=stay?"akiduermo":"akibusiness";
createRoot(document.getElementById("root")).render(stay?<AkiDuermo initialLocale={locale}/>:<div className="akibusiness-host"><BusinessHeader locale={locale} signedIn signOut={async()=>{window.loggedOut=true}}/><main style={{maxWidth:1100,margin:"auto",padding:16}}><BusinessHome locale={locale} places={places} deleteAction={async()=>{window.deleted=true}}/></main></div>);`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  outdir: "/tmp/portal-home-browser-build",
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env": JSON.stringify({ NODE_ENV: "production" }),
  },
  plugins: [
    {
      name: "next-browser-adapters",
      setup(b) {
        b.onResolve({ filter: /^next\/(link|image|navigation)$/ }, (args) => ({
          path: args.path,
          namespace: "test",
        }));
        b.onLoad({ filter: /.*/, namespace: "test" }, (args) => ({
          contents: args.path.endsWith("navigation")
            ? 'export function usePathname(){return "/"}export function useSearchParams(){return new URLSearchParams(location.search)}'
            : args.path.endsWith("image")
              ? 'import React from "react";export default function Image({fill,priority,sizes,...props}){return React.createElement("img",{...props,style:fill?{position:"absolute",inset:0,width:"100%",height:"100%"}:props.style})}'
              : 'import React from "react";export default function Link({children,...props}){return React.createElement("a",props,children)}',
          loader: "jsx",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
const css =
  (
    await postcss([tailwind()]).process(
      [
        "globals.css",
        "compact-app.css",
        "brand.css",
        "appearance.css",
        "tablet-responsive.css",
        "portal-unity.css",
      ]
        .map((file) => readFileSync(`src/app/${file}`, "utf8"))
        .join("\n"),
      { from: resolve("src/app/globals.css") },
    )
  ).css +
  (bundle.outputFiles.find((file) => file.path.endsWith(".css"))?.text || "");
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundle.outputFiles.find((file) => file.path.endsWith(".js")).text);
  } else if (req.url === "/styles.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else if (req.url.startsWith("/api/stays")) {
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        rows: [],
        total: 0,
        availabilityChecked: req.url.includes("checkIn="),
      }),
    );
  } else if (
    req.url.startsWith("/brand/") ||
    req.url.startsWith("/images/cities/")
  ) {
    try {
      const path = new URL(req.url, "http://localhost").pathname;
      if (!/^\/(brand|images\/cities)\/[a-z-]+\.(png|webp)$/.test(path))
        throw new Error("invalid");
      res.setHeader(
        "Content-Type",
        path.endsWith(".png") ? "image/png" : "image/webp",
      );
      res.end(readFileSync(`public${path}`));
    } catch {
      res.statusCode = 404;
      res.end();
    }
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  }
});
await new Promise((r) => server.listen(3197, "127.0.0.1", r));
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
    for (const theme of ["light", "dark"])
      for (const [width, height] of [
        [360, 800],
        [390, 844],
        [512, 768],
        [600, 960],
        [820, 1180],
        [960, 1536],
        [1536, 960],
        [640, 400],
      ])
        for (const product of ["business", "stay"]) {
          console.log(
            `Checking ${product} ${locale} ${theme} ${width}x${height}`,
          );
          const page = await browser.newPage({
            viewport: { width, height },
            colorScheme: theme,
          });
          const errors = [];
          page.on("pageerror", (error) => {
            errors.push(error.message);
            console.error(error);
          });
          await page.addInitScript((theme) => {
            localStorage.setItem("akipasa.theme", theme);
            document.documentElement.dataset.theme = theme;
          }, theme);
          await page.goto(
            `http://127.0.0.1:3197/?lang=${locale}&product=${product}`,
          );
          try {
            await expect(page.locator("header").first()).toBeVisible();
          } catch (error) {
            await page.screenshot({
              path: `${dir}/failed-${product}-${locale}-${theme}-${width}.png`,
            });
            writeFileSync(
              `${dir}/errors.json`,
              JSON.stringify(errors, null, 2),
            );
            throw error;
          }
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
          ).toBeLessThanOrEqual(width + 1);
          const icon = page.locator(
            `header img[src="/brand/${product === "stay" ? "duermo" : "business"}-icon.png"]`,
          );
          await expect(icon).toBeVisible();
          expect(
            await icon.evaluate((img) => img.complete && img.naturalWidth > 0),
          ).toBe(true);
          for (const control of await page
            .locator("header")
            .first()
            .locator("a:visible,button:visible,summary:visible")
            .all()) {
            const box = await control.boundingBox();
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
          }
          if (product === "business") {
            await expect(page.locator("article")).toHaveCount(8);
            await page
              .getByRole("button", {
                name: locale === "es" ? "Siguiente" : "Next",
                exact: true,
              })
              .click();
            await expect(
              page.getByText("2 / 5", { exact: true }),
            ).toBeVisible();
            await page
              .getByRole("button", {
                name: locale === "es" ? /^Alojamientos/ : /^Stays/,
              })
              .click();
            await expect(
              page.getByText("1 / 2", { exact: true }),
            ).toBeVisible();
            await page.getByRole("searchbox").fill("malaga");
            await expect(page.locator("article")).toHaveCount(1);
            const manage = page.getByRole("link", {
              name:
                locale === "es" ? "Gestionar Málaga HQ" : "Manage Málaga HQ",
            });
            await expect(manage).toHaveAttribute(
              "href",
              `/${locale}/business/venue/34`,
            );
            const more = page.locator("header summary");
            await more.click();
            await expect(
              page.getByRole("link", { name: "AkiHQ", exact: true }),
            ).toBeVisible();
            await expect(
              page.getByRole("button", {
                name: locale === "es" ? "Cerrar sesión" : "Log out",
              }),
            ).toBeVisible();
            await more.click();
            await page
              .getByRole("button", {
                name: locale === "es" ? "Restablecer filtros" : "Reset filters",
              })
              .count()
              .then(async (count) => {
                if (count)
                  await page
                    .getByRole("button", {
                      name:
                        locale === "es"
                          ? "Restablecer filtros"
                          : "Reset filters",
                    })
                    .click();
              });
            await page.getByRole("searchbox").fill("");
          } else {
            const nav = page.getByRole("navigation", {
              name:
                locale === "es"
                  ? "Navegación de AkiDuermo"
                  : "AkiDuermo navigation",
            });
            await expect(nav.locator("a")).toHaveCount(5);
            const search = page.getByRole("button", {
              name: locale === "es" ? "Buscar alojamiento" : "Find a stay",
            });
            await expect(search).toBeVisible();
            // Search CTA reachable in the first phone/tablet screen; short split windows scroll naturally.
            if (height >= 768) {
              const box = await search.boundingBox();
              expect(box.y + box.height).toBeLessThanOrEqual(height);
            }
            await page
              .getByRole("textbox", {
                name: locale === "es" ? "Destino" : "Destination",
              })
              .fill("Málaga");
            await search.click();
            await expect(page.locator("#stays")).toContainText("Málaga");
            await page.evaluate(() => window.scrollTo(0, 0));
          }
          expect(errors).toEqual([]);
          if ([390, 960, 1536].includes(width))
            await page.screenshot({
              path: `${dir}/${product}-${locale}-${theme}-${width}.png`,
              fullPage: false,
            });
          results.push({ locale, theme, width, height, product, pass: true });
          await page.close();
        }
  writeFileSync(`${dir}/results.json`, JSON.stringify(results, null, 2));
  console.log(
    `Portal home browser acceptance: ${results.length} combinations passed`,
  );
} finally {
  await browser?.close();
  server.close();
}
