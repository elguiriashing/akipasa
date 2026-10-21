// @ts-expect-error OpenNext generates this module during the Cloudflare build.
import handler from "./.open-next/worker.js";
import {
  serveMapSnapshot,
  type MapEdgeEnv,
  type MapEdgeCache,
} from "./cloudflare/map-edge-cache";
export { MapSnapshot } from "./cloudflare/map-snapshot";
import {
  dispatchClaimDecisions,
  claimMailConfigured,
  type ClaimMailEnv,
} from "./src/lib/claim-mail-delivery";

import { dispatchClaimSubmissionAlerts } from "./src/lib/claim-alert-delivery";
import { dispatchSuiteEmails } from "./src/lib/suite-mail-delivery";

import {
  dispatchBookingConfirmations,
  dispatchAccommodationConfirmations,
} from "./src/lib/booking-mail-delivery";

import { stopIneligibleAkiSuiteAddonRenewals } from "./src/lib/akisuite-addon-renewal";
import { publishScheduledAkiSuiteEvents } from "./src/lib/akisuite-publication";
import {
  releaseSourceCommit,
  type ReleaseAssets,
} from "./src/lib/release-source";

import { purgeBusinessFunnel } from "./src/lib/business-funnel-maintenance";
import { recoverOperationsBillingWithNotifications } from "./src/lib/operations-recovery";

import { processOperationsMigrationCommand } from "./src/lib/operations-migration-command";

const worker = {
  async scheduled(
    _event: unknown,
    env: ClaimMailEnv & {
      AKISUITE_SUBSCRIPTIONS_READY?: string;
      AKISUITE_FEATURES_READY?: string;
      AKISUITE_BILLING_VERIFIED?: string;
      AKISUITE_STRIPE_ACCOUNT_ID?: string;
      STRIPE_SECRET_KEY?: string;
      AKIBUSINESS_OPERATIONS_BILLING_READY?: string;
      AKISUITE_FUNNEL_READY?: string;
      AKIBUSINESS_OPERATIONS_MIGRATIONS_READY?: string;
    },
    ctx: { waitUntil(work: Promise<unknown>): void },
  ) {
    ctx.waitUntil(
      purgeBusinessFunnel(env).catch(() =>
        console.error("business_funnel_retention_retry"),
      ),
    );
    ctx.waitUntil(
      recoverOperationsBillingWithNotifications(env).catch(() =>
        console.error("operations_billing_recovery_retry"),
      ),
    );
    ctx.waitUntil(
      processOperationsMigrationCommand(env).catch(() =>
        console.error("operations_migration_retry"),
      ),
    );
    ctx.waitUntil(dispatchBookingConfirmations(env));
    ctx.waitUntil(dispatchAccommodationConfirmations(env));
    ctx.waitUntil(dispatchClaimDecisions(env));
    ctx.waitUntil(dispatchClaimSubmissionAlerts(env));
    ctx.waitUntil(dispatchSuiteEmails(env));
    ctx.waitUntil(publishScheduledAkiSuiteEvents(env));
    ctx.waitUntil(
      stopIneligibleAkiSuiteAddonRenewals(env).catch(() =>
        console.error("akisuite_addon_renewal_retry"),
      ),
    );
  },
  async fetch(
    request: Request,
    env: MapEdgeEnv & ClaimMailEnv & { ASSETS?: ReleaseAssets },
    ctx: { waitUntil(work: Promise<unknown>): void },
  ) {
    const path = new URL(request.url).pathname;
    if (path === "/api/bookings/release" && request.method === "GET") {
      return Response.json(
        {
          sourceCommit: await releaseSourceCommit(env.ASSETS, request),
          release: "2026-10-09-booking-ux-r1",
          accountWorkspace: "2026-10-12-account-suite-v1",
          membershipCatalogue: "2026-10-12-akisuite-catalogue-v2",
          claimNotifications: {
            release: "2026-10-10-claim-decision-email-v1",
            configured: claimMailConfigured(env),
            suiteEmails: {
              release: "2026-10-11-suite-transactional-v1",
              configured: claimMailConfigured(env),
            },
            submissionAlerts: {
              release: "2026-10-11-claim-submission-v1",
              configured: claimMailConfigured(env),
            },
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
