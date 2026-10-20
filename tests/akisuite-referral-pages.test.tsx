import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({
  require: vi.fn(),
  rpc: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  from: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: mocks.redirect,
}));
vi.mock("../src/lib/auth", () => ({ requireUser: mocks.require }));
vi.mock("../src/app/[locale]/account/referrals/actions", () => ({
  captureReferral: vi.fn(),
  joinReferralProgramme: vi.fn(),
  saveReferralLead: vi.fn(),
  updateReferralLead: vi.fn(),
}));
import ReferralLanding from "../src/app/[locale]/referrals/page";
import ReferralDashboard from "../src/app/[locale]/account/referrals/page";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AKISUITE_REFERRALS_READY", "true");
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: async () => ({ data: [], error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
  };
  mocks.from.mockReturnValue(chain);
  mocks.require.mockResolvedValue({
    user: { id: "user" },
    supabase: { rpc: mocks.rpc, from: mocks.from },
  });
  mocks.rpc.mockResolvedValue({
    data: {
      codes: [],
      referrals: 2,
      conversions: 1,
      invoice_count: 1,
      available_programmes: [],
      recent_activity: [],
      held: true,
      payouts_enabled: false,
    },
    error: null,
  });
});
describe("referral bilingual account handoff", () => {
  it.each(["en", "es"])(
    "retains referral through auth and only canonical local redirect (%s)",
    async (locale) => {
      const html = renderToStaticMarkup(
        await ReferralLanding({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({ ref: "AKIREFER01" }),
        }),
      );
      expect(html).toContain(
        locale === "es" ? "Confirmar recomendación" : "Confirm referral",
      );
      expect(html).toContain("AKIREFER01");
      expect(mocks.require).toHaveBeenCalledWith(
        locale,
        `/${locale}/referrals?ref=AKIREFER01`,
      );
    },
  );
  it("refuses malicious code or unavailable programme without auth tracking", async () => {
    await expect(
      ReferralLanding({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({ ref: "https://evil.example" }),
      }),
    ).rejects.toThrow("NOT_FOUND");
    vi.stubEnv("AKISUITE_REFERRALS_READY", "false");
    const html = renderToStaticMarkup(
      await ReferralLanding({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({ ref: "AKIREFER01" }),
      }),
    );
    expect(html).toContain("not available");
    expect(mocks.require).not.toHaveBeenCalled();
  });
  it.each(["en", "es"])(
    "renders real scoped metrics and inactive money warning (%s)",
    async (locale) => {
      const html = renderToStaticMarkup(
        await ReferralDashboard({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({}),
        }),
      );
      expect(html).toContain(
        locale === "es" ? "Recomendaciones y ventas" : "Referrals and sales",
      );
      expect(html).toContain("<strong>2</strong>");
      expect(html).toContain(
        locale === "es"
          ? "no garantizan una recompensa"
          : "do not guarantee a reward",
      );
      expect(html).not.toContain("Register lead");
    },
  );
  it("never replaces unavailable metrics with fabricated zeros", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("offline") });
    const html = renderToStaticMarkup(
      await ReferralDashboard({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(html).toContain("not available");
    expect(html).not.toContain("<strong>0</strong>");
  });
});
