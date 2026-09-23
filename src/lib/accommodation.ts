import type { CompactMapMarker } from "./map-snapshot";

export type DiscoveryVertical = "activities" | "accommodation";
export const accommodationLabel = (locale: string) =>
  locale === "es" ? "Alojamientos" : "Accommodation";

export function markerIsVisible(
  marker: CompactMapMarker,
  vertical: DiscoveryVertical,
) {
  return (marker[4] === 1) === (vertical === "accommodation");
}

export function markerSource(marker: CompactMapMarker) {
  if (marker[4] === 1) return "accommodation" as const;
  return marker[3] === 1 ? ("unclaimed" as const) : ("claimed" as const);
}
