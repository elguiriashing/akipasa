import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Real components/CSS with explicit disposable action and certificate adapters.
// This does not exercise production authentication, migrations or reward issuance.
const output = resolve("test-results/prestige");
mkdirSync(output, { recursive: true });
const entry = `import React from "react";import{createRoot}from"react-dom/client";
import{PassportPrestigeCard}from"./src/components/PassportPrestigeCard";
import{PassportPrestigeDownload}from"./src/components/PassportPrestigeDownload";
import{PrestigeControls}from"./src/app/[locale]/passports/prestige/PrestigeControls";import{PassportPrestigeShipping}from"./src/components/PassportPrestigeShipping";import{PassportPrestigePrivacy}from"./src/components/PassportPrestigePrivacy";
import{PrestigeStudio}from"./src/app/[locale]/admin/passports/prestige/PrestigeStudio";
import styles from "./src/components/passport-prestige.module.css";
const q=new URLSearchParams(location.search),locale=q.get("locale")==="es"?"es":"en",admin=["admin","delivery"].includes(q.get("screen")),shipping=q.get("screen")==="shipping",delivery=q.get("screen")==="delivery";
const award={id:"10000000-0000-0000-0000-000000000001",programme_key:"city_master",public_id:"10000000-0000-0000-0000-000000000002",serial:42,title_es:"Maestro holográfico de la ciudad y sus diez categorías de exploración",title_en:"Holographic master of the city and all ten exploration categories",public_alias:"Explorer with a deliberately long alias",awarded_at:"2026-10-20T12:00:00Z",shared:false,hall_of_fame:false,revoked_at:null,physical_status:null};
createRoot(document.getElementById("root")).render(<main className={styles.workspace}><h1>{admin?"Prestige studio fixture":"Prestige member fixture"}</h1><p>Disposable fixture · no production activity or awards</p>{admin?<PrestigeStudio locale={locale} programmes={[{...award,key:"city_master",achievement_keys:["stamp_fuengirola_cafe_50"],active:false,physical_eligible:true}]} fulfilmentEnabled={delivery} requests={[{award_id:award.id,serial:42,programme_key:"city_master",status:delivery?"reviewed":"requested",delivery_status:delivery?"ready":"disabled",requested_at:award.awarded_at}]}/>:<div className={styles.grid}><section className={styles.panel}><PassportPrestigeCard locale={locale} award={award}/><PrestigeControls locale={locale} award={award} physicalEligible shippingIntakeEnabled={shipping}/><PassportPrestigeShipping locale={locale} awardId={award.id} enabled={shipping} reviewed={shipping} status="ready"/><PassportPrestigePrivacy locale={locale} awardId={award.id} address={shipping} shared={shipping}/><PassportPrestigeDownload locale={locale} publicId={award.public_id}/></section><section className={styles.panel}><h2>{locale==="es"?"Tu próximo logro":"Your next achievement"}</h2><progress max={50} value={2} aria-label="Fixture progress"/><PrestigeControls locale={locale} programmeKey="city_master"/></section></div>}</main>);`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  outdir: "/tmp/prestige-browser",
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "disposable-prestige-actions",
      setup(builder) {
        builder.onResolve({ filter: /actions$/ }, (args) =>
          /prestige|PassportPrestige/.test(args.importer)
            ? { path: "actions", namespace: "fixture" }
            : undefined,
        );
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: `export async function prestigeMemberAction(locale,input){window.prestigeInput=input;return {success:true}};export async function prestigePrivacyAction(locale,input){window.prestigeInput=input;return {success:true}};export async function prestigeAdminAction(locale,input){window.prestigeInput=input;return input.action==="read_shipping"?{success:true,data:{recipient_name:"Test Recipient",address_line1:"1 Test Road",postal_code:"12345",city:"Test City",country_code:"ES"}}:{success:true}}`,
          loader: "js",
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
  ).css + (bundle.outputFiles.find((f) => f.path.endsWith(".css"))?.text || "");
