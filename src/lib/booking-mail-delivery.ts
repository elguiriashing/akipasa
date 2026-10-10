import { sendWorkspaceMessage, type WorkspaceMailCredentials } from "./workspace-claim-mail";
import { createClient } from "@supabase/supabase-js";
import {
  renderBookingConfirmation,
  type BookingConfirmation,
} from "./booking-confirmation-email";

export type BookingMailEnv = WorkspaceMailCredentials & {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};
export function bookingMailEnvironment(): BookingMailEnv {
  return {
    GOOGLE_WORKSPACE_CLIENT_EMAIL: process.env.GOOGLE_WORKSPACE_CLIENT_EMAIL,
    GOOGLE_WORKSPACE_PRIVATE_KEY: process.env.GOOGLE_WORKSPACE_PRIVATE_KEY,
    GOOGLE_WORKSPACE_SENDER: process.env.GOOGLE_WORKSPACE_SENDER,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}
export function bookingEmailConfigured(env = bookingMailEnvironment()) {
  return Boolean(
    env.GOOGLE_WORKSPACE_CLIENT_EMAIL &&
      env.GOOGLE_WORKSPACE_PRIVATE_KEY &&
      env.GOOGLE_WORKSPACE_SENDER === "alex@akipasa.com" &&
      env.NEXT_PUBLIC_SUPABASE_URL &&
      env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
/** Used by the approved server action and the Worker's five-minute scheduled handler. */
export async function dispatchBookingConfirmations(
  env = bookingMailEnvironment(),
  venueId?: string,
  bookingId?: string,
) {
  return dispatchConfirmations(env, false, venueId, bookingId);
}
export async function dispatchAccommodationConfirmations(
  env = bookingMailEnvironment(),
) {
  return dispatchConfirmations(env, true);
}
async function dispatchConfirmations(
  env: BookingMailEnv,
  accommodation: boolean,
  venueId?: string,
  bookingId?: string,
) {
  // Missing configuration must not claim messages or consume retry attempts.
  if (!bookingEmailConfigured(env))
    return { sent: 0, failed: 0, configured: false };
  const db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { data, error } = await db.rpc(
    accommodation
      ? "claim_accommodation_confirmation_emails"
      : "claim_booking_confirmation_emails",
    accommodation
      ? {}
      : {
          p_venue: venueId || null,
          p_booking: bookingId || null,
        },
  );
  if (error) {
    console.error("booking_email_queue_unavailable", error.code);
    return { sent: 0, failed: 0, configured: true };
  }
  let sent = 0,
    failed = 0;
  for (const row of data || []) {
    // Cancellation may have happened after the lease was issued.
    const { data: current } = await db
      .from(accommodation ? "accommodation_reservations" : "booking_requests")
      .select("status")
      .eq("id", row.booking_id)
      .maybeSingle();
    if (
      current?.status !== "confirmed" &&
      !(accommodation && current?.status === "checked_in")
    )
      continue;
    const payload = row.payload as BookingConfirmation;
    const audience = row.audience as "customer" | "venue";
    const outcome = await sendWorkspaceMessage(
      row.recipient,
      renderBookingConfirmation(payload, audience),
      env,
      `${row.booking_id}-${audience}`,
    );
    const { error: ackError } = await db.rpc(
      accommodation
        ? "finish_accommodation_confirmation_email"
        : "finish_booking_confirmation_email",
      {
        p_booking: row.booking_id,
        p_audience: row.audience,
        p_lease: row.lease_id,
        p_ok: outcome.ok,
        p_message: outcome.messageId || null,
        p_error: outcome.error || null,
        p_ambiguous: outcome.ambiguous ?? true,
      },
    );
    if (ackError) console.error("booking_email_ack_pending", ackError.code);
    if (outcome.ok) sent++;
    else failed++;
  }
  return { sent, failed, configured: true };
}
