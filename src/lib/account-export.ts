import type { SupabaseClient } from "@supabase/supabase-js";

export const accountExportTables = [
  ["profiles", "id"],
  ["pals_preview_access", "user_id"],
  ["pals_states", "user_id"],
  ["pals_avatar_profiles", "user_id"],
  ["pals_entitlements", "user_id"],
  ["booking_requests", "profile_id"],
  ["accommodation_reservations", "profile_id"],
  ["accommodation_quotes", "profile_id"],
  ["saved_events", "profile_id"],
  ["saved_event_refs", "profile_id"],
  ["followed_venues", "profile_id"],
  ["followed_venue_refs", "profile_id"],
  ["recent_event_views", "profile_id"],
  ["recent_event_view_refs", "profile_id"],
  ["check_ins", "profile_id"],
  ["loyalty_ledger", "profile_id"],
  ["xp_ledger", "profile_id"],
  ["passport_progress", "profile_id"],
  ["reward_redemptions", "profile_id"],
  ["event_submissions", "submitter_id"],
  ["reports", "reporter_id"],
  ["venue_claims", "claimant_id"],
  ["claim_decision_emails", "claimant_id"],
  ["claim_submission_alerts", "claimant_id"],
  ["suite_email_outbox", "profile_id"],
  ["suite_email_preferences", "profile_id"],
  ["suite_saved_stays", "profile_id"],
  ["business_applications", "applicant_id"],
  ["billing_customers", "profile_id"],
  ["billing_subscriptions", "profile_id"],
  ["staff_billing_grants", "profile_id"],
  ["venue_members", "profile_id"],
  ["venue_media", "created_by"],
  ["promotion_requests", "requester_id"],
  ["analytics_events", "profile_id"],
  ["personalisation_settings", "profile_id"],
  ["advertising_profiles", "profile_id"],
  ["preference_profiles", "profile_id"],
  ["behaviour_events", "profile_id"],
  ["user_event_preferences", "profile_id"],
  ["moderation_actions", "actor_id"],
  ["feature_slots", "created_by"],
  ["passports", "created_by"],
  ["account_deletion_requests", "profile_id"],
] as const;

const accountExportOrder: Record<string, readonly string[]> = {
  suite_referral_codes: ["code"],
  suite_referral_attributions: ["profile_id"],
  suite_referral_representatives: ["profile_id"],
  suite_referral_billing_events: ["stripe_event_id"],
  pals_preview_access: ["user_id"],
  pals_states: ["user_id"],
  pals_avatar_profiles: ["user_id"],
  saved_events: ["profile_id", "event_id"],
  saved_event_refs: ["profile_id", "event_key"],
  followed_venues: ["profile_id", "venue_id"],
  followed_venue_refs: ["profile_id", "venue_key"],
  recent_event_views: ["profile_id", "event_id"],
  recent_event_view_refs: ["profile_id", "event_key"],
  passport_progress: ["profile_id", "step_id"],
  claim_decision_emails: ["claim_id"],
  claim_submission_alerts: ["claim_id"],
  suite_email_preferences: ["profile_id"],
  suite_saved_stays: ["profile_id", "venue_id"],
  billing_customers: ["profile_id"],
  billing_subscriptions: ["stripe_subscription_id"],
  akisuite_billing_subscriptions: ["stripe_subscription_id"],
  venue_members: ["venue_id", "profile_id"],
  personalisation_settings: ["profile_id"],
  advertising_profiles: ["profile_id"],
  behaviour_events: ["event_id"],
  user_event_preferences: ["profile_id", "event_id"],
  user_preference_signals: ["preference_profile_id", "dimension", "key"],
  experiment_assignments: ["experiment_key", "preference_profile_id"],
  recommendation_items: [
    "recommendation_request_id",
    "event_id",
    "occurrence_id",
  ],
};

const exportPageSize = 1_000;
const exportReadLimit = 80;
const recommendationBatchSize = 100;

export type AccountExportEntry = {
  table: string;
  data: Record<string, unknown>[];
  failed: boolean;
};

/** Bounded deterministic pagination using only the caller's RLS session. */
export function createAccountExportReader(supabase: SupabaseClient) {
  let remainingReads = exportReadLimit;
  return async function read(
    table: string,
    column: string,
    value: string | string[],
  ): Promise<AccountExportEntry> {
    const rows: Record<string, unknown>[] = [];
    let expectedCount: number | undefined;
    try {
      while (remainingReads > 0) {
        remainingReads -= 1;
        let query = supabase.from(table).select("*", { count: "exact" });
        query = Array.isArray(value)
          ? query.in(column, value)
          : query.eq(column, value);
        for (const key of accountExportOrder[table] || ["id"])
          query = query.order(key, { ascending: true });
        const { data, error, count } = await query
          .range(rows.length, rows.length + exportPageSize - 1)
          .retry(false);
        if (
          error ||
          !Array.isArray(data) ||
          count === null ||
          !Number.isSafeInteger(count) ||
          count < 0 ||
          (expectedCount !== undefined && count !== expectedCount) ||
          data.length > exportPageSize ||
          rows.length + data.length > count
        )
          break;
        expectedCount = count;
        rows.push(...data);
        if (rows.length === count) return { table, data: rows, failed: false };
        if (!data.length) break;
      }
    } catch {
      // A partial export is never returned after a transport/parser failure.
    }
    return { table, data: [], failed: true };
  };
}

export async function readAccountRecommendationItems(
  read: ReturnType<typeof createAccountExportReader>,
  recommendationIds: string[],
): Promise<AccountExportEntry> {
  const data: Record<string, unknown>[] = [];
  for (
    let offset = 0;
    offset < recommendationIds.length;
    offset += recommendationBatchSize
  ) {
    const entry = await read(
      "recommendation_items",
      "recommendation_request_id",
      recommendationIds.slice(offset, offset + recommendationBatchSize),
    );
    if (entry.failed) return entry;
    data.push(...entry.data);
  }
  return { table: "recommendation_items", data, failed: false };
}

export function currentAccountExportTables() {
  return [
    ...accountExportTables,
    ...(process.env.AKISUITE_SUBSCRIPTIONS_READY === "true"
      ? [["akisuite_billing_subscriptions", "profile_id"] as const]
      : []),
    ...(process.env.AKISUITE_REFERRALS_READY === "true" &&
    process.env.AKISUITE_PRIVATE_IDENTITY_EXPORTS_READY !== "true"
      ? [
          ["suite_referral_codes", "owner_profile_id"] as const,
          ["suite_referral_attributions", "profile_id"] as const,
          ["suite_referral_representatives", "profile_id"] as const,
          ["suite_referral_leads", "representative_id"] as const,
          ["suite_referral_cases", "reporter_id"] as const,
          ["suite_referral_billing_events", "profile_id"] as const,
        ]
      : []),
  ];
}

export function exportableAuthentication(user: {
  created_at?: string;
  last_sign_in_at?: string;
  identities?: { provider?: string }[] | null;
  user_metadata?: Record<string, unknown>;
}) {
  return {
    created_at: user.created_at || null,
    last_sign_in_at: user.last_sign_in_at || null,
    providers: [
      ...new Set(
        (user.identities || [])
          .map((identity) => identity.provider)
          .filter((provider): provider is string => Boolean(provider)),
      ),
    ],
    profile_metadata: user.user_metadata || {},
  };
}