const script = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text;
const server = createServer((request, response) => {
  if (request.url === "/bundle.js") {
    response.setHeader("Content-Type", "text/javascript");
    response.end(script);
  } else if (request.url === "/styles.css") {
    response.setHeader("Content-Type", "text/css");
    response.end(css);
  } else if (request.url?.startsWith("/api/passports/prestige/")) {
    response.setHeader("Content-Type", "image/svg+xml");
    response.end(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#091c32"/><text x="60" y="300" fill="white" font-size="42">Disposable sharing fixture</text></svg>',
    );
  } else {
    const theme = new URL(request.url, "http://localhost").searchParams.get(
      "theme",
    );
    response.setHeader("Content-Type", "text/html");
    response.end(
      `<!doctype html><html data-theme="${theme === "light" ? "light" : "dark"}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`,
    );
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
let browser;
const results = [];
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PRESTIGE_BROWSER_PATH
      ? { executablePath: process.env.PRESTIGE_BROWSER_PATH }
      : {}),
  });
  for (const screen of ["member", "admin", "shipping", "delivery"])
    for (const locale of ["en", "es"])
      for (const theme of ["light", "dark"])
        for (const [width, height] of [
          [360, 780],
          [768, 1024],
          [1024, 600],
          [1440, 900],
        ]) {
          const page = await browser.newPage({
            viewport: { width, height },
            colorScheme: theme,
            acceptDownloads: true,
          });
          const errors = [];
          page.on("pageerror", (e) => errors.push(e.message));
          await page.goto(
            `http://127.0.0.1:${port}/?screen=${screen}&locale=${locale}&theme=${theme}`,
          );
          await expect(
            page.getByRole("heading", {
              name: ["admin", "delivery"].includes(screen)
                ? "Prestige studio fixture"
                : "Prestige member fixture",
              exact: true,
            }),
          ).toBeVisible();
          await expect
            .poll(() =>
              page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
              ),
            )
            .toBe(true);
          for (const button of await page.getByRole("button").all()) {
            const box = await button.boundingBox();
            expect(box).toBeTruthy();
            expect(box.height).toBeGreaterThanOrEqual(44);
            expect(box.x).toBeGreaterThanOrEqual(-1);
            expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
          }
          if (["member", "shipping"].includes(screen)) {
            const privacyButton = page.getByRole("button", {
              name: locale === "es" ? "Guardar privacidad" : "Save privacy",
              exact: true,
            });
            const controlStyle = await privacyButton.evaluate((element) => {
              const style = getComputedStyle(element);
              return {
                background: style.backgroundColor,
                border: style.borderTopWidth,
              };
            });
            expect(controlStyle.background).not.toBe("rgba(0, 0, 0, 0)");
            expect(controlStyle.border).toBe("1px");
            expect(
              await page
                .locator("progress")
                .evaluate((element) => getComputedStyle(element).appearance),
            ).toBe("none");
            const check = page.getByRole("checkbox").first();
            expect((await check.boundingBox()).width).toBeGreaterThanOrEqual(
              19,
            );
            expect(
              await check.evaluate(
                (element) =>
                  element.closest("label").getBoundingClientRect().height,
              ),
            ).toBeGreaterThanOrEqual(44);
            await check.focus();
            await page.keyboard.press("Space");
            await expect(check).toBeChecked();
            await page
              .getByRole("button", {
                name: locale === "es" ? "Guardar privacidad" : "Save privacy",
                exact: true,
              })
              .click();
            await expect
              .poll(() => page.evaluate(() => window.prestigeInput?.shared))
              .toBe(true);
            const download = page.waitForEvent("download");
            await page
              .getByRole("button", {
                name:
                  locale === "es"
                    ? "Descargar tarjeta PNG"
                    : "Download PNG sharing card",
                exact: true,
              })
              .click();
            const file = await download;
            const buffer = readFileSync(await file.path());
            expect(buffer.subarray(1, 4).toString()).toBe("PNG");
            expect(buffer.readUInt32BE(16)).toBe(1200);
            expect(buffer.readUInt32BE(20)).toBe(630);
            const trophyTitle = page.getByRole("heading", {
              name:
                locale === "es"
                  ? "Maestro holográfico de la ciudad y sus diez categorías de exploración"
                  : "Holographic master of the city and all ten exploration categories",
              exact: true,
            });
            expect(
              await trophyTitle.evaluate((el) => getComputedStyle(el).color),
            ).toBe("rgb(238, 250, 255)");
            await page.emulateMedia({ reducedMotion: "reduce" });
            expect(
              await page
                .locator("svg")
                .first()
                .evaluate((el) => getComputedStyle(el).animationName),
            ).toBe("none");
          }
          if (screen === "shipping") {
            await page
              .getByText(
                locale === "es"
                  ? "Dirección privada de envío"
                  : "Private shipping address",
                { exact: true },
              )
              .click();
            await page
              .getByLabel(locale === "es" ? "Destinatario" : "Recipient", {
                exact: true,
              })
              .fill("Test Recipient");
            await page
              .getByLabel(locale === "es" ? "Dirección" : "Address", {
                exact: true,
              })
              .fill("1 Test Road");
            await page
              .getByLabel(locale === "es" ? "Código postal" : "Postal code", {
                exact: true,
              })
              .fill("12345");
            await page
              .getByLabel(locale === "es" ? "Ciudad" : "City", { exact: true })
              .fill("Test City");
            await page
              .getByLabel(
                locale === "es"
                  ? "Código de país (ES, GB…)"
                  : "Country code (ES, GB…)",
                { exact: true },
              )
              .fill("ES");
            await page
              .getByRole("button", {
                name:
                  locale === "es"
                    ? "Guardar dirección privada"
                    : "Save private address",
                exact: true,
              })
              .click();
            await expect
              .poll(() => page.evaluate(() => window.prestigeInput?.action))
              .toBe("shipping_submit");
            await page
              .getByRole("button", {
                name:
                  locale === "es"
                    ? "Eliminar dirección de envío"
                    : "Delete shipping address",
                exact: true,
              })
              .click();
            await expect
              .poll(() => page.evaluate(() => window.prestigeInput?.action))
              .toBe("shipping_delete");
          }
          if (screen === "delivery") {
            await page
              .getByText(
                locale === "es"
                  ? "Dirección y estado de entrega"
                  : "Address and delivery status",
                { exact: true },
              )
              .click();
            await page
              .getByLabel(
                locale === "es" ? "Motivo de acceso" : "Access reason",
                { exact: true },
              )
              .fill("Synthetic acceptance");
            await page
              .getByRole("button", {
                name:
                  locale === "es"
                    ? "Consultar dirección privada"
                    : "Read private address",
                exact: true,
              })
              .click();
            await expect(
              page.getByText("Test Recipient", { exact: true }),
            ).toBeVisible();
            await page
              .getByRole("button", {
                name: locale === "es" ? "Ocultar dirección" : "Hide address",
                exact: true,
              })
              .click();
            await expect(
              page.getByText("Test Recipient", { exact: true }),
            ).toHaveCount(0);
            const group = page.getByRole("group", {
              name:
                locale === "es"
                  ? "Actualización manual de entrega"
                  : "Manual delivery update",
            });
            await group
              .getByLabel(locale === "es" ? "Motivo" : "Reason", {
                exact: true,
              })
              .fill("Synthetic status review");
            await group
              .getByRole("button", {
                name: locale === "es" ? "Registrar estado" : "Record status",
                exact: true,
              })
              .click();
            await expect
              .poll(() => page.evaluate(() => window.prestigeInput?.action))
              .toBe("delivery");
          }
          expect(errors).toEqual([]);
          // Keep the required full-page screenshot; retry only Chromium's
          // intermittent Page.captureScreenshot protocol rejection.
          const screenshotPath = resolve(
            output,
            `${screen}-${locale}-${theme}-${width}.png`,
          );
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              await page.screenshot({
                path: screenshotPath,
                fullPage: true,
                animations: "disabled",
              });
              break;
            } catch (error) {
              const chromiumCaptureFailure =
                String(error).includes("Page.captureScreenshot") &&
                String(error).includes("Unable to capture screenshot");
              if (!chromiumCaptureFailure || attempt === 1) throw error;
              await page.waitForTimeout(350);
            }
          }
          results.push({
            screen,
            locale,
            theme,
            width,
            height,
            status: "pass",
          });
          await page.close();
        }
  writeFileSync(
    resolve(output, "results.json"),
    JSON.stringify(results, null, 2),
  );
  console.log(
    `PASS ${results.length} prestige component browser combinations, PNG dimensions, keyboard, reduced motion and gated shipping/privacy/delivery interactions`,
  );
} finally {
  await browser?.close();
  server.close();
}
