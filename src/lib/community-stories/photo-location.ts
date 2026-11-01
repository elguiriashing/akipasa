import type { SupabaseClient } from "@supabase/supabase-js";

export type StoryPhotoLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  locatedAt: number;
};
export type StoryPhotoLocationFailure =
  | "location_required"
  | "location_inaccurate"
  | "location_expired"
  | "outside_geofence"
  | "not_eligible"
  | "unavailable";

function coordinates(latitude: unknown, longitude: unknown) {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

// Database geography(Point,4326) only. Never substitute zero for malformed data.
function venuePoint(value: unknown): [number, number] | null {
  if (typeof value === "string") {
    const hex = value.startsWith("\\x") ? value.slice(2) : value;
    if (!/^[0-9a-f]{50}$/i.test(hex)) return null;
    const bytes = Uint8Array.from(hex.match(/../g)!, (b) => parseInt(b, 16));
    const view = new DataView(bytes.buffer);
    if (bytes[0] !== 0 && bytes[0] !== 1) return null;
    const littleEndian = bytes[0] === 1;
    // Exact EWKB 2D Point + explicit SRID; reject Z/M, unknown SRIDs and WKB.
    if (
      view.getUint32(1, littleEndian) !== 0x20000001 ||
      view.getUint32(5, littleEndian) !== 4326
    )
      return null;
    const longitude = view.getFloat64(9, littleEndian);
    const latitude = view.getFloat64(17, littleEndian);
    return coordinates(latitude, longitude)
      ? [latitude as number, longitude as number]
      : null;
  }
  if (value && typeof value === "object") {
    const point = value as Record<string, unknown>;
    if (
      point.type !== "Point" ||
      "crs" in point ||
      !Array.isArray(point.coordinates) ||
      point.coordinates.length !== 2
    )
      return null;
    const [longitude, latitude] = point.coordinates;
    return coordinates(latitude, longitude) ? [latitude, longitude] : null;
  }
  return null;
}

/** Additional upload gate, using fresh caller-scoped reads, not service access.
 * Haversine measures reported coordinates; browser GPS/time is not attestation.
 * The later canonical reservation remains authoritative for visit eligibility.
 * Nothing here stores or logs precise location, or awards a check-in/XP.
 */
export async function verifyStoryPhotoLocation(
  db: SupabaseClient,
  profileId: string,
  checkInId: string,
  location: StoryPhotoLocation,
  now = Date.now(),
): Promise<StoryPhotoLocationFailure | null> {
  if (!location || !coordinates(location.latitude, location.longitude))
    return "location_required";
  if (
    typeof location.accuracy !== "number" ||
    !Number.isFinite(location.accuracy) ||
    location.accuracy < 0 ||
    location.accuracy > 50
  )
    return "location_inaccurate";
  if (!Number.isFinite(now)) return "unavailable";
  if (
    typeof location.locatedAt !== "number" ||
    !Number.isFinite(location.locatedAt) ||
    now - location.locatedAt > 60_000 ||
    location.locatedAt - now > 5_000
  )
    return "location_expired";
  if (!profileId || !checkInId) return "not_eligible";
  try {
    const { data: visit, error: visitError } = await db
      .from("check_ins")
      .select("id,profile_id,venue_id,state,created_at,risk_flags")
      .eq("id", checkInId)
      .eq("profile_id", profileId)
      .eq("state", "accepted")
      .maybeSingle();
    if (visitError) return "unavailable";
    if (
      !visit ||
      visit.id !== checkInId ||
      visit.profile_id !== profileId ||
      visit.state !== "accepted" ||
      typeof visit.venue_id !== "string" ||
      !visit.venue_id
    )
      return "not_eligible";
    const acceptedAt =
      typeof visit.created_at === "string" ? Date.parse(visit.created_at) : NaN;
    if (
      !Number.isFinite(acceptedAt) ||
      acceptedAt > now ||
      now - acceptedAt > 24 * 60 * 60 * 1000 ||
      (visit.risk_flags !== null &&
        (!Array.isArray(visit.risk_flags) ||
          visit.risk_flags.some(
            (flag: unknown) => typeof flag !== "string",
          ))) ||
      visit.risk_flags?.includes("outside_geofence")
    )
      return "not_eligible";
    const { data: venue, error: venueError } = await db
      .from("venues")
      .select("id,location,status,verified")
      .eq("id", visit.venue_id)
      .maybeSingle();
    if (venueError) return "unavailable";
    if (
      !venue ||
      venue.id !== visit.venue_id ||
      venue.status !== "published" ||
      venue.verified !== true
    )
      return "not_eligible";
    const point = venuePoint(venue.location);
    if (!point) return "unavailable";
    const radians = Math.PI / 180;
    const a =
      Math.sin(((location.latitude - point[0]) * radians) / 2) ** 2 +
      Math.cos(point[0] * radians) *
        Math.cos(location.latitude * radians) *
        Math.sin(((location.longitude - point[1]) * radians) / 2) ** 2;
    const distance =
      2 * 6_371_008.8 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, a))));
    // Fixed radius: reported accuracy never enlarges the allowed distance.
    return distance <= 100 ? null : "outside_geofence";
  } catch {
    return "unavailable";
  }
}
