import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AccountExportEntry } from "./account-export";

export const privateIdentityExportSections = [
  "suite_referral_codes",
  "suite_referral_attributions",
  "suite_referral_representatives",
  "suite_referral_leads",
  "suite_referral_cases",
  "suite_referral_billing_events",
  "suite_referral_audit",
  "suite_referral_payout_reviews",
  "passport_prestige_awards",
  "passport_prestige_shipping_addresses",
  "passport_prestige_physical_requests",
  "passport_prestige_audit",
] as const;
export function privateIdentityExportsReady() {
  return process.env.AKISUITE_PRIVATE_IDENTITY_EXPORTS_READY === "true";
}
const pageSize = 500;
const rowLimit = 10_000;
const readLimit = 100;
const cursor = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);
const pageSchema = z.object({
  section: z.enum(privateIdentityExportSections),
  total: z.number().int().safe().nonnegative().max(rowLimit),
  rows: z
    .array(z.object({ key: cursor, data: z.record(z.unknown()) }))
    .max(pageSize),
  next_cursor: cursor.nullable(),
});
/** Caller-only privacy RPC; no account ID, role elevation or product-eligibility gate. */
export async function readPrivateIdentityExports(
  supabase: SupabaseClient,
): Promise<AccountExportEntry[]> {
  const result: AccountExportEntry[] = [];
  let remainingReads = readLimit;
  for (const section of privateIdentityExportSections) {
    const rows: Record<string, unknown>[] = [];
    let after: string | null = null;
    let expected: number | undefined;
    let complete = false;
    try {
      while (remainingReads > 0) {
        remainingReads -= 1;
        const response = await supabase.rpc(
          "suite_private_identity_export_page",
          {
            p_section: section,
            p_after: after,
            p_limit: pageSize,
          },
        );
        if (response.error) break;
        const parsed = pageSchema.safeParse(response.data);
        if (!parsed.success || parsed.data.section !== section) break;
        const page = parsed.data;
        if (expected !== undefined && page.total !== expected) break;
        expected = page.total;
        let last: string | null = after;
        let ordered = true;
        for (const item of page.rows) {
          if (last !== null && item.key <= last) {
            ordered = false;
            break;
          }
          last = item.key;
        }
        if (!ordered || rows.length + page.rows.length > page.total) break;
        rows.push(...page.rows.map((item) => item.data));
        if (page.next_cursor === null) {
          complete = rows.length === page.total;
          break;
        }
        if (
          page.rows.length !== pageSize ||
          page.next_cursor !== last ||
          rows.length >= page.total
        )
          break;
        after = page.next_cursor;
      }
    } catch {
      // Transport/parser/limit errors cannot produce a successful partial export.
    }
    result.push({
      table: section,
      data: complete ? rows : [],
      failed: !complete,
    });
  }
  result.push({
    table: "private_identity_export_projection",
    failed: false,
    data: [
      {
        scope:
          "Caller identity only; complete bounded projections, not a third-party CRM or audit backup",
        excluded_fields: [
          "other-person identifiers",
          "third-party lead contact/name/notes",
          "case detail/resolution free text",
          "review reasons/document references",
          "raw audit before/after/detail snapshots",
        ],
        retained_shipping:
          "Includes retained own addresses even when their purge deadline has passed; no deletion is performed by export",
        financial_records:
          "Evidence and administrative states are not payable balances; no financial history is deleted",
      },
    ],
  });
  return result;
}
