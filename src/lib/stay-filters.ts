import { z } from "zod";
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
  const probes = venueSearchProbes(search).filter(
    (probe) => comparableVenueSearch(probe) === comparableVenueSearch(search),
  );
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
const mapMatchPage = z.object({
  ids: z.array(z.string().uuid()),
  total: z.number().int().nonnegative().max(100000),
});
// Fetch every matching ID, independently of the twelve-card Explore pagination.
export async function loadStayMapMatches(
  type: string,
  q: string,
  signal: AbortSignal,
  request: typeof fetch = fetch,
) {
  const read = async (page: number) => {
    const response = await request(
      `/api/map/stays?${new URLSearchParams({ type, q, page: String(page) })}`,
      { signal },
    );
    if (!response.ok) throw new Error("Stay filters unavailable");
    return mapMatchPage.parse(await response.json());
  };
  const first = await read(1);
  const ids = new Set(first.ids);
  const pages = Array.from(
    { length: Math.max(0, Math.ceil(first.total / 1000) - 1) },
    (_, i) => i + 2,
  );
  await Promise.all(
    Array.from({ length: Math.min(4, pages.length) }, async () => {
      while (pages.length) {
        signal.throwIfAborted();
        const result = await read(pages.shift()!);
        for (const id of result.ids) ids.add(id);
      }
    }),
  );
  signal.throwIfAborted();
  return ids;
}
