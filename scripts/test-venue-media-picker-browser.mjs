import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// Actual component/styles with disposable images and mutation adapters only.
const dir = resolve("test-results/venue-media-picker");
mkdirSync(dir, { recursive: true });
const entry = `import React from "react";import{createRoot}from"react-dom/client";
import{VenueMediaStudio}from"./src/components/VenueMediaStudio";
const locale=new URLSearchParams(location.search).get("lang")||"en";
const media=Array.from({length:25},(_,i)=>({id:String(i),url:"data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" fill="teal"/></svg>'),alt:"Image "+i,sizeBytes:100,folder:i%2?"Events":"Venue"}));
createRoot(document.getElementById("root")).render(<VenueMediaStudio locale={locale} venueId="disposable" media={media} placements={{}}/>);`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "disposable-media-actions",
      setup(b) {
        b.onResolve(
          { filter: /\/business\/venue\/\[id\]\/(actions|premium-actions)$/ },
          (args) => ({ path: args.path, namespace: "adapter" }),
        );
        b.onResolve({ filter: /SafeMediaFileInput$/ }, (args) => ({
          path: args.path,
          namespace: "input",
        }));
        b.onLoad({ filter: /.*/, namespace: "adapter" }, () => ({
          contents:
            "export const setVenueMediaPlacement=async()=>({ok:true});export const clearVenueMediaPlacement=async()=>({ok:true});export const addStayHeaderPhoto=async()=>({ok:true});export const removeStayHeaderPhoto=async()=>({ok:true});export const removeVenueImage=async()=>({ok:true});export const setMediaFolder=async()=>({ok:true});",
          loader: "js",
        }));
        b.onLoad({ filter: /.*/, namespace: "input" }, () => ({
          contents:
            'import React from "react";export function SafeMediaFileInput(){return React.createElement("input",{type:"file"})}',
          loader: "js",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
const css = (
  await postcss([tailwind()]).process(
    [
      "globals.css",
      "compact-app.css",
      "brand.css",
      "appearance.css",
      "tablet-responsive.css",
    ]
      .map((file) => readFileSync(`src/app/${file}`, "utf8"))
      .join("\n"),
    { from: resolve("src/app/globals.css") },
  )
).css;
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundle.outputFiles[0].text);
  } else if (req.url === "/styles.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><div id="root"></div><script src="/bundle.js"></script>',
    );
  }
});
await new Promise((r) => server.listen(3198, "127.0.0.1", r));
let browser;
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
        [360, 640],
        [768, 1024],
        [1024, 600],
        [1440, 900],
        [640, 400],
      ]) {
        const page = await browser.newPage({
          viewport: { width, height },
          colorScheme: theme,
        });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(`http://127.0.0.1:3198/?lang=${locale}`);
        await page.evaluate(
          (theme) => (document.documentElement.dataset.theme = theme),
          theme,
        );
        const opener = page.getByRole("button", {
          name:
            locale === "es"
              ? "Elegir imagen: Perfil / logo"
              : "Choose image: Profile / logo",
          exact: true,
        });
        await opener.click();
        const dialog = page.getByRole("dialog"),
          search = dialog.getByRole("searchbox");
        await expect(search).toBeFocused();
        await expect(
          dialog.locator(".event-media-modal-grid > button"),
        ).toHaveCount(12);
        const footer = dialog.locator("footer"),
          box = await footer.boundingBox();
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height).toBeLessThanOrEqual(height);
        const grid = dialog.locator(".event-media-modal-grid");
        await grid.evaluate((el) => (el.scrollTop = el.scrollHeight));
        await expect(grid.locator("button").last()).toBeInViewport();
        const next = dialog.getByRole("button", {
          name: locale === "es" ? "Página siguiente" : "Next page",
        });
        await next.focus();
        await page.keyboard.press("Tab");
        await expect(
          dialog.getByRole("button", {
            name: locale === "es" ? "Cerrar" : "Close",
            exact: true,
          }),
        ).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await expect(next).toBeFocused();
        await search.fill("does-not-exist");
        await expect(
          grid.getByText(
            locale === "es"
              ? "No hay imágenes disponibles."
              : "No images available.",
          ),
        ).toBeVisible();
        await expect(footer).toBeInViewport();
        await search.fill("");
        await dialog.getByRole("combobox").selectOption("Events");
        await expect(grid.locator("button")).toHaveCount(12);
        await page.screenshot({
          path: `${dir}/${locale}-${theme}-${width}x${height}.png`,
        });
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(opener).toBeFocused();
        expect(errors).toEqual([]);
        await page.close();
        console.log(`PASS media picker ${locale} ${theme} ${width}x${height}`);
      }
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
