import { describe, expect, it } from "vitest";
import type { DiscoveryRepository } from "../src/lib/repository";
import {
  FixtureRepository,
  HybridDiscoveryRepository,
  parseDatabasePoint,
  rankDiscoveryResults,
} from "../src/lib/repository";
import type { DiscoveryResult } from "../src/lib/domain";

const unavailable: DiscoveryRepository = {
  discover: async () => {
    throw new Error("provider unavailable");
  },
  eventBySlug: async () => {
    throw new Error("provider unavailable");
  },
  venueBySlug: async () => {
    throw new Error("provider unavailable");
  },
  venueById: async () => {
    throw new Error("provider unavailable");
  },
  eventsForVenue: async () => {
    throw new Error("provider unavailable");
  },
};

describe("hybrid public catalogue", () => {
  const now = new Date("2026-07-22T18:30:00Z");
  const fixture = new FixtureRepository(now);
  const repository = new HybridDiscoveryRepository(unavailable, fixture);

  it("keeps public discovery available during a live-provider outage", async () => {
    const results = await repository.discover({
      locality: "madrid",
      radiusKm: 25,
      time: "all",
      now,
    });
    expect(results).toEqual([]);
  });

  it("falls back to fixture detail records without leaking provider errors", async () => {
    await expect(repository.eventBySlug("cine-cobalto")).resolves.toBeNull();
    await expect(repository.venueBySlug("azotea-cobalto")).resolves.toBeNull();
  });

  it("suppresses a fixture event when a live event uses the same slug", async () => {
    const results = await repository.discover({
      locality: "madrid",
      radiusKm: 25,
      time: "all",
      now,
    });
    expect(results).toEqual([]);
  });
});

describe("database geography parsing", () => {
  it("parses Supabase EWKB geography points without losing coordinates", () => {
    expect(
      parseDatabasePoint("0101000020E6100000B0726891ED7C12C077BE9F1A2F454240"),
    ).toEqual({
      longitude: -4.622,
      latitude: 36.5405,
    });
  });
});

function discoveryResult(
  id: string,
  startsAt: string,
  sponsored = false,
): DiscoveryResult {
  return {
    event: {
      id,
      slug: id,
      title: { es: id },
      description: { es: id },
      venueId: "venue",
      category: "social",
      priceCents: 0,
      currency: "EUR",
      source: "verified_venue",
      sponsored,
      occurrences: [],
    },
    occurrence: {
      id: `occurrence-${id}`,
      startsAt,
      endsAt: new Date(new Date(startsAt).getTime() + 3_600_000).toISOString(),
      status: "scheduled",
    },
    venue: {
      id: "venue",
      slug: "venue",
      name: "Venue",
      description: { es: "Venue" },
      locality: "madrid",
      address: "Madrid",
      latitude: 40.4,
      longitude: -3.7,
      verified: true,
      accessible: true,
    },
    distanceKm: 1,
  };
}

describe("discovery ranking", () => {
  const now = new Date("2026-08-13T10:00:00Z");

  it("places an active featured event before an earlier regular event", () => {
    const regular = discoveryResult("regular", "2026-08-13T11:00:00Z");
    const featured = discoveryResult("featured", "2026-08-13T12:00:00Z", true);

    expect(
      rankDiscoveryResults([regular, featured], now).map(
        (item) => item.event.id,
      ),
    ).toEqual(["featured", "regular"]);
  });

  it("keeps featured events in chronological order", () => {
    const later = discoveryResult("later", "2026-08-13T13:00:00Z", true);
    const earlier = discoveryResult("earlier", "2026-08-13T11:00:00Z", true);

    expect(
      rankDiscoveryResults([later, earlier], now).map((item) => item.event.id),
    ).toEqual(["earlier", "later"]);
  });
});
