import { beforeEach, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { representativeEvidenceSchema } from "../src/lib/referrals";
const mocks = vi.hoisted(() => ({
  require: vi.fn(),
  rpc: vi.fn(),
  state: "approved",
}));
vi.mock("next/navigation", () => ({
  notFound() {
    throw Error("NOT_FOUND");
  },
}));
vi.mock("../src/lib/auth", () => ({ requireUser: mocks.require }));
vi.mock("../src/app/[locale]/account/referrals/actions", () => ({
  captureReferral: vi.fn(),
  reportReferralCase: vi.fn(),
  joinReferralProgramme: vi.fn(),
  saveReferralLead: vi.fn(),
  updateReferralLead: vi.fn(),
}));
import Page from "../src/app/[locale]/account/referrals/page";
const invoice = {
  reference: "b".repeat(32),
  code: "AKIREVIEW01",
  product: "business",
  recorded_at: "2026-10-01T12:00:00Z",
  currency: "eur",
  proposed_cents: 123,
  terms_version: "synthetic-test-only",
  blockers: ["billing_hold"],
  review_state: "approved",
  effective_approval: false,
  status: "held",
  reviews: [{ state: "approved", reviewed_at: "2026-10-01T12:00:00Z" }],
  reviews_truncated: false,
  payable: false,
  payouts_enabled: false,
};
const evidence = {
  days: 90,
  since: "2026-07-01T00:00:00Z",
  subscriptions: [
    {
      reference: "a".repeat(32),
      latest_evidence_at: "2026-10-01T12:00:00Z",
      invoice_count: 1,
      invoices_truncated: false,
      invoices: [invoice],
    },
  ],
  subscriptions_truncated: false,
  payable: false,
  payouts_enabled: false,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.state = "approved";
  vi.stubEnv("AKISUITE_REFERRALS_READY", "true");
  vi.stubEnv("AKISUITE_REFERRAL_REP_EVIDENCE_READY", "true");
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: async () => ({ data: [], error: null }),
    maybeSingle: async () => ({ data: { state: mocks.state }, error: null }),
  };
  mocks.rpc.mockImplementation(async (name: string) => ({
    data:
      name === "suite_referral_representative_evidence"
        ? evidence
        : {
            codes: [],
            referrals: 1,
            conversions: 1,
            invoice_count: 1,
            available_programmes: [],
            recent_activity: [],
            held: true,
            payouts_enabled: false,
          },
    error: null,
  }));
  mocks.require.mockResolvedValue({
    user: { id: "rep" },
    supabase: { from: () => chain, rpc: mocks.rpc },
  });
});
it.each(["en", "es"])(
  "renders integrated own evidence honestly and bilingually (%s)",
  async (locale) => {
    const html = renderToStaticMarkup(
      await Page({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({ period: "90" }),
      }),
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      "suite_referral_representative_evidence",
      { p_days: 90 },
    );
    for (const text of locale === "es"
      ? [
          "Tus suscripciones atribuidas",
          "La aprobación histórica está retenida",
          "No pagadero",
          "pagos en efectivo están desactivados",
          "Retención por reembolso",
        ]
      : [
          "Your attributed subscriptions",
          "Historical approval is held",
          "Not payable",
          "Cash payouts are disabled",
          "Verified refund",
        ])
      expect(html).toContain(text);
    expect(html).toContain("123 EUR");
    expect(html).toContain("aaaaaaaaaaaa");
    expect(html).toContain("<details>");
    for (const forbidden of [
      "cus_",
      "sub_",
      "in_private",
      "profile_id",
      "approval_reference",
      "Pay now",
      "Pagar ahora",
    ])
      expect(html).not.toContain(forbidden);
  },
);
it("uses a safe bounded period and never queries the new RPC without schema readiness", async () => {
  await Page({
    params: Promise.resolve({ locale: "en" }),
    searchParams: Promise.resolve({ period: "365" }),
  });
  expect(mocks.rpc).toHaveBeenCalledWith(
    "suite_referral_representative_evidence",
    { p_days: 365 },
  );
  mocks.rpc.mockClear();
  vi.stubEnv("AKISUITE_REFERRAL_REP_EVIDENCE_READY", "false");
  const html = renderToStaticMarkup(
    await Page({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ period: "https://evil.test" }),
    }),
  );
  expect(mocks.rpc).not.toHaveBeenCalledWith(
    "suite_referral_representative_evidence",
    expect.anything(),
  );
  expect(html).toContain("No estimated data is shown");
});
it.each(["pending", "suspended"])(
  "hides representative detail and avoids the RPC for %s",
  async (state) => {
    mocks.state = state;
    const html = renderToStaticMarkup(
      await Page({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(html).not.toContain("Your attributed subscriptions");
    expect(mocks.rpc).not.toHaveBeenCalledWith(
      "suite_referral_representative_evidence",
      expect.anything(),
    );
  },
);
it("rejects positive payout claims or unbounded projections and presents unavailable, not invented zeros", async () => {
  expect(
    representativeEvidenceSchema.safeParse({ ...evidence, payable: true })
      .success,
  ).toBe(false);
  expect(
    representativeEvidenceSchema.safeParse({
      ...evidence,
      subscriptions: Array(51).fill(evidence.subscriptions[0]),
    }).success,
  ).toBe(false);
  mocks.rpc.mockImplementation(async (name: string) => ({
    data:
      name === "suite_referral_representative_evidence"
        ? { ...evidence, payable: true }
        : {
            codes: [],
            referrals: 0,
            conversions: 0,
            invoice_count: 0,
            available_programmes: [],
            recent_activity: [],
            held: true,
            payouts_enabled: false,
          },
    error: null,
  }));
  const html = renderToStaticMarkup(
    await Page({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    }),
  );
  expect(html).toContain("This view is not available yet");
  expect(html).not.toContain("123 EUR");
});
