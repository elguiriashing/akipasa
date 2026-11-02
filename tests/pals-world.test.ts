import { describe, expect, it } from "vitest";
import {
  coarseWorldCell,
  normalizeWorldVenues,
  parseWorldCell,
  WORLD_VENUE_LIMIT,
} from "@/lib/pals/world";

describe("private AkiPals World boundary", () => {
  it("keeps venue lookups coarse and rejects detailed query positions", () => {
    expect(coarseWorldCell(36.54356, -4.62547)).toEqual({
      latitude: 36.54,
      longitude: -4.63,
    });
    expect(
      parseWorldCell(
        "https://akipasa.com/pals/world/venues?lat=36.54&lng=-4.63",
      ),
    ).toEqual({ latitude: 36.54, longitude: -4.63 });
    expect(
      parseWorldCell(
        "https://akipasa.com/pals/world/venues?lat=36.54356&lng=-4.63",
      ),
    ).toBeNull();
    expect(
      parseWorldCell("https://akipasa.com/pals/world/venues?lat=&lng=0"),
    ).toBeNull();
    expect(
      parseWorldCell("https://akipasa.com/pals/world/venues?lat=999&lng=0"),
    ).toBeNull();
    expect(coarseWorldCell(Number.NaN, 2)).toBeNull();
  });

  it("keeps only unique, bounded, public-display-safe venue records", () => {
    const ok = {
      id: "venue-1",
      slug: "test-cafe",
      name: "  Test café  ",
      latitude: 36.54,
      longitude: -4.62,
      claimStatus: "claimed",
    };
    const result = normalizeWorldVenues([
      ok,
      ok,
      { ...ok, id: "venue-2", slug: "../private" },
      { ...ok, id: "venue-3", latitude: Infinity },
      { ...ok, id: "venue-4", name: "  " },
      { ...ok, id: "venue-5", claimStatus: "unclaimed" },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Test café");
    expect(result[1].claimStatus).toBe("unclaimed");
    expect(normalizeWorldVenues(null)).toEqual([]);
    expect(
      normalizeWorldVenues(
        Array.from({ length: 300 }, (_, i) => ({ ...ok, id: "v-" + i })),
      ),
    ).toHaveLength(WORLD_VENUE_LIMIT);
  });
});

it("only admits fresh bounded sensor fixes and never substitutes a demo coordinate", async () => {
  const { worldPositionIssue } = await import("@/lib/pals/world");
  const now = 1000000;
  const good = {
    timestamp: now,
    coords: { latitude: 36.54, longitude: -4.62, accuracy: 10 },
  };
  expect(worldPositionIssue(good, now)).toBeNull();
  expect(worldPositionIssue({ ...good, timestamp: now - 30001 }, now)).toBe(
    "stale",
  );
  expect(worldPositionIssue({ ...good, timestamp: now + 5001 }, now)).toBe(
    "stale",
  );
  expect(worldPositionIssue({ ...good, timestamp: NaN }, now)).toBe(
    "unavailable",
  );
  expect(
    worldPositionIssue(
      { ...good, coords: { ...good.coords, latitude: 91 } },
      now,
    ),
  ).toBe("unavailable");
  for (const accuracy of [101, -1, NaN, Infinity])
    expect(
      worldPositionIssue(
        { ...good, coords: { ...good.coords, accuracy } },
        now,
      ),
    ).toBe("inaccurate");
});
it("groups true dense members at a real member anchor while retaining all records", async () => {
  const { groupWorldVenues } = await import("@/lib/pals/world");
  const venues = Array.from({ length: 30 }, (_, index) => ({
    id: `v${index}`,
    slug: `venue-${index}`,
    name: `Place${index}`,
    latitude: 36.54,
    longitude: -4.62,
    claimStatus: "claimed" as const,
  }));
  const far = { ...venues[0], id: "far", longitude: -4.5 };
  const groups = groupWorldVenues([...venues, far], (venue) => ({
    x: venue.longitude * 1000,
    y: venue.latitude * 1000,
  }));
  expect(groups.map((group) => group.length)).toEqual([30, 1]);
  expect(groups[0][0]).toBe(venues[0]);
  expect(groups.flat()).toEqual([...venues, far]);
  expect(new Set(groups.flat().map((venue) => venue.id)).size).toBe(31);
});
