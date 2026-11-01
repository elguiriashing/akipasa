import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const outputDir = resolve("test-results/pals-identity-browser");
const buildDir = mkdtempSync(resolve(tmpdir(), "akipals-identity-"));
mkdirSync(outputDir, { recursive: true });
await build({
  stdin: {
    contents: [
      'export { identityPreviewHtml } from "./src/components/pals/identity-preview";',
      'export { appearanceSchema, DEFAULT_APPEARANCE, renderHumanAvatar } from "./src/lib/pals/avatar-v2";',
    ].join("\n"),
    resolveDir: process.cwd(),
    loader: "ts",
  },
  outfile: resolve(buildDir, "runtime.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
});
const studio = await import(pathToFileURL(resolve(buildDir, "runtime.mjs")));
const icon = readFileSync("src/app/icon.svg");
const creatorBundle = readFileSync("public/pals/runtime/creator.min.js");
const avatarMeshes = Object.fromEntries(
  ["male", "female"].map((base) => [
    base,
    readFileSync("public/pals/models/akipals-base-" + base + ".glb"),
  ]),
);
let saved = null;
let starter = studio.DEFAULT_APPEARANCE;
let browser;
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, "http://127.0.0.1").pathname;
    if (path === "/icon.svg") {
      response.writeHead(200, { "Content-Type": "image/svg+xml" });
      response.end(icon);
      return;
    }
    if (path === "/pals/runtime/creator.min.js") {
      response.writeHead(200, {
        "Content-Type": "application/javascript",
        "Cache-Control": "private, no-store",
      });
      response.end(creatorBundle);
      return;
    }
    const professionalMatch =
      /^\/pals\/models\/professional\/(rain-v3|snow-v4)-20261031\.glb$/.exec(
        path,
      );
    if (professionalMatch) {
      response.writeHead(200, {
        "Content-Type": "model/gltf-binary",
        "Cache-Control": "private, no-store",
      });
      response.end(readFileSync("public" + path));
      return;
    }
    const modelMatch = /^\/pals\/models\/akipals-base-(male|female)\.glb$/.exec(
      path,
    );
    if (modelMatch) {
      response.writeHead(200, {
        "Content-Type": "model/gltf-binary",
        "Cache-Control": "private, no-store",
      });
      response.end(avatarMeshes[modelMatch[1]]);
      return;
    }
    if (path === "/pals") {
      const nonce = randomUUID().replaceAll("-", "");
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Content-Security-Policy":
          "default-src 'none'; script-src 'nonce-" +
          nonce +
          "'; style-src 'nonce-" +
          nonce +
          "'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' blob:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
      });
      response.end(
        studio.identityPreviewHtml(
          nonce,
          new URL(request.url, "http://127.0.0.1").searchParams.get("lang") ===
            "es"
            ? "es"
            : "en",
        ),
      );
      return;
    }
    if (path !== "/pals/identity") {
      response.writeHead(404);
      response.end();
      return;
    }
    const json = (code, payload) => {
      response.writeHead(code, {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store",
      });
      response.end(JSON.stringify(payload));
    };
    if (request.method === "GET") {
      const appearance = saved ?? starter;
      json(200, {
        appearance,
        saved: Boolean(saved),
        needsUpgrade:
          Boolean(saved) &&
          (!saved.model ||
            saved.model === "classic-v2" ||
            !saved.starterOutfit),
      });
      return;
    }
    if (request.method !== "POST") {
      json(405, { error: "Unsupported method" });
      return;
    }
    if (request.headers.origin !== "http://" + request.headers.host) {
      json(403, { error: "Cross-site edit rejected" });
      return;
    }
    let body = "";
    for await (const chunk of request) {
      body += chunk;
      if (Buffer.byteLength(body) > 4096) {
        json(413, { error: "Too large" });
        return;
      }
    }
    const input = JSON.parse(body);
    const appearance = studio.appearanceSchema.safeParse(input.appearance);
    if (!appearance.success || typeof input.save !== "boolean") {
      json(400, { error: "Invalid settings" });
      return;
    }
    if (input.save) saved = appearance.data;
    json(200, {
      appearance: appearance.data,
      saved: input.save,
    });
  } catch (error) {
    response.writeHead(500);
    response.end(String(error));
  }
});

