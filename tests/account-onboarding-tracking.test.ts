import { afterEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  status: "underage",
  consent: true,
  service: vi.fn(),
  auth: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "ak_analytics"
        ? { value: state.consent ? "granted" : "denied" }
        : { value: "11111111-1111-4111-8111-111111111111" },
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: state.auth } }),
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: state.service,
}));
vi.mock("@/lib/account-onboarding-server", () => ({
  accountTrackingAllowed: async () =>
    !["pending", "underage"].includes(state.status),
}));
import { POST } from "../src/app/api/analytics/route";
function request() {
  return new Request("https://akipasa.com/api/analytics", {
    method: "POST",
    headers: {
      origin: "https://akipasa.com",
      "content-type": "application/json",
    },
    body: JSON.stringify({ action: "venue_view", locale: "en" }),
  });
}
afterEach(() => vi.resetAllMocks());
it("never records known restricted users even with granted cookies", async () => {
  state.consent = true;
  state.auth.mockResolvedValue({ data: { user: { id: "user" } } });
  expect((await POST(request())).status).toBe(204);
  expect(state.service).not.toHaveBeenCalled();
});
it("does not let direct API callers bypass analytics refusal", async () => {
  state.consent = false;
  expect((await POST(request())).status).toBe(204);
  expect(state.auth).not.toHaveBeenCalled();
  expect(state.service).not.toHaveBeenCalled();
});
