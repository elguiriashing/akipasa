import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  host: "akipasa.com",
  getUser: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: mocks.host }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw Object.assign(new Error("redirect"), { path });
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: mocks }),
}));

import { updateRecoveredPassword } from "../src/app/[locale]/auth/recover/actions";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.host = "akipasa.com";
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
});

function recoveryForm(next: string, password = "SecureAccount42") {
  const form = new FormData();
  form.set("locale", "en");
  form.set("next", next);
  form.set("password", password);
  form.set("confirmPassword", password);
  return form;
}

async function destination(form: FormData) {
  try {
    await updateRecoveredPassword(form);
    throw new Error("Expected redirect");
  } catch (error) {
    const path = (error as { path?: string }).path;
    if (!path) throw error;
    return new URL(path, "https://akipasa.com");
  }
}

it("returns a completed password reset to sign-in with the original task", async () => {
  const next = "/en/account/subscription?from=akipasa";
  const result = await destination(recoveryForm(next));

  expect(result.pathname).toBe("/en/auth");
  expect(result.searchParams.get("reset")).toBe("1");
  expect(result.searchParams.get("next")).toBe(next);
  expect(mocks.updateUser).toHaveBeenCalledWith({
    password: "SecureAccount42",
  });
  expect(mocks.signOut).toHaveBeenCalledOnce();
  expect(result.href).not.toContain("SecureAccount42");
});

it("preserves an AkiDuermo booking task after a provider save failure", async () => {
  mocks.host = "akiduermo.akipasa.com";
  mocks.updateUser.mockResolvedValue({ error: { message: "inert" } });
  const result = await destination(recoveryForm("/bookings?status=pending"));

  expect(result.pathname).toBe("/en/auth/recover");
  expect(result.searchParams.get("error")).toBe("save");
  expect(result.searchParams.get("next")).toBe("/bookings?status=pending");
});

it("rejects a tampered recovery destination and never serializes passwords", async () => {
  const result = await destination(
    recoveryForm("https://evil.example/steal", "weak"),
  );

  expect(result.pathname).toBe("/en/auth/recover");
  expect(result.searchParams.get("error")).toBe("password-policy");
  expect(result.searchParams.get("next")).toBe("/en/account");
  expect(result.href).not.toContain("weak");
  expect(mocks.updateUser).not.toHaveBeenCalled();
});
