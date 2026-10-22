import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  host: "akipasa.com",
  userAgent: "Mozilla/5.0",
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOtp: vi.fn(),
  signInWithOAuth: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  setCookie: vi.fn(),
}));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ host: mocks.host, "user-agent": mocks.userAgent }),
  cookies: async () => ({ set: mocks.setCookie }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw Object.assign(new Error("redirect"), { path });
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: mocks }),
}));
import {
  requestMagicLink,
  requestPasswordReset,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from "../src/app/[locale]/auth/actions";
import { GET as authCallback } from "../src/app/[locale]/auth/callback/route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.host = "akipasa.com";
  mocks.userAgent = "Mozilla/5.0";
  mocks.signInWithPassword.mockResolvedValue({ error: { message: "inert" } });
  mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
  mocks.signInWithOtp.mockResolvedValue({ error: null });
  mocks.signInWithOAuth.mockResolvedValue({ data: { url: null }, error: null });
  mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
});

function form(locale: string, next: string, overrides = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    locale,
    next,
    email: "qa@example.test",
    password: "SecureAccount42",
    confirmPassword: "SecureAccount42",
    acceptTerms: "accepted",
    ...overrides,
  }))
    data.set(key, value);
  return data;
}

async function destination(
  action: (data: FormData) => Promise<unknown>,
  data: FormData,
) {
  try {
    await action(data);
    throw new Error("Expected redirect");
  } catch (error) {
    const path = (error as { path?: string }).path;
    if (!path) throw error;
    return new URL(path, "https://akipasa.com");
  }
}

