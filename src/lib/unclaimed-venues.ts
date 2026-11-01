import { createSupabasePublicClient } from "./supabase/public";

export type NearbyVenue = {
  id: string;
  slug: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  claimStatus: "claimed" | "unclaimed";
  imageUrl?: string;
};

export type NearbyUnclaimedVenue = NearbyVenue;

export function geographyPointCoordinates(value: unknown) {
  if (value && typeof value === "object" && "coordinates" in value) {
    const coordinates = (value as { coordinates?: unknown }).coordinates;
    if (
      Array.isArray(coordinates) &&
      Number.isFinite(Number(coordinates[0])) &&
      Number.isFinite(Number(coordinates[1]))
    ) {
      return {
        longitude: Number(coordinates[0]),
        latitude: Number(coordinates[1]),
      };
    }
  }

  if (typeof value !== "string" || !/^[0-9a-f]+$/i.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  if (bytes.length < 25) return null;
  const view = new DataView(bytes.buffer);
  const littleEndian = view.getUint8(0) === 1;
  const geometryType = view.getUint32(1, littleEndian);
  const hasSrid = (geometryType & 0x20000000) !== 0;
  const coordinateOffset = hasSrid ? 9 : 5;
  if (bytes.length < coordinateOffset + 16) return null;
  const longitude = view.getFloat64(coordinateOffset, littleEndian);
  const latitude = view.getFloat64(coordinateOffset + 8, littleEndian);
  return Number.isFinite(longitude) && Number.isFinite(latitude)
    ? { longitude, latitude }
    : null;
}

export function geographicDistanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const fromLatitude = radians(from.latitude);
  const toLatitude = radians(to.latitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function venueClaimStatus(accessibility: unknown) {
  return accessibility &&
    typeof accessibility === "object" &&
    (accessibility as { claim_status?: unknown }).claim_status === "unclaimed"
    ? ("unclaimed" as const)
    : ("claimed" as const);
}

/**
 * Resolve only the published page's media. The geography RPC intentionally
 * returns metadata only; AkiHQ's selected venue_explore asset is read through
 * the existing public placement/storage policies without changing that RPC.
 */
async function pageArtwork(
  supabase: ReturnType<typeof createSupabasePublicClient>,
  venueIds: string[],
): Promise<Map<string, string>> {
  if (!venueIds.length) return new Map();
  const chosen = new Map<string, { path: string; priority: number }>();
  const { data: placements, error: placementError } = await supabase
    .from("venue_media_placements")
    .select("venue_id,placement,venue_media(id,storage_path)")
    .in("venue_id", venueIds)
    .eq("target_key", "")
    .in("placement", ["venue_explore", "venue_cover", "venue_profile"]);
  if (placementError) throw placementError;
  const priorities: Record<string, number> = {
    venue_explore: 0,
    venue_cover: 1,
    venue_profile: 2,
  };
  for (const row of placements || []) {
    const media = Array.isArray(row.venue_media)
      ? row.venue_media[0]
      : row.venue_media;
    const id = String(row.venue_id);
    const priority = priorities[String(row.placement)];
    const path = media?.storage_path;
    if (
      !venueIds.includes(id) ||
      priority === undefined ||
      typeof path !== "string" ||
      !path ||
      (chosen.get(id)?.priority ?? Infinity) <= priority
    )
      continue;
    chosen.set(id, { path, priority });
  }

  // Legacy/unclaimed listings may have approved media but no explicit slot.
  const withoutPlacement = venueIds.filter((id) => !chosen.has(id));
  if (withoutPlacement.length) {
    const { data: fallback, error: fallbackError } = await supabase
      .from("venue_media")
      .select("venue_id,storage_path")
      .in("venue_id", withoutPlacement)
      .not("storage_path", "like", "%/events/%")
      .order("sort_order")
      .limit(500);
    if (fallbackError) throw fallbackError;
    for (const row of fallback || []) {
      const id = String(row.venue_id);
      if (
        withoutPlacement.includes(id) &&
        !chosen.has(id) &&
        typeof row.storage_path === "string" &&
        row.storage_path
      )
        chosen.set(id, { path: row.storage_path, priority: 3 });
    }
  }

  const paths = [...new Set([...chosen.values()].map((item) => item.path))];
  if (!paths.length) return new Map();
  const { data: signed, error: signError } = await supabase.storage
    .from("event-media")
    .createSignedUrls(paths, 3600);
  if (signError) throw signError;
  const signedPaths = new Map(
    (signed || []).flatMap((item) =>
      item.path && item.signedUrl && !item.error
        ? [[item.path, item.signedUrl] as const]
        : [],
    ),
  );
  return new Map(
    [...chosen.entries()].flatMap(([id, item]) => {
      const url = signedPaths.get(item.path);
      return url ? [[id, url] as const] : [];
    }),
  );
}

export async function nearbyVenuePage({
  center,
  radiusKm,
  page = 1,
  unclaimedOnly = false,
}: {
  center: { latitude: number; longitude: number };
  radiusKm: number;
  page?: number;
  unclaimedOnly?: boolean;
}): Promise<{ rows: NearbyVenue[]; total: number; page: number }> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc("public_nearby_venue_page", {
    p_lat: center.latitude,
    p_lng: center.longitude,
    p_radius: radiusKm,
    p_page: page,
    p_unclaimed: unclaimedOnly,
  });
  if (error) throw new Error(`Public venue query failed: ${error.message}`);
  const result = data as { rows: NearbyVenue[]; total: number; page: number };
  if (!result.rows?.length) return result;
  try {
    const images = await pageArtwork(
      supabase,
      result.rows.map((row) => row.id),
    );
    return {
      ...result,
      rows: result.rows.map((row) => ({
        ...row,
        ...(images.has(row.id) ? { imageUrl: images.get(row.id) } : {}),
      })),
    };
  } catch (error) {
    // A failed media service must never hide legitimate nearby businesses.
    console.warn("Nearby venue artwork temporarily unavailable", error);
    return result;
  }
}
