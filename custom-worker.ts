// @ts-expect-error OpenNext generates this module during the Cloudflare build.
import handler from "./.open-next/worker.js";
import {
  serveMapSnapshot,
  type MapEdgeEnv,
  type MapEdgeCache,
} from "./cloudflare/map-edge-cache";
export { MapSnapshot } from "./cloudflare/map-snapshot";

const worker = {
  async fetch(
    request: Request,
    env: MapEdgeEnv,
    ctx: { waitUntil(work: Promise<unknown>): void },
  ) {
    const path = new URL(request.url).pathname;
    if (path === "/api/map/snapshot" || path.startsWith("/api/map/tiles/")) {
      const cache = (caches as unknown as { default: MapEdgeCache }).default;
      return serveMapSnapshot(request, env, cache, (work) =>
        ctx.waitUntil(work),
      );
    }
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
