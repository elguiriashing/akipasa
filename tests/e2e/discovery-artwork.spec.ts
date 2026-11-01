import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

let script = "";
let stylesheet = "";
const storefront = readFileSync("public/explore-storefront-placeholder.svg", "utf8");
const transparent = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220"><rect x="130" y="80" width="60" height="60" fill="#f26b1d"/></svg>';

test.use({ serviceWorkers: "block" });
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import { createRoot } from "react-dom/client";
        import { DiscoveryArtwork } from "./src/components/DiscoveryArtwork";
        const root = createRoot(document.getElementById("artwork-fixture"));
        window.updateArtwork = (src) => root.render(<DiscoveryArtwork src={src} alt="Synthetic transparent logo" />);
        window.updateArtwork("https://fixture.invalid/transparent.svg");`,
      resolveDir: process.cwd(),
      loader: "tsx",
      sourcefile: "discovery-artwork-fixture.tsx",
    },
    bundle: true,
    write: false,
    outfile: "artwork-fixture.js",
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  script = result.outputFiles.find((file) => file.path.endsWith(".js"))!.text;
  stylesheet = result.outputFiles.find((file) => file.path.endsWith(".css"))!.text;
});

for (const theme of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    test.describe(`${theme} artwork at ${width}px`, () => {
      test.use({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });

      test("transparent media, error recovery and live theme switching", async ({ page }, testInfo) => {
        await page.route("https://fixture.invalid/**", async (route) => {
          const pathname = new URL(route.request().url()).pathname;
          if (pathname === "/transparent.svg") {
            await route.fulfill({ contentType: "image/svg+xml", body: transparent });
          } else if (pathname === "/explore-storefront-placeholder.svg") {
            await route.fulfill({ contentType: "image/svg+xml", body: storefront });
          } else {
            await route.fulfill({ status: 404, body: "Unavailable synthetic asset" });
          }
        });
        await page.setContent(`<html data-theme="${theme}"><head><base href="https://fixture.invalid/"></head><body style="margin:0"><div id="artwork-fixture" style="position:relative;width:320px;height:220px"></div></body></html>`);
        await page.addStyleTag({ content: stylesheet });
        await page.addScriptTag({ content: script });
        const artwork = page.locator("[data-artwork]");
        await expect(artwork).toHaveAttribute("data-artwork", "photo");
        await expect(artwork.locator("img")).toHaveCount(1);
        await expect(artwork.locator('img[src="/explore-storefront-placeholder.svg"]')).toHaveCount(0);
        await expect.poll(() => artwork.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
        await expect(artwork).toHaveCSS("background-color", theme === "light" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)");

        const shot = await page.locator("#artwork-fixture").screenshot();
        const corner = await page.evaluate(async (base64) => {
          const image = new Image();
          image.src = `data:image/png;base64,${base64}`;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d")!;
          context.drawImage(image, 0, 0);
          return Array.from(context.getImageData(8, 8, 1, 1).data);
        }, shot.toString("base64"));
        expect(corner).toEqual(theme === "light" ? [255, 255, 255, 255] : [0, 0, 0, 255]);
        await testInfo.attach("transparent-artwork", { body: shot, contentType: "image/png" });

        await page.evaluate(() => (window as Window & { updateArtwork: (src?: string) => void }).updateArtwork("https://fixture.invalid/broken.svg"));
        await expect(artwork).toHaveAttribute("data-artwork", "placeholder");
        await expect(artwork.locator("img")).toHaveCount(1);
        await expect(artwork.locator("img")).toHaveAttribute("src", "/explore-storefront-placeholder.svg");
        await expect.poll(() => artwork.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
        await page.evaluate(() => (window as Window & { updateArtwork: (src?: string) => void }).updateArtwork());
        await expect(artwork).toHaveAttribute("data-artwork", "placeholder");
        await testInfo.attach("missing-artwork", { body: await page.locator("#artwork-fixture").screenshot(), contentType: "image/png" });
        const otherTheme = theme === "light" ? "dark" : "light";
        await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, otherTheme);
        await expect(artwork).toHaveCSS("background-color", otherTheme === "light" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)");
        await page.evaluate(() => (window as Window & { updateArtwork: (src?: string) => void }).updateArtwork("https://fixture.invalid/transparent.svg"));
        await expect(artwork).toHaveAttribute("data-artwork", "photo");
        await expect(artwork.locator("img")).toHaveCount(1);
        await expect(artwork.locator('img[src="/explore-storefront-placeholder.svg"]')).toHaveCount(0);
      });

      for (const locale of ["en", "es"]) {
        test(`${locale} actual Home keeps readable text outside artwork`, async ({ page }, testInfo) => {
          await page.addInitScript((value) => {
            localStorage.setItem("akipasa.theme", value);
            document.cookie = "ak_consent_version=2; Path=/";
          }, theme);
          await page.goto(`/${locale}?latitude=36.539&longitude=-4.624&radius=25`);
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          const cards = page.locator("[data-home-venue-card]");
          await expect(cards).toHaveCount(20);
          await cards.first().scrollIntoViewIfNeeded();
          const states = await cards.evaluateAll((elements) => {
            const rgb = (colour: string) => (colour.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
            const luminance = (colour: number[]) => colour.map((v) => v / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
            return elements.map((card) => {
              const artwork = card.querySelector("[data-artwork]")!;
              const artBox = artwork.getBoundingClientRect();
              const labels = [...card.querySelectorAll("h3,p,[class*='home-venues_claim'],[class*='home-venues_distance']")];
              return {
                background: getComputedStyle(card).backgroundColor,
                artworkBackground: getComputedStyle(artwork).backgroundColor,
                imageCount: artwork.querySelectorAll("img").length,
                noTextOverlap: [...card.querySelectorAll("h3,p,[class*='home-venues_distance']")].every((label) => label.getBoundingClientRect().top >= artBox.bottom),
                before: getComputedStyle(card, "::before").content,
                contrasts: labels.map((label) => {
                  let backdrop: Element | null = label;
                  while (backdrop && getComputedStyle(backdrop).backgroundColor === "rgba(0, 0, 0, 0)") backdrop = backdrop.parentElement;
                  const back = luminance(rgb(getComputedStyle(backdrop || card).backgroundColor));
                  const front = luminance(rgb(getComputedStyle(label).color));
                  return (Math.max(front, back) + 0.05) / (Math.min(front, back) + 0.05);
                }),
              };
            });
          });
          for (const state of states) {
            const background = theme === "light" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)";
            expect(state.background).toBe(background);
            expect(state.artworkBackground).toBe(background);
            expect(state.imageCount).toBe(1);
            expect(state.noTextOverlap).toBe(true);
            expect(state.before).toBe("none");
            expect(state.contrasts.length).toBeGreaterThanOrEqual(4);
            for (const contrast of state.contrasts) expect(contrast).toBeGreaterThanOrEqual(4.5);
          }
          await testInfo.attach("home-card-render", { body: await page.locator("#venue-results").screenshot(), contentType: "image/png" });
        });
      }
    });
  }
}
