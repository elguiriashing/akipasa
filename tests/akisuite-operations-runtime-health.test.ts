import { expect, it, vi } from "vitest";
import {
  observeOperationsRuntimeTask,
  recordOperationsCronTick,
  recordOperationsRuntimeHealth,
} from "../src/lib/operations-runtime-health";
import { recoverOperationsBillingWithNotifications } from "../src/lib/operations-recovery";
import { processOperationsMigrationCommand } from "../src/lib/operations-migration-command";
const env = {
  AKIBUSINESS_OPERATIONS_BILLING_READY: "true",
  AKIBUSINESS_OPERATIONS_MIGRATIONS_READY: "true",
  NEXT_PUBLIC_SUPABASE_URL: "https://db.test",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-secret",
  STRIPE_SECRET_KEY: "synthetic-stripe-secret",
};
const healthUrl =
  "https://db.test/rest/v1/rpc/record_operations_runtime_health";
function fixture(
  options: { merchantStatus?: number; healthFailure?: boolean } = {},
) {
  const calls: Array<{
    url: string;
    method: string;
    body: unknown;
    signal?: AbortSignal | null;
  }> = [];
  const fetcher = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input),
        method = init?.method || "GET",
        body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ url, method, body, signal: init?.signal });
      if (url === healthUrl)
        return options.healthFailure
          ? new Response(null, { status: 503 })
          : Response.json(true);
      if (url === "https://api.stripe.com/v1/account" && method === "GET")
        return Response.json(
          { id: "acct_1SVLH2GfzDhsgsQZ" },
          { status: options.merchantStatus || 200 },
        );
      if (
        url === "https://db.test/rest/v1/rpc/claim_crm_operations_migration" &&
        method === "POST"
      )
        return Response.json(null);
      throw Error("Unexpected synthetic adapter request");
    },
  );
  return { calls, fetcher };
}
it("cron tick and task start are recorded before merchant access, with only fixed enum payloads", async () => {
  const t = fixture();
  await recordOperationsCronTick(env, t.fetcher);
  expect(
    await observeOperationsRuntimeTask(
      env,
      "migration",
      (f) => processOperationsMigrationCommand(env, f),
      t.fetcher,
    ),
  ).toEqual({ enabled: true, scheduled: 0 });
  const records = t.calls.filter((c) => c.url === healthUrl);
  expect(records[0].body).toEqual({
    p_task: "cron",
    p_stage: "started",
    p_outcome: "running",
  });
  expect(records[1].body).toEqual({
    p_task: "migration",
    p_stage: "started",
    p_outcome: "running",
  });
  expect(t.calls.findIndex((c) => c.url.endsWith("/account"))).toBeGreaterThan(
    t.calls.findIndex(
      (c) => (c.body as { p_stage?: string })?.p_stage === "merchant",
    ),
  );
  expect(records.at(-1)?.body).toEqual({
    p_task: "migration",
    p_stage: "completed",
    p_outcome: "ok",
  });
  for (const r of records) {
    expect(Object.keys(r.body as object).sort()).toEqual([
      "p_outcome",
      "p_stage",
      "p_task",
    ]);
    expect(JSON.stringify(r.body)).not.toContain("secret");
    expect(r.signal).toBeInstanceOf(AbortSignal);
  }
  expect(
    t.calls
      .filter((c) => c.url.startsWith("https://api.stripe.com/"))
      .every((c) => c.method === "GET"),
  ).toBe(true);
  expect(
    t.calls.some((c) =>
      /apply_crm|\/customers|\/charges|\/schedules/.test(c.url),
    ),
  ).toBe(false);
});
it("merchant failures remain at merchant stage without claiming commands or rewriting original failures", async () => {
  const t = fixture({ merchantStatus: 401 });
  await expect(
    observeOperationsRuntimeTask(
      env,
      "migration",
      (f) => processOperationsMigrationCommand(env, f),
      t.fetcher,
    ),
  ).rejects.toThrow("migration_provider_rejected");
  expect(t.calls.filter((c) => c.url === healthUrl).at(-1)?.body).toEqual({
    p_task: "migration",
    p_stage: "merchant",
    p_outcome: "failed",
  });
  expect(
    t.calls.some((c) => c.url.endsWith("claim_crm_operations_migration")),
  ).toBe(false);
  const original = Error("Original fixture identity");
  await expect(
    observeOperationsRuntimeTask(
      env,
      "billing",
      async () => {
        throw original;
      },
      t.fetcher,
    ),
  ).rejects.toBe(original);
});
it("failed health writes cannot change the original successful result", async () => {
  const t = fixture({ healthFailure: true });
  const result = { enabled: true, applied: 1, failed: 0 };
  expect(
    await observeOperationsRuntimeTask(
      env,
      "billing",
      async () => result,
      t.fetcher,
    ),
  ).toBe(result);
  expect(t.calls.every((c) => c.url === healthUrl)).toBe(true);
});
it("missing provider bindings records only a bindings failure, never a secret or provider call", async () => {
  const t = fixture();
  const missing = { ...env, STRIPE_SECRET_KEY: undefined };
  const failure = Error("Original bindings failure");
  await expect(
    observeOperationsRuntimeTask(
      missing,
      "migration",
      async () => {
        throw failure;
      },
      t.fetcher,
    ),
  ).rejects.toBe(failure);
  expect(t.calls.at(-1)?.body).toEqual({
    p_task: "migration",
    p_stage: "bindings",
    p_outcome: "failed",
  });
  expect(t.calls.every((c) => c.url === healthUrl)).toBe(true);
});
it("disabled worker and per-row failure outcomes are summarized without their data", async () => {
  const t = fixture();
  const disabled = { enabled: false, scheduled: 0 };
  expect(
    await observeOperationsRuntimeTask(
      { ...env, AKIBUSINESS_OPERATIONS_MIGRATIONS_READY: "false" },
      "migration",
      async () => disabled,
      t.fetcher,
    ),
  ).toBe(disabled);
  expect(t.calls.at(-1)?.body).toEqual({
    p_task: "migration",
    p_stage: "completed",
    p_outcome: "disabled",
  });
  const result = {
    enabled: true,
    failed: 1,
    privateCustomerId: "never-record",
  };
  expect(
    await observeOperationsRuntimeTask(
      env,
      "billing",
      async () => result,
      t.fetcher,
    ),
  ).toBe(result);
  expect(t.calls.at(-1)?.body).toEqual({
    p_task: "billing",
    p_stage: "completed",
    p_outcome: "failed",
  });
  expect(JSON.stringify(t.calls)).not.toContain("never-record");
});
it("telemetry needs service bindings and treats disabled or invalid responses as unavailable", async () => {
  const f = vi.fn();
  expect(
    await recordOperationsRuntimeHealth({}, "cron", "started", "running", f),
  ).toBe(false);
  expect(f).not.toHaveBeenCalled();
  f.mockResolvedValue(Response.json(false));
  expect(
    await recordOperationsRuntimeHealth(env, "cron", "started", "running", f),
  ).toBe(false);
  f.mockResolvedValue(new Response("invalid"));
  expect(
    await recordOperationsRuntimeHealth(env, "cron", "started", "running", f),
  ).toBe(false);
});

