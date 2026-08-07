import type { Locale } from "./config";

export type Translation = { es: string; en?: string };
export type Venue = {
  id: string;
  slug: string;
  name: string;
  description: Translation;
  locality: string;
  address: string;
  latitude: number;
  longitude: number;
  verified: boolean;
  accessible: boolean;
  phone?: string;
  whatsappPhone?: string;
  websiteUrl?: string;
  media?: Array<{
    id: string;
    url: string;
    alt: Translation;
  }>;
  offers?: Array<{
    id: string;
    title: Translation;
    terms: Translation;
    startsAt: string;
    endsAt: string;
  }>;
  loyalty?: Array<{
    id: string;
    title: Translation;
    reward: Translation;
    stampsRequired: number;
  }>;
};
export type OccurrenceStatus =
  | "scheduled"
  | "cancelled"
  | "postponed"
  | "sold_out";
export type Occurrence = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: OccurrenceStatus;
  bookingUrl?: string;
};
export type Event = {
  id: string;
  slug: string;
  title: Translation;
  description: Translation;
  venueId: string;
  category: string;
  priceCents: number;
  currency: "EUR";
  source: "verified_venue" | "community";
  sponsored: boolean;
  bookingUrl?: string;
  minimumAge?: number;
  accessibilityNotes?: Translation;
  occurrences: Occurrence[];
};
export type TimeWindow = "now" | "tonight" | "tomorrow" | "weekend" | "all";
export type DiscoveryQuery = {
  locality?: string;
  radiusKm?: number;
  time?: TimeWindow;
  dateFrom?: Date;
  dateTo?: Date;
  category?: string;
  price?: "free" | "paid";
  minPriceCents?: number;
  maxPriceCents?: number;
  accessible?: boolean;
  now?: Date;
};
export type DiscoveryResult = {
  event: Event;
  occurrence: Occurrence;
  venue: Venue;
  distanceKm: number;
};

export function translated(value: Translation, locale: Locale): string {
  return value[locale] || value.es;
}
