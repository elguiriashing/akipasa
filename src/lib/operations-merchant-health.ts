import type { OperationsRecoveryEnv } from "./operations-recovery";

export type MerchantHealthCategory =
  | "ok"
  | "api_version"
  | "authentication"
  | "permission"
  | "account_mismatch"
  | "network"
  | "rate_limit"
  | "provider"
  | "invalid_response"
  | "validation"
  | "rejected";

/** Inspect only a bounded error copy; never consume or replace the original. */
export async function classifyMerchantResponse(
  response: Response,
): Promise<MerchantHealthCategory> {
  if (response.ok) return "ok";
  if (response.status === 401) return "authentication";
  if (response.status === 403) return "permission";
  if (response.status === 429) return "rate_limit";
  if (response.status >= 500) return "provider";
  if (response.status !== 400) return "rejected";
  const reader = response.clone().body?.getReader();
  if (!reader) return "rejected";
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const body = await Promise.race([
      (async () => {
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > 8192 || chunks.length >= 64) return null;
          chunks.push(part.value);
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        return JSON.parse(new TextDecoder().decode(bytes)) as {
          error?: { code?: unknown; param?: unknown; message?: unknown };
        };
      })(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), 250);
      }),
    ]);
    const error = body?.error;
    // Stripe can report an invalid version without a machine-readable code.
    // This exact prefix is classified in memory; the message is never stored.
    if (
      error?.code === "invalid_api_version" ||
      error?.param === "Stripe-Version" ||
      (typeof error?.message === "string" &&
        /^Invalid (?:Stripe )?API Version:/i.test(error.message))
    )
      return "api_version";
  } catch {
    // Malformed or incomplete error payloads retain the safe HTTP category.
  } finally {
    clearTimeout(timer);
    // A cloned tee can wait for the original consumer: never await cancellation.
    void reader.cancel().catch(() => undefined);
  }
  return "rejected";
}

/** Private, best-effort, fixed vocabulary only; no provider body or identifiers. */
export async function recordOperationsMerchantHealth(
  env: OperationsRecoveryEnv,
  task: "billing" | "migration",
  status: number | null,
  category: MerchantHealthCategory,
  fetcher: typeof fetch = fetch,
) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
    return false;
  try {
    const response = await fetcher(
      `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/record_operations_merchant_health`,
      {
        method: "POST",
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_task: task,
          p_http_status: status,
          p_category: category,
        }),
        signal: AbortSignal.timeout(2_000),
      },
    );
    return response.ok && (await response.json()) === true;
  } catch {
    return false;
  }
}
