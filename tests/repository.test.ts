import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { DiscoveryRepository } from "../src/lib/repository";
import {
  FixtureRepository,
  HybridDiscoveryRepository,
  SupabaseDiscoveryRepository,
  parseDatabasePoint,
  rankDiscoveryResults,
  usesPublicUiFixtureBackend,
} from "../src/lib/repository";
import type { DiscoveryResult } from "../src/lib/domain";
import { createSupabasePublicClient } from "../src/lib/supabase/public";

vi.mock("../src/lib/supabase/public", () => ({
  createSupabasePublicClient: vi.fn(),
}));

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

const publicVenueId = "11111111-1111-4111-8111-111111111111";
const publicVenueRow = {
  id: publicVenueId,
  slug: "synthetic-venue",
  name: "Synthetic venue",
  address: "Synthetic address",
  location: { coordinates: [-4.42, 36.72] },
  cities: { slug: "malaga" },
};

function publicPhotos(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `photo-${index}`,
    storage_path: `${publicVenueId}/image-${index}.jpg`,
    alt_es: `Foto ${index}`,
    alt_en: index % 2 ? `Photo ${index}` : null,
  }));
}

type SigningRow = {
  path: string | null;
  signedURL: string | null;
  error: string | null;
};

function publicMediaClient(
  media: ReturnType<typeof publicPhotos>,
  options: {
    signingRows?: SigningRow[];
    signingFailure?: boolean;
    venueMissing?: boolean;
    placements?: { media_id: string; placement: string }[];
    selectedMedia?: ReturnType<typeof publicPhotos>;
  } = {},
) {
  const requests: { url: URL; method: string; body: unknown }[] = [];
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    requests.push({ url, method: init?.method || "GET", body });
    const response = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    if (url.pathname === "/storage/v1/object/sign/event-media") {
      if (options.signingFailure)
        return response(
          { statusCode: "503", error: "Unavailable", message: "Unavailable" },
          503,
        );
      // Exercise the real SDK's signedURL -> signedUrl mapping and row errors.
      return response(
        options.signingRows ||
          [...body.paths].reverse().map((path: string) => ({
            path,
            signedURL: `/object/sign/event-media/${path}?token=synthetic`,
            error: null,
          })),
      );
    }
    if (url.pathname === "/rest/v1/venues")
      return response(options.venueMissing ? [] : [publicVenueRow]);
    if (url.pathname === "/rest/v1/venue_media") {
      const ids = url.searchParams.get("id");
      if (!ids) return response(media);
      const requestedIds = ids.slice(4, -1).split(",");
      return response(
        (options.selectedMedia || []).filter((item) =>
          requestedIds.includes(item.id),
        ),
      );
    }
    if (url.pathname === "/rest/v1/venue_media_placements")
      return response(
        options.placements ||
          (media.length
            ? [{ media_id: media.at(-1)!.id, placement: "venue_cover" }]
            : []),
      );
    if (["/rest/v1/offers", "/rest/v1/loyalty_programs"].includes(url.pathname))
      return response([]);
    throw new Error(`Unexpected public fixture request: ${url.pathname}`);
  });
  const client = createClient("http://127.0.0.1:3999", "synthetic-anon-key", {
    global: { fetch },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  vi.mocked(createSupabasePublicClient).mockReturnValue(client);
  return {
    requests,
    signingRequests: () =>
      requests.filter((request) =>
        request.url.pathname.startsWith("/storage/v1/"),
      ),
  };
}

describe.each(["venueBySlug", "venueById"] as const)(
  "public media batching in %s",
  (method) => {
    const load = () =>
      new SupabaseDiscoveryRepository()[method](
        method === "venueById" ? publicVenueId : publicVenueRow.slug,
      );

    it.each([0, 1, 60])(
      "uses at most one signing HTTP request for %i assets",
      async (count) => {
        const media = publicPhotos(count);
        const fixture = publicMediaClient(media);
        const venue = await load();
        expect(fixture.signingRequests()).toHaveLength(count ? 1 : 0);
        if (count)
          expect(fixture.signingRequests()[0]).toMatchObject({
            method: "POST",
            body: {
              expiresIn: 3600,
              paths: media.map((item) => item.storage_path),
            },
          });
        expect(venue?.media?.map((item) => item.id)).toEqual(
          count
            ? [media.at(-1)!.id, ...media.slice(0, -1).map((item) => item.id)]
            : [],
        );
        for (const photo of venue?.media || []) {
          const source = media.find((item) => item.id === photo.id)!;
          expect(photo.url).toContain(source.storage_path);
          expect(photo.alt).toEqual({
            es: source.alt_es,
            ...(source.alt_en ? { en: source.alt_en } : {}),
          });
        }
        if (count) {
          expect(venue?.coverImage?.id).toBe(media.at(-1)!.id);
          expect(venue?.logoImage?.id).toBe(media[0].id);
        }
        const venueRead = fixture.requests.find(
          (request) => request.url.pathname === "/rest/v1/venues",
        )!;
        expect(venueRead.url.searchParams.get("status")).toBe("eq.published");
        const mediaRead = fixture.requests.find(
          (request) => request.url.pathname === "/rest/v1/venue_media",
        )!;
        expect(mediaRead.url.searchParams.get("venue_id")).toBe(
          `eq.${publicVenueId}`,
        );
        expect(mediaRead.url.searchParams.get("storage_path")).toBe(
          "not.like.%/events/%",
        );
        expect(mediaRead.url.searchParams.get("limit")).toBe("60");
      },
    );

    it("keeps good assets and fallback artwork when other paths are denied or omitted", async () => {
      const media = publicPhotos(4);
      const fixture = publicMediaClient(media, {
        signingRows: [
          { path: media[2].storage_path, signedURL: "/good-2", error: null },
          {
            path: media[3].storage_path,
            signedURL: "/denied-cover",
            error: "Access denied",
          },
          { path: "unknown.jpg", signedURL: "/unknown", error: null },
          { path: null, signedURL: "/missing-path", error: null },
          { path: media[0].storage_path, signedURL: "/good-0", error: null },
        ],
      });
      const venue = await load();
      expect(venue?.media?.map((item) => item.id)).toEqual([
        "photo-0",
        "photo-2",
      ]);
      expect(venue?.media?.map((item) => item.url)).toEqual([
        "http://127.0.0.1:3999/storage/v1/good-0",
        "http://127.0.0.1:3999/storage/v1/good-2",
      ]);
      expect(venue?.coverImage?.id).toBe("photo-0");
      expect(fixture.signingRequests()).toHaveLength(1);
    });

    it("deduplicates signing paths while retaining each media row", async () => {
      const media = publicPhotos(2);
      media[1].storage_path = media[0].storage_path;
      const fixture = publicMediaClient(media);
      const venue = await load();
      expect(fixture.signingRequests()[0].body).toEqual({
        expiresIn: 3600,
        paths: [media[0].storage_path],
      });
      expect(venue?.media?.map((item) => item.id)).toEqual([
        "photo-1",
        "photo-0",
      ]);
    });

    it("returns empty media on whole-batch failure without retry fan-out", async () => {
      const fixture = publicMediaClient(publicPhotos(60), {
        signingFailure: true,
      });
      const venue = await load();
      expect(venue?.media).toEqual([]);
      expect(venue?.coverImage).toBeUndefined();
      expect(fixture.signingRequests()).toHaveLength(1);
    });

    it("loads explicitly selected event uploads and authorised cross-venue assets by ID", async () => {
      const media = publicPhotos(1);
      const selectedMedia = [
        {
          id: "selected-event",
          storage_path: `${publicVenueId}/events/synthetic-event/banner.jpg`,
          alt_es: "Cartel seleccionado",
          alt_en: "Selected banner",
        },
        {
          id: "selected-shared",
          storage_path: "22222222-2222-4222-8222-222222222222/shared.jpg",
          alt_es: "Imagen compartida",
          alt_en: "Shared image",
        },
        {
          id: "unplaced-event",
          storage_path: `${publicVenueId}/events/synthetic-event/private.jpg`,
          alt_es: "Sin selección",
          alt_en: null,
        },
      ];
      const fixture = publicMediaClient(media, {
        placements: [
          { media_id: "selected-event", placement: "venue_cover" },
          { media_id: "selected-shared", placement: "venue_profile" },
          { media_id: "selected-event", placement: "venue_events" },
          { media_id: "inaccessible-selection", placement: "venue_menu" },
        ],
        selectedMedia,
      });
      const venue = await load();
      expect(venue?.coverImage?.id).toBe("selected-event");
      expect(venue?.logoImage?.id).toBe("selected-shared");
      expect(venue?.eventsImage?.id).toBe("selected-event");
      expect(venue?.menuImage?.id).toBe(media[0].id);
      expect(venue?.media?.map((item) => item.id)).toEqual([
        "selected-event",
        media[0].id,
        "selected-shared",
      ]);
      expect(venue?.coverImage?.alt).toEqual({
        es: "Cartel seleccionado",
        en: "Selected banner",
      });
      const missingReads = fixture.requests.filter(
        (request) =>
          request.url.pathname === "/rest/v1/venue_media" &&
          request.url.searchParams.has("id"),
      );
      expect(missingReads).toHaveLength(1);
      expect(missingReads[0].url.searchParams.get("id")).toBe(
        "in.(selected-event,selected-shared,inaccessible-selection)",
      );
      expect(missingReads[0].url.searchParams.has("venue_id")).toBe(false);
      expect(missingReads[0].url.searchParams.has("storage_path")).toBe(false);
      expect(fixture.signingRequests()).toHaveLength(1);
      expect(fixture.signingRequests()[0].body).toEqual({
        expiresIn: 3600,
        paths: [
          media[0].storage_path,
          ...selectedMedia.slice(0, 2).map((item) => item.storage_path),
        ],
      });
      const placementRead = fixture.requests.find(
        (request) => request.url.pathname === "/rest/v1/venue_media_placements",
      )!;
      expect(placementRead.url.searchParams.get("venue_id")).toBe(
        `eq.${publicVenueId}`,
      );
      expect(placementRead.url.searchParams.get("target_key")).toBe("eq.");
    });

    it("resolves selected artwork beyond the ordinary 60-photo gallery", async () => {
      const media = publicPhotos(60);
      const selected = publicPhotos(61)[60];
      const fixture = publicMediaClient(media, {
        placements: [{ media_id: selected.id, placement: "venue_cover" }],
        selectedMedia: [selected],
      });
      const venue = await load();
      expect(venue?.coverImage?.id).toBe(selected.id);
      expect(venue?.media).toHaveLength(61);
      expect(venue?.media?.[0].id).toBe(selected.id);
      expect(fixture.signingRequests()).toHaveLength(1);
      expect(fixture.signingRequests()[0].body).toEqual({
        expiresIn: 3600,
        paths: [...media, selected].map((item) => item.storage_path),
      });
    });

    it("uses explicitly selected artwork without an ordinary gallery", async () => {
      const selected = {
        ...publicPhotos(1)[0],
        id: "event-only",
        storage_path: `${publicVenueId}/events/only/image.jpg`,
      };
      const fixture = publicMediaClient([], {
        placements: [{ media_id: selected.id, placement: "venue_cover" }],
        selectedMedia: [selected],
      });
      const venue = await load();
      expect(venue?.coverImage?.id).toBe(selected.id);
      expect(venue?.media?.map((item) => item.id)).toEqual([selected.id]);
      expect(fixture.signingRequests()).toHaveLength(1);
    });

    it.each(["denied", "omitted"])(
      "falls back to ordinary artwork when selected signing is %s",
      async (failure) => {
        const media = publicPhotos(1);
        const selected = { ...publicPhotos(2)[1], id: "selected-cover" };
        const fixture = publicMediaClient(media, {
          placements: [{ media_id: selected.id, placement: "venue_cover" }],
          selectedMedia: [selected],
          signingRows: [
            {
              path: media[0].storage_path,
              signedURL: "/ordinary",
              error: null,
            },
            ...(failure === "denied"
              ? [
                  {
                    path: selected.storage_path,
                    signedURL: "/denied",
                    error: "Access denied",
                  },
                ]
              : []),
          ],
        });
        const venue = await load();
        expect(venue?.media?.map((item) => item.id)).toEqual([media[0].id]);
        expect(venue?.coverImage?.id).toBe(media[0].id);
        expect(fixture.signingRequests()).toHaveLength(1);
      },
    );

    it("keeps empty fallback for inaccessible selected rows without signing unplaced inventory", async () => {
      const fixture = publicMediaClient([], {
        placements: [{ media_id: "inaccessible", placement: "venue_cover" }],
        selectedMedia: publicPhotos(1),
      });
      const venue = await load();
      expect(venue?.media).toEqual([]);
      expect(venue?.coverImage).toBeUndefined();
      expect(fixture.signingRequests()).toHaveLength(0);
    });

    it.each(["none", "already-loaded"])(
      "avoids a missing-placement media read when selections are %s",
      async (selection) => {
        const media = publicPhotos(1);
        const fixture = publicMediaClient(media, {
          placements:
            selection === "none"
              ? []
              : [{ media_id: media[0].id, placement: "venue_cover" }],
        });
        const venue = await load();
        expect(venue?.coverImage?.id).toBe(media[0].id);
        expect(
          fixture.requests.filter(
            (request) => request.url.pathname === "/rest/v1/venue_media",
          ),
        ).toHaveLength(1);
        expect(fixture.signingRequests()).toHaveLength(1);
      },
    );

    it("does not query or sign media for a missing published venue", async () => {
      const fixture = publicMediaClient(publicPhotos(1), {
        venueMissing: true,
      });
      expect(await load()).toBeNull();
      expect(fixture.requests).toHaveLength(1);
      expect(fixture.signingRequests()).toHaveLength(0);
    });
  },
);
