import type { OperationsRecoveryEnv } from "./operations-recovery";
import {
  classifyMerchantResponse,
  recordOperationsMerchantHealth,
} from "./operations-merchant-health";

type HealthEnv = OperationsRecoveryEnv & {
  AKIBUSINESS_OPERATIONS_MIGRATIONS_READY?: string;
};
export type OperationsHealthTask = "cron" | "billing" | "migration";
export type OperationsHealthStage =
  | "started"
  | "bindings"
  | "merchant"
  | "claim"
  | "work"
  | "completed";
export type OperationsHealthOutcome = "running" | "ok" | "failed" | "disabled";

/** Best-effort private telemetry only; never send customer IDs, values or errors. */
export async function recordOperationsRuntimeHealth(
  env: HealthEnv,
  task: OperationsHealthTask,
  stage: OperationsHealthStage,
  outcome: OperationsHealthOutcome,
  fetcher: typeof fetch = fetch,
) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
    return false;
  try {
    const response = await fetcher(
      `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/record_operations_runtime_health`,
      {
        method: "POST",
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_task: task,
          p_stage: stage,
          p_outcome: outcome,
        }),
        signal: AbortSignal.timeout(2_000),
      },
    );
    return response.ok && (await response.json()) === true;
  } catch {
    return false;
  }
}
export async function recordOperationsCronTick(
  env: HealthEnv,
  fetcher: typeof fetch = fetch,
) {
  await recordOperationsRuntimeHealth(
    env,
    "cron",
    "started",
    "running",
    fetcher,
  );
}

/** Observe existing work without changing its results/errors or introducing actions. */
export async function observeOperationsRuntimeTask<T>(
  env: HealthEnv,
  task: "billing" | "migration",
  run: (observedFetch: typeof fetch) => Promise<T>,
  fetcher: typeof fetch = fetch,
): Promise<T> {
  let stage: OperationsHealthStage = "started";
  let merchantStatus: number | null = null;
  // Fetch callbacks update the stage asynchronously; read it at catch time.
  const currentStage = (): OperationsHealthStage => stage;
  const record = (outcome: OperationsHealthOutcome) =>
    recordOperationsRuntimeHealth(env, task, stage, outcome, fetcher);
  await record("running");
  const enabled =
    env.AKIBUSINESS_OPERATIONS_BILLING_READY === "true" &&
    (task === "billing" ||
      env.AKIBUSINESS_OPERATIONS_MIGRATIONS_READY === "true");
  if (enabled) {
    stage = "bindings";
    await record(
      env.NEXT_PUBLIC_SUPABASE_URL &&
        env.SUPABASE_SERVICE_ROLE_KEY &&
        env.STRIPE_SECRET_KEY
        ? "ok"
        : "failed",
    );
  }
  const observedFetch: typeof fetch = async (input, init) => {
    let url: URL | undefined;
    try {
      url = new URL(
        typeof input === "string"
          ? input
          : input instanceof Request
            ? input.url
            : String(input),
      );
    } catch {
      /* Fixed stage fallback, never record the URL. */
    }
    // The owner-notification drain runs concurrently with billing. Its requests
    // must not replace the stage of the billing task being diagnosed.
    if (url?.pathname === "/rest/v1/rpc/crm_toolbox_deliver_notifications")
      return fetcher(input, init);
    stage =
      url?.origin === "https://api.stripe.com" && url.pathname === "/v1/account"
        ? "merchant"
        : /\/rest\/v1\/rpc\/claim_crm_operations_(?:migration|recovery)$/.test(
              url?.pathname || "",
            )
          ? "claim"
          : "work";
    await record("running");
    const method =
      init?.method ?? (input instanceof Request ? input.method : "GET");
    if (stage === "merchant" && method.toUpperCase() === "GET") {
      merchantStatus = null;
      let response: Response;
      try {
        response = await fetcher(input, init);
      } catch (error) {
        await recordOperationsMerchantHealth(
          env,
          task,
          null,
          "network",
          fetcher,
        );
        throw error;
      }
      merchantStatus = response.status;
      await recordOperationsMerchantHealth(
        env,
        task,
        merchantStatus,
        await classifyMerchantResponse(response).catch(
          () => "rejected" as const,
        ),
        fetcher,
      );
      return response;
    }
    return fetcher(input, init);
  };
  try {
    const result = await run(observedFetch);
    const summary = result as {
      enabled?: boolean;
      failed?: number;
      outcome?: string;
    } | null;
    stage = "completed";
    await record(
      summary?.enabled === false
        ? "disabled"
        : (summary?.failed || 0) > 0 ||
            ["blocked", "retry"].includes(summary?.outcome || "")
          ? "failed"
          : "ok",
    );
    return result;
  } catch (error) {
    if (
      currentStage() === "merchant" &&
      merchantStatus !== null &&
      merchantStatus < 300
    ) {
      await recordOperationsMerchantHealth(
        env,
        task,
        merchantStatus,
        error instanceof Error &&
          [
            "migration_merchant_mismatch",
            "Operations recovery merchant mismatch",
          ].includes(error.message)
          ? "account_mismatch"
          : error instanceof SyntaxError
            ? "invalid_response"
            : "validation",
        fetcher,
      );
    }
    await record("failed");
    throw error;
  }
}
