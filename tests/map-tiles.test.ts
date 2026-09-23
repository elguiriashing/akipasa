import { expect, it, vi } from "vitest";
import {
  MapTileIndex,
  MapTileLoader,
  markerTile,
  parseMapTile,
  tileKey,
  tilesForBounds,
} from "../src/lib/map-tiles";
import { serveMapSnapshot } from "../cloudflare/map-edge-cache";
import type {
  CompactMapMarker,
  MapMarkerSnapshot,
} from "../src/lib/map-snapshot";
const marker = (i: number, lon = -4.624, lat = 36.539): CompactMapMarker => [
  `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  lon,
  lat,
  1,
  0,
];
const snapshot = (markers: CompactMapMarker[]): MapMarkerSnapshot => ({
  version: 2,
  generatedAt: "2026-09-19T00:00:00Z",
  count: markers.length,
  markers,
});
const local = { west: -4.65, east: -4.6, south: 36.52, north: 36.55 };
const signal = () => new AbortController().signal;
it("returns a small local area from 75k markers but never truncates dense tiles", () => {
  const index = new MapTileIndex(
    snapshot([
      marker(0),
      ...Array.from({ length: 75000 }, (_, i) => marker(i + 1, -3.7, 40.4)),
    ]),
  );
  expect(index.read(markerTile(-4.624, 36.539, 11)).count).toBe(1);
  expect(index.read(markerTile(-3.7, 40.4, 11)).count).toBe(75000);
  expect(index.read({ z: 0, x: 0, y: 0 }).count).toBe(75001);
});
it("retains markers, caches empty areas and avoids refetch on returning or zooming within a loaded parent", async () => {
  const index = new MapTileIndex(snapshot([marker(0), marker(1, -3.7, 40.4)]));
  const request = vi.fn(async (url: RequestInfo | URL) =>
    Response.json(index.read(parseMapTile(String(url))!)),
  );
  const loader = new MapTileLoader();
  await loader.load(local, 10, signal(), request);
  expect(loader.values().map((m) => m[0])).toEqual([marker(0)[0]]);
  const calls = request.mock.calls.length;
  await loader.load(local, 10, signal(), request);
  await loader.load(local, 12, signal(), request);
  expect(request).toHaveBeenCalledTimes(calls);
  await loader.load(
    { west: -3.71, east: -3.69, south: 40.39, north: 40.41 },
    10,
    signal(),
    request,
  );
  expect(loader.values()).toHaveLength(2);
  const afterPan = request.mock.calls.length;
  await loader.load(local, 10, signal(), request);
  expect(request).toHaveBeenCalledTimes(afterPan);
  await loader.load(
    { west: -180, east: 180, south: -85, north: 85 },
    0,
    signal(),
    request,
  );
  expect(loader.values()).toHaveLength(2);
});
it("preserves successful tiles on failure and retries only failed areas", async () => {
  const local = { west: -4.9, east: -4.3, south: 36.52, north: 36.55 };
  const loader = new MapTileLoader();
  let failing = true;
  const target = tileKey(tilesForBounds(local, 10)[0]);
  const request = vi.fn(async (url: RequestInfo | URL) =>
    String(url).split("?")[0].endsWith(target) && failing
      ? new Response(null, { status: 503 })
      : Response.json(snapshot([marker(1)])),
  );
  expect((await loader.load(local, 10, signal(), request)).failed).toBe(true);
  expect(loader.values()).toHaveLength(1);
  const calls = request.mock.calls.length;
  failing = false;
  expect((await loader.load(local, 10, signal(), request)).failed).toBe(false);
  expect(request).toHaveBeenCalledTimes(calls + 1);
  expect(loader.values()).toHaveLength(1);
});
it("covers worldwide and antimeridian views with bounded tile requests, without clipping coverage", () => {
  for (const b of [
    local,
    { west: -180, east: 180, south: -85, north: 85 },
    { west: 179, east: -179, south: -10, north: 10 },
  ]) {
    const tiles = tilesForBounds(b, 18);
    expect(tiles.length).toBeLessThanOrEqual(32);
    for (const lon of [b.west, b.east])
      for (const lat of [b.south, b.north])
        expect(tiles.map(tileKey)).toContain(
          tileKey(markerTile(lon, lat, tiles[0].z)),
        );
  }
  expect(parseMapTile("/api/map/tiles/13/0/0")).toBeNull();
  expect(parseMapTile("/api/map/tiles/2/4/0")).toBeNull();
});
it("uses independent edge cache keys per tile and rejects invalid keys before upstream work", async () => {
  const stored = new Map<string, Response>();
  const cache = {
    match: async (r: Request) => stored.get(r.url)?.clone(),
    put: async (r: Request, v: Response) => {
      stored.set(r.url, v);
    },
  };
  const upstream = vi.fn(
    async (r: Request) => new Response(new URL(r.url).pathname),
  );
  const env = {
    MAP_SNAPSHOTS: {
      idFromName: () => "shared",
      get: () => ({ fetch: upstream }),
    },
  };
  const bg: Promise<unknown>[] = [];
  for (const path of ["/api/map/tiles/2/1/1", "/api/map/tiles/2/2/1"]) {
    const response = await serveMapSnapshot(
      new Request("https://akipasa.com" + path),
      env,
      cache,
      (p) => bg.push(p),
    );
    expect(await response.text()).toBe(path);
    await Promise.all(bg);
  }
  await serveMapSnapshot(
    new Request("https://akipasa.com/api/map/tiles/2/1/1?ignored=1"),
    env,
    cache,
    () => {},
  );
  expect(upstream).toHaveBeenCalledTimes(2);
  expect(
    (
      await serveMapSnapshot(
        new Request("https://akipasa.com/api/map/tiles/99/1/1"),
        env,
        cache,
        () => {},
      )
    ).status,
  ).toBe(400);
  expect(upstream).toHaveBeenCalledTimes(2);
});
it("does not cache an aborted tile as successfully loaded", async () => {
  const controller = new AbortController(),
    loader = new MapTileLoader();
  const request = vi.fn(async () => {
    controller.abort();
    return Response.json(snapshot([marker(0)]));
  });
  await loader.load(local, 10, controller.signal, request);
  expect(loader.values()).toHaveLength(0);
  const retry = vi.fn(async () => Response.json(snapshot([marker(0)])));
  await loader.load(local, 10, signal(), retry);
  expect(retry).toHaveBeenCalled();
  expect(loader.values()).toHaveLength(1);
});

it("restores fresh public tiles across map instances without network requests", async () => {
  const entries = new Map<
    string,
    import("../src/lib/map-browser-cache").CachedMapTile
  >();
  const cache = {
    read: async (key: string) => entries.get(key) ?? null,
    write: async (
      key: string,
      value: import("../src/lib/map-browser-cache").CachedMapTile,
    ) => {
      entries.set(key, value);
    },
  };
  const index = new MapTileIndex(snapshot([marker(0)]));
  const request = vi.fn(async (url: RequestInfo | URL) =>
    Response.json(index.read(parseMapTile(String(url))!)),
  );
  await new MapTileLoader(cache).load(local, 10, signal(), request);
  request.mockClear();
  const returned = new MapTileLoader(cache);
  const render = vi.fn();
  await returned.load(local, 10, signal(), request, render);
  expect(returned.values()).toEqual([marker(0)]);
  expect(render).toHaveBeenCalledOnce();
  expect(request).not.toHaveBeenCalled();
});

it("renders stale tiles before refresh, replaces removed/moved markers, and keeps unrelated areas", async () => {
  const { MAP_CACHE_FRESH_MS } = await import("../src/lib/map-browser-cache");
  let now = Date.now();
  const entries = new Map<
    string,
    import("../src/lib/map-browser-cache").CachedMapTile
  >();
  const cache = {
    read: async (key: string) => entries.get(key) ?? null,
    write: async (
      key: string,
      value: import("../src/lib/map-browser-cache").CachedMapTile,
    ) => {
      entries.set(key, value);
    },
  };
  const old = new MapTileIndex(
    snapshot([marker(0), marker(1), marker(2, -3.7, 40.4)]),
  );
  const request = (index: MapTileIndex) =>
    vi.fn(async (url: RequestInfo | URL) =>
      Response.json(index.read(parseMapTile(String(url))!)),
    );
  await new MapTileLoader(cache, () => now).load(
    local,
    10,
    signal(),
    request(old),
  );
  now += MAP_CACHE_FRESH_MS + 1;
  const loader = new MapTileLoader(cache, () => now);
  await loader.load(
    { west: -3.71, east: -3.69, south: 40.39, north: 40.41 },
    10,
    signal(),
    request(old),
  );
  let hydrated = false;
  const fresh = request(new MapTileIndex(snapshot([marker(1, -4.625, 36.54)])));
  const network = vi.fn(async (url: RequestInfo | URL) => {
    expect(hydrated).toBe(true);
    return fresh(url);
  });
  await loader.load(local, 10, signal(), network, () => {
    hydrated = true;
    expect(loader.values()).toContainEqual(marker(0));
  });
  expect(loader.values()).toHaveLength(2);
  expect(loader.values()).toContainEqual(marker(1, -4.625, 36.54));
  expect(loader.values()).toContainEqual(marker(2, -3.7, 40.4));
  expect(loader.values()).not.toContainEqual(marker(0));
});

it("keeps stale markers on network failure but ignores expired data and tolerates unavailable storage", async () => {
  const { MAP_CACHE_MAX_AGE_MS } = await import("../src/lib/map-browser-cache");
  const now = Date.now();
  const index = new MapTileIndex(snapshot([marker(0)]));
  let savedAt = now - 600_000;
  const cache = {
    read: async (key: string) => ({
      data: index.read(parseMapTile("/api/map/tiles/" + key)!),
      savedAt,
    }),
    write: async () => {
      throw Error("quota");
    },
  };
  const loader = new MapTileLoader(cache, () => now);
  expect(
    (
      await loader.load(
        local,
        10,
        signal(),
        async () => new Response(null, { status: 503 }),
      )
    ).failed,
  ).toBe(true);
  expect(loader.values()).toEqual([marker(0)]);
  savedAt = now - MAP_CACHE_MAX_AGE_MS - 1;
  const expired = new MapTileLoader(cache, () => now);
  await expired.load(
    local,
    10,
    signal(),
    async () => new Response(null, { status: 503 }),
  );
  expect(expired.values()).toEqual([]);
  const denied = new MapTileLoader({
    ...cache,
    read: async () => {
      throw Error("denied");
    },
  });
  await denied.load(local, 10, signal(), async (url) =>
    Response.json(index.read(parseMapTile(String(url))!)),
  );
  expect(denied.values()).toEqual([marker(0)]);
});

it("persists validated tiles in IndexedDB, bounds storage, and discards expired/corrupt entries", async () => {
  const { IDBFactory } = await import("fake-indexeddb");
  const { BrowserMapTileCache, MAP_CACHE_MAX_AGE_MS } = await import(
    "../src/lib/map-browser-cache"
  );
  vi.stubGlobal("indexedDB", new IDBFactory());
  try {
    const first = new BrowserMapTileCache();
    const entry = { data: snapshot([marker(0)]), savedAt: Date.now() };
    await first.write("11/0/0", entry);
    expect(await new BrowserMapTileCache().read("11/0/0")).toEqual(entry);
    await first.write("old", {
      ...entry,
      savedAt: Date.now() - MAP_CACHE_MAX_AGE_MS - 1,
    });
    expect(await first.read("old")).toBeNull();
    await first.write("corrupt", {
      ...entry,
      data: { ...entry.data, count: 999 },
    });
    expect(await first.read("corrupt")).toBeNull();
    for (let i = 0; i < 260; i++)
      await first.write(`12/${i}/0`, {
        data: snapshot([]),
        savedAt: Date.now(),
      });
    const records = await new Promise<Array<{ bytes: number }>>(
      (resolve, reject) => {
        const request = indexedDB.open("akipasa-map-tiles-v2", 1);
        request.onsuccess = () => {
          const get = request.result
            .transaction("tiles")
            .objectStore("tiles")
            .getAll();
          get.onsuccess = () => {
            request.result.close();
            resolve(get.result);
          };
          get.onerror = () => reject(get.error);
        };
      },
    );
    expect(records.length).toBeLessThanOrEqual(256);
    expect(
      records.reduce((sum, entry) => sum + entry.bytes, 0),
    ).toBeLessThanOrEqual(12 * 1024 * 1024);
    expect(await first.read("11/0/0")).toBeNull();
    // Oversized results remain usable by the loader but are not persisted.
    await first.write("oversized", {
      ...entry,
      data: snapshot(Array.from({ length: 100000 }, (_, i) => marker(i))),
    });
    expect(await first.read("oversized")).toBeNull();
  } finally {
    vi.unstubAllGlobals();
  }
});
