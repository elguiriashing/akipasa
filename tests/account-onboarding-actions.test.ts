import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  rpc: vi.fn(),
  status: "pending",
  getUser: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  signUp: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    rpc: state.rpc,
    auth: {
      getUser: state.getUser,
      exchangeCodeForSession: state.exchangeCodeForSession,
      signUp: state.signUp,
    },
  }),
}));
vi.mock("@/lib/account-onboarding-server", () => ({
  readOnboardingStatus: async () => state.status,
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [],
    get: () => undefined,
    delete: vi.fn(),
  }),
  headers: async () => new Headers(),
}));
import { GET as oauthCallback } from "../src/app/[locale]/auth/callback/route";
import { signUpWithPassword } from "../src/app/[locale]/auth/actions";
import { requireUser } from "../src/lib/auth";
import { completeAccount } from "../src/app/[locale]/onboarding/actions";
afterEach(() => vi.resetAllMocks());
function identity() {
  state.getUser.mockResolvedValue({ data: { user: { id: "user" } } });
}
describe("server account completion enforcement", () => {
  it("blocks a direct protected URL before querying feature data", async () => {
    identity();
    state.status = "pending";
    await expect(requireUser("en", "/en/passports")).rejects.toThrow(
      "redirect:/en/onboarding?next=%2Fen%2Fpassports",
    );
  });
  it("does not release a known minor's account on another request", async () => {
    identity();
    state.status = "underage";
    await expect(requireUser("es")).rejects.toThrow("redirect:/es/onboarding");
  });
  it("records a negative declaration before unrelated fields and cannot set metadata", async () => {
    identity();
    state.rpc.mockResolvedValue({ error: null });
    const form = new FormData();
    form.set("locale", "en");
    form.set("adult", "no");
    await expect(completeAccount(form)).rejects.toThrow(
      "redirect:/en/onboarding",
    );
    expect(state.rpc).toHaveBeenCalledExactlyOnceWith(
      "complete_account_onboarding",
      { p_adult: false },
    );
  });
  it("rejects an affirmative declaration without username and terms", async () => {
    identity();
    const form = new FormData();
    form.set("adult", "yes");
    await expect(completeAccount(form)).rejects.toThrow("error=required");
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("resumes a safe intended task only after an authoritative complete result", async () => {
    identity();
    state.rpc.mockResolvedValue({ data: "complete", error: null });
    const form = new FormData();
    for (const [k, v] of Object.entries({
      locale: "en",
      adult: "yes",
      username: "alex_user",
      acceptTerms: "accepted",
      next: "/en/account/subscription?from=akipasa",
    }))
      form.set(k, v);
    await expect(completeAccount(form)).rejects.toThrow(
      "redirect:/en/account/subscription?from=akipasa",
    );
  });
});

it("routes an OAuth signup callback through the same mandatory completion state", async () => {
  state.status = "pending";
  state.exchangeCodeForSession.mockResolvedValue({ error: null });
  const result = await oauthCallback(
    new Request(
      "https://akipasa.com/en/auth/callback?code=test&next=%2Fen%2Fpassports",
    ),
    { params: Promise.resolve({ locale: "en" }) },
  );
  expect(result.headers.get("location")).toBe(
    "https://akipasa.com/en/onboarding?next=%2Fen%2Fpassports",
  );
});
it("routes an email signup with an immediate session through mandatory completion", async () => {
  state.status = "pending";
  state.signUp.mockResolvedValue({
    data: { session: { user: { id: "user" } } },
    error: null,
  });
  const form = new FormData();
  for (const [k, v] of Object.entries({
    locale: "en",
    email: "test@example.com",
    password: "SecureAccount42",
    confirmPassword: "SecureAccount42",
    acceptTerms: "accepted",
    next: "/en/passports",
  }))
    form.set(k, v);
  await expect(signUpWithPassword(form)).rejects.toThrow(
    "redirect:/en/onboarding?next=%2Fen%2Fpassports",
  );
});
