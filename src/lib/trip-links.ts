import { z } from "zod";
import type { Locale } from "./config";
export const tripSchema = z.object({
  latitude: z.coerce.number().min(27).max(44.5).optional().catch(undefined),
  longitude: z.coerce.number().min(-19).max(5).optional().catch(undefined),
  q: z.string().trim().max(100).default(""),
  checkIn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  checkOut: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  guests: z.coerce.number().int().min(1).max(20).default(2).catch(2),
});
export type TripIntent = z.infer<typeof tripSchema>;
export function eventStayHref(
  locale: Locale,
  locality: string,
  start: string,
  end: string,
  coordinates?: { latitude: number; longitude: number },
) {
  const day = (value: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  const arrival = day(start);
  const last = day(end);
  const checkout = new Date(`${last}T12:00:00Z`);
  checkout.setUTCDate(checkout.getUTCDate() + 1);
  const params = new URLSearchParams({
    lang: locale,
    q: locality.replace(/-/g, " "),
    checkIn: arrival,
    checkOut: checkout.toISOString().slice(0, 10),
    guests: "2",
  });
  if (coordinates) {
    params.set("latitude", String(coordinates.latitude));
    params.set("longitude", String(coordinates.longitude));
  }
  return `https://akiduermo.akipasa.com/?${params}`;
}
export function nearbyEventsHref(
  locale: Locale,
  city: string,
  checkIn = "",
  checkOut = "",
  coordinates?: { latitude: number; longitude: number },
) {
  const params = new URLSearchParams({
    locality: city
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, "-"),
    locationName: city,
    time: "all",
  });
  if (
    coordinates &&
    Number.isFinite(coordinates.latitude) &&
    coordinates.latitude >= 27 &&
    coordinates.latitude <= 44.5 &&
    Number.isFinite(coordinates.longitude) &&
    coordinates.longitude >= -19 &&
    coordinates.longitude <= 5
  ) {
    params.set("latitude", String(coordinates.latitude));
    params.set("longitude", String(coordinates.longitude));
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(checkIn)) params.set("dateFrom", checkIn);
  if (/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) params.set("dateTo", checkOut);
  return `https://akipasa.com/${locale}?${params}`;
}
