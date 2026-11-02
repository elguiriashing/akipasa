import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import {
  readFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

// Actual World, MapLibre, Three.js and GLB meshes. Only data and GPS are fixtures.
const output = resolve(
  process.env.PALS_WORLD_EVIDENCE || "test-results/pals-world-browser",
);
const temp = mkdtempSync(resolve(tmpdir(), "pals-world-"));
const require = createRequire(import.meta.url);
mkdirSync(output, { recursive: true });
await build({
  entryPoints: ["next.config.ts"],
  outfile: resolve(temp, "next-config.mjs"),
  bundle: true,
  format: "esm",
  platform: "node",
  define: { "process.env.NODE_ENV": '"production"' },
});
const { default: productionConfig } = await import(
  pathToFileURL(resolve(temp, "next-config.mjs"))
);
const headerRules = await productionConfig.headers();
const publicHeaders = Object.fromEntries(
  headerRules
    .find((rule) => rule.source === "/(.*)")
    .headers.map((h) => [h.key, h.value]),
);
const worldHeaders = {
  ...publicHeaders,
  ...Object.fromEntries(
    headerRules
      .find((rule) => rule.source === "/pals/world/:path*")
      .headers.map((h) => [h.key, h.value]),
  ),
};
const publicCsp = publicHeaders["Content-Security-Policy"];
const worldCsp = worldHeaders["Content-Security-Policy"];
assert.equal(
  worldCsp.replace("connect-src 'self' blob: ", "connect-src 'self' "),
  publicCsp,
  "Only private World gains blob connection access for embedded GLB textures",
);
assert.match(worldCsp, /connect-src 'self' blob: /);
assert.doesNotMatch(
  publicCsp.split(";").find((d) => d.trim().startsWith("connect-src")),
  /blob:/,
);
await build({
  stdin: {
    contents:
      'import React from "react"; import {createRoot} from "react-dom/client"; import {WorldExplorer} from "./src/components/pals/WorldExplorer"; const root=createRoot(document.getElementById("root")); window.unmountWorld=()=>root.unmount(); root.render(React.createElement(WorldExplorer,{styleUrl:"/style.json",locale:new URLSearchParams(location.search).get("lang")==="es"?"es":"en"}));',
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  outfile: resolve(temp, "world.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env": JSON.stringify({ NODE_ENV: "production" }),
  },
  plugins: [
    {
      name: "observe-genuine-world-map",
      setup(builder) {
        builder.onResolve({ filter: /^maplibre-gl$/ }, () => ({
          path: "observed-maplibre",
          namespace: "world-map-observation",
        }));
        builder.onLoad(
          { filter: /.*/, namespace: "world-map-observation" },
          () => ({
            // Expose the real instance only in this test bundle. No projection,
            // camera, marker, renderer or production source is replaced.
            contents: `import {Map as RealMap, Marker, AttributionControl} from ${JSON.stringify(require.resolve("maplibre-gl"))}; export {Marker, AttributionControl}; export class Map extends RealMap { constructor(...args) { super(...args); window.palsFixtureMap = this; } }`,
            loader: "js",
            resolveDir: process.cwd(),
          }),
        );
      },
    },
  ],
});
await build({
  stdin: {
    contents: 'export {DEFAULT_APPEARANCE} from "./src/lib/pals/avatar-v2";',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  outfile: resolve(temp, "identity.mjs"),
  bundle: true,
  format: "esm",
  platform: "node",
});
const { DEFAULT_APPEARANCE } = await import(
  pathToFileURL(resolve(temp, "identity.mjs"))
);
const fixtureVenues = [
  {
    id: "test-world-1",
    slug: "fixture-music-room",
    name: "TEST ONLY Music Room",
    latitude: 36.5432,
    longitude: -4.6228,
    claimStatus: "unclaimed",
  },
  {
    id: "test-world-2",
    slug: "fixture-cafe",
    name: "TEST ONLY Cafe",
    latitude: 36.5424,
    longitude: -4.6237,
    claimStatus: "claimed",
  },
  {
    id: "test-world-3",
    slug: "fixture-north",
    name: "TEST ONLY North Venue",
    latitude: 36.545,
    longitude: -4.625,
    claimStatus: "claimed",
  },
  {
    id: "test-world-4",
    slug: "fixture-south",
    name: "TEST ONLY South Venue",
    latitude: 36.5411,
    longitude: -4.6209,
    claimStatus: "unclaimed",
  },
];
const fixtures = {
  type: "FeatureCollection",
  features: Array.from({ length: 10 }, (_, i) => ({
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [-4.64, 36.535 + i * 0.0015],
        [-4.605, 36.535 + i * 0.0015],
      ],
    },
  })),
};
const mapStyle = {
  version: 8,
  sources: {
    streets: {
      type: "geojson",
      data: fixtures,
      attribution: "AkiPals disposable test map",
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#253741" },
    },
    {
      id: "streets",
      type: "line",
      source: "streets",
      paint: { "line-color": "#57747b", "line-width": 8 },
    },
  ],
};
const requests = [];
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  requests.push({ method: req.method, path: url.pathname, query: url.search });
  const send = (type, data, status = 200) => {
    res.writeHead(status, {
      "Content-Type": type,
      "Cache-Control": "no-store",
      ...(url.pathname === "/pals/world" ? worldHeaders : {}),
      ...(url.pathname === "/csp-probe"
        ? {
            "Content-Security-Policy":
              url.searchParams.get("legacy") === "1" ? publicCsp : worldCsp,
          }
        : {}),
    });
    res.end(data);
  };
  if (url.pathname === "/csp-probe")
    return send(
      "text/html",
      "<!doctype html><title>Local CSP probe</title>Disposable policy test",
    );
  if (url.pathname === "/pals/world")
    return send(
      "text/html",
      '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AkiPals World fixture</title><style>body{margin:0}*,*:before,*:after{box-sizing:border-box}</style><link rel="stylesheet" href="/world.css"><div id="root"></div><script src="/world.js"></script></html>',
    );
  if (url.pathname === "/world.js" || url.pathname === "/world.css")
    return send(
      url.pathname.endsWith("css") ? "text/css" : "application/javascript",
      readFileSync(resolve(temp, url.pathname.slice(1))),
    );
  if (url.pathname === "/pals/runtime/creator.min.js")
    return send(
      "application/javascript",
      readFileSync("public/pals/runtime/creator.min.js"),
    );
  const model = /^\/pals\/models\/akipals-base-(male|female)\.glb$/.exec(
    url.pathname,
  );
  if (model)
    return send(
      "model/gltf-binary",
      readFileSync("public/pals/models/akipals-base-" + model[1] + ".glb"),
    );
  const professionalModel =
    /^\/pals\/models\/professional\/(rain-v3|snow-v4)-20261031\.glb$/.exec(
      url.pathname,
    );
  if (professionalModel)
    return send(
      "model/gltf-binary",
      readFileSync(
        "public/pals/models/professional/" +
          professionalModel[1] +
          "-20261031.glb",
      ),
    );
  if (url.pathname === "/pals/identity")
    return send(
      "application/json",
      JSON.stringify({ appearance: DEFAULT_APPEARANCE, saved: false }),
    );
  if (url.pathname === "/pals/world/venues")
    return send(
      "application/json",
      JSON.stringify({ venues: fixtureVenues, truncated: false }),
    );
  if (url.pathname === "/style.json")
    return send("application/json", JSON.stringify(mapStyle));
  send("text/plain", "Not found", 404);
});
await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--disable-dev-shm-usage",
  ],
});
const receipt = [];
const browserErrors = [];
async function setup(context) {
  context.on("page", (page) => {
    page.on("pageerror", (error) => {
      browserErrors.push(error.message);
      console.error("World browser exception:", error.stack);
    });
  });
  await context.addInitScript(() => {
    window.palsCspViolations = [];
    window.palsDecodedImages = [];
    // The scoped loader now decodes embedded PNGs as real HTML images under
    // img-src. Observe successful native loads without substituting pixels.
    const createElementNS = document.createElementNS.bind(document);
    document.createElementNS = function (...args) {
      const image = createElementNS(...args);
      if (String(args[1]).toLowerCase() === "img")
        image.addEventListener(
          "load",
          () => {
            if (
              image.currentSrc.startsWith("blob:") ||
              image.src.startsWith("blob:")
            )
              window.palsDecodedImages.push({
                width: image.naturalWidth,
                height: image.naturalHeight,
                transport: "HTMLImageElement",
              });
          },
          { once: true },
        );
      return image;
    };
    const decodeImage = window.createImageBitmap.bind(window);
    window.createImageBitmap = async (...args) => {
      const image = await decodeImage(...args);
      window.palsDecodedImages.push({
        width: image.width,
        height: image.height,
      });
      return image;
    };
    document.addEventListener("securitypolicyviolation", (event) => {
      window.palsCspViolations.push({
        directive: event.effectiveDirective,
        blocked: event.blockedURI,
      });
    });
    // Observe the actual mount/result without replacing the renderer or motion.
    window.addEventListener(
      "akipals:3d-ready",
      () => {
        const mount = window.AkiPals3D.mount;
        window.AkiPals3D.mount = (...args) => {
          const stage = mount(...args);
          if (args[1]?.mode === "world") window.palsWorldStage = stage;
          return stage;
        };
      },
      { once: true },
    );
    const state = {
      calls: 0,
      clears: [],
      success: null,
      failure: null,
      hidden: false,
    };
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        watchPosition(success, failure) {
          state.calls++;
          state.success = success;
          state.failure = failure;
          return state.calls;
        },
        clearWatch(id) {
          state.clears.push(id);
        },
      },
    });
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => state.hidden,
    });
    window.palsGPS = {
      state,
      emit(latitude, longitude, accuracy = 6, age = 0) {
        state.success?.({
          timestamp: Date.now() - age,
          coords: { latitude, longitude, accuracy, heading: 85, speed: 1.1 },
        });
      },
      deny() {
        state.failure?.({ code: 1 });
      },
      hide() {
        state.hidden = true;
        document.dispatchEvent(new Event("visibilitychange"));
      },
      show() {
        state.hidden = false;
        document.dispatchEvent(new Event("visibilitychange"));
      },
    };
  });
}

