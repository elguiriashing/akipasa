import { beforeEach, afterEach, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  rpc: vi.fn(),
  profile: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("../src/lib/auth", () => ({ requireUser: m.auth }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
import { reviewNativeAccommodation } from "../src/app/[locale]/admin/accommodation-review/actions";
const property = "95000000-0000-4000-8000-000000000001",
  revision = "95000000-0000-4000-8000-000000000002",
  request = {
    property,
    revision,
    publish: true,
    reason: "Reviewed listing evidence",
    locale: "en",
  };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AKISUITE_ACCOMMODATION_READY", "true");
  m.profile.mockResolvedValue({
    data: { app_role: "administrator" },
    error: null,
  });
  m.rpc.mockResolvedValue({ error: null });
  const q = { select: () => q, eq: () => q, maybeSingle: m.profile };
  m.auth.mockResolvedValue({
    user: { id: "admin" },
    supabase: { from: () => q, rpc: m.rpc },
  });
});
afterEach(() => vi.unstubAllEnvs());
it("rejects invalid locale/UUID/reason and extra authority fields before any privileged call", async () => {
  for (const input of [
    { ...request, locale: "xx" },
    { ...request, property: "invalid" },
    { ...request, reason: "short" },
    { ...request, owner: "spoof" },
  ])
    expect(await reviewNativeAccommodation(input)).toEqual({
      ok: false,
      error: "invalid",
    });
  expect(m.auth).not.toHaveBeenCalled();
  expect(m.rpc).not.toHaveBeenCalled();
});
it("requires runtime readiness and persisted admin role independently of page/layout", async () => {
  vi.stubEnv("AKISUITE_ACCOMMODATION_READY", "false");
  expect(await reviewNativeAccommodation(request)).toEqual({
    ok: false,
    error: "unavailable",
  });
  expect(m.auth).not.toHaveBeenCalled();
  vi.stubEnv("AKISUITE_ACCOMMODATION_READY", "true");
  m.profile.mockResolvedValue({ data: { app_role: "consumer" }, error: null });
  expect(await reviewNativeAccommodation(request)).toEqual({
    ok: false,
    error: "forbidden",
  });
  expect(m.rpc).not.toHaveBeenCalled();
});
it("sends exact immutable revision/reason only and revalidates after confirmed database success", async () => {
  expect(await reviewNativeAccommodation(request)).toEqual({ ok: true });
  expect(m.rpc).toHaveBeenCalledWith("review_accommodation_property", {
    p_property: property,
    p_revision: revision,
    p_publish: true,
    p_reason: request.reason,
  });
  expect(m.revalidate).toHaveBeenCalledWith("/en/admin/accommodation-review");
});
it("returns stale/unavailable failures without claiming success or revalidating", async () => {
  m.rpc.mockResolvedValue({
    error: { code: "P0001", message: "Stale property revision" },
  });
  expect(await reviewNativeAccommodation(request)).toEqual({
    ok: false,
    error: "stale",
  });
  m.rpc.mockResolvedValue({ error: { code: "PGRST", message: "offline" } });
  expect(await reviewNativeAccommodation(request)).toEqual({
    ok: false,
    error: "unavailable",
  });
  expect(m.revalidate).not.toHaveBeenCalled();
});
