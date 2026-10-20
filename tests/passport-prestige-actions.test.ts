// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
const { requireUser, rpc, profile, client, revalidatePath } = vi.hoisted(
  () => ({
    requireUser: vi.fn(),
    rpc: vi.fn(),
    profile: vi.fn(),
    client: vi.fn(),
    revalidatePath: vi.fn(),
  }),
);
vi.mock("@/lib/auth", () => ({ requireUser }));
vi.mock("@/lib/passport-prestige-identity", () => ({
  requirePrestigePrivacyIdentity: requireUser,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: client,
}));
vi.mock("next/cache", () => ({ revalidatePath }));
import {
  prestigePrivacyAction,
  prestigeMemberAction,
} from "../src/app/[locale]/passports/prestige/actions";
import { prestigeAdminAction } from "../src/app/[locale]/admin/passports/prestige/actions";
import { GET } from "../src/app/api/passports/prestige/[publicId]/route";
const id = "10000000-0000-0000-0000-000000000001";
function setup(role = "consumer") {
  vi.stubEnv("AKIPASA_PRESTIGE_ENABLED", "true");
  rpc.mockResolvedValue({ data: [], error: null });
  profile.mockResolvedValue({ data: { app_role: role }, error: null });
  const supabase = {
    rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: profile }) }) }),
  };
  requireUser.mockResolvedValue({ supabase, user: { id } });
  client.mockResolvedValue(supabase);
}
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
describe("prestige server boundaries", () => {
  it("does not authenticate, read data or mutate when launch flag is off", async () => {
    vi.stubEnv("AKIPASA_PRESTIGE_ENABLED", "");
    expect(
      await prestigeMemberAction("en", {
        action: "claim",
        programme_key: "city_master",
      }),
    ).toEqual({ error: "Prestige is unavailable." });
    expect(
      await prestigeAdminAction("en", {
        action: "programme_status",
        key: "city_master",
        active: true,
      }),
    ).toEqual({ error: "Unavailable." });
    const response = await GET(
      new Request(`https://akipasa.com/api/passports/prestige/${id}`),
      { params: Promise.resolve({ publicId: id }) },
    );
    expect(response.status).toBe(404);
    expect(requireUser).not.toHaveBeenCalled();
    expect(client).not.toHaveBeenCalled();
  });
  it("rejects invalid payloads and Hall membership without explicit certificate sharing", async () => {
    setup();
    expect(
      await prestigeMemberAction("en", { action: "claim", programme_key: "x" }),
    ).toHaveProperty("error");
    expect(
      await prestigeMemberAction("en", {
        action: "visibility",
        award_id: id,
        shared: false,
        hall_of_fame: true,
        public_alias: "Explorer",
      }),
    ).toHaveProperty("error");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("ignores supplied identity and binds to the authenticated RPC actor", async () => {
    setup();
    const result = await prestigeMemberAction("en", {
      action: "claim",
      programme_key: "city_master",
      profile_id: "other",
      current_count: 1000,
    });
    expect(result).toEqual({ success: true });
    expect(rpc).toHaveBeenCalledWith("prestige_member", {
      p_action: "claim",
      p_payload: { programme_key: "city_master" },
    });
  });
  it("denies member administration before RPC and reports failed RPC without success", async () => {
    setup();
    expect(
      await prestigeAdminAction("en", {
        action: "programme_status",
        key: "city_master",
        active: true,
      }),
    ).toEqual({ error: "Administrator required." });
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockResolvedValue({ error: { message: "requirements not met" } });
    expect(
      await prestigeMemberAction("es", {
        action: "claim",
        programme_key: "city_master",
      }),
    ).toHaveProperty("error");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("never offers shipment transition even to administrators", async () => {
    setup("administrator");
    expect(
      await prestigeAdminAction("en", {
        action: "review",
        award_id: id,
        status: "shipped",
        reason: "Ready",
      }),
    ).toHaveProperty("error");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("keeps privacy deletion and withdrawal usable with digital launch closed", async () => {
    setup();
    vi.stubEnv("AKIPASA_PRESTIGE_SCHEMA_READY", "true");
    vi.stubEnv("AKIPASA_PRESTIGE_ENABLED", "false");
    expect(
      await prestigePrivacyAction("en", {
        action: "shipping_delete",
        award_id: id,
      }),
    ).toEqual({ success: true });
    expect(rpc).toHaveBeenCalledWith("prestige_member", {
      p_action: "shipping_delete",
      p_payload: { award_id: id },
    });
    expect(
      await prestigePrivacyAction("en", { action: "withdraw", award_id: id }),
    ).toEqual({ success: true });
  });
  it("never accepts shipping intake or admin address reads with insufficient scope", async () => {
    setup();
    expect(
      await prestigeMemberAction("en", {
        action: "shipping_submit",
        award_id: id,
        recipient_name: "A",
      }),
    ).toHaveProperty("error");
    expect(
      await prestigeAdminAction("en", {
        action: "read_shipping",
        award_id: id,
        reason: "Support review",
      }),
    ).toHaveProperty("error");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("returns unavailable rather than an invented certificate and avoids caching withdrawn data", async () => {
    setup();
    rpc.mockResolvedValue({ data: null, error: { message: "Unavailable" } });
    const response = await GET(
      new Request(`https://akipasa.com/api/passports/prestige/${id}`),
      { params: Promise.resolve({ publicId: id }) },
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    rpc.mockResolvedValue({ data: [], error: null });
    const missing = await GET(
      new Request(`https://akipasa.com/api/passports/prestige/${id}`),
      { params: Promise.resolve({ publicId: id }) },
    );
    expect(missing.status).toBe(404);
  });
  it("returns only the published certificate as a safe downloadable SVG", async () => {
    setup();
    rpc.mockResolvedValue({
      data: [
        {
          public_id: id,
          serial: 3,
          title_en: "City master",
          title_es: "Maestro local",
          public_alias: "Explorer",
          awarded_at: "2026-10-20T12:00:00Z",
        },
      ],
      error: null,
    });
    const response = await GET(
      new Request(`https://akipasa.com/api/passports/prestige/${id}?lang=es`),
      { params: Promise.resolve({ publicId: id }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    expect(response.headers.get("content-security-policy")).toContain(
      "sandbox",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.text()).toContain("Maestro local");
  });
});
