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
    expect(results.some((item) => item.event.slug === "cine-cobalto")).toBe(
      true,
    );
  });

  it("falls back to fixture detail records without leaking provider errors", async () => {
    await expect(repository.eventBySlug("cine-cobalto")).resolves.toMatchObject(
      {
        slug: "cine-cobalto",
      },
    );
    await expect(
      repository.venueBySlug("azotea-cobalto"),
    ).resolves.toMatchObject({
      slug: "azotea-cobalto",
    });
  });

  it("suppresses a fixture event when a live event uses the same slug", async () => {
    const demoResults = await fixture.discover({
      locality: "madrid",
      radiusKm: 25,
      time: "all",
      now,
    });
    const fixtureResult = demoResults.find(
      (item) => item.event.slug === "cine-cobalto",
    )!;
    const live: DiscoveryRepository = {
      ...unavailable,
      discover: async () => [
        {
          ...fixtureResult,
          event: { ...fixtureResult.event, id: crypto.randomUUID() },
          occurrence: {
            ...fixtureResult.occurrence,
            id: crypto.randomUUID(),
            startsAt: new Date(now.getTime() + 86_400_000).toISOString(),
          },
        },
      ],
    };
    const hybrid = new HybridDiscoveryRepository(live, fixture);
    const results = await hybrid.discover({
      locality: "madrid",
      radiusKm: 25,
      time: "all",
      now,
    });
    expect(
      results.filter((item) => item.event.slug === "cine-cobalto"),
    ).toHaveLength(1);
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
