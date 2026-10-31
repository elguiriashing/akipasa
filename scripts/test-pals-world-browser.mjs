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

// Actual World, MapLibre, Three.js and GLB meshes. Only data and GPS are fixtures.
const output = resolve("test-results/pals-world-browser");
const temp = mkdtempSync(resolve(tmpdir(), "pals-world-"));
mkdirSync(output, { recursive: true });
await build({
  stdin: {
    contents:
      'import React from "react"; import {createRoot} from "react-dom/client"; import {WorldExplorer} from "./src/components/pals/WorldExplorer"; const root=createRoot(document.getElementById("root")); window.unmountWorld=()=>root.unmount(); root.render(React.createElement(WorldExplorer,{styleUrl:"/style.json"}));',
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
    });
    res.end(data);
  };
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
  if (url.pathname === "/pals/identity")
    return send(
      "application/json",
      JSON.stringify({ appearance: DEFAULT_APPEARANCE, saved: true }),
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
try {
  for (const width of [360, 390, 430, 820, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: width === 430 ? "reduce" : "no-preference",
    });
    await setup(context);
    const page = await context.newPage();
    await page.goto(origin + "/pals/world");
    await expect(page.locator("[data-pals-world-avatar]")).toHaveAttribute(
      "data-rendered",
      "true",
      { timeout: 45000 },
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
    await page.screenshot({
      path: resolve(output, `world-${width}.png`),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Locate my AkiPal", exact: true })
      .click();
    assert.equal(await page.evaluate(() => window.palsGPS.state.calls), 1);
    await page.evaluate(() => window.palsGPS.emit(36.54311, -4.62312));
    await expect(page.locator("[data-pals-gps-status]")).toContainText(
      "Following you",
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
      "too imprecise",
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
    receipt.push({
      width,
      realMapLibre: true,
      realGLB: true,
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
