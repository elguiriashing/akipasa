export const accountExportTables = [
  ["profiles", "id"],
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
  ["venue_members", "profile_id"],
  ["venue_media", "created_by"],
  ["promotion_requests", "requester_id"],
  ["analytics_events", "profile_id"],
  ["moderation_actions", "actor_id"],
  ["feature_slots", "created_by"],
  ["passports", "created_by"],
  ["account_deletion_requests", "profile_id"],
] as const;

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
