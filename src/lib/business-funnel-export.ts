import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountExportEntry } from "./account-export";
import { z } from "zod";
const cursor = z.string().regex(/^(0|[1-9][0-9]{0,18})$/);
const row = z
  .object({
    analytics_id: cursor,
    stage: z.enum([
      "claim_completed",
      "hq_activated",
      "checkout_started",
      "payment_verified",
      "subscription_upgraded",
      "subscription_cancelled",
    ]),
    workspace_id: z.string().nullable(),
    venue_id: z.string().uuid().nullable(),
    occurred_at: z.string().datetime({ offset: true }),
    consented_at: z.string().datetime({ offset: true }),
  })
  .strict();
const page = z
  .object({
    until: cursor,
    total: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    rows: z.array(row).max(500),
  })
  .strict();
/** Uses the caller session only. A fixed upper watermark excludes later inserts;
 * changed totals, repeated cursors, exhausted budget or any failure reject the whole export. */
export async function readBusinessFunnelExport(
  supabase: Pick<SupabaseClient, "rpc">,
): Promise<AccountExportEntry> {
  const table = "business_funnel_observations";
  const data: Record<string, unknown>[] = [];
  let after = "0",
    until: string | null = null,
    total: number | undefined;
  try {
    for (let request = 0; request < 80; request++) {
      const response = await supabase.rpc("my_business_funnel_export", {
        p_after: after,
        p_until: until,
        p_limit: 500,
      });
      if (response.error) break;
      const parsed = page.safeParse(response.data);
      if (!parsed.success) break;
      const value = parsed.data;
      if (
        (until !== null && value.until !== until) ||
        (total !== undefined && value.total !== total) ||
        BigInt(value.until) < BigInt(after)
      )
        break;
      until = value.until;
      total = value.total;
      let previous = BigInt(after);
      for (const item of value.rows) {
        if (
          BigInt(item.analytics_id) <= previous ||
          BigInt(item.analytics_id) > BigInt(until)
        )
          throw new Error("Invalid export order");
        previous = BigInt(item.analytics_id);
      }
      if (data.length + value.rows.length > total) break;
      data.push(...value.rows);
      if (data.length === total) return { table, data, failed: false };
      if (!value.rows.length) break;
      after = value.rows[value.rows.length - 1].analytics_id;
    }
  } catch {
    /* Never return a partial privacy export. */
  }
  return { table, data: [], failed: true };
}
