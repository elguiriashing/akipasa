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
      response.end(studio.identityPreviewHtml(nonce));
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
try {
  await new Promise((resolveReady) =>
    server.listen(0, "127.0.0.1", resolveReady),
  );
  const port = server.address().port;
  browser = await chromium.launch({
    headless: true,
    args: [
      "--enable-webgl",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
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
  await page.getByLabel("Hairstyle").selectOption("bun");
  await expect(page.locator("#save")).toBeEnabled();
  await page.locator("#save").click();
  await expect(page.locator("#status")).toContainText(
    "Saved to your AkiPasa account",
  );
  await page.reload();
  await expect(page.getByLabel("Hairstyle")).toHaveValue("bun");
  await page.getByLabel("Hairstyle").selectOption("buzz");
  await page.locator("#reset").click();
  await expect(page.getByLabel("Hairstyle")).toHaveValue("bun");
  for (const width of [320, 390, 820, 1440]) {
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
