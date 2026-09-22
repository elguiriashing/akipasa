import { describe, expect, it } from "vitest";
import {
  escapeVenueSearchPattern,
  normalizeVenueSearch,
  rankVenueSearchResults,
} from "../src/lib/venue-search";

describe("venue search helpers", () => {
  it("normalizes user input and limits query length", () => {
    expect(normalizeVenueSearch("  Rock   Bar  ")).toBe("Rock Bar");
    expect(normalizeVenueSearch("a".repeat(100))).toHaveLength(80);
  });

  it("escapes SQL LIKE wildcard characters", () => {
    expect(escapeVenueSearchPattern("100%_real\\name")).toBe(
      "100\\%\\_real\\\\name",
    );
  });

  it("ranks exact and prefix matches before loose matches", () => {
    const rows = [
      {
        id: "3",
        slug: "the-rock-bar",
        name: "The Rock Bar",
        address: "Fuengirola",
      },
      {
        id: "2",
        slug: "rock-bar-el-mundo",
        name: "Rock Bar El Mundo",
        address: "Fuengirola",
      },
      {
        id: "1",
        slug: "rock-bar",
        name: "Rock Bar",
        address: "Málaga",
      },
    ];

    expect(rankVenueSearchResults(rows, "rock bar").map((row) => row.id)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("matches accents consistently while ranking", () => {
    const rows = [
      {
        id: "1",
        slug: "cafe-central",
        name: "Café Central",
        address: null,
      },
      {
        id: "2",
        slug: "central-cafe",
        name: "Central Café",
        address: null,
      },
    ];

    expect(rankVenueSearchResults(rows, "cafe")[0].id).toBe("1");
  });
});
