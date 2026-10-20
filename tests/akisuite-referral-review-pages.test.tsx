import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mock = vi.hoisted(() => ({
  role: "administrator",
  user: true,
  rpc: vi.fn(),
  from: vi.fn(),
  require: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock("../src/lib/auth", () => ({ requireUser: mock.require }));
vi.mock("../src/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mock.getUser },
    from: mock.from,
  }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw Error("NOT_FOUND");
  },
  redirect: () => {
    throw Error("REDIRECT");
  },
}));
vi.mock("../src/app/[locale]/admin/referrals/actions", () => ({
  assignReferralCode: vi.fn(),
  reviewReferralCase: vi.fn(),
  reviewReferralPayout: vi.fn(),
  revokeReferralCode: vi.fn(),
  saveReferralProgramme: vi.fn(),
  setReferralProgrammeState: vi.fn(),
  setRepresentative: vi.fn(),
}));
import Studio from "../src/app/[locale]/admin/referrals/page";
import { GET as exportAudit } from "../src/app/[locale]/admin/referrals/export/route";
beforeEach(() => {
  vi.clearAllMocks();
  mock.role = "administrator";
  mock.user = true;
  vi.stubEnv("AKISUITE_REFERRALS_READY", "true");
  vi.stubEnv("AKISUITE_REFERRAL_APPROVAL_SCHEMA_READY", "true");
  mock.getUser.mockImplementation(async () => ({
    data: { user: mock.user ? { id: "admin" } : null },
  }));
  mock.from.mockImplementation(() => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      range: () => chain,
      retry: async () => ({
        data: [{ id: "audit-entry" }],
        count: 1,
        error: null,
      }),
      limit: async () => ({ data: [], error: null }),
      maybeSingle: async () => ({ data: { app_role: mock.role }, error: null }),
    };
    return chain;
  });
  mock.require.mockResolvedValue({
    user: { id: "admin" },
    supabase: { from: mock.from, rpc: mock.rpc },
  });
  mock.rpc.mockResolvedValue({
    data: [
      {
        event_id: "evt_test",
        code: "AKIREVIEW01",
        currency: "eur",
        proposed_cents: 123,
        blockers: ["billing_hold"],
        eligible: false,
        latest_state: "approved",
        effective_approval: false,
        reviews_enabled: false,
      },
    ],
    error: null,
  });
});
afterEach(() => vi.unstubAllEnvs());
it.each(["en", "es"])(
  "renders %s live holds and disabled payout workflow without pretending an approval is payable",
  async (locale) => {
    const html = renderToStaticMarkup(
      await Studio({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(html).toContain(
      locale === "es"
        ? "no crea un saldo pagadero"
        : "creates no payable balance",
    );
    expect(html).toContain(
      locale === "es" ? "Retención por reembolso" : "Verified refund",
    );
    expect(html).not.toContain("billing_hold");
    expect(html).toContain('disabled=""');
    expect(mock.rpc).toHaveBeenCalledWith("suite_referral_payout_review_queue");
  },
);
it("retains existing studio when approval schema is not deployed and denies non-admin", async () => {
  vi.stubEnv("AKISUITE_REFERRAL_APPROVAL_SCHEMA_READY", "false");
  await Studio({
    params: Promise.resolve({ locale: "en" }),
    searchParams: Promise.resolve({}),
  });
  expect(mock.rpc).not.toHaveBeenCalled();
  mock.role = "consumer";
  await expect(
    Studio({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    }),
  ).rejects.toThrow("NOT_FOUND");
});
it("exports bounded immutable review history only to an administrator with no-store", async () => {
  const result = await exportAudit();
  expect(result.status).toBe(200);
  expect(result.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await result.json()).toMatchObject({
    payouts_enabled: false,
    exported: { suite_referral_payout_reviews: [{ id: "audit-entry" }] },
  });
  expect(mock.from).toHaveBeenCalledWith("suite_referral_payout_reviews");
  mock.role = "consumer";
  mock.from.mockClear();
  expect((await exportAudit()).status).toBe(403);
  expect(mock.from).not.toHaveBeenCalledWith("suite_referral_payout_reviews");
  mock.user = false;
  expect((await exportAudit()).status).toBe(401);
});
