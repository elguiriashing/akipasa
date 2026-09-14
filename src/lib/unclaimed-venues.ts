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

export async function nearbyVenues({
  center,
  radiusKm,
}: {
  center: { latitude: number; longitude: number };
  radiusKm: number;
}) {
  return (await publishedVenues({ center })).filter(
    (venue) => venue.distanceKm <= radiusKm,
  );
}

export async function publishedVenues({
  center,
}: {
  center: { latitude: number; longitude: number };
}) {
  const supabase = createSupabasePublicClient();
  const rows: Array<{
    id: string;
    slug: string;
    name: string;
    address: string;
    location: unknown;
    accessibility: unknown;
  }> = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("venues")
      .select("id,slug,name,address,location,accessibility")
      .eq("status", "published")
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Public venue query failed: ${error.message}`);
    const page = (data || []) as typeof rows;
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows
    .flatMap((venue): NearbyVenue[] => {
      const coordinates = geographyPointCoordinates(venue.location);
      if (!coordinates) return [];
      const { longitude, latitude } = coordinates;
      const distanceKm = geographicDistanceKm(center, {
        latitude,
        longitude,
      });
      return [
        {
          id: venue.id,
          slug: venue.slug,
          name: venue.name,
          address: venue.address,
          latitude,
          longitude,
          distanceKm,
          claimStatus: venueClaimStatus(venue.accessibility),
        },
      ];
    })
    .sort((left, right) => left.distanceKm - right.distanceKm);
}

export async function nearbyUnclaimedVenues(options: {
  center: { latitude: number; longitude: number };
  radiusKm: number;
}) {
  return (await nearbyVenues(options)).filter(
    (venue) => venue.claimStatus === "unclaimed",
  );
}
