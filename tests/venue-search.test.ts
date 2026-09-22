import { describe, expect, it } from "vitest";
import {
  escapeVenueSearchPattern,
  normalizeVenueSearch,
  rankVenueSearchResults,
  venueSearchProbes,
} from "../src/lib/venue-search";

describe("venue search helpers", () => {
  it("normalizes user input and limits query length", () => {
    expect(normalizeVenueSearch("  Rock   Bar  ")).toBe("Rock Bar");
    expect(normalizeVenueSearch("a".repeat(200))).toHaveLength(120);
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

    expect(
      rankVenueSearchResults(rows, "rock bar").map((row) => row.id),
    ).toEqual(["1", "2", "3"]);
  });

  it("understands venue plus city queries", () => {
    const rows = [
      {
        id: "1",
        slug: "old-town-irish-pub",
        name: "Old Town Irish Pub",
        locality: "malaga",
        address: "PLAZA UNCIBAY 6, Málaga, 29008, Málaga, España",
      },
      {
        id: "2",
        slug: "old-town-la-estacion",
        name: "OLD TOWN LA ESTACION",
        locality: "alicante",
        address:
          "AVENIDA LA ESTACIÓN ENTRESUELO IZQUIERDA 25, 03003, Comunitat Valenciana, España",
      },
    ];

    expect(
      rankVenueSearchResults(rows, "Old Town, Málaga").map((row) => row.id),
    ).toEqual(["1"]);
  });

  it("understands venue plus town without a comma", () => {
    const rows = [
      {
        id: "1",
        slug: "old-town-restaurant",
        name: "Old Town Restaurant & Bar",
        locality: "frigiliana",
        address: "CALLE SAN SEBASTIAN 30, Frigiliana, 29788, Málaga, España",
      },
      {
        id: "2",
        slug: "old-town-irish-pub",
        name: "Old Town Irish Pub",
        locality: "malaga",
        address: "PLAZA UNCIBAY 6, Málaga, 29008, Málaga, España",
      },
    ];

    expect(
      rankVenueSearchResults(rows, "Old Town Frigiliana").map((row) => row.id),
    ).toEqual(["1"]);
  });

  it("understands full address searches", () => {
    const rows = [
      {
        id: "1",
        slug: "old-town-restaurant",
        name: "Old Town Restaurant & Bar",
        locality: "frigiliana",
        address: "CALLE SAN SEBASTIAN 30, Frigiliana, 29788, Málaga, España",
      },
    ];

    expect(
      rankVenueSearchResults(
        rows,
        "Calle San Sebastian 30, Frigiliana 29788",
      ).map((row) => row.id),
    ).toEqual(["1"]);
  });

  it("matches accents consistently and probes common accent variants", () => {
    const rows = [
      {
        id: "1",
        slug: "cafe-central",
        name: "Café Central",
        address: "Málaga",
      },
      {
        id: "2",
        slug: "central-cafe",
        name: "Central Café",
        address: "Sevilla",
      },
    ];

    expect(rankVenueSearchResults(rows, "cafe malaga")[0].id).toBe("1");
    expect(venueSearchProbes("Malaga")).toContain("Málaga");
  });
});
