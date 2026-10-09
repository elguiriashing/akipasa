import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const staySearchSchema = z
  .object({
    venue: z.string().uuid(),
    checkIn: date,
    checkOut: date,
    guests: z.coerce.number().int().min(1).max(30),
  })
  .refine((value) => value.checkOut > value.checkIn);
export const stayMutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("quote"),
    roomType: z.string().uuid(),
    checkIn: date,
    checkOut: date,
    guests: z.number().int().min(1).max(30),
  }),
  z.object({
    action: z.literal("request"),
    quote: z.string().uuid(),
    key: z.string().uuid(),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    locale: z.enum(["en", "es"]),
  }),
  z.object({ action: z.literal("cancel"), reservation: z.string().uuid() }),
]);
export type StayRoomQuote = {
  room_type_id: string;
  room_name: string;
  total_cents: number;
  nights: number;
  available: number;
  policy: string;
};
export type StayQuote = {
  id: string;
  expires_at: string;
  snapshot: StayRoomQuote;
};
