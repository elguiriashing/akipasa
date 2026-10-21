import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { beforeAll, expect, it, vi } from "vitest";

const probe = vi.fn();
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
  "./src/lib/operations-recovery": [
    "recoverOperationsBillingWithNotifications",
  ],
  "./src/lib/operations-migration-command": [
    "processOperationsMigrationCommand",
  ],
};
let worker: {
  scheduled(
    event: unknown,
    env: Record<string, string>,
    ctx: { waitUntil(work: Promise<unknown>): void },
  ): Promise<void>;
  fetch(
    request: Request,
    env: Record<string, string>,
    ctx: { waitUntil(work: Promise<unknown>): void },
  ): Promise<Response>;
};
beforeAll(async () => {
  const compiled = await build({
    stdin: {
      contents: readFileSync("custom-worker.ts", "utf8"),
      loader: "ts",
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    platform: "node",
    format: "iife",
    globalName: "ReleaseFixture",
    plugins: [
      {
        name: "read-only-fixture",
        setup(b) {
          b.onResolve({ filter: /.*/ }, ({ path }) => ({
            path,
            namespace: "fixture",
          }));
          b.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
            loader: "js",
            contents:
              path === "./.open-next/worker.js"
                ? "export default {fetch(request){probe('ordinary-route',request.method);return new Response('ordinary route')}}"
                : path === "./src/lib/operations-runtime-health"
                  ? "export async function recordOperationsCronTick(){probe('recordOperationsCronTick')}export async function observeOperationsRuntimeTask(env,task,run){probe('observeOperationsRuntimeTask',task);return run()}"
                  : path === "./src/lib/release-source"
                    ? "export async function releaseSourceCommit(){probe('releaseSourceCommit');return 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'}"
                    : (exportsByModule[path] || [])
                        .map(
                          (name) =>
                            `export ${name === "claimMailConfigured" ? "" : "async "}function ${name}(){probe(${JSON.stringify(name)});return false}`,
                        )
                        .join(";"),
          }));
        },
      },
    ],
  });
  worker = runInNewContext(
    `${compiled.outputFiles[0].text};ReleaseFixture.default`,
    { probe, URL, Request, Response },
  );
});
const bindings = {
  NEXT_PUBLIC_SUPABASE_URL: "https://private-db.example.test",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-private-service",
  STRIPE_SECRET_KEY: "synthetic-private-stripe",
};
const cases: Array<
  [
    string,
    Record<string, string>,
    { billingReady: boolean; migrationsReady: boolean; configured: boolean },
  ]
> = [
  [
    "missing flags and bindings",
    {},
    { billingReady: false, migrationsReady: false, configured: false },
  ],
  [
    "current open batch",
    {
      ...bindings,
      AKIBUSINESS_OPERATIONS_BILLING_READY: "true",
      AKIBUSINESS_OPERATIONS_MIGRATIONS_READY: "true",
    },
    { billingReady: true, migrationsReady: true, configured: true },
  ],
  [
    "independent flags",
    {
      ...bindings,
      AKIBUSINESS_OPERATIONS_BILLING_READY: "true",
      AKIBUSINESS_OPERATIONS_MIGRATIONS_READY: "false",
    },
    { billingReady: true, migrationsReady: false, configured: true },
  ],
  [
    "noncanonical values",
    {
      ...bindings,
      AKIBUSINESS_OPERATIONS_BILLING_READY: "TRUE",
      AKIBUSINESS_OPERATIONS_MIGRATIONS_READY: "1",
    },
    { billingReady: false, migrationsReady: false, configured: true },
  ],
];
for (const key of Object.keys(bindings)) {
  const missing: Record<string, string> = { ...bindings };
  delete missing[key];
  cases.push([
    `missing ${key}`,
    missing,
    { billingReady: false, migrationsReady: false, configured: false },
  ]);
}
it.each(cases)(
  "release endpoint exposes only operation booleans: %s",
  async (_label, env, expected) => {
    probe.mockClear();
    const pending = vi.fn();
    const response = await worker.fetch(
      new Request(
        "https://akipasa.test/api/bookings/release?run=scheduled&workspace=private",
      ),
      env,
      { waitUntil: pending },
    );
    const data = await response.json();
    expect(data.operations).toEqual(expected);
    expect(Object.keys(data.operations).sort()).toEqual([
      "billingReady",
      "configured",
      "migrationsReady",
    ]);
    expect(data.sourceCommit).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
    const serialized = JSON.stringify(data);
    for (const value of Object.values(bindings))
      expect(serialized).not.toContain(value);
    expect(pending).not.toHaveBeenCalled();
    expect(
      probe.mock.calls.every(([name]) =>
        ["releaseSourceCommit", "claimMailConfigured"].includes(name),
      ),
    ).toBe(true);
  },
);
it("POST retains ordinary routing and cannot invoke diagnostic tasks", async () => {
  probe.mockClear();
  const pending = vi.fn();
  const response = await worker.fetch(
    new Request("https://akipasa.test/api/bookings/release", {
      method: "POST",
    }),
    bindings,
    { waitUntil: pending },
  );
  expect(await response.text()).toBe("ordinary route");
  expect(probe).toHaveBeenCalledExactlyOnceWith("ordinary-route", "POST");
  expect(pending).not.toHaveBeenCalled();
});

it("actual scheduler records its first tick before invoking existing operational work", async () => {
  probe.mockClear();
  const pending: Promise<unknown>[] = [];
  await worker.scheduled({}, bindings, {
    waitUntil(work) {
      pending.push(work);
    },
  });
  await Promise.all(pending);
  expect(probe.mock.calls[0]).toEqual(["recordOperationsCronTick"]);
  expect(probe).toHaveBeenCalledWith("observeOperationsRuntimeTask", "billing");
  expect(probe).toHaveBeenCalledWith(
    "observeOperationsRuntimeTask",
    "migration",
  );
  expect(probe).toHaveBeenCalledWith(
    "recoverOperationsBillingWithNotifications",
  );
  expect(probe).toHaveBeenCalledWith("processOperationsMigrationCommand");
});
