import { build } from "esbuild";
import { PNG } from "pngjs";
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

const outputDir = resolve(
  process.env.PALS_IDENTITY_EVIDENCE || "test-results/pals-identity-browser",
);
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
let saveWrites = 0;
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
    if (input.save) {
      saved = appearance.data;
      saveWrites++;
    }
    json(200, {
      appearance: appearance.data,
      saved: input.save,
    });
  } catch (error) {
    response.writeHead(500);
    response.end(String(error));
  }
});
async function verifySyntheticPersistedReturn(page, locale, expectedLook) {
  // Synthetic PageTransitionEvents deterministically exercise the persisted
  // branch. This is not proof of actual BFCache eligibility or physical-device
  // navigation. The resulting private-document and identity HTTP reads are real.
  const documentResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/pals" &&
      response.request().isNavigationRequest(),
  );
  const identityResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/pals/identity" &&
      response.request().method() === "GET",
  );
  const disposed = await page.evaluate(() => {
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: true }),
    );
    const state = {
      saveDisabled: document.querySelector("#save").disabled,
      exportDisabled: document.querySelector("#download").disabled,
      canvases: document.querySelectorAll("#avatar-stage canvas").length,
    };
    setTimeout(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
    }, 0);
    return state;
  });
  expect(disposed).toEqual({
    saveDisabled: true,
    exportDisabled: true,
    canvases: 0,
  });
  expect((await documentResponse).status()).toBe(200);
  const response = await identityResponse;
  expect(response.status()).toBe(200);
  expect((await response.json()).appearance).toMatchObject(expectedLook);
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  await page.locator('[data-tab="Hair"]').click();
  await expect(
    page.locator(`[data-field="hair"][data-value="${expectedLook.hair}"]`),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#save")).toBeDisabled();
  await expect(page.locator("#download")).toBeEnabled();
  expect(saved).toMatchObject(expectedLook);
}
const evidence = [];
async function ready(page) {
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
}
async function choose(page, field, value) {
  const tab = {
    model: "Character",
    height: "Character",
    skin: "Face",
    eyeColor: "Face",
    hair: "Hair",
    hairColor: "Hair",
    top: "Outfit",
    topColor: "Outfit",
    bottomColor: "Outfit",
    shoeColor: "Outfit",
  }[field];
  await page.locator(`[data-tab="${tab}"]`).click();
  const button = page.locator(`[data-field="${field}"][data-value="${value}"]`);
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await ready(page);
}
async function changedCanvas(page, field, first, second) {
  await choose(page, field, first);
  // A rear bun is physically behind the head: use matching, native60degree
  // views for hairstyle geometry. Front/rear calibration evidence is separate.
  if (field === "hair") await page.locator("#rotate").click();
  const before = await page.locator("#avatar-stage canvas").screenshot();
  await choose(page, field, second);
  let changedPixels = null;
  try {
    await expect
      .poll(async () =>
        before.equals(await page.locator("#avatar-stage canvas").screenshot()),
      )
      .toBe(false);
    if (field === "hair") {
      const after = await page.locator("#avatar-stage canvas").screenshot(),
        a = PNG.sync.read(before),
        b = PNG.sync.read(after);
      changedPixels = 0;
      for (let i = 0; i < a.data.length; i += 4)
        if (
          Math.max(
            ...[0, 1, 2].map((c) => Math.abs(a.data[i + c] - b.data[i + c])),
          ) > 8
        )
          changedPixels++;
      expect(changedPixels).toBeGreaterThan(100);
      await expect(page.locator("#save")).toBeEnabled();
      await page.locator("#save").click();
      await expect(page.locator("#status")).toContainText("Saved");
      expect(saved.hair).toBe(second);
      await expect(page.locator("#save")).toBeDisabled();
      for (let i = 0; i < 5; i++) await page.locator("#rotate").click();
    }
  } catch (error) {
    writeFileSync(resolve(outputDir, `failure-${field}-${first}.png`), before);
    await page.locator("#avatar-stage canvas").screenshot({
      path: resolve(outputDir, `failure-${field}-${second}.png`),
    });
    writeFileSync(
      resolve(outputDir, `failure-${field}-state.json`),
      JSON.stringify(
        {
          field,
          first,
          second,
          changedPixels,
          dataset: await page
            .locator("#avatar-stage")
            .evaluate((x) => ({ ...x.dataset })),
          saved,
        },
        null,
        2,
      ),
    );
    throw error;
  }
  evidence.push({
    test: "actual-WebGL-appearance-change",
    field,
    first,
    second,
    view: field === "hair" ? "native60degree" : "fixed",
    changedPixels,
    status: "PASS",
  });
}

