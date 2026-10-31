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
