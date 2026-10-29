import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  profile: vi.fn(),
  rpc: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { passportAdminAction } from "../src/app/[locale]/admin/passports/awards/actions";
const actions = [
  "search",
  "read",
  "history",
  "mark_test",
  "grant",
  "preset",
  "revoke",
  "reset_city",
  "reset_batch",
] as const;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.profile.mockResolvedValue({
    data: { app_role: "administrator" },
    error: null,
  });
  mocks.rpc.mockResolvedValue({ data: { fixture: true }, error: null });
  mocks.requireUser.mockResolvedValue({
    user: { id: "fixture-admin" },
    supabase: {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }),
      }),
      rpc: mocks.rpc,
    },
  });
});
afterEach(() => vi.restoreAllMocks());
it.each(["en", "es"] as const)(
  "authenticates %s guests before malformed collection validation",
  async (locale) => {
    mocks.requireUser.mockRejectedValue(new Error("AUTH_REDIRECT"));
    const parse = vi.spyOn(z.ZodRecord.prototype, "_parse");
    await expect(
      passportAdminAction(locale, {
        action: "grant",
        payload: Object.fromEntries(
          Array.from({ length: 1001 }, (_, i) => [`key_${i}`, []]),
        ),
      }),
    ).rejects.toThrow("AUTH_REDIRECT");
    expect(parse).not.toHaveBeenCalled();
    expect(mocks.requireUser).toHaveBeenCalledWith(
      locale,
      `/${locale}/admin/passports/awards`,
    );
    expect(mocks.profile).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  },
);
it.each(["consumer", "venue_owner", "staff"])(
  "denies %s before collection validation",
  async (role) => {
    mocks.profile.mockResolvedValue({ data: { app_role: role }, error: null });
    const parse = vi.spyOn(z.ZodRecord.prototype, "_parse");
    expect(
      await passportAdminAction("en", {
        action: "grant",
        payload: { bad: [] },
      }),
    ).toEqual({ error: "Administrator required" });
    expect(parse).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  },
);
it.each([
  { data: null, error: null },
  { data: null, error: { message: "private provider failure" } },
  { data: { app_role: "administrator" }, error: { message: "read failed" } },
])("fails closed on missing/error role read before parsing", async (result) => {
  mocks.profile.mockResolvedValue(result);
  const parse = vi.spyOn(z.ZodRecord.prototype, "_parse");
  expect(await passportAdminAction("es", null)).toEqual({
    error: "Administrator required",
  });
  expect(parse).not.toHaveBeenCalled();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it.each(actions)(
  "preserves authorized %s payload and read/mutation revalidation",
  async (action) => {
    const payload = {
      profile_id: "fixture-target",
      reason: "Fixture reason",
      request_id: "fixture-idempotency-key",
      custom_compatible_key: "retained",
      enabled: true,
    };
    expect(await passportAdminAction("en", { action, payload })).toEqual({
      data: { fixture: true },
    });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_passport_awards", {
      p_action: action,
      p_payload: payload,
    });
    if (["search", "read", "history"].includes(action))
      expect(mocks.revalidate).not.toHaveBeenCalled();
    else
      expect(mocks.revalidate.mock.calls).toEqual([
        ["/es/passports"],
        ["/es/account/rewards"],
        ["/en/passports"],
        ["/en/account/rewards"],
      ]);
  },
);
it.each([
  null,
  { action: "unknown", payload: {} },
  { action: "grant", payload: { invalid: [] } },
])("retains authorized invalid request response", async (input) => {
  expect(await passportAdminAction("en", input)).toEqual({
    error: "Invalid award request",
  });
  expect(mocks.requireUser).toHaveBeenCalledOnce();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it.each(["en", "es"] as const)(
  "retains localized %s RPC failure without leaking details",
  async (locale) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "PRIVATE" } });
    expect(
      await passportAdminAction(locale, {
        action: "grant",
        payload: { reason: "Fixture reason" },
      }),
    ).toEqual({
      error:
        locale === "es"
          ? "No se pudo completar. Revisa el usuario, nivel y motivo."
          : "Could not complete. Check the member, tier and reason.",
    });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  },
);
it("does not add an unrelated Prestige feature flag to existing awards", async () => {
  vi.stubEnv("AKIPASA_PRESTIGE_ENABLED", "");
  expect(
    await passportAdminAction("es", { action: "read", payload: {} }),
  ).toEqual({ data: { fixture: true } });
  vi.unstubAllEnvs();
});