it.each([false, true])(
  "concurrent actual owner notification delivery cannot overwrite billing failure stage (missing Stripe: %s)",
  async (missingStripe) => {
    const runtime = missingStripe
      ? { ...env, STRIPE_SECRET_KEY: undefined }
      : env;
    const records: unknown[] = [];
    const requests: string[] = [];
    let deliveryFinished = false;
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        requests.push(url);
        if (url === healthUrl) {
          records.push(JSON.parse(String(init?.body)));
          return Response.json(true);
        }
        if (url.endsWith("/crm_toolbox_deliver_notifications")) {
          await Promise.resolve();
          deliveryFinished = true;
          return Response.json(0);
        }
        if (url === "https://api.stripe.com/v1/account")
          return new Response(null, { status: 401 });
        throw Error("Unexpected fixture request");
      },
    );
    await expect(
      observeOperationsRuntimeTask(
        runtime,
        "billing",
        (f) => recoverOperationsBillingWithNotifications(runtime, f),
        fetcher,
      ),
    ).rejects.toThrow(
      missingStripe
        ? "Operations recovery bindings unavailable"
        : "Operations recovery provider unavailable",
    );
    expect(deliveryFinished).toBe(true);
    expect(records.at(-1)).toEqual({
      p_task: "billing",
      p_stage: missingStripe ? "bindings" : "merchant",
      p_outcome: "failed",
    });
    expect(records).not.toContainEqual({
      p_task: "billing",
      p_stage: "work",
      p_outcome: "running",
    });
    expect(
      requests.filter(
        (url) =>
          ![
            healthUrl,
            "https://db.test/rest/v1/rpc/crm_toolbox_deliver_notifications",
            "https://api.stripe.com/v1/account",
          ].includes(url),
      ),
    ).toEqual([]);
    expect(requests.filter((url) => url.endsWith("/account"))).toHaveLength(
      missingStripe ? 0 : 1,
    );
  },
);