const evidence = {
  rendering: [],
  responsive: [],
  saves: 0,
  physicalAndroid: false,
  fixtureIdentity: true,
};
async function ready(page, model) {
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 45000 },
  );
  if (model)
    await expect(page.locator("#avatar-stage")).toHaveAttribute(
      "data-model-id",
      model,
    );
  expect(await page.locator("body").innerText()).not.toMatch(
    /Classic saved look|Aspecto clásico/,
  );
  await expect(page.locator("#stage-error")).toBeHidden();
}
async function choose(page, field, value) {
  await page
    .locator(`button[data-field="${field}"][data-value="${value}"]`)
    .click();
  await ready(page);
  await expect(
    page.locator(`button[data-field="${field}"][data-value="${value}"]`),
  ).toHaveAttribute("aria-pressed", "true");
}
async function tab(page, name) {
  await page.locator(`[data-tab="${name}"]`).click();
}
async function instrument(context) {
  await context.addInitScript(() => {
    window.palsBitmapCalls = 0;
    // Exercise the Android-relevant alternative with ImageBitmap deliberately
    // unusable. Do not disable CSP, replace WebGL or mock the actual GLB bytes.
    window.createImageBitmap = () => {
      window.palsBitmapCalls++;
      return Promise.reject(new Error("TEST ONLY ImageBitmap unavailable"));
    };
    window.palsImages = [];
    window.palsCsp = [];
    window.palsFrames = 0;
    const originalFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) =>
      originalFrame.call(window, (time) => {
        window.palsFrames++;
        callback(time);
      });
    const create = document.createElementNS.bind(document);
    document.createElementNS = (namespace, name, ...args) => {
      const element = create(namespace, name, ...args);
      if (name === "img") {
        element.addEventListener("load", () => {
          if (element.src.startsWith("blob:"))
            window.palsImages.push([
              element.naturalWidth,
              element.naturalHeight,
            ]);
        });
        const descriptor = Object.getOwnPropertyDescriptor(
          HTMLImageElement.prototype,
          "src",
        );
        Object.defineProperty(element, "src", {
          get() {
            return descriptor.get.call(this);
          },
          set(value) {
            if (window.palsFailDecode && String(value).startsWith("blob:"))
              queueMicrotask(() => this.dispatchEvent(new Event("error")));
            else descriptor.set.call(this, value);
          },
        });
      }
      return element;
    };
    document.addEventListener("securitypolicyviolation", (event) =>
      window.palsCsp.push(event.violatedDirective),
    );
  });
}
try {
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const origin = "http://127.0.0.1:" + server.address().port;
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--enable-webgl",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await instrument(context);
  const page = await context.newPage();
  const failures = [],
    modelRequests = [];
  page.on("pageerror", (error) => {
    failures.push(error.message);
    console.error("Wardrobe page error:", error.stack || error.message);
  });
  page.on("request", (request) => {
    if (request.url().includes(".glb")) modelRequests.push(request.url());
  });
  await page.goto(origin + "/pals");
  await ready(page, "rain-v3");
  await expect(page.locator("#save")).toBeEnabled();
  await page.screenshot({
    path: resolve(outputDir, "starter-rain-mobile.png"),
    fullPage: true,
  });
  await page.waitForTimeout(300);
  const idle = await page.evaluate(() => window.palsFrames);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.palsFrames)).toBe(idle);
  expect(
    await page.evaluate(() => window.palsImages.length),
  ).toBeGreaterThanOrEqual(6);
  expect(
    await page.evaluate(() =>
      window.palsImages.every(([w, h]) => w > 0 && h > 0),
    ),
  ).toBe(true);
  expect(await page.evaluate(() => window.palsBitmapCalls)).toBe(0);
  await tab(page, "Character");
  const snowAsset = "**/pals/models/professional/snow-v4-20261031.glb";
  await page.route(snowAsset, (route) => route.abort());
  await page.locator('[data-field="model"][data-value="snow-v4"]').click();
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-ready",
    "error",
  );
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-model-id",
    "",
  );
  await expect(page.locator("#save")).toBeDisabled();
  await expect(page.locator("#download")).toBeDisabled();
  expect(saved).toBeNull();
  await page.screenshot({
    path: resolve(outputDir, "neutral-load-error-mobile.png"),
    fullPage: true,
  });
  await page.unroute(snowAsset);
  await page.locator("#stage-retry").click();
  await ready(page, "snow-v4");
  await page.getByLabel("Height", { exact: true }).selectOption("short");
  await tab(page, "Outfit");
  await choose(page, "starterOutfit", "explorer");
  await tab(page, "Hair");
  await choose(page, "starterHair", "cropped");
  await choose(page, "starterHairColor", "silver");
  await tab(page, "Colour");
  await choose(page, "starterPalette", "coast");
  await page.locator("#save").click();
  await expect(page.locator("#status")).toContainText(
    "Saved to your AkiPasa account",
  );
  evidence.saves++;
  expect(saved).toMatchObject({
    model: "snow-v4",
    height: "short",
    starterOutfit: "explorer",
    starterHair: "cropped",
    starterHairColor: "silver",
    starterPalette: "coast",
  });
  const stable = structuredClone(saved);
  await page.reload();
  await ready(page, "snow-v4");
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-starter-style",
    "explorer/cropped/coast/silver",
  );
  await expect(page.locator("#save")).toBeDisabled();
  await choose(page, "starterOutfit", "varsity");
  await page.route("**/pals/identity", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: '{"error":"TEST ONLY save failure"}',
        })
      : route.continue(),
  );
  await page.locator("#save").click();
  await expect(page.locator("#status")).toContainText(
    "Previous saved look unchanged",
  );
  expect(saved).toEqual(stable);
  await page.unroute("**/pals/identity");
  await page.locator("#reset").click();
  await ready(page);
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-starter-style",
    "explorer/cropped/coast/silver",
  );
  // Real graphics-context recovery keeps the authored choice and no save-ready blank.
  await page.evaluate(() => {
    window.palsContext = document
      .querySelector("#avatar-stage canvas")
      .getContext("webgl2")
      .getExtension("WEBGL_lose_context");
    if (!window.palsContext)
      throw new Error("Context-loss extension unavailable");
    window.palsContext.loseContext();
  });
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-ready",
    "error",
  );
  await expect(page.locator("#download")).toBeDisabled();
  await page.evaluate(() => window.palsContext.restoreContext());
  await ready(page, "snow-v4");
  // Last model wins after rapid switches; texture/material changes never affect a second mount.
  await tab(page, "Character");
  await page.locator('[data-field="model"][data-value="rain-v3"]').click();
  await page.locator('[data-field="model"][data-value="snow-v4"]').click();
  await ready(page, "snow-v4");
  // Model-less and explicit Classic rows are display-migrated, never overwritten on GET.
  for (const legacyId of [undefined, "classic-v2"]) {
    saved = { ...stable, model: legacyId, hair: "bun", bag: "backpack" };
    const original = JSON.stringify(saved);
    await page.reload();
    await ready(page, "rain-v3");
    expect(JSON.stringify(saved)).toBe(original);
    await expect(page.locator("#save")).toBeEnabled();
    await tab(page, "Character");
    expect(await page.locator('[data-field="model"]').count()).toBe(2);
  }
  saved = stable;
  await page.reload();
  await ready(page);
  await choose(page, "starterOutfit", "crew");
  const disposedState = await page.evaluate(() => {
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: true }),
    );
    return {
      saveDisabled: document.querySelector("#save").disabled,
      exportDisabled: document.querySelector("#download").disabled,
      canvasCount: document.querySelectorAll("#avatar-stage canvas").length,
    };
  });
  expect(disposedState).toEqual({
    saveDisabled: true,
    exportDisabled: true,
    canvasCount: 0,
  });
  await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/pals" &&
        response.request().isNavigationRequest(),
    ),
    page.evaluate(() =>
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      ),
    ),
  ]);
  await ready(page, "snow-v4");
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-starter-style",
    "explorer/cropped/coast/silver",
  );
  // Native keyboard tabs, both locales, narrow and desktop layouts.
  for (const locale of ["en", "es"]) {
    await page.goto(origin + "/pals?lang=" + locale);
    await ready(page);
    await page.locator('[data-tab="Outfit"]').focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator('[data-tab="Hair"]')).toHaveAttribute(
      "aria-selected",
      "true",
    );
    for (const width of [320, 360, 390, 820, 1440]) {
      await page.setViewportSize({ width, height: 850 });
      await tab(page, "Outfit");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: resolve(outputDir, `starter-${locale}-${width}.png`),
        fullPage: true,
      });
      evidence.responsive.push({ locale, width });
    }
    await choose(page, "starterOutfit", "varsity");
    await page.locator("#save").click();
    await expect(page.locator("#status")).toContainText(
      locale === "es"
        ? "Guardado en tu cuenta"
        : "Saved to your AkiPasa account",
    );
    evidence.saves++;
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await ready(page);
  await tab(page, "Character");
  for (const height of ["short", "tall"]) {
    await page.getByLabel("Altura", { exact: true }).selectOption(height);
    await ready(page);
  }
  await page.waitForTimeout(250);
  const reducedFrames = await page.evaluate(() => window.palsFrames);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.palsFrames)).toBe(reducedFrames);
  expect(await page.evaluate(() => window.palsCsp)).toEqual([]);
  expect(modelRequests.every((url) => url.includes("/professional/"))).toBe(
    true,
  );
  // Real image decoding failure (not just a failed network request) and same-model Retry.
  const broken = await context.newPage();
  await broken.addInitScript(() => {
    window.palsFailDecode = true;
  });
  await broken.goto(origin + "/pals");
  await expect(broken.locator("#avatar-stage")).toHaveAttribute(
    "data-ready",
    "error",
  );
  await expect(broken.locator("#save")).toBeDisabled();
  await broken.evaluate(() => {
    window.palsFailDecode = false;
  });
  await broken.locator("#stage-retry").click();
  await ready(broken, saved.model);
  await broken.close();
  // Source-bound art grid: every starter garment/hairstyle on both real donors.
  await page.goto(origin + "/pals");
  await ready(page);
  await page.setViewportSize({ width: 1100, height: 900 });
  for (const model of ["rain-v3", "snow-v4"]) {
    await tab(page, "Character");
    await choose(page, "model", model);
    await page.getByLabel("Height", { exact: true }).selectOption("medium");
    const outfitImages = [],
      hairImages = [],
      paletteImages = [],
      tintImages = [];
    for (const outfit of ["crew", "varsity", "explorer"]) {
      await tab(page, "Outfit");
      await choose(page, "starterOutfit", outfit);
      outfitImages.push(
        await page.locator("#avatar-stage canvas").screenshot(),
      );
      for (const hair of ["original", "swept", "cropped"]) {
        await tab(page, "Hair");
        await choose(page, "starterHair", hair);
        await page.locator("#avatar-stage canvas").screenshot({
          path: resolve(outputDir, `art-${model}-${outfit}-${hair}.png`),
        });
        evidence.rendering.push({ model, outfit, hair });
      }
    }
    for (const hair of ["original", "swept", "cropped"]) {
      await tab(page, "Hair");
      await choose(page, "starterHair", hair);
      hairImages.push(await page.locator("#avatar-stage canvas").screenshot());
    }
    for (const palette of ["ember", "midnight", "coast", "orchid", "sand"]) {
      await tab(page, "Colour");
      await choose(page, "starterPalette", palette);
      paletteImages.push(
        await page.locator("#avatar-stage canvas").screenshot(),
      );
    }
    for (const tint of [
      "espresso",
      "black",
      "copper",
      "blonde",
      "silver",
      "pink",
    ]) {
      await choose(page, "starterHairColor", tint);
      tintImages.push(await page.locator("#avatar-stage canvas").screenshot());
    }
    for (const images of [
      outfitImages,
      hairImages,
      paletteImages,
      tintImages,
    ]) {
      expect(
        new Set(images.map((image) => image.toString("base64"))).size,
      ).toBe(images.length);
    }
  }
  const androidContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; AkiPasa WebView) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/153.0.0.0 Mobile Safari/537.36",
  });
  await instrument(androidContext);
  const android = await androidContext.newPage();
  android.on("pageerror", (error) => failures.push(error.message));
  await android.goto(origin + "/pals?lang=es");
  await ready(android);
  const canvas = android.locator("#avatar-stage canvas"),
    before = await canvas.screenshot(),
    box = await canvas.boundingBox();
  const touch = await android.context().newCDPSession(android);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + box.width * 0.4, y: box.y + box.height * 0.5 }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: box.x + box.width * 0.7, y: box.y + box.height * 0.5 }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () => before.equals(await canvas.screenshot()))
    .toBe(false);
  await android.screenshot({
    path: resolve(outputDir, "starter-android-touch.png"),
    fullPage: true,
  });
  await androidContext.close();
  expect(failures).toEqual([]);
  writeFileSync(
    resolve(outputDir, "starter-acceptance.json"),
    JSON.stringify(evidence, null, 2),
  );
  console.log(
    "Authored-only starter editor: real textured Rain/Snow, styles, save/restore, retry, context recovery, both locales and touch emulation passed. Physical Android not exercised.",
  );
} catch (error) {
  console.error("Starter browser failure:", error);
  for (const [index, page] of browser
    ?.contexts()
    .flatMap((context) => context.pages())
    .entries() ?? []) {
    if (!page.isClosed())
      await page
        .screenshot({
          path: resolve(outputDir, "failure-" + index + ".png"),
          fullPage: true,
        })
        .catch(() => {});
  }
  throw error;
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
  rmSync(buildDir, { recursive: true, force: true });
}
