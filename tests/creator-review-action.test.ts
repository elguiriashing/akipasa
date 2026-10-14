import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  requireUser: vi.fn(),
  insert: vi.fn(),
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

import { submitCreatorReview } from "../src/app/[locale]/community/creator-actions";

beforeEach(() => {
  mocks.redirect.mockClear();
  mocks.insert.mockReset().mockResolvedValue({ error: null });
  mocks.requireUser.mockReset().mockResolvedValue({
    user: { id: "20000000-0000-4000-8000-000000000002" },
    supabase: {
      from: () => ({ insert: mocks.insert }),
    },
  });
});

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
      `/${locale}/community/creators/ana-local`,
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
