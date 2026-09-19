import assert from "node:assert/strict";
import { build } from "esbuild";
import { Miniflare } from "miniflare";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const directory = await mkdtemp(path.join(tmpdir(), "akipasa-map-cache-"));
const bundle = await build({
  stdin: {
    contents: `
    import {serveMapSnapshot} from './cloudflare/map-edge-cache';
    export {MapSnapshot} from './cloudflare/map-snapshot';
    export default {fetch(request,env,ctx) {
      return serveMapSnapshot(request,env,caches.default,p=>ctx.waitUntil(p));
    }};`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
  target: "es2022",
});
let builds = 0;
const count = 100001;
const payload = JSON.stringify({
  version: 1,
  generatedAt: new Date().toISOString(),
  count,
  markers: Array.from({ length: count }, (_, i) => [
    `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    -4.624,
    36.539,
    1,
  ]),
});
const options = {
  modules: true,
  script: bundle.outputFiles[0].text,
  compatibilityDate: "2026-07-22",
  durableObjects: {
    MAP_SNAPSHOTS: { className: "MapSnapshot", useSQLite: true },
  },
  durableObjectsPersist: directory,
  bindings: {
    NEXT_PUBLIC_SUPABASE_URL: "https://database.example",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-test-key",
  },
  outboundService: async (request) => {
    assert.equal(
      new URL(request.url).pathname,
      "/rest/v1/rpc/public_map_marker_snapshot",
    );
    builds++;
    return new Response(payload, {
      headers: { "Content-Type": "application/json" },
    });
  },
};
let mf;
try {
  mf = new Miniflare(options);
  await Promise.all(
    Array.from({ length: 5 }, async (_, i) => {
      const response = await mf.dispatchFetch(
        `https://akipasa.com/api/map/snapshot?client=${i}`,
      );
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.count, count);
      assert.equal(data.markers.length, count);
    }),
  );
  assert.equal(builds, 1, "simultaneous misses must build once");
  const warm = await mf.dispatchFetch(
    "https://akipasa.com/api/map/snapshot?ignored=1",
  );
  assert.equal(warm.headers.get("X-Map-Cache"), "HIT");
  const etag = warm.headers.get("ETag");
  await warm.arrayBuffer();
  const unchanged = await mf.dispatchFetch(
    "https://akipasa.com/api/map/snapshot",
    { headers: { "If-None-Match": etag } },
  );
  assert.equal(unchanged.status, 304);
  // Separate tile cache entries share the same persistent nationwide build.
  const n = 2 ** 10,
    x = Math.floor(((-4.624 + 180) / 360) * n),
    lat = (36.539 * Math.PI) / 180;
  const y = Math.floor(((1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2) * n);
  const tile = await mf.dispatchFetch(
    `https://akipasa.com/api/map/tiles/10/${x}/${y}`,
  );
  assert.equal(
    (await tile.json()).count,
    count,
    "dense tiles must not be truncated",
  );
  const empty = await mf.dispatchFetch(
    `https://akipasa.com/api/map/tiles/10/${x + 10}/${y}`,
  );
  assert.equal(
    (await empty.json()).count,
    0,
    "tile cache keys must not collide",
  );
  assert.equal(builds, 1, "exploring new tiles must reuse the snapshot");
  await mf.dispose();
  mf = new Miniflare(options);
  const restored = await mf.dispatchFetch(
    "https://akipasa.com/api/map/snapshot",
  );
  assert.equal(restored.status, 200);
  assert.equal((await restored.json()).count, count);
  assert.equal(
    builds,
    1,
    "Durable Object restart must restore persistent snapshot",
  );
  console.log(
    "PASS: 100,001 markers, coalesced builds, edge HIT, 304 and SQLite restart persistence.",
  );
} finally {
  if (mf) await mf.dispose();
  await rm(directory, { recursive: true, force: true });
}
