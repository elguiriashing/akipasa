import { spainLocations, type SpainLocationKey } from "./locations";
import { distanceKm } from "./geo";
import photos from "./city-photos.json";
import type { Locale } from "./config";

export const featuredCityKeys = [
  "madrid",
  "barcelona",
  "malaga",
  "valencia",
  "sevilla",
] as const;
export const majorCities = Object.entries(photos).map(([key, photo]) => ({
  key: key as SpainLocationKey,
  ...spainLocations[key as SpainLocationKey],
  photo,
}));
export type DiscoveryCity = (typeof majorCities)[number];
export function nearestMajorCities(
  center: { latitude: number; longitude: number },
  count = 3,
) {
  if (
    !Number.isFinite(center.latitude) ||
    !Number.isFinite(center.longitude) ||
    Math.abs(center.latitude) > 90 ||
    Math.abs(center.longitude) > 180
  )
    return [];
  return majorCities
    .map((city) => ({
      ...city,
      distance: distanceKm(
        center.latitude,
        center.longitude,
        city.latitude,
        city.longitude,
      ),
    }))
    .sort((a, b) => a.distance - b.distance || a.key.localeCompare(b.key))
    .slice(0, count);
}
export function cityDiscoveryHref(city: DiscoveryCity, locale: Locale) {
  const params = new URLSearchParams({
    locality: city.key,
    locationName: city[locale],
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    radius: "25",
    time: "all",
  });
  return `/${locale}?${params}#results`;
}
