import { createServer } from "node:http";

const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

// Synthetic published activity venues, all within a kilometre of Fuengirola.
// More than 2,000 rows exercise the actual Next map API's cursor boundary.
// This fixture models RPC response/pagination contracts, not Postgres/RLS logic.
export const publicUiVenues = Array.from({ length: 2_105 }, (_, index) => ({
  id: `e2e00000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  slug: `e2e-synthetic-venue-${index + 1}`,
  name: `E2E synthetic venue ${String(index + 1).padStart(4, "0")}`,
  address: `E2E fixture address ${index + 1}, Fuengirola`,
  latitude: 36.539 + (Math.floor(index / 50) - 21) * 0.00015,
  longitude: -4.624 + ((index % 50) - 25) * 0.00015,
  claimStatus: index % 3 === 0 ? "unclaimed" : "claimed",
}));

const detailTables = new Set([
  "offers",
  "loyalty_programs",
  "venue_media",
  "venue_media_placements",
  "venue_booking_settings",
]);

function venueRow(venue) {
  return {
    id: venue.id,
    slug: venue.slug,
    name: venue.name,
    address: venue.address,
    description_es:
      "Local sintético usado solo en pruebas aisladas de interfaz.",
    description_en: "Synthetic venue used only for isolated browser tests.",
    location: { type: "Point", coordinates: [venue.longitude, venue.latitude] },
    verified: false,
    accessibility: { claim_status: venue.claimStatus, step_free: true },
    discovery_vertical: "activities",
    discovery_enabled: true,
    recommendation_weight: 1,
    cities: { slug: "fuengirola" },
  };
}

function knownVenueFilter(value) {
  return value?.startsWith("eq.")
    ? publicUiVenues.find((venue) => venue.id === value.slice(3))
    : undefined;
}

function publicDetailRead(url) {
  const table = url.pathname.replace(/^\/rest\/v1\//, "");
  if (
    table === "creator_profiles" &&
    url.searchParams.get("state") === "eq.published"
  ) {
    // Disposable public profile for browser rendering only. No Auth or writes.
    const creator = {
      profile_id: "10000000-0000-4000-8000-000000000001",
      slug: "ana-local",
      display_name: "Synthetic creator for interface testing",
      headline_es: "Perfil sintético de prueba",
      headline_en: "Synthetic test profile",
      bio_es: "Contenido sintético usado solo en pruebas aisladas de interfaz.",
      bio_en: "Synthetic content used only for isolated interface tests.",
      locality: "Málaga",
      province: "Málaga",
      avatar_url: "/brand/v3/pasa-192.png",
      cover_url: "/images/akipasa/nightlife-editorial.webp",
      website_url: null,
      instagram_url: null,
      youtube_url: null,
      verification_state: "unverified",
      updated_at: "2026-10-14T00:00:00Z",
      creator_categories: [],
      creator_reviews: [],
      events: [],
    };
    const slug = url.searchParams.get("slug");
    return !slug || slug === "eq.ana-local" ? [creator] : [];
  }
  if (table === "venues" && url.searchParams.get("status") === "eq.published") {
    const slug = url.searchParams.get("slug");
    const id = url.searchParams.get("id");
    if (!slug?.startsWith("eq.") && !id?.startsWith("eq.")) return undefined;
    const venue = publicUiVenues.find(
      (item) =>
        (!slug || item.slug === slug.slice(3)) &&
        (!id || item.id === id.slice(3)),
    );
    return venue ? [venueRow(venue)] : [];
  }
  const venueId = url.searchParams.get("venue_id");
  if (detailTables.has(table) && knownVenueFilter(venueId)) return [];
  if (
    table === "events" &&
    url.searchParams.get("status") === "eq.published" &&
    (!venueId || knownVenueFilter(venueId))
  )
    return [];
  if (
    table === "feature_flags" &&
    url.searchParams.get("select") === "key,enabled"
  )
    return [];
  return undefined;
}

export function publicUiFixtureAddress(env = process.env) {
  if (env.NEXT_PUBLIC_DATA_PROVIDER !== "fixtures") return null;
  let address;
  try {
    address = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  } catch {
    throw new Error(
      "Public UI fixtures require an explicit localhost Supabase URL.",
    );
  }
  if (
    address.protocol !== "http:" ||
    !localHosts.has(address.hostname) ||
    !address.port ||
    Number(address.port) < 1024 ||
    address.username ||
    address.password ||
    address.pathname !== "/" ||
    address.search ||
    address.hash
  ) {
    throw new Error(
      "Public UI fixtures only bind an explicit, uncredentialed localhost HTTP port.",
    );
  }
  return address;
}

function within(value, min, max) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function distanceKm(origin, venue) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(venue.latitude - origin.latitude);
  const longitudeDelta = radians(venue.longitude - origin.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(origin.latitude)) *
      Math.cos(radians(venue.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearbyPage(params) {
  const { p_lat, p_lng, p_radius, p_page = 1, p_unclaimed = false } = params;
  if (
    !within(p_lat, -90, 90) ||
    !within(p_lng, -180, 180) ||
    !within(p_radius, 0.1, 100) ||
    !Number.isInteger(p_page) ||
    !within(p_page, 1, 100_000) ||
    typeof p_unclaimed !== "boolean"
  )
    throw new Error("Invalid discovery parameters");
  const matches = publicUiVenues
    .filter((venue) => !p_unclaimed || venue.claimStatus === "unclaimed")
    .map((venue) => ({
      ...venue,
      recommendationWeight: 1,
      distanceKm: distanceKm({ latitude: p_lat, longitude: p_lng }, venue),
    }))
    .filter((venue) => venue.distanceKm <= p_radius)
    .sort((a, b) => a.distanceKm - b.distanceKm || a.id.localeCompare(b.id));
  const page = Math.min(p_page, Math.max(1, Math.ceil(matches.length / 20)));
  return {
    rows: matches.slice((page - 1) * 20, page * 20),
    total: matches.length,
    page,
  };
}

function mapPage(params) {
  const { p_west, p_east, p_south, p_north, p_after = null } = params;
  if (
    !within(p_west, -180, 180) ||
    !within(p_east, -180, 180) ||
    !within(p_south, -85, 85) ||
    !within(p_north, -85, 85) ||
    p_west >= p_east ||
    p_south >= p_north ||
    (p_after !== null && (typeof p_after !== "string" || !uuid.test(p_after)))
  )
    throw new Error("Invalid map bounds");
  const west = Math.max(p_west, -19);
  const east = Math.min(p_east, 5);
  const south = Math.max(p_south, 27);
  const north = Math.min(p_north, 45);
  const matches = publicUiVenues.filter(
    (venue) =>
      west < east &&
      south < north &&
      venue.longitude >= west &&
      venue.longitude <= east &&
      venue.latitude >= south &&
      venue.latitude <= north &&
      (p_after === null || venue.id > p_after),
  );
  const rows = matches.slice(0, 2_000);
  const hasMore = matches.length > rows.length;
  return { rows, hasMore, nextCursor: hasMore ? rows.at(-1).id : null };
}

function json(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(value));
}

export async function startPublicUiSupabase(env = process.env) {
  const address = publicUiFixtureAddress(env);
  if (!address) return null;
  const calls = [];
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, address);
    const path = url.pathname;
    if (request.method === "GET" && path === "/__public_ui_fixture__") {
      return json(response, 200, {
        fixture: "akipasa-public-ui",
        venueCount: publicUiVenues.length,
      });
    }
    if (request.method === "GET") {
      const rows = publicDetailRead(url);
      if (rows !== undefined) {
        calls.push({ path, params: Object.fromEntries(url.searchParams) });
        return json(response, 200, rows);
      }
    }
    const rpc =
      path === "/rest/v1/rpc/public_nearby_venue_page"
        ? nearbyPage
        : path === "/rest/v1/rpc/public_map_venue_page"
          ? mapPage
          : path === "/rest/v1/rpc/public_venue_catalogue"
            ? ({ p_venue }) => {
                if (!publicUiVenues.some((venue) => venue.id === p_venue))
                  throw new Error("Unknown synthetic venue");
                return null;
              }
            : null;
    if (!rpc || request.method !== "POST") {
      // Never forward requests, authenticate users, or accept arbitrary writes.
      return json(response, 501, {
        code: "E2E_UNSUPPORTED",
        message:
          "This public UI fixture only serves read-only synthetic venue discovery and details.",
      });
    }
    try {
      let body = "";
      for await (const chunk of request) {
        body += chunk;
        if (body.length > 16_384)
          throw new Error("Fixture request is too large");
      }
      const params = JSON.parse(body);
      if (!params || Array.isArray(params) || typeof params !== "object")
        throw new Error("Invalid RPC parameters");
      calls.push({ path, params });
      return json(response, 200, rpc(params));
    } catch (error) {
      return json(response, 400, {
        code: "22023",
        message:
          error instanceof Error ? error.message : "Invalid RPC parameters",
      });
    }
  });
  const hostname = address.hostname === "[::1]" ? "::1" : address.hostname;
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(Number(address.port), hostname, resolve);
  });
  return {
    address,
    calls,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  };
}