async function projectedPins(page, locale = "en") {
  return page.evaluate(
    ({ venues, prefix }) => {
      const map = window.palsFixtureMap;
      const mapBox = map.getContainer().getBoundingClientRect();
      return venues.map((venue) => {
        const marker = [
          ...document.querySelectorAll(".maplibregl-marker"),
        ].find(
          (node) => node.getAttribute("aria-label") === prefix + venue.name,
        );
        if (!marker) return { id: venue.id, error: 99999 };
        const point = map.project([venue.longitude, venue.latitude]);
        const box = marker.getBoundingClientRect();
        // The stem is an in-flow ::after flex child, so its foot is included in
        // this bottom-centre anchor. Shadows/3D face styling do not move it.
        return {
          id: venue.id,
          position: getComputedStyle(marker).position,
          stemPosition: getComputedStyle(marker, "::after").position,
          error: Math.max(
            Math.abs(box.left + box.width / 2 - (mapBox.left + point.x)),
            Math.abs(box.bottom - (mapBox.top + point.y)),
          ),
        };
      });
    },
    {
      venues: fixtureVenues,
      prefix: locale === "es" ? "Explorar " : "Explore ",
    },
  );
}

async function assertProjectedPins(page, step, locale = "en") {
  await expect
    .poll(async () =>
      Math.max(...(await projectedPins(page, locale)).map((p) => p.error)),
    )
    .toBeLessThan(1.6);
  const pins = await projectedPins(page, locale);
  for (const pin of pins) {
    assert.equal(
      pin.position,
      "absolute",
      step + ": marker is outside normal flow",
    );
    assert.equal(
      pin.stemPosition,
      "static",
      step + ": stem belongs to the anchor box",
    );
  }
  return { step, maximumPixelError: Math.max(...pins.map((p) => p.error)) };
}

