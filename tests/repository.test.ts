import { describe, expect, it, vi } from "vitest";
import type { DiscoveryRepository } from "../src/lib/repository";
import {
  SupabaseDiscoveryRepository,
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

const publicMediaBackend = vi.hoisted(() => ({ client: {} }));
vi.mock("../src/lib/supabase/public", () => ({
  createSupabasePublicClient: () => publicMediaBackend.client,
}));

describe("shared venue public media placements", () => {
  const venueId = "11111111-1111-4111-8111-111111111111";
  const own = {
    id: "own",
    venue_id: venueId,
    storage_path: "venue/own.jpg",
    alt_es: "Propia",
    alt_en: "Own",
  };
  const selected = {
    id: "selected",
    venue_id: venueId,
    storage_path: "venue/events/selected.jpg",
    alt_es: "Elegida",
    alt_en: "Selected",
  };
  const privateEvent = {
    id: "private",
    venue_id: venueId,
    storage_path: "venue/events/private.jpg",
    alt_es: "Privada",
    alt_en: "Private",
  };
  const foreign = {
    id: "foreign",
    venue_id: "other-venue",
    storage_path: "other/events/private.jpg",
    alt_es: "Otra",
    alt_en: "Other",
  };

  function backend(
    fallback: (typeof own)[],
    placements: { media_id: string; placement: string }[],
    signingFails = false,
  ) {
    const calls: {
      table: string;
      filters: Record<string, unknown>;
      limit?: number;
    }[] = [];
    const signed: string[] = [];
    publicMediaBackend.client = {
      from(table: string) {
        const call = {
          table,
          filters: {} as Record<string, unknown>,
          limit: undefined as number | undefined,
        };
        calls.push(call);
        const query = {
          select: () => query,
          eq(key: string, value: unknown) {
            call.filters[key] = value;
            return query;
          },
          in(key: string, value: unknown) {
            call.filters[key] = value;
            return query;
          },
          not() {
            return query;
          },
          order: () => query,
          limit(value: number) {
            call.limit = value;
            return query;
          },
          lte: () => query,
          gte: () => query,
          maybeSingle: () => query,
          then(resolve: (value: unknown) => unknown) {
            let data: unknown = [];
            if (table === "venues")
              data = {
                id: venueId,
                slug: "venue",
                name: "Venue",
                address: "Fuengirola",
                location: null,
              };
            if (table === "venue_media_placements") data = placements;
            if (table === "venue_media")
              data = call.filters.id
                ? [selected, privateEvent, foreign].filter(
                    (item) =>
                      item.venue_id === call.filters.venue_id &&
                      (call.filters.id as string[]).includes(item.id),
                  )
                : fallback;
            return Promise.resolve({ data, error: null }).then(resolve);
          },
        };
        return query;
      },
      storage: {
        from: () => ({
          createSignedUrl: async (path: string) => {
            signed.push(path);
            return {
              data:
                signingFails && path === selected.storage_path
                  ? null
                  : { signedUrl: `https://media.invalid/${path}` },
            };
          },
        }),
      },
    };
    return { calls, signed };
  }

  it.each(["venueBySlug", "venueById"] as const)(
    "%s resolves selected event uploads without signing private event-bin files",
    async (method) => {
      const { calls, signed } = backend(
        [own],
        [
          { media_id: selected.id, placement: "venue_cover" },
          { media_id: foreign.id, placement: "venue_profile" },
        ],
      );
      const venue = await new SupabaseDiscoveryRepository()[method](
        method === "venueById" ? venueId : "venue",
      );
      expect(venue?.coverImage?.id).toBe(selected.id);
      expect(venue?.logoImage?.id).toBe(own.id);
      expect(venue?.media?.map((item) => item.id)).toEqual([
        selected.id,
        own.id,
      ]);
      expect(signed).toEqual([own.storage_path, selected.storage_path]);
      expect(
        calls.find((call) => call.table === "venue_media" && call.filters.id),
      ).toMatchObject({
        filters: { venue_id: venueId, id: [selected.id, foreign.id] },
      });
    },
  );

  it.each(["venueBySlug", "venueById"] as const)(
    "%s supports an explicitly placed event asset when no ordinary venue image exists",
    async (method) => {
      backend([], [{ media_id: selected.id, placement: "venue_cover" }]);
      const venue = await new SupabaseDiscoveryRepository()[method](
        method === "venueById" ? venueId : "venue",
      );
      expect(venue?.coverImage?.id).toBe(selected.id);
    },
  );

  it("keeps the existing fallback when signing an explicit placement fails", async () => {
    backend([own], [{ media_id: selected.id, placement: "venue_cover" }], true);
    expect(
      (await new SupabaseDiscoveryRepository().venueBySlug("venue"))?.coverImage
        ?.id,
    ).toBe(own.id);
  });

  it("does not fetch private event assets when there are no missing placements", async () => {
    const { calls, signed } = backend(
      [own],
      [{ media_id: own.id, placement: "venue_cover" }],
    );
    await new SupabaseDiscoveryRepository().venueBySlug("venue");
    expect(calls.filter((call) => call.table === "venue_media")).toHaveLength(
      1,
    );
    expect(signed).toEqual([own.storage_path]);
  });
});
