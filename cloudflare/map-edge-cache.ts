export type MapEdgeEnv = {
  MAP_SNAPSHOTS: {
    idFromName(name: string): unknown;
    get(id: unknown): { fetch(request: Request): Promise<Response> };
  };
};
export interface MapEdgeCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export async function serveMapSnapshot(
  request: Request,
  env: MapEdgeEnv,
  cache: MapEdgeCache,
  waitUntil: (work: Promise<unknown>) => void,
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD")
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  // Ignore query strings, user cookies and host aliases. This contains only
  // public markers, built using the publishable key and normal venue RLS.
  const key = new Request("https://akipasa.com/api/map/snapshot");
  let result = await cache.match(key);
  const hit = Boolean(result);
  if (!result) {
    const object = env.MAP_SNAPSHOTS.get(
      env.MAP_SNAPSHOTS.idFromName("spain-public-v1"),
    );
    result = await object.fetch(key);
    if (result.ok) {
      const cached = new Response(result.clone().body, {
        status: result.status,
        headers: result.headers,
      });
      cached.headers.set("Cache-Control", "public, max-age=300");
      waitUntil(cache.put(key, cached).catch(() => undefined));
    }
  }
  const headers = new Headers(result.headers);
  headers.set("X-Map-Cache", hit ? "HIT" : "MISS");
  if (result.ok)
    headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
  if (result.ok && request.headers.get("If-None-Match") === headers.get("ETag"))
    return new Response(null, { status: 304, headers });
  return new Response(request.method === "HEAD" ? null : result.body, {
    status: result.status,
    headers,
  });
}
