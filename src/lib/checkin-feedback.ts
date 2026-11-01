import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CheckInFailureReason =
  | "outside_geofence"
  | "cooldown"
  | "rate_limited"
  | "invalid_token"
  | "account"
  | "weak_location"
  | "location_unavailable"
  | "network"
  | "unknown";

const receiptId = z.string().uuid();
const recordedFailures = new Set([
  "outside_geofence",
  "cooldown",
  "rate_limited",
]);

/** Translate known provider outcomes, never display raw database errors. */
export function checkInOutcome(
  data: unknown,
  error?: { message?: string; code?: string } | null,
) {
  if (error) {
    const message = error.message || "";
    const state: CheckInFailureReason =
      /account completion required|authentication required/.test(message)
        ? "account"
        : /invalid check-in token/.test(message)
          ? "invalid_token"
          : /valid precise location required|valid venue distance required/.test(
                message,
              )
            ? "weak_location"
            : /fetch failed|failed to fetch|network|timeout|timed out/i.test(
                  message,
                ) || error.code === "57014"
              ? "network"
              : "unknown";
    return { state, visitId: undefined };
  }
  const value =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const id = receiptId.safeParse(value.check_in_id);
  const state =
    value.state === "accepted" || recordedFailures.has(String(value.state))
      ? (String(value.state) as
          | "accepted"
          | "outside_geofence"
          | "cooldown"
          | "rate_limited")
      : "unknown";
  // A reported success without an addressable receipt is an uncertain result.
  return {
    state: state === "accepted" && !id.success ? ("unknown" as const) : state,
    visitId: id.success ? id.data : undefined,
  };
}

export function checkInFailureReason(value?: string): CheckInFailureReason {
  return [
    "outside_geofence",
    "cooldown",
    "rate_limited",
    "invalid_token",
    "account",
    "weak_location",
    "location_unavailable",
    "network",
  ].includes(value || "")
    ? (value as CheckInFailureReason)
    : "unknown";
}

/** RLS ownership is enforced by the caller's normal authenticated client. A query
 * string may identify a receipt, but cannot supply its outcome or distance. */
export function checkInFailureReceipt(
  value: unknown,
  expectedId: string,
  expectedReason: CheckInFailureReason,
) {
  if (
    !receiptId.safeParse(expectedId).success ||
    !value ||
    typeof value !== "object"
  )
    return null;
  const row = value as Record<string, unknown>;
  if (row.id !== expectedId || row.state === "accepted") return null;
  const outside =
    row.state === "duplicate" &&
    Array.isArray(row.risk_flags) &&
    row.risk_flags.includes("outside_geofence");
  if (
    !(expectedReason === "outside_geofence"
      ? outside
      : row.state === expectedReason && recordedFailures.has(expectedReason))
  )
    return null;
  const distance =
    typeof row.distance_meters === "number" &&
    Number.isFinite(row.distance_meters) &&
    row.distance_meters >= 0
      ? Math.round(row.distance_meters)
      : null;
  const venue =
    row.venues && typeof row.venues === "object" && !Array.isArray(row.venues)
      ? (row.venues as Record<string, unknown>)
      : null;
  const venueSlug =
    typeof venue?.slug === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(venue.slug)
      ? venue.slug
      : null;
  return {
    reason: expectedReason,
    distance,
    ...(venueSlug ? { venueSlug } : {}),
  };
}

export async function loadCheckInFailureReceipt(
  db: SupabaseClient,
  profileId: string,
  visitId: string | undefined,
  reason: CheckInFailureReason,
) {
  if (
    !visitId ||
    !receiptId.safeParse(visitId).success ||
    !recordedFailures.has(reason)
  )
    return null;
  try {
    const { data, error } = await db
      .from("check_ins")
      .select("id,state,risk_flags,distance_meters,venues(slug)")
      .eq("id", visitId)
      .eq("profile_id", profileId)
      .maybeSingle();
    return error ? null : checkInFailureReceipt(data, visitId, reason);
  } catch {
    return null;
  }
}
