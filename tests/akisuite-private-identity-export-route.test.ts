import { afterEach, beforeEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), user: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    rpc: mocks.rpc,
    auth: { getUser: mocks.user },
  }),
}));
vi.mock("@/lib/account-export", () => ({
  currentAccountExportTables: () => [],
  createAccountExportReader: () => async () => ({
    table: "unused",
    data: [],
    failed: false,
  }),
  exportableAuthentication: () => ({}),
  readAccountRecommendationItems: async () => ({
    table: "recommendation_items",
    data: [],
    failed: false,
  }),
}));
import { GET } from "../src/app/[locale]/account/export/route";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AKISUITE_PRIVATE_IDENTITY_EXPORTS_READY", "true");
  vi.stubEnv("AKIPASA_PRESTIGE_SCHEMA_READY", "true");
  vi.stubEnv("AKIPASA_PRESTIGE_ENABLED", "false");
  vi.stubEnv("AKISUITE_REFERRALS_READY", "false");
  vi.stubEnv("AKISUITE_FUNNEL_READY", "false");
  vi.stubEnv("AKISUITE_ONBOARDING_SCHEMA_READY", "true");
  mocks.user.mockResolvedValue({
    data: { user: { id: "member", email: "member@example.test" } },
  });
});
afterEach(() => vi.unstubAllEnvs());
it.each(["pending", "underage"])(
  "exports ownprivateidentity with %s restriction and marketing/gameplay off",
  async (status) => {
    mocks.rpc.mockImplementation(
      async (name: string, args?: { p_section: string }) => ({
        data:
          name === "my_account_onboarding"
            ? { status }
            : name === "suite_private_identity_export_page"
              ? {
                  section: args!.p_section,
                  total:
                    args!.p_section === "passport_prestige_shipping_addresses"
                      ? 1
                      : 0,
                  rows:
                    args!.p_section === "passport_prestige_shipping_addresses"
                      ? [
                          {
                            key: "00000000-0000-4000-8000-000000000001",
                            data: {
                              recipient_name: "Own recipient",
                              delete_after: "2026-10-20T00:00:00Z",
                            },
                          },
                        ]
                      : [],
                  next_cursor: null,
                }
              : [],
        error: null,
      }),
    );
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    const body = await response.json();
    expect(body.data.account_onboarding).toEqual([{ status }]);
    expect(body.data.passport_prestige_shipping_addresses).toHaveLength(1);
    expect(body.data).not.toHaveProperty("passport_prestige");
    expect(mocks.rpc).not.toHaveBeenCalledWith(
      "prestige_member",
      expect.anything(),
    );
  },
);
it("returns no partial export if any private section fails", async () => {
  mocks.rpc.mockImplementation(
    async (name: string, args?: { p_section: string }) =>
      name === "suite_private_identity_export_page" &&
      args!.p_section === "suite_referral_payout_reviews"
        ? { data: null, error: { message: "Unavailable" } }
        : {
            data:
              name === "suite_private_identity_export_page"
                ? {
                    section: args!.p_section,
                    total: 0,
                    rows: [],
                    next_cursor: null,
                  }
                : [],
            error: null,
          },
  );
  const response = await GET();
  expect(response.status).toBe(503);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  const body = await response.json();
  expect(body).not.toHaveProperty("data");
  expect(body.unavailable_tables).toContain("suite_referral_payout_reviews");
});
it("never invokes privacy RPC without validated authentication", async () => {
  mocks.user.mockResolvedValue({ data: { user: null } });
  const response = await GET();
  expect(response.status).toBe(401);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
