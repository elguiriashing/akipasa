import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  requireUser: vi.fn(),
  insert: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  eq: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (destination: string) => {
    mocks.redirect(destination);
    throw new Error(`redirect:${destination}`);
  },
}));
vi.mock("@/lib/auth", () => ({
  requireUser: mocks.requireUser,
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  unstable_cache: (callback: unknown) => callback,
}));

import {
  requestCreatorVerification,
  saveCreatorProfile,
  submitCreatorReview,
} from "../src/app/[locale]/community/creator-actions";
import CreatorStudioPage from "../src/app/[locale]/community/creator/page";

beforeEach(() => {
  mocks.redirect.mockClear();
  mocks.insert.mockReset().mockResolvedValue({ error: null });
  mocks.upsert.mockReset().mockResolvedValue({ error: null });
  mocks.eq.mockReset().mockResolvedValue({ error: null });
  mocks.update.mockReset().mockReturnValue({ eq: mocks.eq });
  mocks.remove.mockReset().mockReturnValue({ eq: mocks.eq });
  mocks.rpc.mockReset().mockImplementation(async (name: string) => ({
    data:
      name === "creator_verification_eligibility" ? { eligible: true } : null,
    error: null,
  }));
  mocks.from.mockReset().mockReturnValue({
    insert: mocks.insert,
    upsert: mocks.upsert,
    update: mocks.update,
    delete: mocks.remove,
  });
  mocks.requireUser.mockReset().mockResolvedValue({
    user: { id: "20000000-0000-4000-8000-000000000002" },
    supabase: {
      from: mocks.from,
      rpc: mocks.rpc,
    },
  });
});

function creatorForm(locale: "en" | "es") {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    locale,
    slug: "ana-local",
    displayName: "Ana Local",
    headlineEs: "Artista local",
    headlineEn: "Local artist",
    bioEs:
      "Una biografía de prueba suficientemente larga para el perfil del creador.",
    bioEn: "A sufficiently long biography for this creator's public profile.",
    locality: "Málaga",
    province: "Málaga",
    avatarUrl: "",
    coverUrl: "",
    websiteUrl: "",
    instagramUrl: "",
    youtubeUrl: "",
    publish: "draft",
    profile_id: "10000000-0000-4000-8000-000000000001",
  }))
    form.set(key, value);
  form.append("categoryIds", "30000000-0000-4000-8000-000000000003");
  return form;
}

for (const locale of ["en", "es"] as const) {
  it(`retains the ${locale} Creator studio through its page authentication boundary`, async () => {
    mocks.requireUser.mockRejectedValue(new Error("AUTH_REQUIRED"));
    await expect(
      CreatorStudioPage({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("AUTH_REQUIRED");
    expect(mocks.requireUser).toHaveBeenCalledExactlyOnceWith(
      locale,
      `/${locale}/community/creator`,
    );
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it(`keeps ${locale} creator save caller-owned and returns to the studio`, async () => {
    await expect(saveCreatorProfile(creatorForm(locale))).rejects.toThrow(
      `redirect:/${locale}/community/creator?updated=1`,
    );
    expect(mocks.requireUser).toHaveBeenCalledExactlyOnceWith(
      locale,
      `/${locale}/community/creator`,
    );
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: "20000000-0000-4000-8000-000000000002",
        slug: "ana-local",
        state: "draft",
      }),
      { onConflict: "profile_id" },
    );
    expect(mocks.eq.mock.calls).toEqual([
      ["id", "20000000-0000-4000-8000-000000000002"],
      ["creator_profile_id", "20000000-0000-4000-8000-000000000002"],
    ]);
    expect(mocks.insert).toHaveBeenCalledWith([
      {
        creator_profile_id: "20000000-0000-4000-8000-000000000002",
        category_id: "30000000-0000-4000-8000-000000000003",
      },
    ]);
  });

  it(`checks ${locale} creator verification eligibility for the authenticated caller`, async () => {
    await expect(
      requestCreatorVerification(creatorForm(locale)),
    ).rejects.toThrow(
      `redirect:/${locale}/community/creator?updated=verification`,
    );
    expect(mocks.requireUser).toHaveBeenCalledExactlyOnceWith(
      locale,
      `/${locale}/community/creator`,
    );
    expect(mocks.rpc.mock.calls).toEqual([
      [
        "creator_verification_eligibility",
        { p_profile: "20000000-0000-4000-8000-000000000002" },
      ],
      ["request_creator_verification"],
    ]);
  });

  it.each([saveCreatorProfile, requestCreatorVerification])(
    `stops %s before any ${locale} creator mutation when authentication requires a return`,
    async (action) => {
      mocks.requireUser.mockRejectedValue(new Error("AUTH_REQUIRED"));
      await expect(action(creatorForm(locale))).rejects.toThrow(
        "AUTH_REQUIRED",
      );
      expect(mocks.requireUser).toHaveBeenCalledExactlyOnceWith(
        locale,
        `/${locale}/community/creator`,
      );
      expect(mocks.from).not.toHaveBeenCalled();
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );
}

it.each(["en", "es"] as const)(
  "returns %s sign-in to the creator review task and acknowledges submission",
  async (locale) => {
    const form = new FormData();
    form.set("locale", locale);
    form.set("creatorProfileId", "10000000-0000-4000-8000-000000000001");
    form.set("creatorSlug", "ana-local");
    form.set("rating", "5");
    form.set("body", "A detailed and useful review of this creator.");

    await expect(submitCreatorReview(form)).rejects.toThrow(
      `redirect:/${locale}/community/creators/ana-local?review=submitted`,
    );
    expect(mocks.requireUser).toHaveBeenCalledWith(
      locale,
      `/${locale}/community/creators/ana-local?review=draft`,
    );
    expect(mocks.insert).toHaveBeenCalledWith({
      creator_profile_id: "10000000-0000-4000-8000-000000000001",
      reviewer_id: "20000000-0000-4000-8000-000000000002",
      rating: 5,
      body: "A detailed and useful review of this creator.",
      state: "pending",
    });
  },
);

it("rejects an invalid review before authentication", async () => {
  const form = new FormData();
  form.set("locale", "en");
  form.set("creatorSlug", "ana-local");
  form.set("body", "short");

  await expect(submitCreatorReview(form)).rejects.toThrow(
    "redirect:/en/community/creators/ana-local?review=invalid",
  );
  expect(mocks.requireUser).not.toHaveBeenCalled();
});
