/**
 * Private AkiPals World prototype. No GPS is persisted, no visit is verified,
 * and nothing here awards XP, checks users in, or publishes social presence.
 */
export const WORLD_START = { latitude: 36.543, longitude: -4.623 } as const;
export const WORLD_VENUE_LIMIT = 80;

export type WorldVenue = {
  id: string;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  claimStatus: "claimed" | "unclaimed";
};

export function coarseWorldCell(latitude: number, longitude: number) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return null;
  // Only coarse map cells are transmitted to the venue discovery endpoint.
  // Precise coordinates stay in the browser for the moving avatar.
  return {
    latitude: Math.round(latitude * 100) / 100,
    longitude: Math.round(longitude * 100) / 100,
  };
}

export function parseWorldCell(url: string) {
  let query: URLSearchParams;
  try {
    query = new URL(url).searchParams;
  } catch {
    return null;
  }
  const lat = query.get("lat");
  const lng = query.get("lng");
  if (
    !lat ||
    !lng ||
    !/^-?\d{1,3}(?:\.\d{1,2})?$/.test(lat) ||
    !/^-?\d{1,3}(?:\.\d{1,2})?$/.test(lng)
  )
    return null;
  const cell = coarseWorldCell(Number(lat), Number(lng));
  if (!cell) return null;
  // Reject unnecessarily precise input; no raw location query is accepted.
  if (cell.latitude !== Number(lat) || cell.longitude !== Number(lng))
    return null;
  return cell;
}

export function normalizeWorldVenues(input: unknown): WorldVenue[] {
  if (!Array.isArray(input)) return [];
  const found = new Set<string>();
  const result: WorldVenue[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      !row.id.trim() ||
      row.id.length > 120 ||
      typeof row.slug !== "string" ||
      !/^[a-z0-9][a-z0-9-]{0,119}$/i.test(row.slug) ||
      typeof row.name !== "string" ||
      !row.name.trim() ||
      typeof row.latitude !== "number" ||
      typeof row.longitude !== "number" ||
      !coarseWorldCell(row.latitude, row.longitude) ||
      found.has(row.id)
    )
      continue;
    found.add(row.id);
    result.push({
      id: row.id,
      slug: row.slug,
      name: row.name.trim().slice(0, 120),
      latitude: row.latitude,
      longitude: row.longitude,
      claimStatus: row.claimStatus === "claimed" ? "claimed" : "unclaimed",
    });
    if (result.length >= WORLD_VENUE_LIMIT) break;
  }
  return result;
}
