import { describe, expect, it, vi } from "vitest";
import type { DiscoveryRepository } from "../src/lib/repository";
import {
  FixtureRepository,
  HybridDiscoveryRepository,
  parseDatabasePoint,
  rankDiscoveryResults,
  usesPublicUiFixtureBackend,
} from "../src/lib/repository";
import type { DiscoveryResult } from "../src/lib/domain";

describe("disposable public UI repository guard", () => {
  it.each([
    "http://127.0.0.1:3999",
    "http://localhost:3999",
    "http://[::1]:3999",
  ])("allows an explicitly opted-in fixture server at %s", (url) => {
    expect(usesPublicUiFixtureBackend("fixtures", "1", url)).toBe(true);
  });

  it.each([undefined, "", "0", "true"])(
    "keeps ordinary fixtures unchanged without the exact private flag (%s)",
    (flag) => {
      expect(
        usesPublicUiFixtureBackend("fixtures", flag, "http://127.0.0.1:3999"),
      ).toBe(false);
    },
  );

  it.each(["supabase", "hybrid", ""])(
    "never overrides the %s provider",
    (provider) => {
      expect(
        usesPublicUiFixtureBackend(provider, "1", "http://127.0.0.1:3999"),
      ).toBe(false);
    },
  );

  it.each([
    undefined,
    "not-a-url",
    "https://project.supabase.co",
    "http://project.supabase.co:3999",
    "http://127.0.0.1.evil.example:3999",
    "http://0.0.0.0:3999",
    "https://127.0.0.1:3999",
    "http://127.0.0.1",
    "http://127.0.0.1:443",
    "http://user:password@127.0.0.1:3999",
    "http://127.0.0.1:3999/rest/v1",
    "http://127.0.0.1:3999?target=remote",
    "http://127.0.0.1:3999#fixture",
  ])("rejects a non-disposable backend URL (%s)", (url) => {
    expect(usesPublicUiFixtureBackend("fixtures", "1", url)).toBe(false);
  });

  it("cannot enable the override in a browser", () => {
    vi.stubGlobal("window", {});
    try {
      expect(
        usesPublicUiFixtureBackend("fixtures", "1", "http://127.0.0.1:3999"),
      ).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

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
