import { z } from "zod";

export const stayTypes = [
  "hotel",
  "apartment",
  "rural_house",
  "hostel",
  "guest_house",
  "campsite",
  "motel",
  "student_accommodation",
] as const;
export const stayTypeNames: Record<string, string> = {
  hotel: "Hotels",
  apartment: "Apartments",
  rural_house: "Rural escapes",
  hostel: "Hostels",
  guest_house: "Guest houses",
  campsite: "Camping",
  motel: "Motels",
  student_accommodation: "Student stays",
};
export const stayQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  type: z.enum(["all", ...stayTypes]).default("all"),
  page: z.coerce.number().int().min(1).max(5000).default(1),
});
export const staySchema = z.object({
  id: z.string().uuid(),
  slug: z.string().max(300),
  name: z.string().max(300),
  address: z.string().max(1000),
  accommodationType: z.string().max(100),
  website: z.string().nullable(),
  city: z.string().max(150),
});
export type Stay = z.infer<typeof staySchema>;
export function safePropertyWebsite(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
