import { migrateRentalCoverMedia } from "./rental-media-migration";
import { createClient } from "@supabase/supabase-js";
import { resendSendingKey } from "./booking-mail-delivery";
import {
  suiteEmailKinds,
  sendSuiteEmail,
  type SuiteEmailKind,
  type SuiteEmailPayload,
} from "./suite-email-templates";
import {
  claimMailConfigured,
  claimMailEnvironment,
  type ClaimMailEnv,
} from "./claim-mail-delivery";

export const suiteMailSenderConfigured = claimMailConfigured;

type SuiteEmailRow = {
  id: string;
  kind: string;
  dedupe_key: string;
  profile_id: string;
  recipient: string;
  locale: string;
  payload: SuiteEmailPayload;
  lease_id: string;
};
function suiteDatabase(env: ClaimMailEnv) {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
type SuiteMailDb = ReturnType<typeof suiteDatabase>;

const readable = (value: unknown) => (typeof value === "string" ? value : "");

async function validateSuiteEmail(row: SuiteEmailRow, db: SuiteMailDb) {
  // The account must still exist with the same confirmed address. This also
  // blocks sends to changed/deleted addresses from an older frozen queue.
  const { data: auth, error: authError } = await db.auth.admin.getUserById(
    row.profile_id,
  );
  if (authError) throw new Error("account_lookup_unavailable");
  const user = auth?.user;
  if (
    !user ||
    user.deleted_at ||
    !user.email_confirmed_at ||
    user.email?.toLowerCase() !== row.recipient?.toLowerCase()
  )
    return "verified_account_email_changed_or_deleted";

  if (row.kind === "rental_booking_update") {
    const { data: booking, error } = await db
      .from("car_rental_bookings")
      .select("status,renter_id,vehicle:car_rental_vehicles!inner(company_id)")
      .eq("id", readable(row.payload.bookingId))
      .maybeSingle();
    if (error) throw new Error("rental_booking_recheck_failed");
    if (!booking || booking.status !== row.payload.status)
      return "rental_booking_status_changed";
    const vehicle = Array.isArray(booking.vehicle)
      ? booking.vehicle[0]
      : booking.vehicle;
    if (vehicle?.company_id !== row.payload.companyId)
      return "rental_branch_changed";
    if (row.payload.audience === "customer") {
      if (booking.renter_id !== row.profile_id)
        return "rental_customer_changed";
    } else if (row.payload.audience === "operator") {
      const { data: company, error: branchError } = await db
        .from("car_rental_companies")
        .select("submitted_by")
        .eq("id", vehicle.company_id)
        .maybeSingle();
      if (branchError) throw new Error("rental_branch_recheck_failed");
      if (company?.submitted_by !== row.profile_id)
        return "rental_operator_changed";
    } else return "rental_audience_invalid";
  }
  if (row.kind === "claim_received") {
    const { data, error } = await db
      .from("venue_claims")
      .select("status")
      .eq("id", readable(row.payload.claimId))
      .eq("claimant_id", row.profile_id)
      .maybeSingle();
    if (error) throw new Error("claim_recheck_failed");
    const claim = data as unknown as { status: string } | null;
    if (claim?.status !== "pending") return "claim_not_pending";
  }

  if (
    row.kind === "event_booking_requested" ||
    row.kind === "event_booking_cancelled"
  ) {
    const { data, error } = await db
      .from("booking_requests")
      .select("status,profile_id")
      .eq("id", readable(row.payload.bookingId))
      .eq("profile_id", row.profile_id)
      .maybeSingle();
    if (error) throw new Error("booking_recheck_failed");
    const booking = data as unknown as { status: string } | null;
    if (
      !booking ||
      booking.status !==
        (row.kind === "event_booking_requested" ? "requested" : "cancelled")
    )
      return "booking_status_changed";
  }

  if (
    row.kind === "stay_booking_requested" ||
    row.kind === "stay_booking_cancelled"
  ) {
    const { data, error } = await db
      .from("accommodation_reservations")
      .select("status,profile_id")
      .eq("id", readable(row.payload.bookingId))
      .eq("profile_id", row.profile_id)
      .maybeSingle();
    if (error) throw new Error("stay_booking_recheck_failed");
    const reservation = data as unknown as { status: string } | null;
    if (
      !reservation ||
      reservation.status !==
        (row.kind === "stay_booking_requested" ? "requested" : "cancelled")
    )
      return "stay_reservation_status_changed";
  }

  if (
    row.kind === "event_saved_reminder" ||
    row.kind === "stay_saved_reminder"
  ) {
    const { data: pref, error: prefError } = await db
      .from("suite_email_preferences")
      .select("event_reminders,stay_reminders")
      .eq("profile_id", row.profile_id)
      .maybeSingle();
    if (prefError) throw new Error("reminder_preference_unavailable");
    const preference = pref as unknown as {
      event_reminders: boolean;
      stay_reminders: boolean;
    } | null;
    if (
      row.kind === "event_saved_reminder"
        ? !preference?.event_reminders
        : !preference?.stay_reminders
    )
      return "reminders_opted_out";

    if (row.kind === "event_saved_reminder") {
      const eventId = readable(row.payload.eventId);
      const occurrenceId = readable(row.payload.occurrenceId);
      const { data: saved, error: savedError } = await db
        .from("saved_event_refs")
        .select("event_key")
        .eq("profile_id", row.profile_id)
        .eq("event_key", eventId)
        .maybeSingle();
      if (savedError) throw new Error("saved_event_lookup_failed");
      if (!saved) return "event_unsaved";
      const { data: occurrence, error: occurrenceError } = await db
        .from("event_occurrences")
        .select("starts_at,status")
        .eq("id", occurrenceId)
        .eq("event_id", eventId)
        .maybeSingle();
      if (occurrenceError) throw new Error("occurrence_lookup_failed");
      const activeOccurrence = occurrence as unknown as {
        starts_at: string;
        status: string;
      } | null;
      if (
        !activeOccurrence ||
        ["cancelled", "expired"].includes(activeOccurrence.status) ||
        new Date(activeOccurrence.starts_at).getTime() !==
          new Date(readable(row.payload.startsAt)).getTime() ||
        new Date(activeOccurrence.starts_at).getTime() <
          Date.now() + 24 * 3_600_000
      )
        return "saved_event_date_changed_or_too_near";
      const { data: event, error: eventError } = await db
        .from("events")
        .select("status")
        .eq("id", eventId)
        .maybeSingle();
      if (eventError) throw new Error("event_lookup_failed");
      const publishedEvent = event as unknown as { status: string } | null;
      if (publishedEvent?.status !== "published")
        return "event_no_longer_published";
    } else {
      const propertyId = readable(row.payload.propertyId);
      const venueId = propertyId || readable(row.payload.venueId);
      const ownershipColumn = propertyId ? "property_id" : "venue_id";
      if (propertyId) {
        const visible = await db.rpc("accommodation_property_public", {
          p_property: propertyId,
        });
        if (visible.error) throw new Error("stay_property_lookup_failed");
        if (!visible.data) return "stay_no_longer_published";
      }
      const { data: saved, error: savedError } = await db
        .from("suite_saved_stays")
        .select("saved_at")
        .eq("profile_id", row.profile_id)
        .eq(ownershipColumn, venueId)
        .maybeSingle();
      if (savedError) throw new Error("saved_stay_lookup_failed");
      const savedStay = saved as unknown as { saved_at: string } | null;
      if (
        !savedStay ||
        new Date(savedStay.saved_at).getTime() !==
          new Date(readable(row.payload.savedAt)).getTime()
      )
        return "stay_unsaved_or_saved_again";
      const { data: bookings, error: bookingError } = await db
        .from("accommodation_reservations")
        .select("id")
        .eq("profile_id", row.profile_id)
        .eq(ownershipColumn, venueId)
        .gte("created_at", savedStay.saved_at)
        .in("status", ["requested", "confirmed", "checked_in"])
        .limit(1);
      if (bookingError) throw new Error("stay_booking_lookup_failed");
      if ((bookings || []).length) return "stay_already_requested";
    }
  }
  return null;
}

export async function dispatchSuiteEmails(
  env: ClaimMailEnv = claimMailEnvironment(),
) {
  if (!suiteMailSenderConfigured(env))
    return { sent: 0, failed: 0, skipped: 0, configured: false };
  const db = suiteDatabase(env);
  await migrateRentalCoverMedia(db);
  const { error: activationError } = await db.rpc(
    "activate_rental_booking_emails",
  );
  if (activationError && activationError.code !== "42883")
    console.error("rental_email_activation_pending", activationError.code);
  const { error: schedulingError } = await db.rpc("queue_due_suite_reminders");
  if (schedulingError)
    console.error("suite_reminder_schedule_unavailable", schedulingError.code);
  const { data: leased, error: claimError } = await db.rpc(
    "claim_due_suite_emails",
  );
  if (claimError) {
    console.error("suite_email_queue_unavailable", claimError.code);
    return { sent: 0, failed: 0, skipped: 0, configured: true };
  }
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const row of (leased || []) as SuiteEmailRow[]) {
    let outcome:
      | {
          ok: boolean;
          messageId?: string;
          error?: string;
          ambiguous?: boolean;
          retryable?: boolean;
        }
      | undefined;
    const kind = row.kind as SuiteEmailKind;
    try {
      if (!suiteEmailKinds.includes(kind)) {
        outcome = {
          ok: false,
          error: "unsupported_email_kind",
          retryable: false,
          ambiguous: false,
        };
        skipped++;
      } else {
        const invalid = await validateSuiteEmail(row, db);
        if (invalid) {
          outcome = {
            ok: false,
            error: invalid,
            retryable: false,
            ambiguous: false,
          };
          skipped++;
        } else {
          outcome = await sendSuiteEmail(
            row.id,
            kind,
            row.locale === "en" ? "en" : "es",
            row.payload,
            row.recipient,
            resendSendingKey(env),
          );
        }
      }
    } catch (error) {
      // Database problems are retryable but never reported as sent.
      console.error(
        "suite_email_validation_unavailable",
        String(error).slice(0, 100),
      );
      outcome = {
        ok: false,
        error: "validation_unavailable",
        retryable: true,
        ambiguous: false,
      };
    }
    const { error: ackError } = await db.rpc("finish_suite_email", {
      p_id: row.id,
      p_lease: row.lease_id,
      p_ok: outcome.ok,
      p_message: outcome.messageId || null,
      p_error: outcome.error || null,
      p_retryable: outcome.retryable ?? false,
      p_ambiguous: outcome.ambiguous ?? true,
    });
    if (ackError) console.error("suite_email_ack_pending", ackError.code);
    if (outcome.ok) sent++;
    else failed++;
  }
  return { sent, failed, skipped, configured: true };
}
