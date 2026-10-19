import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  accountExportTables,
  createAccountExportReader,
  currentAccountExportTables,
  exportableAuthentication,
} from "../src/lib/account-export";

function exportClient(rows: Record<string, unknown>[], changedCount = false) {
  const offsets: number[] = [];
  const client = {
    from: () => ({
      select: () => {
        let offset = 0;
        const query = {
          eq: () => query,
          in: () => query,
          order: () => query,
          range: (start: number) => {
            offset = start;
            offsets.push(start);
            return query;
          },
          retry: async () => ({
            data: rows.slice(offset, offset + 1_000),
            error: null,
            count: changedCount && offset ? rows.length - 1 : rows.length,
          }),
        };
        return query;
      },
    }),
  } as unknown as SupabaseClient;
  return { client, offsets };
}

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
      "pals_preview_access",
      "pals_states",
      "pals_entitlements",
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

  it("keeps privileged Pals command and analytics tables out of exports", () => {
    const tables = accountExportTables.map(([table]) => table);
    expect(tables).not.toContain("pals_commands");
    expect(tables).not.toContain("pals_analytics_events");
    expect(tables).not.toContain("ai_chat_messages");
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

  it("paginates exact-count exports deterministically", async () => {
    const rows = Array.from({ length: 2_005 }, (_, id) => ({ id }));
    const { client, offsets } = exportClient(rows);
    const result = await createAccountExportReader(client)(
      "xp_ledger",
      "profile_id",
      "owner",
    );
    expect(result).toEqual({ table: "xp_ledger", data: rows, failed: false });
    expect(offsets).toEqual([0, 1_000, 2_000]);
  });

  it("fails closed when an exact count changes between pages", async () => {
    const rows = Array.from({ length: 1_005 }, (_, id) => ({ id }));
    const { client } = exportClient(rows, true);
    await expect(
      createAccountExportReader(client)("xp_ledger", "profile_id", "owner"),
    ).resolves.toEqual({ table: "xp_ledger", data: [], failed: true });
  });
});
