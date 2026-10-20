import { beforeEach, describe, expect, it, vi } from "vitest";
import { referralCode, referralShareUrl } from "../src/lib/referrals";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  retrieve: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock("../src/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({
    rpc: mocks.rpc,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
    }),
  }),
}));
vi.mock("../src/lib/stripe", () => ({
  stripeRetrieve: mocks.retrieve,
  stripeBillingPlanForPrice: (id: string) =>
    id === "price_known"
      ? { plan: "business" }
      : id === "price_other"
        ? { plan: "premium" }
        : null,
  stripeObjectId: (v: unknown) =>
    typeof v === "string"
      ? v
      : v && typeof v === "object" && "id" in v
        ? v.id
        : null,
}));
vi.mock("../src/lib/akisuite-stripe", () => ({
  matchConfiguredAkiSuitePriceId: () => null,
}));
import {
  recordVerifiedReferralInvoice,
  recordVerifiedReferralHold,
} from "../src/lib/referral-billing";
const input = {
  eventId: "evt_test",
  created: 12345,
  profileId: "profile",
  customerId: "cus_test",
  subscriptionId: "sub_test",
  productCode: "business",
  invoice: {
    id: "in_test",
    customer: "cus_test",
    paid: true,
    status: "paid",
    amount_paid: 1000,
    currency: "eur",
    lines: {
      data: [
        {
          pricing: { price_details: { price: "price_known" } },
          currency: "eur",
        },
      ],
      has_more: false,
    },
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AKISUITE_REFERRALS_READY", "true");
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.maybeSingle.mockResolvedValue({
    data: { profile_id: "profile" },
    error: null,
  });
});
describe("verified referral billing adapter", () => {
  it("defaults off without touching billing or attribution", async () => {
    vi.stubEnv("AKISUITE_REFERRALS_READY", "false");
    await recordVerifiedReferralInvoice(input);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([
    { paid: false },
    { status: "open" },
    { amount_paid: 0 },
    { amount_paid: -1 },
    { amount_paid: 1.5 },
    { customer: "cus_wrong" },
  ])("rejects unpaid or mismatched invoice %s", async (change) => {
    await recordVerifiedReferralInvoice({
      ...input,
      invoice: { ...input.invoice, ...change },
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("accepts current Stripe invoice schema without the removed paid boolean", async () => {
    const invoice: Record<string, unknown> = { ...input.invoice };
    delete invoice.paid;
    await recordVerifiedReferralInvoice({ ...input, invoice });
    expect(mocks.rpc).toHaveBeenCalledOnce();
  });
  it("records only verified positive invoice evidence and propagates retryable database failure", async () => {
    await recordVerifiedReferralInvoice(input);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "suite_record_referral_billing",
      expect.objectContaining({
        p_kind: "paid",
        p_invoice: "in_test",
        p_profile: "profile",
        p_amount: 1000,
      }),
    );
    mocks.rpc.mockResolvedValue({ error: new Error("database unavailable") });
    await expect(recordVerifiedReferralInvoice(input)).rejects.toThrow(
      "database unavailable",
    );
  });
  it("uses invoice-priced product instead of later subscription plan and rejects mixed/truncated invoices", async () => {
    await recordVerifiedReferralInvoice({ ...input, productCode: "premium" });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "suite_record_referral_billing",
      expect.objectContaining({ p_product: "business" }),
    );
    vi.clearAllMocks();
    await recordVerifiedReferralInvoice({
      ...input,
      invoice: {
        ...input.invoice,
        lines: { ...input.invoice.lines, has_more: true },
      },
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
    await recordVerifiedReferralInvoice({
      ...input,
      invoice: {
        ...input.invoice,
        lines: {
          data: [
            ...input.invoice.lines.data,
            {
              pricing: { price_details: { price: "price_other" } },
              currency: "eur",
            },
          ],
          has_more: false,
        },
      },
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("holds refunds using retrieved charge customer, not user-controlled event metadata", async () => {
    mocks.retrieve.mockResolvedValue({
      customer: "cus_test",
      amount_refunded: 1000,
    });
    await recordVerifiedReferralHold({
      id: "evt_refund",
      type: "charge.refunded",
      created: 12345,
      data: { object: { id: "ch_test", metadata: { profile_id: "attacker" } } },
    });
    expect(mocks.retrieve).toHaveBeenCalledWith("/charges/ch_test");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "suite_record_referral_billing",
      expect.objectContaining({
        p_kind: "refund_hold",
        p_profile: "profile",
        p_customer: "cus_test",
      }),
    );
  });
  it("holds disputes and never interprets dispute closure as approval to pay", async () => {
    mocks.retrieve.mockResolvedValue({ customer: "cus_test" });
    const event = {
      id: "evt_dispute",
      type: "charge.dispute.created",
      created: 12345,
      data: { object: { charge: "ch_test" } },
    };
    await recordVerifiedReferralHold(event);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "suite_record_referral_billing",
      expect.objectContaining({ p_kind: "dispute_hold" }),
    );
    vi.clearAllMocks();
    await recordVerifiedReferralHold({
      ...event,
      type: "charge.dispute.closed",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects unsafe codes and generates only canonical locale-preserving share links", () => {
    expect(referralCode("AKIREFER01")).toBe("AKIREFER01");
    expect(referralCode("code&profile=attacker")).toBeNull();
    expect(referralCode("https://evil.example")).toBeNull();
    expect(referralShareUrl("AKIREFER01", "en")).toBe(
      "https://akipasa.com/en/referrals?ref=AKIREFER01",
    );
  });
});
