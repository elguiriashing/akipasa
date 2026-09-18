export type MapVenue = {
  id: string;
  slug: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  claimStatus: "claimed" | "unclaimed";
};

// Batches bound individual requests, not coverage. Continue until the server
// confirms exhaustion. Cancelling the load stops the entire traversal.
export async function* mapVenuePages(
  bounds: URLSearchParams,
  signal: AbortSignal,
  request: typeof fetch = fetch,
): AsyncGenerator<MapVenue[]> {
  const query = new URLSearchParams(bounds);
  query.delete("after");
  let cursor: string | null = null;
  do {
    signal.throwIfAborted();
    if (cursor) query.set("after", cursor);
    const response = await request("/api/map/venues?" + query, { signal });
    if (!response.ok) throw new Error("Map unavailable");
    const data: {
      rows: MapVenue[];
      hasMore: boolean;
      nextCursor: string | null;
    } = await response.json();
    signal.throwIfAborted();
    if (
      data.hasMore &&
      (!data.nextCursor || (cursor && data.nextCursor <= cursor))
    )
      throw new Error("Map pagination did not advance");
    yield data.rows;
    cursor = data.hasMore ? data.nextCursor : null;
  } while (cursor);
}

// The map keeps this complete dataset for its lifetime. Panning and zooming
// only affect MapLibre rendering; neither supplies bounds nor restarts loading.
export async function loadSpainMapVenues(
  signal: AbortSignal,
  onProgress: (count: number) => void,
  request: typeof fetch = fetch,
): Promise<MapVenue[]> {
  const bounds = new URLSearchParams({
    west: "-19",
    east: "5",
    south: "27",
    north: "45",
  });
  const venues: MapVenue[] = [];
  for await (const rows of mapVenuePages(bounds, signal, request)) {
    venues.push(...rows);
    onProgress(venues.length);
  }
  return venues;
}
