import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AccountExportEntry } from "./account-export";

const payloadKeys = {
  welcome_akipasa: ["product", "displayName"],
  welcome_akiduermo: ["product", "displayName"],
  welcome_akibusiness: ["product", "displayName"],
  welcome_akihq: ["product", "displayName"],
  claim_received: ["claimId", "venueId", "venueName"],
  event_booking_requested: [
    "bookingId",
    "eventId",
    "venueName",
    "bookingStart",
    "guestCount",
  ],
  event_booking_cancelled: [
    "bookingId",
    "eventId",
    "venueName",
    "bookingStart",
    "guestCount",
  ],
  stay_booking_requested: [
    "bookingId",
    "venueName",
    "checkIn",
    "checkOut",
    "guests",
    "totalCents",
    "venueId",
  ],
  stay_booking_cancelled: [
    "bookingId",
    "venueName",
    "checkIn",
    "checkOut",
    "guests",
    "totalCents",
    "venueId",
  ],
  event_saved_reminder: [
    "eventId",
    "occurrenceId",
    "eventName",
    "startsAt",
    "slug",
  ],
  stay_saved_reminder: ["venueId", "venueName", "venueSlug", "savedAt"],
  rental_booking_update: [
    "bookingId",
    "companyId",
    "companyName",
    "vehicleName",
    "status",
    "start",
    "end",
    "totalCents",
    "audience",
  ],
};
const customerFields = [
  "customerName",
  "customerEmail",
  "customerPhone",
  "note",
];
const uuid = z
  .string()
  .uuid()
  .transform((id) => id.toLowerCase());
const instant = z.string().datetime({ offset: true });
const row = z
  .object({
    id: uuid,
    kind: z.enum(
      Object.keys(payloadKeys) as [
        keyof typeof payloadKeys,
        ...Array<keyof typeof payloadKeys>,
      ],
    ),
    recipient: z.string().min(5).max(254),
    locale: z.enum(["en", "es"]),
    status: z.enum([
      "pending",
      "sending",
      "sent",
      "failed",
      "blocked",
      "review",
      "cancelled",
    ]),
    created_at: instant,
    available_at: instant,
    first_attempt_at: instant.nullable(),
    attempted_at: instant.nullable(),
    sent_at: instant.nullable(),
    attempts: z.number().int().min(0).max(12),
    delivery_uncertain: z.boolean(),
    payload: z.record(
      z.union([z.string(), z.number().finite(), z.boolean(), z.null()]),
    ),
    projection_version: z.literal("personal-mail-v1"),
    payload_excluded_field_count: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((item, context) => {
    const allowed: string[] = [...payloadKeys[item.kind]];
    if (
      item.kind === "rental_booking_update" &&
      item.payload.audience === "customer"
    )
      allowed.push(...customerFields);
    if (Object.keys(item.payload).some((key) => !allowed.includes(key)))
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unexpected private payload field",
      });
  });
const page = z
  .object({
    items: z.array(row).max(100),
    nextCursor: uuid.nullable(),
    truncated: z.boolean(),
  })
  .strict();

/** Retained caller-only personal mail. Never broad/service-role table reads. */
export async function readSuiteEmailExport(
  supabase: SupabaseClient,
): Promise<AccountExportEntry> {
  const data: Record<string, unknown>[] = [];
  let after: string | null = null;
  try {
    for (let reads = 0; reads < 100; reads++) {
      const response = await supabase.rpc("my_suite_email_export_page", {
        p_after: after,
        p_limit: 100,
      });
      if (response.error) break;
      const result = page.safeParse(response.data);
      if (!result.success) break;
      const current = result.data;
      let last = after;
      let ordered = true;
      for (const item of current.items) {
        if (last !== null && item.id <= last) {
          ordered = false;
          break;
        }
        last = item.id;
      }
      if (!ordered || data.length + current.items.length > 10_000) break;
      if (
        current.truncated &&
        (current.items.length !== 100 || current.nextCursor !== last)
      )
        break;
      if (!current.truncated && current.nextCursor !== null) break;
      data.push(...current.items);
      if (!current.truncated)
        return { table: "suite_email_outbox", data, failed: false };
      after = current.nextCursor;
    }
  } catch {
    /* Never report a partial export as complete. */
  }
  return { table: "suite_email_outbox", data: [], failed: true };
}
