import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc, requireUser } = vi.hoisted(() => ({
  rpc: vi.fn(),
  requireUser: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error("REDIRECT:" + url);
  },
}));
vi.mock("../src/lib/auth", () => ({ requireUser }));
vi.mock("../src/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => {
    throw new Error("analytics unavailable");
  },
}));
vi.mock("../src/lib/personalisation/trusted", () => ({
  recordTrustedBehaviour: vi.fn(),
}));
import { completeCheckIn } from "../src/app/[locale]/check-in/[token]/actions";
const id = "00000000-0000-4000-8000-000000000001";
function form() {
  const f = new FormData();
  Object.entries({
    locale: "es",
    token: id,
    idempotencyKey: id,
    latitude: "36.5",
    longitude: "-4.6",
    accuracy: "14",
  }).forEach(([k, v]) => f.set(k, v));
  return f;
}
beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({ supabase: { rpc }, user: { id: "owner" } });
});
describe("real check-in server-action feedback", () => {
  it.each(["outside_geofence", "cooldown", "rate_limited"])(
    "preserves the real %s receipt for authenticated presentation",
    async (state) => {
      rpc.mockResolvedValue({ data: { state, check_in_id: id }, error: null });
      await expect(completeCheckIn(form())).rejects.toThrow(
        `REDIRECT:/es/passports?checkin=${state}&visit=${id}`,
      );
      expect(rpc).toHaveBeenCalledWith("check_in_by_token", {
        p_token: id,
        p_idempotency_key: id,
        p_latitude: 36.5,
        p_longitude: -4.6,
        p_accuracy_meters: 14,
      });
    },
  );
  it("keeps accepted visits successful even if optional analytics fails", async () => {
    rpc.mockResolvedValue({
      data: { state: "accepted", check_in_id: id },
      error: null,
    });
    await expect(completeCheckIn(form())).rejects.toThrow(
      `REDIRECT:/es/passports?checkin=accepted&visit=${id}`,
    );
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("keeps uncertain transport failures distinct from location rejection", async () => {
    rpc.mockRejectedValue(new Error("offline"));
    await expect(completeCheckIn(form())).rejects.toThrow(
      "REDIRECT:/es/passports?checkin=network",
    );
  });
  it("provides specific invalid QR guidance without exposing provider messages", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "invalid check-in token" },
    });
    await expect(completeCheckIn(form())).rejects.toThrow(
      "REDIRECT:/es/passports?checkin=invalid_token",
    );
  });
  it.each(["", " ", "NaN", "Infinity"])(
    "rejects malformed GPS %j before any RPC",
    async (latitude) => {
      const f = form();
      f.set("latitude", latitude);
      await expect(completeCheckIn(f)).rejects.toThrow(
        "REDIRECT:/es/passports?checkin=weak_location",
      );
      expect(requireUser).not.toHaveBeenCalled();
      expect(rpc).not.toHaveBeenCalled();
    },
  );
});
