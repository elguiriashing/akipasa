import { expect, it, vi } from "vitest";
import { classifyMerchantResponse } from "../src/lib/operations-merchant-health";
import { observeOperationsRuntimeTask } from "../src/lib/operations-runtime-health";
import { recoverOperationsBilling } from "../src/lib/operations-recovery";
import { processOperationsMigrationCommand } from "../src/lib/operations-migration-command";
const env = {
  AKIBUSINESS_OPERATIONS_BILLING_READY: "true",
  AKIBUSINESS_OPERATIONS_MIGRATIONS_READY: "true",
  NEXT_PUBLIC_SUPABASE_URL: "https://db.test",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-secret",
  STRIPE_SECRET_KEY: "synthetic-stripe-secret",
};
const merchant = "https://api.stripe.com/v1/account";
const probe = "https://db.test/rest/v1/rpc/record_operations_merchant_health";
const bodySecret = "synthetic-untrusted-secret-and-customer-id";
function fixture(
  response: () => Response,
  telemetryFails = false,
  networkError?: Error,
) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url === probe) {
        if (telemetryFails)
          throw Error("synthetic diagnostic transport failure");
        return Response.json(true);
      }
      if (url.endsWith("/record_operations_runtime_health"))
        return Response.json(true);
      if (url === merchant) {
        if (networkError) throw networkError;
        return response();
      }
      if (url.endsWith("/claim_crm_operations_recovery"))
        return Response.json([]);
      if (url.endsWith("/claim_crm_operations_migration"))
        return Response.json(null);
      throw Error("Unexpected request outside bounded synthetic adapters");
    },
  );
  return {
    calls,
    fetcher,
    records: () =>
      calls
        .filter((c) => c.url === probe)
        .map((c) => JSON.parse(String(c.init?.body))),
  };
}
for (const task of ["billing", "migration"] as const) {
  const run = async (fetcher: typeof fetch) =>
    task === "billing"
      ? recoverOperationsBilling(env, fetcher)
      : processOperationsMigrationCommand(env, fetcher);
  for (const [status, error, category] of [
    [400, { message: `Invalid API Version: ${bodySecret}` }, "api_version"],
    [400, { code: "invalid_api_version", message: bodySecret }, "api_version"],
    [400, { param: "Stripe-Version", message: bodySecret }, "api_version"],
    [400, { message: `unrelated ${bodySecret}` }, "rejected"],
    [401, { message: bodySecret }, "authentication"],
    [403, { message: bodySecret }, "permission"],
    [404, { message: bodySecret }, "rejected"],
    [429, { message: bodySecret }, "rate_limit"],
    [503, { message: bodySecret }, "provider"],
  ] as const)
    it(`${task}: classifies ${status}/${category} without any queue or customer action`, async () => {
      const t = fixture(() =>
        Response.json(
          { error },
          { status, headers: { "request-id": bodySecret } },
        ),
      );
      await expect(
        observeOperationsRuntimeTask(env, task, run, t.fetcher),
      ).rejects.toThrow(
        task === "billing"
          ? "Operations recovery provider unavailable"
          : "migration_provider_",
      );
      expect(t.records()).toEqual([
        { p_task: task, p_http_status: status, p_category: category },
      ]);
      expect(
        t.calls.filter((c) => !c.url.includes("record_operations_")),
      ).toHaveLength(1);
      const request = t.calls.find((c) => c.url === merchant)!;
      expect(request.init?.method || "GET").toBe("GET");
      expect(request.init?.headers).toEqual({
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Stripe-Version": "2026-08-26.dahlia",
      });
      expect(JSON.stringify(t.records())).not.toContain(bodySecret);
      expect(JSON.stringify(t.records())).not.toContain("secret");
    });
  it(`${task}: retains the exact original network error without claiming a command`, async () => {
    const original = Error(bodySecret),
      t = fixture(() => Response.json({}), false, original);
    await expect(
      observeOperationsRuntimeTask(env, task, run, t.fetcher),
    ).rejects.toBe(original);
    expect(t.records()).toEqual([
      { p_task: task, p_http_status: null, p_category: "network" },
    ]);
    expect(t.calls.some((c) => c.url.includes("claim_"))).toBe(false);
  });
  it(`${task}: preserves account mismatch rejection and only records a fixed category`, async () => {
    const t = fixture(() => Response.json({ id: bodySecret }));
    await expect(
      observeOperationsRuntimeTask(env, task, run, t.fetcher),
    ).rejects.toThrow(
      task === "billing"
        ? "Operations recovery merchant mismatch"
        : "migration_merchant_mismatch",
    );
    expect(t.records().at(-1)).toEqual({
      p_task: task,
      p_http_status: 200,
      p_category: "account_mismatch",
    });
    expect(t.calls.some((c) => c.url.includes("claim_"))).toBe(false);
    expect(JSON.stringify(t.records())).not.toContain(bodySecret);
  });
  it(`${task}: malformed successful account data does not bypass the existing check`, async () => {
    const t = fixture(() => new Response("not-json", { status: 200 }));
    await expect(
      observeOperationsRuntimeTask(env, task, run, t.fetcher),
    ).rejects.toBeInstanceOf(SyntaxError);
    expect(t.records().at(-1)?.p_category).toBe("invalid_response");
    expect(t.calls.some((c) => c.url.includes("claim_"))).toBe(false);
  });
  it(`${task}: unavailable diagnostic RPC cannot change valid empty-queue processing`, async () => {
    const t = fixture(
      () => Response.json({ id: "acct_1SVLH2GfzDhsgsQZ" }),
      true,
    );
    const result = await observeOperationsRuntimeTask(
      env,
      task,
      run,
      t.fetcher,
    );
    expect(result).toEqual(
      task === "billing"
        ? { enabled: true, applied: 0, failed: 0, deferred: 0 }
        : { enabled: true, scheduled: 0 },
    );
    expect(t.calls.filter((c) => c.url.includes("claim_"))).toHaveLength(1);
    expect(
      t.calls.filter((c) => c.url.startsWith("https://api.stripe.com")),
    ).toHaveLength(1);
  });
}
it("bounds error inspection to8KiB and preserves the original response body", async () => {
  const raw = JSON.stringify({
    error: { message: `Invalid API Version: ${"x".repeat(9000)}` },
  });
  const response = new Response(raw, { status: 400 });
  expect(await classifyMerchantResponse(response)).toBe("rejected");
  expect(await response.text()).toBe(raw);
});
it("bounds a stalled error stream and does not await cloned-tee cancellation", async () => {
  const response = new Response(
    new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode('{"error":'));
      },
    }),
    { status: 400 },
  );
  const started = Date.now();
  expect(await classifyMerchantResponse(response)).toBe("rejected");
  expect(Date.now() - started).toBeLessThan(1500);
  await response.body!.cancel();
});
it("an unreadable diagnostic copy cannot override the original task error", async () => {
  const response = new Response("already read", { status: 400 });
  await response.text();
  const original = Error("original-task-error"),
    t = fixture(() => response);
  await expect(
    observeOperationsRuntimeTask(
      env,
      "billing",
      async (f) => {
        expect(await f(merchant)).toBe(response);
        throw original;
      },
      t.fetcher,
    ),
  ).rejects.toBe(original);
  expect(t.records().at(-1)?.p_category).toBe("rejected");
});

it("bounds repeated empty error chunks rather than spinning until timeout", async () => {
  let reads = 0;
  const response = new Response(
    new ReadableStream({
      pull(controller) {
        reads++;
        controller.enqueue(new Uint8Array());
      },
    }),
    { status: 400 },
  );
  expect(await classifyMerchantResponse(response)).toBe("rejected");
  expect(reads).toBeLessThan(70);
  await response.body!.cancel();
});
