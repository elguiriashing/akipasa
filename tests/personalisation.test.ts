import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DiscoveryResult } from "../src/lib/domain";
import { behaviourBatchSchema } from "../src/lib/personalisation/schema";
import {
  rankRecommendations,
  type PreferenceSignal,
} from "../src/lib/personalisation/ranking";
import {
  RequestSecurityError,
  requireSameOriginRequest,
} from "../src/lib/request-security";

function candidate(
  id: string,
  category: string,
  distanceKm: number,
  venueId = `${id}-venue`,
  sponsored = false,
): DiscoveryResult {
  return {
    event: {
      id,
      slug: id,
      title: { es: id },
      description: { es: id },
      venueId,
      category,
      priceCents: 0,
      currency: "EUR",
      source: "verified_venue",
      sponsored,
      occurrences: [],
    },
    occurrence: {
      id: `${id}-occurrence`,
      startsAt: "2026-08-13T20:00:00.000Z",
      endsAt: "2026-08-13T22:00:00.000Z",
      status: "scheduled",
    },
    venue: {
      id: venueId,
      slug: venueId,
      name: venueId,
      description: { es: venueId },
      locality: "fuengirola",
      address: "Spain",
      latitude: 36.54,
      longitude: -4.62,
      verified: true,
      accessible: true,
    },
    distanceKm,
  };
}

describe("behaviour schema", () => {
  it("accepts a versioned, bounded impression", () => {
    expect(
      behaviourBatchSchema.safeParse({
        events: [
          {
            event_id: "c29b8567-1268-4698-9a38-adc7d56c6013",
            schema_version: 1,
            event_type: "event_impression",
            entity_type: "event",
            entity_id: "f0a12bbd-2bf6-4942-a05a-8a2a104a2a91",
            occurred_at: "2026-08-13T10:00:00.000Z",
            surface: "discover",
            position: 2,
            context: { distance_km: 1.4 },
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects unknown properties and unsupported high-value client events", () => {
    expect(
      behaviourBatchSchema.safeParse({
        events: [
          {
            event_id: crypto.randomUUID(),
            schema_version: 1,
            event_type: "event_ticket_purchased",
            occurred_at: new Date().toISOString(),
            surface: "discover",
            email: "no@example.com",
          },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("advertising profile privacy contract", () => {
  it("seeds lifecycle records but gates learned segments on explicit consent", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "database/migrations/0058_consent_aware_advertising_profiles.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("after insert on public.profiles");
    expect(migration).toContain(
      "new.personalisation_enabled and new.marketing_enabled",
    );
    expect(migration).toContain("ap.collection_status = 'eligible'");
    expect(migration).toContain(
      "alter table public.advertising_profiles enable row level security",
    );
    expect(migration).toContain("administrator role required");
    expect(migration).not.toMatch(/email|phone|precise_location|fingerprint/i);
  });

  it("keeps individual analytics lookup bounded and administrator-only", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "database/migrations/0059_admin_individual_analytics_search.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("administrator role required");
    expect(migration).toContain("char_length(v_query) < 2");
    expect(migration).toContain("p_limit > 25");
    expect(migration).toContain("limit 6");
    expect(migration).not.toMatch(/metadata|context|latitude|longitude|phone/i);
  });
});

describe("internal API request security", () => {
  it("accepts same-origin fetches and rejects cross-origin requests", () => {
    expect(() =>
      requireSameOriginRequest(
        new Request("https://akipasa.com/api/v1/recommendations", {
          headers: { origin: "https://akipasa.com" },
        }),
      ),
    ).not.toThrow();
    expect(() =>
      requireSameOriginRequest(
        new Request("https://akipasa.com/api/v1/recommendations", {
          headers: { origin: "https://attacker.example" },
        }),
      ),
    ).toThrow(RequestSecurityError);
  });
});

describe("public analytics abuse controls", () => {
  it("routes anonymous writes through a service-only atomic session quota", () => {
    const route = readFileSync("src/app/api/analytics/route.ts", "utf8");
    const migration = readFileSync(
      "database/migrations/0079_rate_limit_public_analytics.sql",
      "utf8",
    );
    expect(route).toContain("requireSameOriginRequest(request)");
    expect(route).toContain('get("ak_session_id")');
    expect(route).toContain('rpc("record_analytics_limited"');
    expect(route).toContain('request.headers.get("cf-connecting-ip")');
    expect(route).toContain('createHmac("sha256", secret)');
    expect(migration).toContain(
      "on conflict (source_hash, window_start) do update",
    );
    expect(migration).toContain(
      "if v_count > 120 then raise exception 'analytics rate limit exceeded'",
    );
    expect(migration).toContain(
      "revoke all on function public.record_analytics(analytics_action,uuid,uuid,jsonb) from public, anon",
    );
    expect(migration).toContain(
      "grant execute on function public.record_analytics_limited(analytics_action,uuid,uuid,jsonb,uuid,uuid,text) to service_role",
    );
  });
});

describe("weighted recommendations", () => {
  const now = new Date("2026-08-13T18:00:00.000Z");
  it("makes two users rank the same candidates differently", () => {
    const candidates = [
      candidate("music", "music", 3),
      candidate("food", "food", 3),
    ];
    const music: PreferenceSignal[] = [
      {
        dimension: "category",
        key: "music",
        shortTermScore: 1,
        longTermScore: 0.8,
        confidence: 0.95,
      },
    ];
    const food: PreferenceSignal[] = [
      {
        dimension: "category",
        key: "food",
        shortTermScore: 1,
        longTermScore: 0.8,
        confidence: 0.95,
      },
    ];
    expect(
      rankRecommendations({ candidates, signals: music, radiusKm: 25, now })[0]
        .result.event.id,
    ).toBe("music");
    expect(
      rankRecommendations({ candidates, signals: food, radiusKm: 25, now })[0]
        .result.event.id,
    ).toBe("food");
  });

  it("does not allow payment to promote an irrelevant event", () => {
    const candidates = [
      candidate("organic", "music", 2),
      candidate("paid", "food", 100, "paid-venue", true),
    ];
    const signals: PreferenceSignal[] = [
      {
        dimension: "category",
        key: "food",
        shortTermScore: -1,
        longTermScore: -1,
        confidence: 1,
      },
    ];
    const ranked = rankRecommendations({
      candidates,
      signals,
      radiusKm: 100,
      now,
    });
    expect(
      ranked.find((item) => item.result.event.id === "paid")?.sponsored,
    ).toBe(false);
    expect(ranked[0].result.event.id).toBe("organic");
  });
});
