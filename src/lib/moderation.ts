import { z } from "zod";
import { madridLocalDateTimeSchema } from "./time";

export const communitySubmissionSchema = z
  .object({
    locale: z.enum(["es", "en"]),
    venueName: z.string().trim().min(2).max(160),
    venueAddress: z.string().trim().min(5).max(300),
    addressSelection: z.literal("selected"),
    locality: z.string().trim().min(2).max(120),
    province: z.string().trim().min(2).max(120),
    postalCode: z.string().trim().max(20),
    latitude: z.coerce.number().min(27).max(44.5),
    longitude: z.coerce.number().min(-19).max(5),
    addressProviderId: z.string().trim().min(1).max(160),
    categoryId: z.string().uuid(),
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(20).max(4000),
    startsAt: madridLocalDateTimeSchema,
    endsAt: madridLocalDateTimeSchema,
    sourceUrl: z.union([
      z.literal(""),
      z
        .string()
        .url()
        .refine((value) => value.startsWith("https://")),
    ]),
  })
  .refine((value) => value.endsAt > value.startsAt, { path: ["endsAt"] });

export const reportSchema = z.object({
  locale: z.enum(["es", "en"]),
  targetType: z.enum(["event", "venue"]),
  targetId: z.string().uuid(),
  reason: z.enum(["cancelled", "duplicate", "incorrect", "scam", "other"]),
  details: z.string().trim().min(10).max(2000),
});

export const moderationDecisionSchema = z.object({
  locale: z.enum(["es", "en"]),
  targetType: z.enum(["submission", "venue", "event", "offer", "venue_claim"]),
  targetId: z.string().uuid(),
  decision: z.enum(["approved", "published", "rejected"]),
  reason: z.string().trim().min(3).max(2000),
  duplicateOf: z.union([z.literal(""), z.string().uuid()]).optional(),
});

export const reportResolutionSchema = z.object({
  locale: z.enum(["es", "en"]),
  reportId: z.string().uuid(),
  decision: z.enum(["resolved", "dismissed"]),
  resolution: z.string().trim().min(3).max(2000),
});
