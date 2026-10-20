import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  request: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/lib/stripe", () => ({
  stripeRetrieve: mocks.retrieve,
  stripeRequest: mocks.request,
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({ rpc: mocks.rpc }),
}));
import { scheduleOperationsDowngrade } from "../src/lib/operations-schedule";
import { OPERATION_PRICES } from "../src/lib/operations-billing/operations-contract.mjs";
const end = Math.floor(Date.now() / 1000) + 28 * 86400;
const phase = {
  start_date: end - 30 * 86400,
  end_date: end,
  items: [{ price: OPERATION_PRICES.pro.id, quantity: 1 }],
  automatic_tax: { enabled: false },
  metadata: { preserve: "yes" },
  discounts: [{ coupon: "coupon_existing" }],
};
const source = {
  id: "sub_test",
  customer: "cus_test",
  billing_cycle_anchor: phase.start_date,
  items: {
    data: [
      {
        id: "si_test",
        quantity: 1,
        current_period_start: phase.start_date,
        current_period_end: end,
        price: { id: OPERATION_PRICES.pro.id },
      },
    ],
  },
};
const target = {
  priceId: OPERATION_PRICES.basico.id,
  tier: "basico",
  workspace: "private-test",
  profile: "profile",
};
const change = {
  token: "token",
  subscription_id: "sub_test",
  schedule_id: null,
  created_at: new Date().toISOString(),
};
function confirmed() {
  return {
    id: "sub_sched_test",
    subscription: "sub_test",
    status: "active",
    phases: [
      phase,
      {
        start_date: end,
        items: [{ price: target.priceId, quantity: 1 }],
        metadata: { workspace_id: "private-test" },
      },
    ],
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.request.mockResolvedValue({
    id: "sub_sched_test",
    subscription: "sub_test",
  });
  mocks.retrieve
    .mockResolvedValueOnce({
      id: "sub_sched_test",
      subscription: "sub_test",
      status: "active",
      phases: [phase],
    })
    .mockResolvedValue(confirmed());
});
describe("explicit future downgrade schedule", () => {
  it("preserves existing customer/subscription/current price until paid expiry with no proration", async () => {
    await scheduleOperationsDowngrade(change, source, target);
    expect(mocks.request.mock.calls.map((call) => call[0])).toEqual([
      "/subscription_schedules",
      "/subscription_schedules/sub_sched_test",
    ]);
    expect(mocks.request.mock.calls[0][1].get("from_subscription")).toBe(
      "sub_test",
    );
    const params = mocks.request.mock.calls[1][1] as URLSearchParams;
    expect(params.get("proration_behavior")).toBe("none");
    expect(params.get("phases[0][items][0][price]")).toBe(
      OPERATION_PRICES.pro.id,
    );
    expect(params.get("phases[0][end_date]")).toBe(String(end));
    expect(params.get("phases[1][start_date]")).toBe(String(end));
    expect(params.get("phases[1][items][0][price]")).toBe(target.priceId);
    expect(params.get("phases[0][discounts][0][coupon]")).toBe(
      "coupon_existing",
    );
    expect(params.get("phases[1][metadata][operations_change_token]")).toBe(
      "token",
    );
    expect(
      params.has("phases[1][metadata][operations_migration_manifest]"),
    ).toBe(false);
    expect(mocks.rpc.mock.calls.at(-1)?.[1]).toMatchObject({
      p_complete: true,
      p_effective: new Date(end * 1000).toISOString(),
    });
  });
  it("reuses a matching existing two-phase schedule without another write", async () => {
    mocks.retrieve.mockReset().mockResolvedValue(confirmed());
    await scheduleOperationsDowngrade(
      { ...change, schedule_id: "sub_sched_test" },
      source,
      target,
    );
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("rejects an unrelated future phase and never overwrites it", async () => {
    const s = confirmed();
    s.phases[1].items[0].price = "price_other";
    mocks.retrieve.mockReset().mockResolvedValue(s);
    await expect(
      scheduleOperationsDowngrade(
        { ...change, schedule_id: "sub_sched_test" },
        source,
        target,
      ),
    ).rejects.toThrow("Another scheduled change");
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("holds ambiguous creation after the idempotency window instead of creating duplicate schedules", async () => {
    await expect(
      scheduleOperationsDowngrade(
        {
          ...change,
          created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
        },
        source,
        target,
      ),
    ).rejects.toThrow("reconciliation");
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
