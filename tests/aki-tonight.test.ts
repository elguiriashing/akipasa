import { describe, expect, it } from "vitest";
import type { DiscoveryResult } from "../src/lib/domain";
import {
  matchesTonightIntent,
  parseTonightPreferences,
  selectTonightEvents,
  tonightArea,
  tonightMaximumPriceCents,
} from "../src/lib/aki-tonight";

const now = new Date("2026-10-29T19:00:00.000Z");

function eventItem(
  overrides: Partial<DiscoveryResult["event"]> = {},
  occurrenceOverrides: Partial<DiscoveryResult["occurrence"]> = {},
) {
  const result: DiscoveryResult = {
    event: {
      id: "f728f63d-8d57-443c-8f9b-777e2e271000",
      venueId: "f728f63d-8d57-443c-8f9b-777e2e271001",
      slug: "gig",
      title: { es: "Concierto en directo", en: "Live gig" },
      description: { es: "Música en vivo", en: "Live music" },
      category: "music",
      priceCents: 1000,
      currency: "EUR",
      source: "verified_venue",
      sponsored: false,
      occurrences: [],
      ...overrides,
    },
    occurrence: {
      id: "f728f63d-8d57-443c-8f9b-777e2e271002",
      startsAt: "2026-10-29T20:00:00.000Z",
      endsAt: "2026-10-30T01:00:00.000Z",
      status: "scheduled",
      ...occurrenceOverrides,
    },
    venue: {
      id: "f728f63d-8d57-443c-8f9b-777e2e271001",
      slug: "real-venue",
      name: "A venue",
      description: { es: "" },
      locality: "fuengirola",
      address: "Fuengirola",
      latitude: 36.539,
      longitude: -4.624,
      verified: true,
      accessible: false,
    },
    distanceKm: 1.2,
  };
  return { result };
}

describe("AkiTonight: strict, real-data discovery contract", () => {
  it("allowlists all query parameters and preserves safe launch defaults", () => {
    const preferences = parseTonightPreferences({
      intent: ["dancing", "sports"],
      area: "http://evil.example",
      radius: "-100000",
      budget: "-1",
      company: "crowd",
      people: "100",
      start: "25",
    });
    expect(preferences).toEqual({
      intent: "all",
      area: "fuengirola",
      radiusKm: 15,
      budget: "any",
      company: "friends",
      people: 4,
      start: "now",
    });
  });

  it("uses verified launch presets without implying live venue activity", () => {
    const preferences = parseTonightPreferences({ area: "benalmadena" });
    expect(tonightArea(preferences).latitude).toBeGreaterThan(36);
    expect(tonightArea(preferences).longitude).toBeLessThan(-4);
    expect(tonightMaximumPriceCents("any")).toBeUndefined();
    expect(tonightMaximumPriceCents("free")).toBe(0);
    expect(tonightMaximumPriceCents("30")).toBe(3000);
  });

  it("never infers dancing or cocktails from a music-only event", () => {
    const item = eventItem().result;
    expect(matchesTonightIntent(item, "live-music")).toBe(true);
    expect(matchesTonightIntent(item, "dancing")).toBe(false);
    expect(matchesTonightIntent(item, "cocktails")).toBe(false);
    expect(matchesTonightIntent(item, "surprise")).toBe(true);
  });

  it("excludes cancelled, expired, malformed and hidden-price events", () => {
    const preferences = parseTonightPreferences({
      intent: "live-music",
      budget: "15",
    });
    const valid = eventItem();
    const cancelled = eventItem({}, { status: "cancelled" });
    const expired = eventItem(
      {},
      { startsAt: "2026-10-28T18:00:00Z", endsAt: "2026-10-28T20:00:00Z" },
    );
    const malformed = eventItem(
      {},
      { startsAt: "n/a", endsAt: "2026-10-30T01:00:00Z" },
    );
    const unknownPrice = eventItem({ priceDisplayMode: "hide" });
    const tooExpensive = eventItem({ priceCents: 6000 });
    expect(
      selectTonightEvents(
        [valid, cancelled, expired, malformed, unknownPrice, tooExpensive],
        preferences,
        now,
      ),
    ).toEqual([valid]);
  });

  it("respects midnight in Europe/Madrid and preserves sponsored source order", () => {
    const earlyEnding = eventItem(
      {},
      { startsAt: "2026-10-29T18:00:00Z", endsAt: "2026-10-29T19:30:00Z" },
    );
    const late = eventItem({ sponsored: true });
    const preferences = parseTonightPreferences({
      start: "0",
      intent: "all",
      company: "friends",
      people: "8",
    });
    expect(selectTonightEvents([late, earlyEnding], preferences, now)).toEqual([
      late,
    ]);
    expect(preferences.people).toBe(8);
  });

  it("keeps events ending minutes after arrival and those continuing past dawn", () => {
    const endsAtHalfPastTen = eventItem({}, { endsAt: "2026-10-29T21:30:00Z" });
    const endsExactlyAtArrival = eventItem(
      {},
      { endsAt: "2026-10-29T21:00:00Z" },
    );
    const overnight = eventItem({}, { endsAt: "2026-10-30T06:00:00Z" });
    expect(
      selectTonightEvents(
        [endsAtHalfPastTen, endsExactlyAtArrival, overnight],
        parseTonightPreferences({ start: "22" }),
        now,
      ),
    ).toEqual([endsAtHalfPastTen, overnight]);
  });

  it("bounds the current night by dates rather than repeating clock hours", () => {
    const tonight = eventItem();
    const tomorrow = eventItem(
      {},
      {
        startsAt: "2026-10-30T20:00:00Z",
        endsAt: "2026-10-31T01:00:00Z",
      },
    );
    expect(
      selectTonightEvents(
        [tonight, tomorrow],
        parseTonightPreferences({ start: "22" }),
        now,
      ),
    ).toEqual([tonight]);
  });

  it("keeps the same evening after midnight and never revives ended events", () => {
    const afterMidnight = new Date("2026-10-30T00:15:00Z");
    const valid = eventItem();
    const ended = eventItem({}, { endsAt: "2026-10-29T23:45:00Z" });
    expect(
      selectTonightEvents(
        [valid, ended],
        parseTonightPreferences({ start: "22" }),
        afterMidnight,
      ),
    ).toEqual([valid]);
  });

  it.each(["Cóctel", "Cócteles", "Coctel", "Cocteles"])(
    "matches the published Spanish cocktail intent %s",
    (title) => {
      expect(
        matchesTonightIntent(
          eventItem({ title: { es: title } }).result,
          "cocktails",
        ),
      ).toBe(true);
    },
  );

  it("does not manufacture plans from an empty candidate set", () => {
    expect(
      selectTonightEvents(
        [],
        parseTonightPreferences({ intent: "dancing" }),
        now,
      ),
    ).toEqual([]);
  });
});
