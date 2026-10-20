// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
const { rpc, user } = vi.hoisted(() => ({ rpc: vi.fn(), user: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ rpc, auth: { getUser: user } }),
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
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
function setup() {
  user.mockResolvedValue({
    data: { user: { id: "member", email: "member@example.test" } },
  });
  rpc.mockImplementation(async (name: string) =>
    name === "prestige_member"
      ? {
          data: { awards: [{ serial: 42 }], physical_requests: [] },
          error: null,
        }
      : { data: [], error: null },
  );
}
describe("prestige account export", () => {
  it("retains backward compatibility before migration readiness", async () => {
    setup();
    vi.stubEnv("AKIPASA_PRESTIGE_SCHEMA_READY", "");
    const response = await GET();
    expect(response.status).toBe(200);
    expect((await response.json()).data).not.toHaveProperty(
      "passport_prestige",
    );
    expect(rpc).not.toHaveBeenCalledWith("prestige_member", expect.anything());
  });
  it("exports caller-scoped records with launch disabled and without a caller-controlled profile ID", async () => {
    setup();
    vi.stubEnv("AKIPASA_PRESTIGE_SCHEMA_READY", "true");
    vi.stubEnv("AKIPASA_PRESTIGE_ENABLED", "false");
    const response = await GET();
    expect(response.status).toBe(200);
    expect((await response.json()).data.passport_prestige).toEqual([
      { awards: [{ serial: 42 }], physical_requests: [] },
    ]);
    expect(rpc).toHaveBeenCalledWith("prestige_member", { p_action: "export" });
  });
  it("fails the complete export if prestige data cannot be read", async () => {
    setup();
    vi.stubEnv("AKIPASA_PRESTIGE_SCHEMA_READY", "true");
    rpc.mockImplementation(async (name: string) =>
      name === "prestige_member"
        ? { error: { message: "Unavailable" } }
        : { data: [], error: null },
    );
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).unavailable_tables).toContain(
      "passport_prestige",
    );
  });
  it("exports both independent schema receipts while feature access is locked", async () => {
    setup();
    vi.stubEnv("AKIPASA_PRESTIGE_SCHEMA_READY", "true");
    vi.stubEnv("AKISUITE_ONBOARDING_SCHEMA_READY", "true");
    rpc.mockImplementation(async (name: string) => ({
      data:
        name === "my_account_onboarding"
          ? { status: "underage" }
          : name === "prestige_member"
            ? { awards: [], physical_requests: [] }
            : [],
      error: null,
    }));
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.account_onboarding).toEqual([{ status: "underage" }]);
    expect(body.data.passport_prestige).toEqual([
      { awards: [], physical_requests: [] },
    ]);
    expect(rpc).toHaveBeenCalledWith("my_account_onboarding");
    expect(rpc).toHaveBeenCalledWith("prestige_member", { p_action: "export" });
  });
  it("never returns a partial export when either ready schema fails", async () => {
    setup();
    vi.stubEnv("AKIPASA_PRESTIGE_SCHEMA_READY", "true");
    vi.stubEnv("AKISUITE_ONBOARDING_SCHEMA_READY", "true");
    rpc.mockImplementation(async (name: string) =>
      name === "my_account_onboarding"
        ? { error: { message: "Unavailable" } }
        : { data: [], error: null },
    );
    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.unavailable_tables).toContain("account_onboarding");
    expect(body).not.toHaveProperty("data");
  });
  it("does not request prestige for unauthenticated callers", async () => {
    setup();
    user.mockResolvedValue({ data: { user: null } });
    const response = await GET();
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
});
