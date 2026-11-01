import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  checkInOutcome,
  checkInFailureReason,
  checkInFailureReceipt,
  loadCheckInFailureReceipt,
} from "../src/lib/checkin-feedback";
const id = "00000000-0000-4000-8000-000000000001";
describe("check-in outcomes and owned failed receipts", () => {
  it.each(["outside_geofence", "cooldown", "rate_limited", "accepted"])(
    "retains the receipt for %s",
    (state) => {
      expect(checkInOutcome({ state, check_in_id: id })).toEqual({
        state,
        visitId: id,
      });
    },
  );
  it.each([
    null,
    {},
    { state: "accepted" },
    { state: "accepted", check_in_id: "fake" },
    { state: "injected?visit=accepted" },
  ])("does not invent success from %j", (value) => {
    expect(checkInOutcome(value).state).toBe("unknown");
  });
  it.each([
    ["account completion required [coverage-v1]", "account"],
    ["invalid check-in token", "invalid_token"],
    ["valid precise location required", "weak_location"],
    ["network connection failed", "network"],
    ["private database details", "unknown"],
  ])("translates a safe reason without exposing %s", (message, expected) => {
    expect(checkInOutcome(null, { message }).state).toBe(expected);
    expect(JSON.stringify(checkInOutcome(null, { message }))).not.toContain(
      message,
    );
  });
  it("never trusts a query-string distance or success as a failure", () => {
    expect(checkInFailureReason("accepted")).toBe("unknown");
    expect(
      checkInFailureReceipt(
        { id, state: "accepted", distance_meters: 438 },
        id,
        "outside_geofence",
      ),
    ).toBeNull();
    expect(
      checkInFailureReceipt(
        {
          id: "other",
          state: "duplicate",
          risk_flags: ["outside_geofence"],
          distance_meters: 438,
        },
        id,
        "outside_geofence",
      ),
    ).toBeNull();
    expect(
      checkInFailureReceipt(
        { id, state: "duplicate", risk_flags: [], distance_meters: 438 },
        id,
        "outside_geofence",
      ),
    ).toBeNull();
  });
  it("uses the actual persisted outside-geofence flag and distance", () => {
    expect(
      checkInFailureReceipt(
        {
          id,
          state: "duplicate",
          risk_flags: ["outside_geofence"],
          distance_meters: 438,
        },
        id,
        "outside_geofence",
      ),
    ).toEqual({ reason: "outside_geofence", distance: 438 });
  });
  it.each([-1, Infinity, "438", null])(
    "does not fabricate malformed distance %s",
    (distance_meters) => {
      expect(
        checkInFailureReceipt(
          {
            id,
            state: "duplicate",
            risk_flags: ["outside_geofence"],
            distance_meters,
          },
          id,
          "outside_geofence",
        )?.distance,
      ).toBeNull();
    },
  );
  it("filters failed receipt reads by the authenticated owner and handles errors", async () => {
    const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    const db = { from: vi.fn(() => query) } as unknown as SupabaseClient;
    query.maybeSingle.mockResolvedValue({
      data: {
        id,
        state: "duplicate",
        risk_flags: ["outside_geofence"],
        distance_meters: 438,
      },
      error: null,
    });
    expect(
      await loadCheckInFailureReceipt(db, "owner", id, "outside_geofence"),
    ).toEqual({ reason: "outside_geofence", distance: 438 });
    expect(query.eq.mock.calls).toEqual([
      ["id", id],
      ["profile_id", "owner"],
    ]);
    query.maybeSingle.mockResolvedValue({
      data: { id, state: "accepted" },
      error: { message: "denied" },
    });
    expect(
      await loadCheckInFailureReceipt(db, "owner", id, "outside_geofence"),
    ).toBeNull();
    query.maybeSingle.mockRejectedValue(new Error("unavailable"));
    expect(
      await loadCheckInFailureReceipt(db, "owner", id, "outside_geofence"),
    ).toBeNull();
  });
});