describe("authentication journey recovery", () => {
  it.each(["en", "es"] as const)(
    "keeps %s membership context after a failed password sign-in",
    async (locale) => {
      const next = `/${locale}/account/subscription?from=akihq`;
      const url = await destination(signInWithPassword, form(locale, next));
      expect(url.pathname).toBe(`/${locale}/auth`);
      expect(url.searchParams.get("mode")).toBe("signin");
      expect(url.searchParams.get("error")).toBe("signin");
      expect(url.searchParams.get("next")).toBe(next);
      expect(url.href).not.toContain("qa%40");
      expect(url.href).not.toContain("SecureAccount42");
    },
  );

  it.each(["en", "es"] as const)(
    "returns %s signup validation to signup and its business application",
    async (locale) => {
      const next = `/${locale}/business/apply`;
      const url = await destination(
        signUpWithPassword,
        form(locale, next, { confirmPassword: "DoesNotMatch42" }),
      );
      expect(url.searchParams.get("mode")).toBe("signup");
      expect(url.searchParams.get("next")).toBe(next);
      expect(url.searchParams.get("error")).toBe("password-policy");
      expect(mocks.signUp).not.toHaveBeenCalled();
    },
  );

  it.each(["en", "es"] as const)(
    "keeps %s signup and magic notices on the original task",
    async (locale) => {
      const next = `/${locale}/community`;
      const signup = await destination(signUpWithPassword, form(locale, next));
      expect(signup.searchParams.get("mode")).toBe("signup");
      expect(signup.searchParams.get("registered")).toBe("1");
      expect(signup.searchParams.get("next")).toBe(next);
      const magic = await destination(requestMagicLink, form(locale, next));
      expect(magic.searchParams.get("mode")).toBe("magic");
      expect(magic.searchParams.get("sent")).toBe("1");
      expect(magic.searchParams.get("next")).toBe(next);
      expect(mocks.signInWithOtp).toHaveBeenCalledWith({
        email: "qa@example.test",
        options: {
          emailRedirectTo: `https://akipasa.com/${locale}/auth/callback?next=${encodeURIComponent(next)}`,
          shouldCreateUser: false,
        },
      });
    },
  );

  it("keeps AkiDuermo retries on its allowlisted stay route", async () => {
    mocks.host = "akiduermo.akipasa.com";
    const next = "/stays/qa-property?lang=es&guests=2";
    const url = await destination(signInWithPassword, form("es", next));
    expect(url.searchParams.get("next")).toBe(next);
    const rejected = await destination(
      signInWithPassword,
      form("es", "/es/admin"),
    );
    expect(rejected.searchParams.get("next")).toBe("/account");
  });

  it.each([
    "https://attacker.example/account",
    "//attacker.example/account",
    "/en/account",
  ])("does not reflect disallowed destination %s", async (next) => {
    const url = await destination(signInWithPassword, form("es", next));
    expect(url.searchParams.get("next")).toBe("/es/account");
  });

  it("retains the private Pals destination and provider signup error mode", async () => {
    mocks.signUp.mockResolvedValue({ data: {}, error: { message: "inert" } });
    const url = await destination(signUpWithPassword, form("en", "/pals"));
    expect(url.searchParams.get("next")).toBe("/pals");
    expect(url.searchParams.get("mode")).toBe("signup");
    expect(url.searchParams.get("error")).toBe("signup");
  });

  it("keeps magic provider/validation failures on the magic form", async () => {
    mocks.signInWithOtp.mockResolvedValue({ error: { message: "inert" } });
    const next = "/en/account/subscription?from=akibusiness";
    for (const email of ["qa@example.test", "invalid-email"]) {
      const url = await destination(
        requestMagicLink,
        form("en", next, { email }),
      );
      expect(url.searchParams.get("mode")).toBe("magic");
      expect(url.searchParams.get("next")).toBe(next);
      expect(url.searchParams.get("error")).toBe(
        email === "invalid-email" ? "invalid" : "send",
      );
    }
  });

  it("keeps Google failures on the original membership task and preserves its terms gate", async () => {
    const next = "/en/account/subscription?from=akihq";
    const terms = await destination(
      signInWithGoogle,
      form("en", next, { acceptTerms: "" }),
    );
    expect(terms.searchParams.get("next")).toBe(next);
    expect(terms.searchParams.get("error")).toBe("terms");
    expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
    const provider = await destination(signInWithGoogle, form("en", next));
    expect(provider.searchParams.get("next")).toBe(next);
    expect(provider.searchParams.get("error")).toBe("google");
    expect(mocks.signInWithOAuth.mock.calls[0][0].options.redirectTo).toContain(
      encodeURIComponent(next),
    );
  });

  it("marks only the Android WebView OAuth callback for browser-to-app handoff", async () => {
    mocks.userAgent = "Mozilla/5.0 AkiPasaAndroid/1.0.1";
    await destination(signInWithGoogle, form("es", "/es/account"));
    const android = new URL(
      mocks.signInWithOAuth.mock.calls[0][0].options.redirectTo,
    );
    expect(android.pathname).toBe("/es/auth/callback");
    expect(android.searchParams.get("android")).toBe("1");
    expect(android.searchParams.get("next")).toBe("/es/account");
    mocks.userAgent = "Mozilla/5.0";
    await destination(signInWithGoogle, form("es", "/es/account"));
    const web = new URL(
      mocks.signInWithOAuth.mock.calls[1][0].options.redirectTo,
    );
    expect(web.searchParams.has("android")).toBe(false);
  });

  it("hands the unexchanged Android code back to the app without leaking it as a referrer", async () => {
    const response = await authCallback(
      new Request(
        "https://akipasa.com/es/auth/callback?android=1&code=single-use-code&next=%2Fes%2Faccount",
      ),
      { params: Promise.resolve({ locale: "es" }) },
    );
    const html = await response.text();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(html).toContain(
      "akipasa://auth/callback?locale=es&amp;code=single-use-code",
    );
    expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("retains successful password redirects without introducing an auth notice", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    const next = "/en/account/subscription?from=akiduermo";
    const url = await destination(signInWithPassword, form("en", next));
    expect(url.pathname + url.search).toBe(next);
    mocks.signUp.mockResolvedValue({ data: { session: {} }, error: null });
    const signup = await destination(signUpWithPassword, form("en", next));
    expect(signup.pathname + signup.search).toBe(next);
  });

  it("retains recovery mode and the existing recovery callback", async () => {
    const url = await destination(
      requestPasswordReset,
      form("es", "/es/account"),
    );
    expect(url.searchParams.get("mode")).toBe("recover");
    expect(url.searchParams.get("recovery")).toBe("sent");
    expect(mocks.resetPasswordForEmail.mock.calls[0][1].redirectTo).toBe(
      "https://akipasa.com/es/auth/callback?next=%2Fes%2Fauth%2Frecover%3Fnext%3D%252Fes%252Faccount",
    );
  });
});