try {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port,
    origin = "http://127.0.0.1:" + port;
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
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const failures = [];
  page.on("pageerror", (e) => failures.push(e.message));
  await page.addInitScript(() => {
    const raf = requestAnimationFrame;
    window.__palsFrames = 0;
    window.requestAnimationFrame = (callback) =>
      raf.call(window, (time) => {
        window.__palsFrames++;
        callback(time);
      });
  });
  await page.goto(origin + "/pals");
  await ready(page);
  const worldLink = page.locator('a[href^="/pals/world"]');
  await expect(worldLink).toBeVisible();
  const linkBox = await worldLink.boundingBox();
  expect(linkBox.height).toBeGreaterThanOrEqual(44);
  expect(linkBox.width).toBeGreaterThanOrEqual(44);
  await expect(
    page.getByRole("heading", { name: "Wardrobe", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-field="model"]')).toHaveCount(2);
  await expect(
    page.locator('[data-field="model"][data-value="classic-v2"]'),
  ).toHaveCount(0);
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-model-id",
    "rain-v3",
  );
  await page.screenshot({
    path: resolve(outputDir, "identity-default-390.png"),
    fullPage: true,
  });
  await page.waitForTimeout(350);
  const frames = await page.evaluate(() => window.__palsFrames);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__palsFrames)).toBe(frames);
  await expect(
    page.getByRole("link", { name: "Character credits" }),
  ).toHaveAttribute("href", "/pals/models/professional/ATTRIBUTION.txt");
  const rain = await page.locator("#avatar-stage canvas").screenshot();
  await choose(page, "model", "snow-v4");
  expect(
    (await page.locator("#avatar-stage canvas").screenshot()).equals(rain),
  ).toBe(false);
  await choose(page, "height", "short");
  await choose(page, "hair", "quiff");
  await page.locator("#save").click();
  await expect(page.locator("#status")).toContainText("Saved");
  expect(saved).toMatchObject({
    model: "snow-v4",
    height: "short",
    hair: "quiff",
  });
  await page.reload();
  await ready(page);
  await expect(page.locator("#save")).toBeDisabled();
  await choose(page, "height", "short");
  const rainAsset = "**/pals/models/professional/rain-v3-20261031.glb";
  await page.route(rainAsset, (r) => r.abort());
  await chooseModelWithoutReady(page, "rain-v3");
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-ready",
    "error",
  );
  await expect(page.locator("#save")).toBeDisabled();
  await expect(page.locator("#download")).toBeDisabled();
  expect(saved.model).toBe("snow-v4");
  await page.unroute(rainAsset);
  await choose(page, "model", "snow-v4");
  await choose(page, "model", "rain-v3");
  await page.locator("#reset").click();
  await ready(page);
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-model-id",
    "snow-v4",
  );
  await chooseModelWithoutReady(page, "rain-v3");
  await chooseModelWithoutReady(page, "snow-v4");
  await chooseModelWithoutReady(page, "rain-v3");
  await ready(page);
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-model-id",
    "rain-v3",
  );
  // Both saved legacy frames project read-only onto authored rigs. No Classic UI,
  // no automatic write, no mutation of the raw saved row or unsupported old hair.
  for (const [bodyStyle, model, hair, projectedHair] of [
    ["feminine", "rain-v3", "buzz", "long"],
    ["masculine", "snow-v4", "bun", "crop"],
  ]) {
    saved = {
      ...studio.DEFAULT_APPEARANCE,
      model: "classic-v2",
      bodyStyle,
      hair,
    };
    const raw = JSON.stringify(saved),
      writes = saveWrites;
    await page.reload();
    await ready(page);
    await expect(page.locator("#avatar-stage")).toHaveAttribute(
      "data-model-id",
      model,
    );
    await page.locator('[data-tab="Hair"]').click();
    await expect(
      page.locator(`[data-field="hair"][data-value="${projectedHair}"]`),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#save")).toBeDisabled();
    expect(JSON.stringify(saved)).toBe(raw);
    expect(saveWrites).toBe(writes);
    evidence.push({
      test: "legacy-classic-read-only-authored-projection",
      bodyStyle,
      model,
      hair,
      projectedHair,
      status: "PASS",
    });
  }
  saved = null;
  starter = { ...studio.DEFAULT_APPEARANCE, model: "classic-v2" };
  await page.reload();
  await ready(page);
  await choose(page, "hair", "crop");
  await page.evaluate(() => {
    window.__palsContext = document
      .querySelector("#avatar-stage canvas")
      .getContext("webgl2")
      .getExtension("WEBGL_lose_context");
    if (!window.__palsContext) throw Error("Context-loss test unavailable");
    window.__palsContext.loseContext();
  });
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-ready",
    "error",
  );
  await expect(page.locator("#stage-error")).toContainText("preview paused");
  await expect(page.locator("#save")).toBeDisabled();
  await expect(page.locator("#download")).toBeDisabled();
  expect(saved).toBeNull();
  await page.evaluate(() => window.__palsContext.restoreContext());
  await ready(page);
  await expect(
    page.locator('[data-field="hair"][data-value="crop"]'),
  ).toHaveAttribute("aria-pressed", "true");
  await page.locator("#reset").click();
  await ready(page);
  // Selecting Snow replaces the old masculine procedural-rig switch with the
  // actual authored asset required by the new two-character product contract.
  await choose(page, "model", "snow-v4");
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-model-id",
    "snow-v4",
  );
  await choose(page, "top", "jacket");
  await choose(page, "bottomColor", "mint");
  await choose(page, "hair", "quiff");
  await page.locator("#save").click();
  await expect(page.locator("#status")).toContainText("Saved");
  await page.reload();
  await ready(page);
  await page.locator('[data-tab="Hair"]').click();
  await expect(
    page.locator('[data-field="hair"][data-value="quiff"]'),
  ).toHaveAttribute("aria-pressed", "true");
  await choose(page, "hair", "crop");
  await page.locator("#reset").click();
  await ready(page);
  await expect(
    page.locator('[data-field="hair"][data-value="quiff"]'),
  ).toHaveAttribute("aria-pressed", "true");
  await choose(page, "hair", "crop");
  await verifySyntheticPersistedReturn(page, "en", {
    model: "snow-v4",
    hair: "quiff",
    bodyStyle: "masculine",
    top: "jacket",
  });
  await choose(page, "model", "rain-v3");
  await changedCanvas(page, "hair", "long", "bun");
  await changedCanvas(page, "hairColor", "black", "blonde");
  await changedCanvas(page, "top", "tee", "jacket");
  await changedCanvas(page, "topColor", "orange", "mint");
  await changedCanvas(page, "skin", "porcelain", "deep");
  const stable = await page.locator("#avatar-stage canvas").screenshot();
  await page.locator("#zoom-in").click();
  await expect
    .poll(async () =>
      stable.equals(await page.locator("#avatar-stage canvas").screenshot()),
    )
    .toBe(false);
  await page.locator("#zoom-out").click();
  await choose(page, "model", "snow-v4");
  await choose(page, "hair", "quiff");
  await page.locator("#save").click();
  await expect(page.locator("#status")).toContainText("Saved");
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const width of [320, 390, 820, 1440]) {
        await page.emulateMedia({
          colorScheme: theme,
          reducedMotion: "reduce",
        });
        await page.setViewportSize({ width, height: 900 });
        await page.goto(origin + "/pals?lang=" + locale);
        await ready(page);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator('a[href^="/pals/world"]')).toHaveAttribute(
          "href",
          "/pals/world?lang=" + locale,
        );
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
        await page.locator('[data-tab="Outfit"]').click();
        await page.screenshot({
          path: resolve(outputDir, `identity-${locale}-${theme}-${width}.png`),
          fullPage: true,
        });
        evidence.push({
          test: "responsive-locale-theme",
          locale,
          theme,
          width,
          status: "PASS",
        });
      }
  await choose(page, "top", "sweater");
  await page.locator("#save").click();
  await expect(page.locator("#status")).toContainText("Guardado");
  await page.reload();
  await ready(page);
  await choose(page, "hair", "crop");
  await verifySyntheticPersistedReturn(page, "es", {
    model: "snow-v4",
    hair: "quiff",
    bodyStyle: "masculine",
    top: "sweater",
  });
  const android = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; AkiPasa WebView) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/153.0.0.0 Mobile Safari/537.36",
  });
  android.on("pageerror", (e) => failures.push(e.message));
  await android.goto(origin + "/pals?lang=es");
  await ready(android);
  const canvas = android.locator("#avatar-stage canvas"),
    beforeTouch = await canvas.screenshot(),
    box = await canvas.boundingBox(),
    touch = await android.context().newCDPSession(android);
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
    .poll(async () => beforeTouch.equals(await canvas.screenshot()))
    .toBe(false);
  await android.screenshot({
    path: resolve(outputDir, "identity-es-android-emulated-390.png"),
    fullPage: true,
  });
  expect(
    await android.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await android.close();
  const art = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  art.on("pageerror", (e) => failures.push(e.message));
  await art.goto(origin + "/pals");
  await ready(art);
  for (const [model, hairs] of [
    ["rain-v3", ["crop", "quiff", "long", "bun"]],
    ["snow-v4", ["crop", "quiff"]],
  ]) {
    await choose(art, "model", model);
    for (const skin of ["porcelain", "deep"]) {
      await choose(art, "skin", skin);
      for (const hair of hairs) {
        await choose(art, "hair", hair);
        await art.locator("#avatar-stage canvas").screenshot({
          path: resolve(outputDir, `art-${model}-${skin}-${hair}.png`),
        });
      }
    }
  }
  await art.close();
  expect(failures).toEqual([]);
  writeFileSync(
    resolve(outputDir, "results.json"),
    JSON.stringify(
      {
        status: "PASS",
        actualWebGL: true,
        syntheticIdentityProvider: true,
        physicalDevice: false,
        evidence,
      },
      null,
      2,
    ),
  );
  console.log(
    "AkiPals authored Rain/Snow: actual WebGL wardrobe, legacy privacy, save/restore, context loss, touch, responsive locales and appearance changes PASS",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((r) => server.close(r));
  rmSync(buildDir, { recursive: true, force: true });
}
async function chooseModelWithoutReady(page, model) {
  await page.locator('[data-tab="Character"]').click();
  await page.locator(`[data-field="model"][data-value="${model}"]`).click();
}
