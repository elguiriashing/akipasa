import { afterEach, describe, expect, it, vi } from "vitest";
import {
  accountExportTables,
  currentAccountExportTables,
  exportableAuthentication,
} from "../src/lib/account-export";

describe("account data export contract", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("exports new payer billing only after its schema is ready", () => {
    vi.stubEnv("AKISUITE_SUBSCRIPTIONS_READY", "false");
    expect(
      currentAccountExportTables().some(
        ([table]) => table === "akisuite_billing_subscriptions",
      ),
    ).toBe(false);
    vi.stubEnv("AKISUITE_SUBSCRIPTIONS_READY", "true");
    expect(currentAccountExportTables()).toContainEqual([
      "akisuite_billing_subscriptions",
      "profile_id",
    ]);
  });
  it("covers consumer, business, community, analytics and privacy records", () => {
    const tables = new Set<string>(accountExportTables.map(([table]) => table));
    for (const required of [
      "profiles",
      "claim_decision_emails",
      "saved_events",
      "recent_event_views",
      "check_ins",
      "xp_ledger",
      "passport_progress",
      "event_submissions",
      "reports",
      "business_applications",
      "billing_customers",
      "billing_subscriptions",
      "staff_billing_grants",
      "venue_members",
      "venue_media",
      "promotion_requests",
      "analytics_events",
      "advertising_profiles",
      "account_deletion_requests",
    ]) {
      expect(tables.has(required), required).toBe(true);
    }
  });

  it("exports provider names without authentication secrets", () => {
    expect(
      exportableAuthentication({
        created_at: "2026-07-23T00:00:00Z",
        identities: [
          { provider: "email" },
          { provider: "google" },
          { provider: "google" },
        ],
        user_metadata: { preferred_locale: "en" },
      }),
    ).toEqual({
      created_at: "2026-07-23T00:00:00Z",
      last_sign_in_at: null,
      providers: ["email", "google"],
      profile_metadata: { preferred_locale: "en" },
    });
  });
});
