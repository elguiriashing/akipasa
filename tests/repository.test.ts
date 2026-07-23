import { describe, expect, it } from "vitest";
import type { DiscoveryRepository } from "../src/lib/repository";
import {
  FixtureRepository,
  HybridDiscoveryRepository,
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
});
