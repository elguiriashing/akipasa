import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  verifyStoryPhotoLocation,
  type StoryPhotoLocation,
} from "../src/lib/community-stories/photo-location";

const now = Date.parse("2026-11-01T18:00:00Z");
const fix = {
  latitude: 36.539,
  longitude: -4.625,
  accuracy: 15,
  locatedAt: now,
};
function ewkb(latitude: number, longitude: number, little = true, srid = 4326) {
  const bytes = new Uint8Array(25);
  const view = new DataView(bytes.buffer);
  bytes[0] = little ? 1 : 0;
  view.setUint32(1, 0x20000001, little);
  view.setUint32(5, srid, little);
  view.setFloat64(9, longitude, little);
  view.setFloat64(17, latitude, little);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
function fixture() {
  const visit = {
    id: "visit",
    profile_id: "owner",
    venue_id: "venue",
    state: "accepted",
    created_at: new Date(now - 30_000).toISOString(),
    risk_flags: [] as unknown,
  };
  const venue = {
    id: "venue",
    location: ewkb(fix.latitude, fix.longitude) as unknown,
    status: "published",
    verified: true,
  };
  const filters: Array<[string, string, unknown]> = [];
  const responses = {
    check_ins: {
      data: visit as typeof visit | null,
      error: null as object | null,
    },
    venues: {
      data: venue as typeof venue | null,
      error: null as object | null,
    },
  };
  const from = vi.fn((table: keyof typeof responses) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((key: string, value: unknown) => {
        filters.push([table, key, value]);
        return query;
      }),
      maybeSingle: vi.fn(async () => responses[table]),
    };
    return query;
  });
  const db = { from } as unknown as SupabaseClient;
  return {
    visit,
    venue,
    responses,
    filters,
    from,
    run: (location: StoryPhotoLocation = fix) =>
      verifyStoryPhotoLocation(db, "owner", "visit", location, now),
  };
}
it.each([true, false])(
  "reads actual EWKB4326 point endian %s",
  async (little) => {
    const f = fixture();
    f.venue.location = ewkb(fix.latitude, fix.longitude, little);
    expect(await f.run()).toBeNull();
    expect(f.filters).toEqual([
      ["check_ins", "id", "visit"],
      ["check_ins", "profile_id", "owner"],
      ["check_ins", "state", "accepted"],
      ["venues", "id", "venue"],
    ]);
  },
);
it("accepts a trusted GeoJSON Point and prefixed EWKB", async () => {
  const f = fixture();
  f.venue.location = { type: "Point", coordinates: [-4.625, 36.539] };
  expect(await f.run()).toBeNull();
  f.venue.location = "\\x" + ewkb(fix.latitude, fix.longitude);
  expect(await f.run()).toBeNull();
});
it.each([
  null,
  "",
  "010100000000000000000000000000000000000000",
  ewkb(36.539, -4.625, true, 3857),
  ewkb(NaN, -4.625),
  ewkb(91, -4.625),
  "0201000020e610000000000000000000000000000000000000",
  { type: "Point", coordinates: ["-4.625", 36.539] },
  { type: "Point", coordinates: [-4.625, 36.539, 0] },
  { type: "LineString", coordinates: [-4.625, 36.539] },
  { type: "Point", coordinates: [-4.625, 36.539], crs: "EPSG:3857" },
])("fails closed for malformed/non4326 venue geometry %j", async (location) => {
  const f = fixture();
  f.venue.location = location;
  expect(await f.run()).toBe("unavailable");
});
it.each([
  { latitude: NaN },
  { longitude: Infinity },
  { latitude: 91 },
  { longitude: -181 },
  { latitude: "36.539" },
])("rejects invalid reported coordinates %j before reads", async (value) => {
  const f = fixture();
  expect(await f.run({ ...fix, ...value } as StoryPhotoLocation)).toBe(
    "location_required",
  );
  expect(f.from).not.toHaveBeenCalled();
});
it.each([-1, 50.001, Infinity, NaN, "15"])(
  "rejects inaccurate fix %s before reads",
  async (accuracy) => {
    const f = fixture();
    expect(await f.run({ ...fix, accuracy } as StoryPhotoLocation)).toBe(
      "location_inaccurate",
    );
    expect(f.from).not.toHaveBeenCalled();
  },
);
it.each([now - 60_001, now + 5_001, NaN, Infinity, "now"])(
  "rejects old/future/malformed locatedAt %s before reads",
  async (locatedAt) => {
    const f = fixture();
    expect(await f.run({ ...fix, locatedAt } as StoryPhotoLocation)).toBe(
      "location_expired",
    );
    expect(f.from).not.toHaveBeenCalled();
  },
);
it("allows exact timestamp/accuracy bounds but never expands100m radius", async () => {
  const f = fixture();
  expect(
    await f.run({ ...fix, accuracy: 50, locatedAt: now - 60_000 }),
  ).toBeNull();
  expect(await f.run({ ...fix, locatedAt: now + 5_000 })).toBeNull();
  expect(await f.run({ ...fix, latitude: fix.latitude + 0.0008 })).toBeNull();
  expect(
    await f.run({ ...fix, latitude: fix.latitude + 0.001, accuracy: 50 }),
  ).toBe("outside_geofence");
});
it.each([
  { id: "forged" },
  { profile_id: "other" },
  { state: "duplicate" },
  { venue_id: "" },
  { created_at: new Date(now - 86_400_001).toISOString() },
  { created_at: new Date(now + 1).toISOString() },
  { created_at: "invalid" },
  { risk_flags: ["outside_geofence"] },
  { risk_flags: "outside_geofence" },
  { risk_flags: [false] },
])("rejects forged/ineligible visit data %j", async (value) => {
  const f = fixture();
  Object.assign(f.visit, value);
  expect(await f.run()).toBe("not_eligible");
  expect(f.from).toHaveBeenCalledTimes(1);
});
it.each([{ id: "other" }, { status: "draft" }, { verified: false }])(
  "rejects unavailable/unverified/mismatched venue %j",
  async (value) => {
    const f = fixture();
    Object.assign(f.venue, value);
    expect(await f.run()).toBe("not_eligible");
  },
);
it("withholds eligibility for missing RLS rows and fails closed on read errors", async () => {
  const f = fixture();
  f.responses.check_ins.error = { message: "unavailable" };
  expect(await f.run()).toBe("unavailable");
  f.responses.check_ins.error = null;
  f.responses.check_ins.data = null;
  expect(await f.run()).toBe("not_eligible");
  f.responses.check_ins.data = f.visit;
  f.responses.venues.error = { message: "unavailable" };
  expect(await f.run()).toBe("unavailable");
  f.responses.venues.error = null;
  f.responses.venues.data = null;
  expect(await f.run()).toBe("not_eligible");
});
it("returns unavailable without logging location when transport throws", async () => {
  const f = fixture();
  f.from.mockImplementationOnce(() => {
    throw new Error("transport");
  });
  expect(await f.run()).toBe("unavailable");
});