try {
  const cspContext = await browser.newContext();
  await setup(cspContext);
  const cspPage = await cspContext.newPage();
  const fetchEmbeddedBlob = async () =>
    cspPage.evaluate(async () => {
      const url = URL.createObjectURL(
        new Blob(["embedded-texture-probe"], { type: "text/plain" }),
      );
      try {
        return await (await fetch(url)).text();
      } catch {
        return "blocked";
      } finally {
        URL.revokeObjectURL(url);
      }
    });
  await cspPage.goto(origin + "/csp-probe?legacy=1");
  assert.equal(
    await fetchEmbeddedBlob(),
    "blocked",
    "The old global policy really blocks embedded-image fetch",
  );
  await expect
    .poll(() =>
      cspPage.evaluate(() =>
        window.palsCspViolations.some(
          (v) => v.directive === "connect-src" && v.blocked === "blob",
        ),
      ),
    )
    .toBe(true);
  await cspPage.goto(origin + "/csp-probe");
  assert.equal(
    await fetchEmbeddedBlob(),
    "embedded-texture-probe",
    "Actual World policy permits same-document image blobs",
  );
  assert.deepEqual(await cspPage.evaluate(() => window.palsCspViolations), []);
  await cspContext.close();
  for (const { width, height } of [
    ...[360, 390, 430, 820, 1440].map((width) => ({ width, height: 900 })),
    { width: 390, height: 640 },
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      reducedMotion: width === 430 ? "reduce" : "no-preference",
    });
    await setup(context);
    const page = await context.newPage();
    const expectedModel = width === 430 ? "snow-v4" : "rain-v3";
    if (expectedModel === "snow-v4") {
      await page.route("**/pals/identity", (route) =>
        route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            appearance: { ...DEFAULT_APPEARANCE, model: "snow-v4" },
            saved: true,
          }),
        }),
      );
    }
    const modelRequests = [];
    page.on("request", (request) => {
      if (request.url().endsWith(".glb")) modelRequests.push(request.url());
    });
    await page.goto(origin + "/pals/world");
    await expect(page.locator("[data-pals-world-avatar]")).toHaveAttribute(
      "data-rendered",
      "true",
      { timeout: 45000 },
    );
    await expect(page.locator("[data-pals-world-avatar]")).toHaveAttribute(
      "data-model-id",
      expectedModel,
    );
    assert.ok(
      modelRequests.some((url) =>
        url.endsWith(`/professional/${expectedModel}-20261031.glb`),
      ),
      "World requests the actual selected professional model",
    );
    const decodedImages = await page.evaluate(() => window.palsDecodedImages);
    assert.ok(
      decodedImages.length > 0 &&
        decodedImages.every((image) => image.width > 0 && image.height > 0),
      "Native image decoding completes for embedded model textures",
    );
    await expect(
      page.getByRole("button", { name: /TEST ONLY Music Room/ }).first(),
    ).toBeVisible();
    assert.equal(
      await page.evaluate(() => typeof window.palsWorldStage?.setMotion),
      "function",
      "World mounts the real renderer with its motion interface",
    );
    const portraitBeforeGps = await page.evaluate(() =>
      window.palsWorldStage.screenshot(),
    );
    assert.equal(await page.evaluate(() => window.palsGPS.state.calls), 0);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      true,
      "No horizontal overflow",
    );
    await expect(page.locator("[data-pals-world-details]")).toHaveCount(0);
    const projection = [await assertProjectedPins(page, "initial")];
    let negativeControlMaximumPixelError = null;
    if (width === 390 && height === 900) {
      const regression = await page.addStyleTag({
        content:
          '.maplibregl-marker[aria-label^="Explore TEST ONLY"] { position: relative !important; }',
      });
      negativeControlMaximumPixelError = Math.max(
        ...(await projectedPins(page)).map((p) => p.error),
      );
      assert.ok(
        negativeControlMaximumPixelError > 20,
        "The former normal-flow positioning must fail coordinate placement",
      );
      await regression.evaluate((style) => style.remove());
      projection.push(
        await assertProjectedPins(page, "negative control restored"),
      );
    }
    for (const [step, camera] of [
      ["pan", { center: [-4.6244, 36.5437] }],
      ["zoom", { zoom: 17.2 }],
      ["tilt and rotate", { pitch: 34, bearing: 31 }],
    ]) {
      await page.evaluate(
        (camera) => window.palsFixtureMap.jumpTo(camera),
        camera,
      );
      projection.push(await assertProjectedPins(page, step));
    }
    await page.setViewportSize({
      width: Math.max(320, width - 37),
      height: height - 80,
    });
    projection.push(await assertProjectedPins(page, "resize"));
    await page.setViewportSize({ width, height });
    await page.evaluate(() =>
      window.palsFixtureMap.jumpTo({
        center: [-4.6234, 36.543],
        zoom: 16.1,
        pitch: 55,
        bearing: -14,
      }),
    );
    projection.push(await assertProjectedPins(page, "restored"));
    if (width <= 880) {
      const mapBox = await page
        .getByRole("region", { name: "AkiPals interactive exploration map" })
        .boundingBox();
      const hudBox = await page.locator("[data-pals-world-hud]").boundingBox();
      assert.ok(
        mapBox.height >= height - 115,
        "Map gets the viewport below compact navigation",
      );
      assert.ok(
        hudBox.height < 90,
        "Default controls cannot become another large popup",
      );
      assert.ok(
        mapBox.height - hudBox.height >= height * 0.67,
        "At least two-thirds of the phone remains clear map",
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= window.innerHeight + 1,
        ),
        true,
        "Closed panels never push the phone map into a scrolling page",
      );
      await expect(
        page.getByRole("region", { name: "Nearby venue list" }),
      ).not.toBeVisible();
      await page
        .getByRole("button", { name: "Nearby places", exact: true })
        .click();
      await expect(
        page.getByRole("region", { name: "Nearby venue list" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Locate my AkiPal", exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Close nearby places" }).click();
      await expect(
        page.getByRole("button", { name: "Nearby places", exact: true }),
      ).toBeFocused();
      const attribution = page.locator(".maplibregl-ctrl-attrib-button");
      const attributionBox = await attribution.boundingBox();
      assert.ok(attributionBox.width >= 44 && attributionBox.height >= 44);
      assert.equal(
        await attribution.evaluate(
          (node) => getComputedStyle(node).backgroundRepeat,
        ),
        "no-repeat",
        "Larger accessible attribution control must not tile its icon",
      );
      await attribution.click();
      await expect(
        page.locator(".maplibregl-ctrl-attrib-inner"),
      ).not.toBeVisible();
      await attribution.click();
      await expect(page.locator(".maplibregl-ctrl-attrib-inner")).toBeVisible();
    }
    await page.getByRole("button", { name: "About AkiWorld" }).click();
    await expect(
      page.getByRole("heading", { name: "Map & location" }),
    ).toBeVisible();
    const helpInk = await page
      .getByRole("heading", { name: "Map & location" })
      .evaluate((node) => getComputedStyle(node).color);
    assert.equal(
      helpInk,
      "rgb(255, 244, 233)",
      "World cards set readable ink above global heading rules",
    );
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-pals-world-details]")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "About AkiWorld" }),
    ).toBeFocused();
    projection.push(await assertProjectedPins(page, "help collapsed"));
    await page.screenshot({
      path: resolve(
        output,
        `world-${width}${height === 640 ? "-short" : ""}.png`,
      ),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Locate my AkiPal", exact: true })
      .click();
    assert.equal(await page.evaluate(() => window.palsGPS.state.calls), 1);
    await expect(
      page.getByRole("button", { name: "Stop location tracking", exact: true }),
    ).toBeVisible();
    await page.evaluate(() => window.palsGPS.emit(36.54311, -4.62312));
    await expect(page.locator("[data-pals-gps-status]")).toContainText(
      "GPS ±6 m · private",
    );
    await expect
      .poll(() =>
        page.evaluate(
          (before) => window.palsWorldStage.screenshot() !== before,
          portraitBeforeGps,
        ),
      )
      .toBe(true);
    await page
      .getByRole("button", {
        name: "Explore TEST ONLY Music Room",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", { name: "TEST ONLY Music Room", exact: true }),
    ).toBeVisible();
    projection.push(
      await assertProjectedPins(page, "venue opened while following"),
    );
    if (width === 390 && height === 640) {
      await page.screenshot({
        path: resolve(output, "world-390-short-venue.png"),
        fullPage: true,
      });
    }
    const stop = page.getByRole("button", {
      name: "Stop location tracking",
      exact: true,
    });
    await expect(stop).toBeVisible();
    const box = await stop.boundingBox();
    assert.ok(box.width >= 44 && box.height >= 44);
    await stop.click();
    await expect(page.locator("[data-pals-gps-status]")).toContainText(
      "Location off",
    );
    await page.evaluate(() => window.palsGPS.emit(36.55, -4.61));
    await expect(page.locator("[data-pals-gps-status]")).toContainText(
      "Location off",
    );
    await page
      .getByRole("button", { name: "Locate my AkiPal", exact: true })
      .click();
    await page.evaluate(() =>
      window.palsGPS.emit(36.54311, -4.62312, 6, 60000),
    );
    await expect(page.locator("[data-pals-gps-status]")).toContainText(
      "fresh GPS",
    );
    await page.evaluate(() => window.palsGPS.emit(36.54311, -4.62312, 500));
    await expect(page.locator("[data-pals-gps-status]")).toContainText(
      "imprecise",
    );
    await page.evaluate(() => window.palsGPS.emit(36.54311, -4.62312));
    await page.evaluate(() => window.palsGPS.hide());
    await expect(page.locator("[data-pals-gps-status]")).toContainText(
      "Location off",
    );
    await page.evaluate(() => window.palsGPS.emit(36.56, -4.6));
    await expect(page.locator("[data-pals-gps-status]")).toContainText(
      "Location off",
    );
    await page.evaluate(() => window.palsGPS.show());
    await page
      .getByRole("button", { name: "Locate my AkiPal", exact: true })
      .click();
    await page.evaluate(() => window.palsGPS.deny());
    await expect(page.locator("[data-pals-gps-status]")).toContainText(
      "Location denied",
    );
    await page
      .getByRole("button", { name: "Locate my AkiPal", exact: true })
      .click();
    const clears = await page.evaluate(
      () => window.palsGPS.state.clears.length,
    );
    await page.evaluate(() => window.unmountWorld());
    assert.equal(
      await page.evaluate(() => window.palsGPS.state.clears.length),
      clears + 1,
      "Unmount clears the sensor",
    );
    assert.deepEqual(browserErrors, [], "No JavaScript runtime errors");
    assert.deepEqual(
      await page.evaluate(() => window.palsCspViolations),
      [],
      "Real World renderer, texture fetches and map workers satisfy production CSP",
    );
    receipt.push({
      width,
      height,
      compactDefaultControls: true,
      detailsDismissible: true,
      projectedPins: projection,
      negativeControlMaximumPixelError,
      realMapLibre: true,
      realGLB: true,
      modelId: expectedModel,
      savedAppearance: expectedModel === "snow-v4",
      decodedTextureImages: decodedImages,
      realWorldModeAndGpsPortraitUpdate: true,
      gpsInitiallyOff: true,
      stopVisibleOnVenue: true,
      staleCallbackBlocked: true,
      oldAndInaccurateFixRejected: true,
      backgroundStop: true,
      denied: true,
      unmountStop: true,
    });
    await context.close();
  }
  // The night-game HUD is intentional under both OS preferences. This is
  // actual localized World/MapLibre/WebGL, not a claimed separate light palette.
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const width of [390, 820, 1440]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          reducedMotion: "reduce",
          colorScheme: theme,
        });
        await setup(context);
        const page = await context.newPage(),
          es = locale === "es";
        await page.route("**/pals/identity", (r) =>
          r.fulfill({
            json: {
              appearance: {
                ...DEFAULT_APPEARANCE,
                model: "classic-v2",
                bodyStyle: es ? "masculine" : "feminine",
              },
              saved: true,
            },
          }),
        );
        await page.goto(origin + "/pals/world?lang=" + locale);
        await expect(page.locator("[data-pals-world-avatar]")).toHaveAttribute(
          "data-rendered",
          "true",
          { timeout: 45000 },
        );
        await expect(page.locator("[data-pals-world-avatar]")).toHaveAttribute(
          "data-model-id",
          es ? "snow-v4" : "rain-v3",
        );
        assert.equal(await page.evaluate(() => window.palsGPS.state.calls), 0);
        const projected = await assertProjectedPins(
          page,
          "localized night HUD",
          locale,
        );
        const nearby = page.getByRole("region", {
          name: es ? "Lista de lugares cercanos" : "Nearby venue list",
          exact: true,
        });
        await expect(nearby).not.toBeVisible();
        await page
          .getByRole("button", {
            name: es ? "Lugares cercanos" : "Nearby places",
            exact: true,
          })
          .click();
        await expect(nearby).toBeVisible();
        await page
          .getByRole("button", {
            name: es ? "Cerrar lugares cercanos" : "Close nearby places",
            exact: true,
          })
          .click();
        await expect(nearby).not.toBeVisible();
        const locate = page.getByRole("button", {
          name: es ? "Localizar mi AkiPal" : "Locate my AkiPal",
          exact: true,
        });
        await locate.click();
        await page.evaluate(() => window.palsGPS.emit(36.54311, -4.62312));
        await expect(page.locator("[data-pals-gps-status]")).toContainText(
          es ? "privado" : "private",
        );
        await page
          .getByRole("button", {
            name: es ? "Detener ubicación" : "Stop location tracking",
            exact: true,
          })
          .click();
        await expect(page.locator("[data-pals-gps-status]")).toContainText(
          es ? "Ubicación desactivada" : "Location off",
        );
        await locate.click();
        await page.evaluate(() => window.palsGPS.deny());
        await expect(page.locator("[data-pals-gps-status]")).toContainText(
          es ? "Ubicación denegada" : "Location denied",
        );
        await page
          .getByRole("button", {
            name: (es ? "Explorar " : "Explore ") + "TEST ONLY Music Room",
            exact: true,
          })
          .click();
        const venue = page.getByRole("link", {
          name: es ? "Ver lugar ↗" : "View place ↗",
          exact: true,
        });
        await expect(venue).toHaveAttribute(
          "href",
          `/${locale}/venues/fixture-music-room`,
        );
        await page.screenshot({
          path: resolve(output, `world-${locale}-${theme}-${width}.png`),
          fullPage: true,
        });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          true,
        );
        await Promise.all([
          page.waitForURL(`**/${locale}/venues/fixture-music-room`),
          venue.click(),
        ]);
        receipt.push({
          locale,
          osPreference: theme,
          visualPalette: "intentional fixed night game HUD",
          width,
          legacySavedModelReadOnly: true,
          modelId: es ? "snow-v4" : "rain-v3",
          projected,
          nearbyDefaultClosed: true,
          actualOptInStopDenied: true,
          nativeVenueHref: true,
          realMapLibre: true,
          realGLB: true,
        });
        await context.close();
      }
  for (const kind of ["venues", "avatar"]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await setup(context);
    const page = await context.newPage();
    const match =
      kind === "venues" ? "**/pals/world/venues?*" : "**/pals/identity";
    await page.route(match, (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"error":"Fixture unavailable"}',
      }),
    );
    await page.goto(origin + "/pals/world");
    if (kind === "venues") {
      await expect(
        page.getByRole("button", { name: "Nearby places", exact: true }),
      ).toContainText("Retry");
      await page
        .getByRole("button", { name: "Nearby places", exact: true })
        .click();
      await expect(
        page.getByText("Venue feed unavailable.", { exact: false }),
      ).toBeVisible();
      await page.unroute(match);
      await page.getByRole("button", { name: "Refresh nearby places" }).click();
      await expect(
        page.getByRole("button", {
          name: "Explore TEST ONLY Music Room",
          exact: true,
        }),
      ).toBeVisible();
    } else {
      await expect(page.locator("[data-pals-world-avatar]")).toHaveText(
        "3D unavailable",
      );
      await expect(
        page.getByRole("button", {
          name: "Explore TEST ONLY Music Room",
          exact: true,
        }),
      ).toBeVisible();
    }
    receipt.push({ recovery: kind, passed: true });
    await context.close();
  }
  for (const r of requests.filter((r) => r.path === "/pals/world/venues")) {
    const params = new URLSearchParams(r.query);
    assert.match(params.get("lat"), /^-?\d+(\.\d{1,2})?$/);
    assert.match(params.get("lng"), /^-?\d+(\.\d{1,2})?$/);
  }
  assert.equal(
    requests.some((r) => r.method !== "GET"),
    false,
    "World never writes check-ins, rewards, scans or location",
  );
  assert.deepEqual(browserErrors, [], "No JavaScript runtime errors");
  writeFileSync(
    resolve(output, "receipt.json"),
    JSON.stringify(
      {
        suite: "actual World/MapLibre/GLB with disposable data and sensors",
        productionAuthOrPhysicalGps: false,
        productionWorldCspEnforced: true,
        globalBlobFetchDenied: true,
        privateWorldBlobFetchAllowed: true,
        checks: receipt,
        requestCount: requests.length,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ result: "PASS", contexts: receipt.length }));
} catch (error) {
  console.error("World failure:", error, browserErrors);
  for (const [index, page] of browser
    .contexts()
    .flatMap((context) => context.pages())
    .entries()) {
    await page.screenshot({
      path: resolve(output, `failure-${index}.png`),
      fullPage: true,
    });
    writeFileSync(
      resolve(output, `failure-${index}.html`),
      await page.content(),
    );
  }
  throw error;
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
  rmSync(temp, { recursive: true, force: true });
}
