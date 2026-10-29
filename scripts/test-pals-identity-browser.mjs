import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, readFileSync } from "node:fs";
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
          "'; style-src-attr 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
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
      const appearance = saved ?? studio.DEFAULT_APPEARANCE;
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
  await expect(
    page.getByLabel(locale === "es" ? "Peinado" : "Hairstyle"),
  ).toHaveValue(expectedLook.hair);
  await expect(page.locator("#save")).toBeDisabled();
  await expect(page.locator("#download")).toBeEnabled();
  await expect(
    page.getByText(
      locale === "es"
        ? "Guarda antes de salir de esta página. Los cambios sin guardar se descartan al volver."
        : "Save before leaving this page. Unsaved edits are discarded when you return.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(saved).toMatchObject(expectedLook);
}
try {
  await new Promise((resolveReady) =>
    server.listen(0, "127.0.0.1", resolveReady),
  );
  const port = server.address().port;
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
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.addInitScript(() => {
    const original = window.requestAnimationFrame;
    window.__palsFrames = 0;
    window.requestAnimationFrame = (callback) =>
      original.call(window, (time) => {
        window.__palsFrames++;
        callback(time);
      });
  });
  await page.goto("http://127.0.0.1:" + port + "/pals");
  await expect(page.locator("#avatar-stage canvas")).toBeVisible();
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  await expect(
    page.getByRole("heading", { name: /Looking like.*yourself/i }),
  ).toBeVisible();
  await page.screenshot({
    path: resolve(outputDir, "identity-default-390.png"),
    fullPage: true,
  });
  // A stationary portrait should not keep the mobile GPU busy indefinitely.
  await page.waitForTimeout(350);
  const idleFrames = await page.evaluate(() => window.__palsFrames);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__palsFrames)).toBe(idleFrames);
  await page.getByLabel("Hairstyle").selectOption("crop");
  await expect(page.locator("#save")).toBeEnabled();
  // Exercise real WebGL loss/restoration, not a synthetic DOM-only event. A
  // lost context must never leave a blank render presented as save/export ready.
  await page.evaluate(() => {
    const canvas = document.querySelector("#avatar-stage canvas");
    window.__palsContext = canvas
      .getContext("webgl2")
      .getExtension("WEBGL_lose_context");
    if (!window.__palsContext) throw new Error("Context-loss test unavailable");
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
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  await expect(page.getByLabel("Hairstyle")).toHaveValue("crop");
  await expect(page.locator("#save")).toBeEnabled();
  await page.locator("#reset").click();
  await expect(page.getByLabel("Hairstyle")).toHaveValue("quiff");
  // A real 3D renderer must load the alternate rig when the user changes body frame.
  await page.getByRole("tab", { name: "Face" }).click();
  const maleMesh = page.waitForResponse(
    (response) =>
      response.url().includes("/pals/models/akipals-base-male.glb") &&
      response.status() === 200,
  );
  await page.getByLabel("Body frame").selectOption("masculine");
  await maleMesh;
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-model",
    "male",
  );
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.screenshot({
    path: resolve(outputDir, "identity-male-390.png"),
    fullPage: true,
  });
  await page.locator("#avatar-stage canvas").screenshot({
    path: resolve(outputDir, "identity-male-stage-390.png"),
  });
  await page.getByRole("tab", { name: "Outfit" }).click();
  await page.getByRole("button", { name: "Night out" }).click();
  await expect(page.locator('select[name="top"]')).toHaveValue("jacket");
  await expect(page.getByLabel("Bottoms")).toHaveValue("tailored");
  await page.getByRole("tab", { name: "Hair" }).click();
  await page.getByLabel("Hairstyle").selectOption("bun");
  await expect(page.locator("#save")).toBeEnabled();
  await page.locator("#save").click();
  await expect(page.locator("#status")).toContainText(
    "Saved to your AkiPasa account",
  );
  await page.reload();
  await expect(page.getByLabel("Hairstyle")).toHaveValue("bun");
  await page.getByRole("tab", { name: "Face" }).click();
  await expect(page.getByLabel("Body frame")).toHaveValue("masculine");
  await page.getByRole("tab", { name: "Outfit" }).click();
  await expect(page.locator('select[name="top"]')).toHaveValue("jacket");
  await page.getByRole("tab", { name: "Hair" }).click();
  await page.getByLabel("Hairstyle").selectOption("buzz");
  await page.locator("#reset").click();
  await expect(page.getByLabel("Hairstyle")).toHaveValue("bun");
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.getByLabel("Hairstyle").selectOption("crop");
  await expect(page.locator("#save")).toBeEnabled();
  await verifySyntheticPersistedReturn(page, "en", {
    hair: "bun",
    bodyStyle: "masculine",
    top: "jacket",
  });
  for (const width of [320, 360, 390, 820, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    await expect(page.locator("#avatar-stage canvas")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    if (overflow) throw new Error("Horizontal overflow at " + width + "px");
    await page.screenshot({
      path: resolve(outputDir, "identity-" + width + ".png"),
      fullPage: true,
    });
  }
  // Reduced-motion must stop the idle frame loop while edits still render.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.waitForTimeout(250);
  const settledFrames = await page.evaluate(() => window.__palsFrames);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__palsFrames)).toBe(settledFrames);
  await page.getByRole("tab", { name: "Body", exact: true }).click();
  for (const height of ["short", "tall"]) {
    await page.getByLabel("Height", { exact: true }).selectOption(height);
    await expect(page.locator("#avatar-stage")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await page.screenshot({
      path: resolve(outputDir, "identity-" + height + "-reduced-motion.png"),
      fullPage: true,
    });
  }
  expect(await page.evaluate(() => window.__palsFrames)).toBeGreaterThan(
    settledFrames,
  );
  await page.goto("http://127.0.0.1:" + port + "/pals?lang=es");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.getByRole("tab", { name: "Ropa", exact: true }).click();
  await page.evaluate(() => {
    window.__palsContext = document
      .querySelector("#avatar-stage canvas")
      .getContext("webgl2")
      .getExtension("WEBGL_lose_context");
    window.__palsContext.loseContext();
  });
  await expect(page.locator("#stage-error")).toContainText("Vista 3D en pausa");
  await expect(page.locator("#download")).toBeDisabled();
  await page.evaluate(() => window.__palsContext.restoreContext());
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  await page
    .getByRole("button", { name: "Día tranquilo", exact: true })
    .click();
  await expect(page.getByLabel("Parte superior", { exact: true })).toHaveValue(
    "sweater",
  );
  await page
    .getByRole("button", { name: "Guardar mi estilo", exact: true })
    .click();
  await expect(page.locator("#status")).toContainText(
    "Guardado en tu cuenta de AkiPasa",
  );
  await page.reload();
  await expect(page.locator("#avatar-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.getByRole("tab", { name: "Ropa", exact: true }).click();
  await expect(page.getByLabel("Parte superior", { exact: true })).toHaveValue(
    "sweater",
  );
  await page.getByRole("tab", { name: "Pelo", exact: true }).click();
  await page.getByLabel("Peinado").selectOption("buzz");
  await expect(page.locator("#save")).toBeEnabled();
  await verifySyntheticPersistedReturn(page, "es", {
    hair: "bun",
    bodyStyle: "masculine",
    top: "sweater",
  });
  await page.getByRole("tab", { name: "Ropa", exact: true }).click();
  for (const width of [320, 360, 390, 820, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: resolve(outputDir, "identity-es-" + width + ".png"),
      fullPage: true,
    });
  }
  const android = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; AkiPasa WebView) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/153.0.0.0 Mobile Safari/537.36",
  });
  android.on("pageerror", (error) => failures.push(error.message));
  await android.goto("http://127.0.0.1:" + port + "/pals?lang=es");
  await expect(android.locator("#avatar-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  const canvas = android.locator("#avatar-stage canvas");
  await canvas.scrollIntoViewIfNeeded();
  const beforeTouch = await canvas.screenshot();
  const box = await canvas.boundingBox();
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
  // High-resolution actual stage renders make donor-face shading, fitted hair
  // and neck joins reviewable independently of the full editor screenshots.
  const art = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  art.on("pageerror", (error) => failures.push(error.message));
  await art.goto("http://127.0.0.1:" + port + "/pals");
  await expect(art.locator("#avatar-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  for (const bodyStyle of ["feminine", "masculine"]) {
    for (const skin of ["porcelain", "deep"]) {
      await art.getByRole("tab", { name: "Face", exact: true }).click();
      await art.getByLabel("Body frame").selectOption(bodyStyle);
      const tone = art.locator(
        `button[data-field="skin"][data-value="${skin}"]`,
      );
      await tone.click();
      await expect(tone).toHaveAttribute("aria-pressed", "true");
      await art.getByRole("tab", { name: "Hair", exact: true }).click();
      for (const hair of ["buzz", "crop", "quiff", "bun"]) {
        await art.getByLabel("Hairstyle").selectOption(hair);
        await expect(art.locator("#avatar-stage")).toHaveAttribute(
          "data-ready",
          "true",
        );
        await art.locator("#avatar-stage canvas").screenshot({
          path: resolve(outputDir, `art-${bodyStyle}-${skin}-${hair}.png`),
        });
      }
    }
  }
  await art.close();
  if (failures.length)
    throw new Error("Client-side errors: " + failures.join("; "));
  console.log(
    "AkiPals real GLB 3D creator: renders, saves, restores and passes responsive browser smoke.",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
  rmSync(buildDir, { recursive: true, force: true });
}
