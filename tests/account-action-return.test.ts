// @vitest-environment node

import { beforeEach, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  eq: vi.fn(),
  storageFrom: vi.fn(),
  updateUser: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireUser: fixture.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: fixture.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (destination: string) => {
    throw new Error(`redirect:${destination}`);
  },
}));

import {
  requestAccountDeletion,
  requestAccountEmailChange,
  requestAccountPasswordReset,
  updateAccountProfile,
} from "../src/app/[locale]/account/actions";
import { config } from "@/lib/config";

const caller = "20000000-0000-4000-8000-000000000002";
const callerEmail = "existing-synthetic@example.test";

beforeEach(() => {
  vi.resetAllMocks();
  fixture.rpc.mockResolvedValue({ error: null });
  fixture.eq.mockResolvedValue({ error: null });
  fixture.update.mockReturnValue({ eq: fixture.eq });
  fixture.insert.mockResolvedValue({ error: null });
  fixture.from.mockReturnValue({
    update: fixture.update,
    insert: fixture.insert,
  });
  fixture.updateUser.mockResolvedValue({ error: null });
  fixture.resetPasswordForEmail.mockResolvedValue({ error: null });
  fixture.requireUser.mockResolvedValue({
    user: { id: caller, email: callerEmail },
    supabase: {
      rpc: fixture.rpc,
      from: fixture.from,
      storage: { from: fixture.storageFrom },
      auth: {
        updateUser: fixture.updateUser,
        resetPasswordForEmail: fixture.resetPasswordForEmail,
      },
    },
  });
});

function validProfileForm(locale: "en" | "es") {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    locale,
    displayName: "Synthetic member",
    preferredLocale: locale,
    username: "synthetic_member",
    bio: "Synthetic profile for an authentication return test.",
    publicEmail: "",
    phone: "",
    websiteUrl: "example.test",
    instagramHandle: "",
    locality: "",
    province: "",
    birthYear: "",
    gender: "",
    profileVisibility: "private",
    contactVisibility: "private",
    attendanceVisibility: "private",
  }))
    form.set(key, value);
  return form;
}

for (const locale of ["en", "es"] as const) {
  const profile = validProfileForm(locale);
  const email = new FormData();
  email.set("locale", locale);
  email.set("email", "new-synthetic@example.test");
  const password = new FormData();
  password.set("locale", locale);
  const deletion = new FormData();
  deletion.set("locale", locale);
  deletion.set("confirmation", locale === "es" ? "BORRAR" : "DELETE");

  for (const [task, action, form, target] of [
    ["profile save", updateAccountProfile, profile, "profile"],
    ["email change", requestAccountEmailChange, email, "settings"],
    ["password recovery", requestAccountPasswordReset, password, "settings"],
    ["deletion request", requestAccountDeletion, deletion, "privacy"],
  ] as const) {
    it(`returns an unauthenticated ${locale} ${task} to its exact task before any side effect`, async () => {
      fixture.requireUser.mockRejectedValue(new Error("AUTH_REQUIRED"));
      await expect(action(form)).rejects.toThrow("AUTH_REQUIRED");
      expect(fixture.requireUser).toHaveBeenCalledExactlyOnceWith(
        locale,
        `/${locale}/account/${target}`,
      );
      expect(fixture.rpc).not.toHaveBeenCalled();
      expect(fixture.from).not.toHaveBeenCalled();
      expect(fixture.storageFrom).not.toHaveBeenCalled();
      expect(fixture.updateUser).not.toHaveBeenCalled();
      expect(fixture.resetPasswordForEmail).not.toHaveBeenCalled();
      expect(fixture.revalidatePath).not.toHaveBeenCalled();
    });
  }

  it(`keeps an authenticated ${locale} profile save bound to its caller`, async () => {
    await expect(
      updateAccountProfile(validProfileForm(locale)),
    ).rejects.toThrow(`redirect:/${locale}/account/profile?updated=1`);
    expect(fixture.rpc).toHaveBeenCalledExactlyOnceWith("update_own_profile", {
      p_display_name: "Synthetic member",
      p_preferred_locale: locale,
    });
    expect(fixture.from).toHaveBeenCalledExactlyOnceWith("profiles");
    expect(fixture.eq).toHaveBeenCalledExactlyOnceWith("id", caller);
    expect(fixture.update).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_visibility: "private",
        contact_visibility: "private",
        attendance_visibility: "private",
      }),
    );
  });

  it(`keeps ${locale} email confirmation at the existing callback and settings destination`, async () => {
    await expect(requestAccountEmailChange(email)).rejects.toThrow(
      `redirect:/${locale}/account/settings?email=pending`,
    );
    const [change, options] = fixture.updateUser.mock.calls[0];
    expect(change).toEqual({ email: "new-synthetic@example.test" });
    const callback = new URL(options.emailRedirectTo);
    expect(callback.origin).toBe(new URL(config.siteUrl).origin);
    expect(callback.pathname).toBe(`/${locale}/auth/callback`);
    expect(callback.searchParams.get("next")).toBe(
      `/${locale}/account/settings?email=confirmed`,
    );
    expect(fixture.from).not.toHaveBeenCalled();
  });

  it(`keeps ${locale} password recovery bound to the authenticated email`, async () => {
    password.set("email", "untrusted-synthetic@example.test");
    await expect(requestAccountPasswordReset(password)).rejects.toThrow(
      `redirect:/${locale}/account/settings?password=sent`,
    );
    const [address, options] = fixture.resetPasswordForEmail.mock.calls[0];
    expect(address).toBe(callerEmail);
    const callback = new URL(options.redirectTo);
    expect(callback.origin).toBe(new URL(config.siteUrl).origin);
    expect(callback.pathname).toBe(`/${locale}/auth/callback`);
    expect(callback.searchParams.get("next")).toBe(`/${locale}/auth/recover`);
    expect(fixture.from).not.toHaveBeenCalled();
  });

  it(`records only the authenticated ${locale} caller's deletion request`, async () => {
    deletion.set("profile_id", "10000000-0000-4000-8000-000000000001");
    await expect(requestAccountDeletion(deletion)).rejects.toThrow(
      `redirect:/${locale}/account/privacy?updated=delete-request`,
    );
    expect(fixture.from).toHaveBeenCalledExactlyOnceWith(
      "account_deletion_requests",
    );
    expect(fixture.insert).toHaveBeenCalledExactlyOnceWith({
      profile_id: caller,
    });
    expect(fixture.rpc).not.toHaveBeenCalled();
    expect(fixture.updateUser).not.toHaveBeenCalled();
    expect(fixture.resetPasswordForEmail).not.toHaveBeenCalled();
  });
}
