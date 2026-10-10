import { createClient } from "@supabase/supabase-js";
import {
  bookingMailEnvironment,
  type BookingMailEnv,
} from "./booking-mail-delivery";
import type { ClaimDecision } from "./claim-decision-email";
import {
  sendWorkspaceClaimDecision,
  type WorkspaceMailCredentials,
} from "./workspace-claim-mail";

export type ClaimMailEnv = BookingMailEnv & WorkspaceMailCredentials;
export function claimMailEnvironment(): ClaimMailEnv {
  return {
    ...bookingMailEnvironment(),
    GOOGLE_WORKSPACE_CLIENT_EMAIL: process.env.GOOGLE_WORKSPACE_CLIENT_EMAIL,
    GOOGLE_WORKSPACE_PRIVATE_KEY: process.env.GOOGLE_WORKSPACE_PRIVATE_KEY,
    GOOGLE_WORKSPACE_SENDER: process.env.GOOGLE_WORKSPACE_SENDER,
  };
}
export function claimMailConfigured(env: ClaimMailEnv) {
  return Boolean(
    env.GOOGLE_WORKSPACE_CLIENT_EMAIL &&
      env.GOOGLE_WORKSPACE_PRIVATE_KEY &&
      env.GOOGLE_WORKSPACE_SENDER === "alex@akipasa.com" &&
      env.NEXT_PUBLIC_SUPABASE_URL &&
      env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
export async function dispatchClaimDecisions(
  env: ClaimMailEnv = claimMailEnvironment(),
  claimId?: string,
) {
  if (!claimMailConfigured(env))
    return { sent: 0, failed: 0, configured: false };
  const db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await db.rpc("claim_claim_decision_emails", {
    p_claim: claimId || null,
  });
  if (error) {
    console.error("claim_email_queue_unavailable", error.code);
    return { sent: 0, failed: 0, configured: true };
  }
  let sent = 0,
    failed = 0;
  for (const row of data || []) {
    const outcome = await sendWorkspaceClaimDecision(
      { ...(row.payload as ClaimDecision), recipient: row.recipient },
      env,
    );
    const { error: ackError } = await db.rpc("finish_claim_decision_email", {
      p_claim: row.claim_id,
      p_lease: row.lease_id,
      p_ok: outcome.ok,
      p_message: outcome.messageId || null,
      p_error: outcome.error || null,
      p_ambiguous: outcome.ambiguous ?? true,
      p_retryable: outcome.retryable ?? false,
    });
    if (ackError) console.error("claim_email_ack_pending", ackError.code);
    if (outcome.ok) sent++;
    else failed++;
  }
  return { sent, failed, configured: true };
}
