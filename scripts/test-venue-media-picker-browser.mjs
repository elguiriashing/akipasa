import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve("test-results/venue-media-picker");
mkdirSync(dir, { recursive: true });
const entry = `import React from "react";import{createRoot}from"react-dom/client";
import{VenueMediaStudio}from"./src/components/VenueMediaStudio";
const locale=new URLSearchParams(location.search).get("locale")||"en";
const media=Array.from({length:25},(_,i)=>({id:"media-"+i,url:"data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150"><rect width="200" height="150" fill="#375b80"/></svg>'),alt:"Photo "+i,sizeBytes:1024,folder:i%2?"Events":"Venue"}));
createRoot(document.getElementById("root")).render(<VenueMediaStudio locale={locale} venueId="disposable-venue" media={media} placements={{}}/>);`;
const bundled = await build({
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
          { filter: /\/business\/venue\/\[id\]\/(?:premium-actions|actions)$/ },
          () => ({ path: "actions", namespace: "disposable" }),
        );
        b.onLoad({ filter: /.*/, namespace: "disposable" }, () => ({
          contents:
            "export const setMediaFolder=async()=>({ok:true});export const addStayHeaderPhoto=async()=>({ok:true});export const clearVenueMediaPlacement=async()=>({ok:true});export const removeStayHeaderPhoto=async()=>({ok:true});export const removeVenueImage=async()=>({ok:true});export const setVenueMediaPlacement=async()=>({ok:true});",
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
      .map((file) => readFileSync("src/app/" + file, "utf8"))
      .join("\n"),
    { from: resolve("src/app/globals.css") },
  )
).css;
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundled.outputFiles[0].text);
  } else if (req.url === "/styles.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
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
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const [width, height] of [
        [390, 844],
        [768, 1024],
        [1024, 768],
        [1440, 900],
        [640, 400],
      ]) {
        const page = await browser.newPage({
          viewport: { width, height },
          colorScheme: theme,
        });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(
          `http://127.0.0.1:${server.address().port}/?locale=${locale}`,
        );
        await page.locator("html").evaluate((el, t) => {
          el.dataset.theme = t;
          el.classList.add(`theme-${t}`);
        }, theme);
        const trigger = page.getByRole("button", {
          name:
            locale === "es"
              ? "Elegir imagen: Banner del local"
              : "Choose image: Venue banner",
          exact: true,
        });
        await trigger.click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByRole("searchbox")).toBeFocused();
        const bounds = await dialog.evaluate((el) => {
          const rect = (node) => {
            const r = node.getBoundingClientRect();
            return {
              top: r.top,
              bottom: r.bottom,
              left: r.left,
              right: r.right,
              height: r.height,
            };
          };
          return {
            dialog: rect(el),
            controls: rect(el.querySelector(".venue-media-picker-controls")),
            grid: rect(el.querySelector(".event-media-modal-grid")),
            footer: rect(el.querySelector("footer")),
            scroll: el.querySelector(".event-media-modal-grid").scrollHeight,
          };
        });
        expect(bounds.dialog.top).toBeGreaterThanOrEqual(0);
        expect(bounds.dialog.bottom).toBeLessThanOrEqual(height + 1);
        expect(bounds.dialog.left).toBeGreaterThanOrEqual(0);
        expect(bounds.dialog.right).toBeLessThanOrEqual(width + 1);
        expect(bounds.controls.bottom).toBeLessThanOrEqual(bounds.grid.top + 1);
        expect(bounds.grid.height).toBeGreaterThan(40);
        expect(bounds.grid.bottom).toBeLessThanOrEqual(bounds.footer.top + 1);
        expect(bounds.footer.bottom).toBeLessThanOrEqual(height + 1);
        const cards = dialog.locator(".event-media-modal-grid > button");
        const firstCard = await cards.first().boundingBox();
        expect(firstCard.height).toBeGreaterThanOrEqual(144);
        const firstImage = await cards.first().locator("img").boundingBox();
        expect(firstImage.height).toBeGreaterThanOrEqual(96);
        expect(firstImage.y).toBeGreaterThanOrEqual(bounds.grid.top);
        expect(firstImage.y + firstImage.height).toBeLessThanOrEqual(
          bounds.grid.bottom + 1,
        );
        const firstLabel = await cards.first().locator("span").boundingBox();
        expect(firstLabel.height).toBeGreaterThanOrEqual(12);
        expect(firstLabel.y + firstLabel.height).toBeLessThanOrEqual(
          bounds.grid.bottom + 1,
        );
        if (height <= 480) {
          expect(bounds.scroll).toBeGreaterThan(bounds.grid.height);
          await cards.last().scrollIntoViewIfNeeded();
          const lastLabel = await cards.last().locator("span").boundingBox();
          expect(lastLabel.y).toBeGreaterThanOrEqual(bounds.grid.top - 1);
          expect(lastLabel.y + lastLabel.height).toBeLessThanOrEqual(
            bounds.grid.bottom + 1,
          );
          await expect(cards.last()).toBeInViewport();
          await cards.last().click();
          await expect(dialog).toHaveCount(0);
          await expect(trigger).toBeFocused();
          await trigger.click();
        }
        const close = dialog.getByRole("button", {
          name: locale === "es" ? "Cerrar" : "Close",
          exact: true,
        });
        const next = dialog.getByRole("button", {
          name: locale === "es" ? "Página siguiente" : "Next page",
          exact: true,
        });
        await next.focus();
        await page.keyboard.press("Tab");
        await expect(close).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await expect(next).toBeFocused();
        await dialog.getByRole("combobox").selectOption("Events");
        await dialog.getByRole("searchbox").fill("no matching result");
        await expect(
          dialog.getByText(
            locale === "es"
              ? "No hay imágenes disponibles."
              : "No images available.",
          ),
        ).toBeVisible();
        await expect(
          dialog.getByRole("button", {
            name: locale === "es" ? "Usar automático" : "Use automatic",
          }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
        await trigger.click();
        await expect(
          page.getByRole("dialog").getByRole("combobox"),
        ).toHaveValue("");
        await expect(
          page.getByRole("dialog").getByRole("searchbox"),
        ).toHaveValue("");
        await page.screenshot({
          path: resolve(dir, `${locale}-${theme}-${width}x${height}.png`),
        });
        expect(errors).toEqual([]);
        results.push({ locale, theme, width, height, status: "passed" });
        console.log(
          `Media picker ${locale} ${theme} ${width}x${height}: passed`,
        );
        await page.close();
      }
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
  writeFileSync(resolve(dir, "results.json"), JSON.stringify(results, null, 2));
}
