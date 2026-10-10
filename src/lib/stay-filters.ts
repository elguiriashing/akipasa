import type { Stay } from "./akiduermo";
import {
  comparableVenueSearch,
  escapeVenueSearchPattern,
  venueSearchProbes,
} from "./venue-search";

export function staySearchFilters(q: string) {
  const search = q
    .replace(/[(),.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!search) return "";
  // Long place names generated dozens of ILIKE clauses and timed out the
  // public listing query. Short names still get bounded accent variants.
  const probes =
    search.length <= 6
      ? venueSearchProbes(search)
          .filter(
            (probe) =>
              comparableVenueSearch(probe) === comparableVenueSearch(search),
          )
          .slice(0, 8)
      : [];
  return [...new Set([search, ...probes])]
    .flatMap((probe) => {
      const pattern = escapeVenueSearchPattern(probe);
      return [`name.ilike.%${pattern}%`, `address.ilike.%${pattern}%`];
    })
    .join(",");
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
