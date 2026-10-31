import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  getUser: vi.fn(),
  eligibility: vi.fn(),
  profile: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: mocks.headers, cookies: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string): never => {
    throw Object.assign(new Error("redirect"), { path });
  },
}));
vi.mock("../src/lib/account-onboarding-server", () => ({
  readOnboardingStatus: mocks.eligibility,
}));
vi.mock("../src/lib/supabase/public", () => ({
  createSupabasePublicClient: vi.fn(),
}));
vi.mock("../src/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }),
    }),
  }),
}));
import { requireUser } from "../src/lib/auth";
import { config } from "../src/lib/config";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.headers.mockResolvedValue(new Headers());
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "disposable-consumer" } },
  });
  mocks.eligibility.mockResolvedValue("ready");
  mocks.profile.mockResolvedValue({
    data: { terms_version: config.currentTermsVersion },
  });
});
async function target(locale: "en" | "es", next: string) {
  try {
    await requireUser(locale, next);
    throw Error("expected guard redirect");
  } catch (error) {
    const path = (error as { path?: string }).path;
    if (!path) throw error;
    return new URL(path, "https://akipasa.com");
  }
}
for (const locale of ["en", "es"] as const)
  describe(`workspace auth task ${locale}`, () => {
    for (const area of ["staff", "admin"] as const) {
      it(`preserves ${area} leaf through sign-in, onboarding and terms`, async () => {
        const task = `/${locale}/${area}/audit?period=30&tag=a&tag=b`;
        mocks.headers.mockResolvedValue(
          new Headers({ "x-akipasa-workspace-next": task }),
        );
        for (const caller of [
          `/${locale}/${area}`,
          `/${locale}/${area}/audit`,
        ]) {
          mocks.getUser.mockResolvedValue({ data: { user: null } });
          expect((await target(locale, caller)).searchParams.get("next")).toBe(
            task,
          );
          mocks.getUser.mockResolvedValue({
            data: { user: { id: "disposable-consumer" } },
          });
          mocks.eligibility.mockResolvedValue("pending");
          expect((await target(locale, caller)).searchParams.get("next")).toBe(
            task,
          );
          mocks.eligibility.mockResolvedValue("ready");
          mocks.profile.mockResolvedValue({ data: { terms_version: "old" } });
          expect((await target(locale, caller)).searchParams.get("next")).toBe(
            task,
          );
          mocks.profile.mockResolvedValue({
            data: { terms_version: config.currentTermsVersion },
          });
        }
      });
      for (const header of [
        null,
        "https://evil.example/en/staff",
        "//evil.example/path",
        `/${locale === "en" ? "es" : "en"}/${area}/audit`,
        `/${locale}/${area === "staff" ? "admin" : "staff"}/audit`,
      ]) {
        it(`keeps original ${area} task for invalid or absent header ${header}`, async () => {
          mocks.headers.mockResolvedValue(
            new Headers(header ? { "x-akipasa-workspace-next": header } : {}),
          );
          mocks.getUser.mockResolvedValue({ data: { user: null } });
          const next = `/${locale}/${area}/audit`;
          expect((await target(locale, next)).searchParams.get("next")).toBe(
            next,
          );
        });
      }
    }
    it("does not read workspace header for ordinary consumer tasks", async () => {
      mocks.getUser.mockResolvedValue({ data: { user: null } });
      const next = `/${locale}/account`;
      expect((await target(locale, next)).searchParams.get("next")).toBe(next);
      expect(mocks.headers).not.toHaveBeenCalled();
    });
  });

vi.mock("@/lib/supabase/middleware", () => ({
  refreshSession: vi.fn(
    async (request: Request) =>
      new NextResponse(null, {
        headers: {
          "x-fixture-workspace-next":
            request.headers.get("x-akipasa-workspace-next") || "absent",
        },
      }),
  ),
}));
import { NextRequest, NextResponse } from "next/server";
import { middleware } from "../src/middleware";
for (const locale of ["en", "es"]) {
  it(`middleware overwrites a forged workspace header using actual ${locale} path`, async () => {
    const response = await middleware(
      new NextRequest(
        `https://akipasa.com/${locale}/staff/audit?period=30&tag=a&tag=b`,
        {
          headers: { "x-akipasa-workspace-next": "https://evil.example/spoof" },
        },
      ),
    );
    expect(response.headers.get("x-fixture-workspace-next")).toBe(
      `/${locale}/staff/audit?period=30&tag=a&tag=b`,
    );
  });
  it(`middleware removes workspace headers outside namespace ${locale}`, async () => {
    const response = await middleware(
      new NextRequest(`https://akipasa.com/${locale}/account`, {
        headers: { "x-akipasa-workspace-next": `/${locale}/admin/audit` },
      }),
    );
    expect(response.headers.get("x-fixture-workspace-next")).toBe("absent");
  });
}
