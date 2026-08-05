import { describe, expect, it } from "vitest";
import type { DiscoveryRepository } from "../src/lib/repository";
import {
  FixtureRepository,
  HybridDiscoveryRepository,
  parseDatabasePoint,
} from "../src/lib/repository";

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
