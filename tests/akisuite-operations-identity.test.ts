import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), retrieve: vi.fn() }));
vi.mock("../src/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("../src/lib/stripe", () => ({ stripeRetrieve: mocks.retrieve }));
import { syncOperationsBilling } from "../src/lib/operations-billing";
import { OPERATION_PRICES } from "../src/lib/operations-billing/operations-contract.mjs";
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
it("signed webhook detached binding remains handled without paid grants or client metadata reassignment", async () => {
  vi.stubEnv("AKIBUSINESS_OPERATIONS_BILLING_READY", "true");
  mocks.retrieve.mockResolvedValue({
    id: "sub_deleted",
    customer: "cus_retained",
    metadata: { workspace_id: "workspace", profile_id: "forged-new-profile" },
    items: { data: [{ price: { id: OPERATION_PRICES.basico.id } }] },
  });
  mocks.rpc.mockResolvedValue({
    data: {
      subscriptionId: "sub_deleted",
      customerId: "cus_retained",
      workspaceId: "workspace",
      profileId: null,
    },
    error: null,
  });
  expect(
    await syncOperationsBilling("sub_deleted", "evt_deleted", 1),
  ).toMatchObject({ profileId: null, subscriptionId: "sub_deleted" });
  expect(mocks.rpc.mock.calls.map((c) => c[0])).toEqual([
    "crm_operations_binding",
  ]);
});

it("detached pre-renewal legacy binding cannot fall back to recreating deleted billing identity", async () => {
  vi.stubEnv("AKIBUSINESS_OPERATIONS_BILLING_READY", "true");
  mocks.retrieve.mockResolvedValue({
    id: "sub_deleted",
    customer: "cus_retained",
    metadata: { profile_id: "deleted-profile" },
    items: { data: [{ price: { id: "legacy-price" } }] },
  });
  mocks.rpc.mockResolvedValue({
    data: {
      subscriptionId: "sub_deleted",
      customerId: "cus_retained",
      workspaceId: "workspace",
      profileId: null,
    },
    error: null,
  });
  expect(
    await syncOperationsBilling("sub_deleted", "evt_legacy", 1),
  ).toMatchObject({ profileId: null });
  expect(mocks.rpc.mock.calls.map((c) => c[0])).toEqual([
    "crm_operations_binding",
  ]);
});
it("unbound legacy subscriptions retain their generic processing path", async () => {
  vi.stubEnv("AKIBUSINESS_OPERATIONS_BILLING_READY", "true");
  mocks.retrieve.mockResolvedValue({
    id: "sub_other",
    items: { data: [{ price: { id: "legacy-price" } }] },
  });
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  expect(await syncOperationsBilling("sub_other", "evt_other", 1)).toBe(false);
});

it("detached handling remains available while paid billing activation is off", async () => {
  vi.stubEnv("AKIBUSINESS_OPERATIONS_BILLING_READY", "false");
  mocks.retrieve.mockResolvedValue({
    id: "sub_deleted",
    customer: "cus_retained",
    items: { data: [{ price: { id: "legacy-price" } }] },
  });
  mocks.rpc.mockResolvedValue({
    data: {
      subscriptionId: "sub_deleted",
      customerId: "cus_retained",
      workspaceId: "workspace",
      profileId: null,
    },
    error: null,
  });
  expect(
    await syncOperationsBilling("sub_deleted", "evt_off", 1),
  ).toMatchObject({ profileId: null });
  expect(mocks.rpc.mock.calls.map((c) => c[0])).toEqual([
    "crm_operations_binding",
  ]);
});
it("disabled paid billing cannot grant an attached subscriber", async () => {
  vi.stubEnv("AKIBUSINESS_OPERATIONS_BILLING_READY", "false");
  mocks.retrieve.mockResolvedValue({
    id: "sub_attached",
    items: { data: [{ price: { id: OPERATION_PRICES.basico.id } }] },
  });
  mocks.rpc.mockResolvedValue({ data: { profileId: "existing" }, error: null });
  expect(await syncOperationsBilling("sub_attached", "evt_off", 1)).toBe(false);
  expect(mocks.rpc.mock.calls.map((c) => c[0])).toEqual([
    "crm_operations_binding",
  ]);
});
it("disabled rollout preserves the old schema legacy path but database failures fail closed", async () => {
  vi.stubEnv("AKIBUSINESS_OPERATIONS_BILLING_READY", "false");
  mocks.retrieve.mockResolvedValue({
    id: "sub_legacy",
    items: { data: [{ price: { id: "legacy-price" } }] },
  });
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
  expect(await syncOperationsBilling("sub_legacy", "evt_legacy", 1)).toBe(
    false,
  );
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "08006" } });
  await expect(
    syncOperationsBilling("sub_legacy", "evt_retry", 1),
  ).rejects.toThrow("binding unavailable");
});
