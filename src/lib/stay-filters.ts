import type { Stay } from "./akiduermo";
import { comparableVenueSearch, venueSearchTokens } from "./venue-search";

export function staySearchTerms(q: string) {
  // The published catalogue already has an unaccented GIN search_document.
  // Prefix terms retain city/name partial matches without an unindexed ILIKE
  // scan across every accommodation row.
  return venueSearchTokens(q)
    .filter((token) => /^[a-z0-9]+$/.test(token))
    .slice(0, 6)
    .map((token) => `${token}:*`)
    .join(" & ");
}
export function filterSavedStays(stays: Stay[], type: string, q: string) {
  const search = comparableVenueSearch(q.replace(/[(),.]/g, " "));
  return stays.filter(
    (stay) =>
      (type === "all" || stay.accommodationType === type) &&
      (!search ||
        comparableVenueSearch(stay.name).includes(search) ||
        comparableVenueSearch(stay.address).includes(search)),
  );
}
