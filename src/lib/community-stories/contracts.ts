import { z } from "zod";
export const storyIdSchema = z.string().uuid();
export const storyInputSchema = z
  .object({
    checkInId: storyIdSchema,
    kind: z.enum(["selfie", "venue"]),
    caption: z.string().trim().max(240),
    publicOptIn: z.literal("true"),
  })
  .strict();
export const storyModerationSchema = z
  .object({
    decision: z.enum(["approve", "reject", "remove"]),
    reason: z.string().trim().min(3).max(240),
  })
  .strict();
export type StoryStatus = "pending" | "approved" | "rejected";
export type CityStory = {
  id: string;
  citySlug: string;
  venueName: string;
  caption: string;
  kind: "selfie" | "venue";
  createdAt: string;
  expiresAt: string;
  mediaUrl: string;
};
/** Only canonical city centroids, never a visitor's geolocation. */
export type StoryCity = {
  id: string;
  slug: string;
  nameEs: string;
  nameEn: string | null;
  latitude: number;
  longitude: number;
  approvedStories24h: number;
};
