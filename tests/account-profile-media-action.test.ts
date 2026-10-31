// @vitest-environment node

import { beforeEach, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  requireUser: vi.fn(),
  storageFrom: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireUser: fixture.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: fixture.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (destination: string) => {
    throw new Error(`redirect:${destination}`);
  },
}));

import { uploadProfileMedia } from "../src/app/[locale]/account/actions";

const caller = "20000000-0000-4000-8000-000000000002";
beforeEach(() => {
  vi.resetAllMocks();
  fixture.upload.mockResolvedValue({ error: null });
  fixture.getPublicUrl.mockImplementation((path: string) => ({
    data: { publicUrl: `https://media.example.test/${path}` },
  }));
  fixture.storageFrom.mockReturnValue({
    upload: fixture.upload,
    getPublicUrl: fixture.getPublicUrl,
  });
  fixture.eq.mockResolvedValue({ error: null });
  fixture.update.mockReturnValue({ eq: fixture.eq });
  fixture.from.mockReturnValue({ update: fixture.update });
  fixture.requireUser.mockResolvedValue({
    user: { id: caller },
    supabase: {
      from: fixture.from,
      storage: { from: fixture.storageFrom },
    },
  });
});

function mediaForm(locale: "en" | "es", returnTo: string, file?: File) {
  const form = new FormData();
  form.set("locale", locale);
  form.set("returnTo", returnTo);
  form.set("kind", returnTo === "creator" ? "banner" : "avatar");
  form.set("profile_id", "10000000-0000-4000-8000-000000000001");
  form.set(
    "file",
    file ||
      new File(["synthetic image bytes"], "avatar.png", { type: "image/png" }),
  );
  return form;
}

for (const locale of ["en", "es"] as const) {
  for (const returnTo of ["creator", "profile", "https://untrusted.example/"]) {
    const destination =
      returnTo === "creator"
        ? `/${locale}/community/creator`
        : `/${locale}/account/profile`;
    it(`preserves the ${locale} ${returnTo} upload task through authentication and caller-owned storage`, async () => {
      await expect(
        uploadProfileMedia(mediaForm(locale, returnTo)),
      ).rejects.toThrow(`redirect:${destination}?updated=media`);
      expect(fixture.requireUser).toHaveBeenCalledExactlyOnceWith(
        locale,
        destination,
      );
      const [path, bytes, options] = fixture.upload.mock.calls[0];
      const kind = returnTo === "creator" ? "banner" : "avatar";
      expect(path).toMatch(
        new RegExp(`^${caller}/${kind}-[a-f0-9-]{36}\\.png$`),
      );
      expect(new TextDecoder().decode(bytes)).toBe("synthetic image bytes");
      expect(options).toEqual({ contentType: "image/png", upsert: false });
      expect(fixture.storageFrom.mock.calls).toEqual([
        ["profile-media"],
        ["profile-media"],
      ]);
      expect(fixture.getPublicUrl).toHaveBeenCalledExactlyOnceWith(path);
      expect(fixture.from).toHaveBeenCalledExactlyOnceWith("profiles");
      expect(fixture.update).toHaveBeenCalledExactlyOnceWith({
        [kind === "banner" ? "banner_url" : "avatar_url"]:
          `https://media.example.test/${path}`,
      });
      expect(fixture.eq).toHaveBeenCalledExactlyOnceWith("id", caller);
      expect(fixture.revalidatePath.mock.calls).toEqual([
        [`/${locale}/account`, "layout"],
        [`/${locale}/community`, "layout"],
      ]);
    });
  }

  for (const returnTo of ["creator", "profile"]) {
    it(`does not upload or update a ${locale} ${returnTo} profile when the session requires authentication`, async () => {
      fixture.requireUser.mockRejectedValue(new Error("AUTH_REQUIRED"));
      await expect(
        uploadProfileMedia(mediaForm(locale, returnTo)),
      ).rejects.toThrow("AUTH_REQUIRED");
      expect(fixture.requireUser).toHaveBeenCalledExactlyOnceWith(
        locale,
        returnTo === "creator"
          ? `/${locale}/community/creator`
          : `/${locale}/account/profile`,
      );
      expect(fixture.storageFrom).not.toHaveBeenCalled();
      expect(fixture.from).not.toHaveBeenCalled();
      expect(fixture.revalidatePath).not.toHaveBeenCalled();
    });
  }

  it.each([
    ["empty", new File([], "empty.png", { type: "image/png" })],
    ["unsupported", new File(["gif"], "image.gif", { type: "image/gif" })],
    [
      "oversized",
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.png", {
        type: "image/png",
      }),
    ],
  ])(
    `rejects a %s ${locale} creator upload before any authentication or storage request`,
    async (_kind, file) => {
      await expect(
        uploadProfileMedia(mediaForm(locale, "creator", file)),
      ).rejects.toThrow(`redirect:/${locale}/community/creator?error=media`);
      expect(fixture.requireUser).not.toHaveBeenCalled();
      expect(fixture.storageFrom).not.toHaveBeenCalled();
      expect(fixture.from).not.toHaveBeenCalled();
    },
  );
}
