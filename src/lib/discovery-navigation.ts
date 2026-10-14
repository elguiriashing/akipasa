import type { Locale } from "./config";

const discoveryKeys = [
  "locality",
  "locationName",
  "latitude",
  "longitude",
  "radius",
  "time",
  "category",
  "price",
  "minPrice",
  "maxPrice",
  "dateFrom",
  "dateTo",
  "accessible",
] as const;

type DiscoveryQuery =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function queryValue(query: DiscoveryQuery, key: string) {
  const value = query instanceof URLSearchParams ? query.get(key) : query[key];
  return typeof value === "string" ? value.slice(0, 160) : undefined;
}

export function discoveryViewHref(
  locale: Locale,
  view: "discover" | "map",
  query: DiscoveryQuery,
) {
  const params = new URLSearchParams();
  for (const key of discoveryKeys) {
    const value = queryValue(query, key);
    if (value) params.set(key, value);
  }
  const path = view === "map" ? `/${locale}/map` : `/${locale}`;
  return params.size ? `${path}?${params}` : path;
}
