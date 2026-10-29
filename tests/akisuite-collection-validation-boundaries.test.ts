import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rpc: vi.fn(),
  upsert: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  insert: vi.fn(),
  profile: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { saveCreatorProfile } from "../src/app/[locale]/community/creator-actions";
import { prestigeAdminAction } from "../src/app/[locale]/admin/passports/prestige/actions";
const userId = "10000000-0000-4000-8000-000000000001";
function form(count: number, locale = "en") {
  const f = new FormData();
  Object.entries({
    locale,
    slug: "creator-fixture",
    displayName: "Fixture creator",
    headlineEs: "",
    headlineEn: "",
    bioEs: "A factual fixture biography long enough for validation.",
    bioEn: "",
    locality: "",
    province: "",
    avatarUrl: "",
    coverUrl: "",
    websiteUrl: "",
    instagramUrl: "",
    youtubeUrl: "",
    publish: "draft",
  }).forEach(([k, v]) => f.set(k, v));
  for (let i = 0; i < count; i++)
    f.append(
      "categoryIds",
      `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
  return f;
}
function programme(count: number) {
  return {
    action: "configure",
    key: "fixture_programme",
    title_en: "Fixture title",
    title_es: "Título de prueba",
    achievement_keys: Array.from({ length: count }, (_, i) => `fixture_${i}`),
    physical_eligible: false,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AKIPASA_PRESTIGE_ENABLED", "true");
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.update.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
  mocks.remove.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ data: {}, error: null });
  mocks.profile.mockResolvedValue({
    data: { app_role: "administrator" },
    error: null,
  });
  mocks.requireUser.mockResolvedValue({
    user: { id: userId },
    supabase: {
      rpc: mocks.rpc,
      from: () => ({
        upsert: mocks.upsert,
        update: mocks.update,
        delete: mocks.remove,
        insert: mocks.insert,
        select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }),
      }),
    },
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
it.each(["en", "es"])(
  "rejects oversized %s creator categories before any Zod item parsing/auth",
  async (locale) => {
    const parse = vi.spyOn(z.ZodString.prototype, "_parse");
    await expect(saveCreatorProfile(form(7, locale))).rejects.toThrow(
      `redirect:/${locale}/community/creator?error=validation`,
    );
    expect(parse).not.toHaveBeenCalled();
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  },
);
it.each([0, 6])(
  "preserves creator boundary%s payload and mutations",
  async (count) => {
    const f = form(count);
    await expect(saveCreatorProfile(f)).rejects.toThrow(
      "redirect:/en/community/creator?updated=1",
    );
    expect(mocks.requireUser).toHaveBeenCalledWith("en");
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: userId,
        state: "draft",
        slug: "creator-fixture",
      }),
      { onConflict: "profile_id" },
    );
    if (count)
      expect(mocks.insert).toHaveBeenCalledWith(
        f
          .getAll("categoryIds")
          .map((category_id) => ({ creator_profile_id: userId, category_id })),
      );
    else expect(mocks.insert).not.toHaveBeenCalled();
  },
);
it("retains within-limit invalid creator UUID rejection", async () => {
  const f = form(1);
  f.set("categoryIds", "bad");
  await expect(saveCreatorProfile(f)).rejects.toThrow("error=validation");
  expect(mocks.requireUser).not.toHaveBeenCalled();
});
it.each(["en", "es"])(
  "rejects oversized %s configure before Zod elements/auth/RPC",
  async (locale) => {
    const parse = vi.spyOn(z.ZodString.prototype, "_parse");
    expect(await prestigeAdminAction(locale, programme(1001))).toEqual({
      error: locale === "es" ? "Revisa los datos." : "Check the details.",
    });
    expect(parse).not.toHaveBeenCalled();
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  },
);
it.each([1, 1000])(
  "preserves configure boundary%s payload and authenticated RPC",
  async (count) => {
    const input = programme(count);
    expect(await prestigeAdminAction("en", input)).toMatchObject({
      success: true,
    });
    const { action, ...payload } = input;
    expect(mocks.rpc).toHaveBeenCalledWith("prestige_admin", {
      p_action: action,
      p_payload: payload,
    });
  },
);
it("retains feature gate before oversized-input handling", async () => {
  vi.stubEnv("AKIPASA_PRESTIGE_ENABLED", "");
  expect(await prestigeAdminAction("en", programme(1001))).toEqual({
    error: "Unavailable.",
  });
  expect(mocks.requireUser).not.toHaveBeenCalled();
});
it("retains invalid configure minimum and item checks", async () => {
  expect(await prestigeAdminAction("en", programme(0))).toEqual({
    error: "Check the details.",
  });
  expect(
    await prestigeAdminAction("en", {
      ...programme(1),
      achievement_keys: ["!"],
    }),
  ).toEqual({ error: "Check the details." });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("preserves administrator authorization for valid configure requests", async () => {
  mocks.profile.mockResolvedValue({
    data: { app_role: "consumer" },
    error: null,
  });
  expect(await prestigeAdminAction("en", programme(1))).toEqual({
    error: "Administrator required.",
  });
  expect(mocks.requireUser).toHaveBeenCalledWith(
    "en",
    "/en/admin/passports/prestige",
  );
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("keeps invalid locale rejection ahead of payload validation", async () => {
  expect(await prestigeAdminAction("xx", programme(1001))).toEqual({
    error: "Unavailable.",
  });
  expect(mocks.requireUser).not.toHaveBeenCalled();
});
