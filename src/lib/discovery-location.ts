import type { Locale } from "./config";
import { isSpainLocation, spainLocations } from "./locations";

type Query = Record<string, string | string[] | undefined>;

function value(query: Query, key: string) {
  return typeof query[key] === "string" ? query[key] : undefined;
}

export function discoveryLocationFromQuery(query: Query, locale: Locale) {
  const requestedLocality = value(query, "locality") || "fuengirola";
  const locality = isSpainLocation(requestedLocality)
    ? requestedLocality
    : "fuengirola";
  const fallback = spainLocations[locality];
  const latitude = Number(value(query, "latitude"));
  const longitude = Number(value(query, "longitude"));
  const custom =
    Number.isFinite(latitude) &&
    latitude >= 27 &&
    latitude <= 44.5 &&
    Number.isFinite(longitude) &&
    longitude >= -19 &&
    longitude <= 5;
  const requestedName = (value(query, "locationName") || "")
    .trim()
    .slice(0, 160);

  return {
    locality,
    name: custom && requestedName ? requestedName : fallback[locale],
    center: custom
      ? { latitude, longitude }
      : { latitude: fallback.latitude, longitude: fallback.longitude },
    custom,
  };
}
