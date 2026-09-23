import { describe, expect, it, vi } from "vitest";
import {
  MapSnapshotCache,
  SNAPSHOT_FRESH_MS,
  SNAPSHOT_MAX_AGE_MS,
  SNAPSHOT_RETRY_MS,
  type CachedMapSnapshot,
} from "../src/lib/map-snapshot-cache";
import { serveMapSnapshot } from "../cloudflare/map-edge-cache";
import { loadMapSnapshot } from "../src/lib/map-snapshot";

const snap = (time: number, body = "complete") => ({
  body,
  createdAt: time,
  etag: '"v1"',
});
function setup(initial?: CachedMapSnapshot) {
  let saved = initial;
  const store = {
    load: () => saved,
    save: vi.fn((s: CachedMapSnapshot) => {
      saved = s;
    }),
  };
  return store;
}

describe("global snapshot cache", () => {
  it("coalesces 1,000 simultaneous cold readers into ONE database build", async () => {
    let finish!: (s: CachedMapSnapshot) => void;
    const build = vi.fn(
      () =>
        new Promise<CachedMapSnapshot>((resolve) => {
          finish = resolve;
        }),
    );
    const store = setup();
    const cache = new MapSnapshotCache(store, build, () => 1000);
    const requests = Array.from({ length: 1000 }, () => cache.read(() => {}));
    expect(build).toHaveBeenCalledTimes(1);
    finish(snap(1000));
    const results = await Promise.all(requests);
    expect(results.every((r) => r.body === "complete")).toBe(true);
    expect(store.save).toHaveBeenCalledTimes(1);
    await cache.read(() => {});
    expect(build).toHaveBeenCalledTimes(1);
  });
  it("serves the previous complete snapshot during ONE refresh and persists replacement", async () => {
    let now = 1000 + SNAPSHOT_FRESH_MS;
    const store = setup(snap(1000, "old"));
    let finish!: (s: CachedMapSnapshot) => void;
    const build = vi.fn(
      () =>
        new Promise<CachedMapSnapshot>((resolve) => {
          finish = resolve;
        }),
    );
    const cache = new MapSnapshotCache(store, build, () => now);
    const background: Promise<unknown>[] = [];
    const results = await Promise.all(
      Array.from({ length: 1000 }, () => cache.read((p) => background.push(p))),
    );
    expect(results.every((r) => r.body === "old")).toBe(true);
    expect(build).toHaveBeenCalledTimes(1);
    finish(snap(now, "new"));
    await Promise.all(background);
    now++;
    const restarted = new MapSnapshotCache(store, build, () => now);
    expect((await restarted.read(() => {})).body).toBe("new");
    expect(build).toHaveBeenCalledTimes(1);
  });
  it("does not replace good data on failure; backs off and rejects excessively old data", async () => {
    let now = 1000 + SNAPSHOT_FRESH_MS;
    const store = setup(snap(1000));
    const build = vi.fn(async () => {
      throw new Error("database down");
    });
    const cache = new MapSnapshotCache(store, build, () => now);
    const background: Promise<unknown>[] = [];
    expect((await cache.read((p) => background.push(p))).body).toBe("complete");
    await Promise.all(background);
    await cache.read(() => {});
    expect(build).toHaveBeenCalledTimes(1);
    expect(store.save).not.toHaveBeenCalled();
    now = 1000 + SNAPSHOT_MAX_AGE_MS + SNAPSHOT_RETRY_MS;
    await expect(cache.read(() => {})).rejects.toThrow("database down");
  });
});

it("edge hits and conditional requests avoid the origin and canonicalize cache keys", async () => {
  let stored: Response | undefined;
  const cache = {
    match: vi.fn(async () => stored?.clone()),
    put: vi.fn(async (_key: Request, r: Response) => {
      stored = r;
    }),
  };
  const origin = vi.fn(
    async () =>
      new Response('{"markers":[]}', {
        headers: { ETag: '"same"', "Cache-Control": "public, max-age=60" },
      }),
  );
  const env = {
    MAP_SNAPSHOTS: {
      idFromName: () => "global",
      get: () => ({ fetch: origin }),
    },
  };
  const background: Promise<unknown>[] = [];
  const first = await serveMapSnapshot(
    new Request("https://www.akipasa.com/api/map/snapshot?random=1"),
    env,
    cache,
    (p) => background.push(p),
  );
  expect(first.headers.get("X-Map-Cache")).toBe("MISS");
  await Promise.all(background);
  const second = await serveMapSnapshot(
    new Request("https://akipasa.com/api/map/snapshot?random=2", {
      headers: { "If-None-Match": '"same"' },
    }),
    env,
    cache,
    () => {},
  );
  expect(second.status).toBe(304);
  expect(second.headers.get("X-Map-Cache")).toBe("HIT");
  expect(origin).toHaveBeenCalledTimes(1);
  expect(cache.put.mock.calls[0][0].url).toBe(
    "https://akipasa.com/api/map/snapshot?v=1",
  );
});

it("does not cache upstream errors", async () => {
  const put = vi.fn();
  const result = await serveMapSnapshot(
    new Request("https://akipasa.com/api/map/snapshot"),
    {
      MAP_SNAPSHOTS: {
        idFromName: () => 1,
        get: () => ({ fetch: async () => new Response(null, { status: 503 }) }),
      },
    },
    { match: async () => undefined, put },
    () => {},
  );
  expect(result.status).toBe(503);
  expect(put).not.toHaveBeenCalled();
});

it("loads 100,001 markers with one request, without names or address payloads", async () => {
  const markers = Array.from({ length: 100001 }, (_, n) => [
    `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    -4.6,
    36.5,
    1,
    0,
  ]);
  const request = vi.fn(async () =>
    Response.json({
      version: 2,
      generatedAt: "2026-09-18",
      count: markers.length,
      markers,
    }),
  );
  const result = await loadMapSnapshot(new AbortController().signal, request);
  expect(result.count).toBe(100001);
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0]).toBeDefined();
});
