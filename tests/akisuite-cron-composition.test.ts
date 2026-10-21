import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { expect, it, vi } from "vitest";
import { operationsReleaseVars } from "./helpers/operations-release-config";

// Execute the actual Worker scheduler with disposable adapter boundaries. No
// OpenNext artifact, production service, provider request or secret is used.
const exportsByModule: Record<string, string[]> = {
  "./cloudflare/map-edge-cache": ["serveMapSnapshot"],
  "./cloudflare/map-snapshot": ["MapSnapshot"],
  "./src/lib/claim-mail-delivery": [
    "dispatchClaimDecisions",
    "claimMailConfigured",
  ],
  "./src/lib/claim-alert-delivery": ["dispatchClaimSubmissionAlerts"],
  "./src/lib/suite-mail-delivery": ["dispatchSuiteEmails"],
  "./src/lib/booking-mail-delivery": [
    "dispatchBookingConfirmations",
    "dispatchAccommodationConfirmations",
  ],
  "./src/lib/akisuite-addon-renewal": ["stopIneligibleAkiSuiteAddonRenewals"],
  "./src/lib/akisuite-publication": ["publishScheduledAkiSuiteEvents"],
  "./src/lib/release-source": ["releaseSourceCommit"],
  "./src/lib/business-funnel-maintenance": ["purgeBusinessFunnel"],
  "./src/lib/operations-recovery": [
    "recoverOperationsBillingWithNotifications",
  ],
  "./src/lib/operations-migration-command": [
    "processOperationsMigrationCommand",
  ],
};
it.each(["purgeBusinessFunnel", "recoverOperationsBillingWithNotifications"])(
  "actual scheduled composition preserves independent tasks when %s fails",
  async (failedTask) => {
    const probe = vi.fn(async (name: string) => {
      if (name === failedTask) throw Error("Disposable adapter failure");
      return { applied: 1 };
    });
    const errors = vi.fn();
    const compiled = await build({
      stdin: {
        contents: readFileSync("custom-worker.ts", "utf8"),
        loader: "ts",
        resolveDir: process.cwd(),
      },
      bundle: true,
      write: false,
      format: "iife",
      globalName: "CronFixture",
      platform: "node",
      plugins: [
        {
          name: "disposable-adapters",
          setup(b) {
            b.onResolve({ filter: /.*/ }, ({ path }) => ({
              path,
              namespace: "fixture",
            }));
            b.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
              contents:
                path === "./src/lib/operations-runtime-health"
                  ? "export async function recordOperationsCronTick(){return probe('recordOperationsCronTick')};export async function observeOperationsRuntimeTask(env,task,run){return run()}"
                  : path === "./.open-next/worker.js"
                    ? "export default {fetch(){throw Error('No route requests in scheduler fixture')}}"
                    : (exportsByModule[path] || [])
                        .map(
                          (name) =>
                            `export async function ${name}(...args){return probe(${JSON.stringify(name)},...args)}`,
                        )
                        .join(";"),
              loader: "js",
            }));
          },
        },
      ],
    });
    const worker = runInNewContext(
      `${compiled.outputFiles[0].text};CronFixture.default`,
      { probe, console: { error: errors } },
    ) as {
      scheduled(
        event: unknown,
        env: Record<string, string>,
        ctx: { waitUntil(work: Promise<unknown>): void },
      ): Promise<void>;
    };
    const pending: Promise<unknown>[] = [];
    await worker.scheduled({}, operationsReleaseVars, {
      waitUntil(work) {
        pending.push(work);
      },
    });
    const outcomes = await Promise.allSettled(pending);
    expect(outcomes.every((outcome) => outcome.status === "fulfilled")).toBe(
      true,
    );
    expect(probe.mock.calls[0][0]).toBe("recordOperationsCronTick");
    expect(probe.mock.calls.map(([name]) => name).sort()).toEqual(
      [
        "recordOperationsCronTick",
        "purgeBusinessFunnel",
        "recoverOperationsBillingWithNotifications",
        "processOperationsMigrationCommand",
        "dispatchBookingConfirmations",
        "dispatchAccommodationConfirmations",
        "dispatchClaimDecisions",
        "dispatchClaimSubmissionAlerts",
        "dispatchSuiteEmails",
        "publishScheduledAkiSuiteEvents",
        "stopIneligibleAkiSuiteAddonRenewals",
      ].sort(),
    );
    expect(errors).toHaveBeenCalledWith(
      failedTask === "purgeBusinessFunnel"
        ? "business_funnel_retention_retry"
        : "operations_billing_recovery_retry",
    );
  },
);
