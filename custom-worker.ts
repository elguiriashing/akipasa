// @ts-expect-error OpenNext generates this module during the Cloudflare build.
import handler from "./.open-next/worker.js";
import {
  serveMapSnapshot,
  type MapEdgeEnv,
  type MapEdgeCache,
} from "./cloudflare/map-edge-cache";
export { MapSnapshot } from "./cloudflare/map-snapshot";
import { dispatchClaimDecisions } from "./src/lib/claim-mail-delivery";

import {
  dispatchBookingConfirmations,
  dispatchAccommodationConfirmations,
  bookingEmailConfigured,
  type BookingMailEnv,
} from "./src/lib/booking-mail-delivery";

const worker = {
  async scheduled(
    _event: unknown,
    env: BookingMailEnv,
    ctx: { waitUntil(work: Promise<unknown>): void },
  ) {
    ctx.waitUntil(dispatchBookingConfirmations(env));
    ctx.waitUntil(dispatchAccommodationConfirmations(env));
    ctx.waitUntil(dispatchClaimDecisions(env));
  },
  async fetch(
    request: Request,
    env: MapEdgeEnv & BookingMailEnv,
    ctx: { waitUntil(work: Promise<unknown>): void },
  ) {
    const path = new URL(request.url).pathname;
    if (path === "/api/bookings/release" && request.method === "GET") {
      return Response.json(
        {
          release: "2026-10-09-booking-ux-r1",
          claimNotifications: {
            release: "2026-10-10-claim-decision-email-v1",
            configured: bookingEmailConfigured(env),
          },
        },
        {
          headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
        },
      );
    }
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
