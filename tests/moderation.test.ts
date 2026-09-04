import { describe, expect, it } from "vitest";
import {
  communitySubmissionSchema,
  moderationDecisionSchema,
  reportResolutionSchema,
  reportSchema,
} from "../src/lib/moderation";

describe("community and moderation validation", () => {
  const selectedLocation = {
    addressSelection: "selected",
    locality: "Fuengirola",
    province: "Málaga",
    postalCode: "29640",
    latitude: 36.53927,
    longitude: -4.62261,
    addressProviderId: "01.29.MUN_290540016257",
    categoryId: "20000000-0000-4000-8000-000000000002",
  } as const;

  it("accepts a valid community suggestion", () => {
    const result = communitySubmissionSchema.safeParse({
      locale: "es",
      venueName: "Centro Cultural",
      venueAddress: "Calle del Mercado 12, Fuengirola",
      ...selectedLocation,
      title: "Taller de verano",
      description: "Una actividad con información suficiente para revisión.",
      startsAt: "2026-08-01T18:00",
      endsAt: "2026-08-01T20:00",
      sourceUrl: "https://example.com/evento",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an ending before the start", () => {
    const result = communitySubmissionSchema.safeParse({
      locale: "en",
      venueName: "Example Hall",
      venueAddress: "12 Example Street",
      ...selectedLocation,
      title: "Example event",
      description: "An event description with enough detail for review.",
      startsAt: "2026-08-01T20:00",
      endsAt: "2026-08-01T18:00",
      sourceUrl: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects insecure evidence links and malformed report targets", () => {
    expect(
      communitySubmissionSchema.safeParse({
        locale: "es",
        venueName: "Sala",
        venueAddress: "Calle 123",
        ...selectedLocation,
        title: "Evento",
        description: "Descripción suficientemente larga para revisar.",
        startsAt: "2026-08-01T18:00",
        endsAt: "2026-08-01T20:00",
        sourceUrl: "http://example.com",
      }).success,
    ).toBe(false);
    expect(
      reportSchema.safeParse({
        locale: "es",
        targetType: "event",
        targetId: "not-a-uuid",
        reason: "scam",
        details: "Detalles suficientes",
      }).success,
    ).toBe(false);
  });

  it("rejects a typed address that was not selected from map data", () => {
    const result = communitySubmissionSchema.safeParse({
      locale: "es",
      venueName: "Sala",
      venueAddress: "Calle Capitan 8",
      ...selectedLocation,
      addressSelection: "",
      title: "Evento comunitario",
      description: "Descripcion suficientemente larga para moderacion.",
      startsAt: "2026-08-01T18:00",
      endsAt: "2026-08-01T20:00",
      sourceUrl: "",
    });
    expect(result.success).toBe(false);
  });

  it("requires auditable moderator reasons", () => {
    const id = "10000000-0000-4000-8000-000000000001";
    expect(
      moderationDecisionSchema.safeParse({
        locale: "es",
        targetType: "event",
        targetId: id,
        decision: "published",
        reason: "",
      }).success,
    ).toBe(false);
    expect(
      reportResolutionSchema.safeParse({
        locale: "en",
        reportId: id,
        decision: "resolved",
        resolution: "Verified with venue",
      }).success,
    ).toBe(true);
    expect(
      moderationDecisionSchema.safeParse({
        locale: "en",
        targetType: "venue",
        targetId: id,
        decision: "published",
        reason: "Business profile checked",
      }).success,
    ).toBe(true);
    expect(
      moderationDecisionSchema.safeParse({
        locale: "en",
        targetType: "offer",
        targetId: id,
        decision: "published",
        reason: "Commercial terms checked",
      }).success,
    ).toBe(true);
  });
});
