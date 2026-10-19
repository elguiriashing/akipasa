import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const timestamp =
  "20261019223704_least_privilege_security_definer_execution.sql";
const supabaseMigration = readFileSync(
  `supabase/migrations/${timestamp}`,
  "utf8",
);
const databaseMigration = readFileSync(
  `database/migrations/${timestamp}`,
  "utf8",
);

const authenticatedRpcs = [
  "accept_current_terms(text,text)",
  "admin_search_users(text,integer)",
  "admin_user_record(uuid)",
  "delete_owned_event(uuid,text,text)",
  "grant_staff_billing_access(uuid,text,text,text,uuid)",
  "review_business_application(uuid,text,text)",
  "set_automatic_moderation(boolean)",
  "set_feature_flag(text,boolean,text)",
  "update_own_profile(text,text)",
  "upsert_catalog_category(uuid,text,text,text,text)",
  "venue_analytics(uuid,timestamp with time zone)",
];

const triggerFunctions = [
  "enforce_community_submission_rate_limit()",
  "enforce_report_rate_limit()",
  "handle_new_user()",
  "keep_verified_venue_content_live()",
  "promote_business_owner()",
  "reconcile_venue_access()",
  "require_enabled_feature()",
  "sync_profile_entitlements_from_billing()",
];

describe("least-privilege SECURITY DEFINER execution", () => {
  it("keeps the deploy and operator migration mirrors identical", () => {
    expect(databaseMigration).toBe(supabaseMigration);
  });

  it.each(authenticatedRpcs)("removes anonymous execution from %s", (rpc) => {
    expect(supabaseMigration).toContain(
      `revoke execute on function public.${rpc}`,
    );
  });

  it.each(triggerFunctions)(
    "removes direct browser execution from %s",
    (rpc) => {
      expect(supabaseMigration).toContain(
        `revoke execute on function public.${rpc}`,
      );
      expect(supabaseMigration).toMatch(
        new RegExp(
          `revoke execute on function public\\.${rpc.replace(/[()]/g, "\\$&")}\\s+from public, anon, authenticated`,
        ),
      );
    },
  );

  it("keeps the launch bootstrap service-only", () => {
    expect(supabaseMigration).toMatch(
      /revoke execute on function public\.promote_launch_catalogue\(text\)\s+from public, anon, authenticated/,
    );
    expect(supabaseMigration).toMatch(
      /grant execute on function public\.promote_launch_catalogue\(text\)\s+to service_role/,
    );
  });

  it("does not revoke intentional public discovery and booking RPCs", () => {
    for (const rpc of [
      "booking_available_slots",
      "event_public_engagement",
      "public_venue_catalogue",
      "search_claimable_venues",
    ]) {
      expect(supabaseMigration).not.toContain(
        `revoke execute on function public.${rpc}`,
      );
    }
  });
});
