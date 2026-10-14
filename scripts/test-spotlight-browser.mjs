import { spawn } from "node:child_process";
import { createServer, request as httpRequest } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Test data exists only in this disposable, loopback-bound HTTP adapter. It is
// never added to the application's deliberately empty production fixtures.
const root = fileURLToPath(new URL("../", import.meta.url));
const port = (value, fallback) => {
  const parsed = Number(value || fallback);
  if (!Number.isInteger(parsed) || parsed < 1024 || parsed > 65535)
    throw new Error("Spotlight test ports must be integers from 1024 to 65535");
  return parsed;
};
const fixturePort = port(process.env.SPOTLIGHT_FIXTURE_PORT, 3398);
const nextPort = port(process.env.SPOTLIGHT_NEXT_PORT, 3399);
if (fixturePort === nextPort) throw new Error("Spotlight ports must differ");
const origin = `http://127.0.0.1:${fixturePort}`;
const nextOrigin = `http://127.0.0.1:${nextPort}`;
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const start = new Date(Date.now() + 8 * 86_400_000);
start.setUTCHours(10, 22, 0, 0);
const startsAt = start.toISOString();
const endsAt = new Date(+start + 2 * 3_600_000).toISOString();
const pastStart = new Date(+start - 20 * 86_400_000).toISOString();
const pastEnd = new Date(+start - 20 * 86_400_000 + 3_600_000).toISOString();
const baseVenue = {
  id: uuid(1),
  slug: "spotlight-test-kitchen",
  name: "Spotlight Test Kitchen",
  status: "published",
  description_es:
    "Datos de prueba: hamburguesas, batidos y brunch. Información de alérgenos y atención en español.",
  description_en:
    "Test data: burgers, shakes and brunch. Allergen information and helpful local details.",
  address: "Calle de Prueba 8, Las Lagunas, Mijas, Málaga",
  location: { type: "Point", coordinates: [-4.6346, 36.5488] },
  cities: { slug: "mijas" },
  verified: true,
  accessibility: { step_free: true, claim_status: "claimed" },
  contact_phone: "+34000000000",
  whatsapp_phone: "+34000000000",
  website_url: "https://example.com/spotlight-venue",
  discovery_vertical: "activities",
  discovery_enabled: true,
  recommendation_weight: 1,
};
const venues = [
  baseVenue,
  { ...baseVenue, id: uuid(10), slug: "spotlight-external" },
  {
    ...baseVenue,
    id: uuid(20),
    slug: "spotlight-empty",
    name: "Spotlight Community Space",
    verified: false,
    accessibility: { claim_status: "unclaimed" },
    contact_phone: null,
    whatsapp_phone: null,
    website_url: null,
  },
  {
    ...baseVenue,
    id: uuid(30),
    slug: "spotlight-stay",
    discovery_vertical: "accommodation",
  },
  {
    ...baseVenue,
    id: uuid(40),
    slug: "spotlight-long-name",
    name: "Espacio cultural y gastronómico de Málaga — programación, exposiciones y actividades para toda la familia",
  },
];
const occurrence = (id, status = "scheduled", overrides = {}) => ({
  id: uuid(id),
  starts_at: startsAt,
  ends_at: endsAt,
  status,
  ...overrides,
});
const baseEvent = {
  id: uuid(2),
  venue_id: baseVenue.id,
  slug: "spotlight-lunch",
  title_es: "Almuerzo de prueba",
  title_en: "Test lunch",
  description_es:
    "Una prueba de almuerzo con información útil, carta vinculada y acceso sin escalones.",
  description_en:
    "A test lunch with practical information, a linked menu and step-free access.",
  status: "published",
  categories: { slug: "food" },
  price_cents: 1250,
  price_display_mode: "show",
  currency: "EUR",
  source: "verified_venue",
  sponsored: false,
  booking_url: null,
  minimum_age: 0,
  accessibility_notes_es: "Acceso sin escalones indicado por el local.",
  accessibility_notes_en: "Step-free access indicated by the venue.",
  catalogue_section_ids: [uuid(201)],
  event_occurrences: [
    occurrence(301, "scheduled", { starts_at: pastStart, ends_at: pastEnd }),
    occurrence(302),
  ],
  feature_slots: [],
};
const events = [
  baseEvent,
  {
    ...baseEvent,
    id: uuid(12),
    venue_id: uuid(10),
    slug: "spotlight-external-event",
    booking_url: "https://example.com/spotlight-series-booking",
    event_occurrences: [
      occurrence(312, "scheduled", {
        booking_url: "https://example.com/spotlight-occurrence-booking",
      }),
    ],
  },
  {
    ...baseEvent,
    id: uuid(22),
    slug: "spotlight-cancelled-event",
    title_es: "Evento cancelado de prueba",
    title_en: "Cancelled test event",
    event_occurrences: [occurrence(322, "cancelled")],
  },
  {
    ...baseEvent,
    id: uuid(23),
    slug: "spotlight-sold-out-event",
    title_es: "Evento agotado de prueba",
    title_en: "Sold-out test event",
    event_occurrences: [occurrence(323, "sold_out")],
  },
  {
    ...baseEvent,
    id: uuid(24),
    slug: "spotlight-offsite-event",
    location: { type: "Point", coordinates: [-4.6202, 36.5399] },
    location_label: "Plaza de Prueba, Fuengirola",
    directions_address: "Paseo de Prueba 24, Fuengirola",
    event_occurrences: [occurrence(324)],
  },
];
const allergens = Object.fromEntries(
  [
    "gluten",
    "crustaceans",
    "eggs",
    "fish",
    "peanuts",
    "soy",
    "milk",
    "nuts",
    "celery",
    "mustard",
    "sesame",
    "sulphites",
    "lupin",
    "molluscs",
  ].map((key) => [key, key === "milk" ? "contains" : "unknown"]),
);
const item = (id, es, en, mediaId, overrides = {}) => ({
  id: uuid(id),
  name: { es, en },
  description: {
    es: "Producto de prueba con información de alérgenos.",
    en: "Test item with allergen information.",
  },
  kind: "food",
  visible: true,
  mediaId: uuid(mediaId),
  containsFood: true,
  availability: "available",
  priceMode: "fixed",
  priceCents: 950,
  unit: "each",
  variants: [],
  allergens: {
    states: allergens,
    cereals: [],
    nuts: [],
    crossContact: "unknown",
    ingredients: { es: "Ingredientes de prueba", en: "Test ingredients" },
    notes: {
      es: "Consulta al equipo si tienes alergias.",
      en: "Ask the team about allergies.",
    },
    reviewConfirmed: false,
  },
  ...overrides,
});
const catalogue = {
  schemaVersion: "1",
  title: { es: "Carta de prueba", en: "Test menu" },
  description: {
    es: "Datos sintéticos para comprobar la interfaz.",
    en: "Synthetic data for interface checks.",
  },
  layout: "menu",
  sections: [
    {
      id: uuid(201),
      title: { es: "Burgers", en: "Burgers" },
      items: [
        item(401, "Burger de prueba", "Test burger", 103),
        item(402, "Oculto de prueba", "Hidden test item", 103, {
          visible: false,
        }),
      ],
    },
    {
      id: uuid(202),
      title: { es: "Batidos", en: "Shakes" },
      items: [
        item(403, "Batido de vainilla", "Vanilla shake", 104, {
          kind: "drink",
          priceCents: 650,
        }),
      ],
    },
    {
      id: uuid(203),
      title: { es: "Sección vacía", en: "Empty section" },
      items: [],
    },
  ],
};
const media = [
  {
    id: uuid(101),
    storage_path: "spotlight/cover.svg",
    alt_es: "Imagen de prueba del local",
    alt_en: "Test venue image",
  },
  {
    id: uuid(102),
    storage_path: "spotlight/logo.svg",
    alt_es: "Identidad de prueba",
    alt_en: "Test identity",
  },
  {
    id: uuid(103),
    storage_path: "spotlight/burger.svg",
    alt_es: "Producto de prueba",
    alt_en: "Test product",
  },
  {
    id: uuid(104),
    storage_path: "spotlight/shake.svg",
    alt_es: "Batido de prueba",
    alt_en: "Test shake",
  },
];
const poster = {
  id: uuid(105),
  storage_path: "spotlight/poster.svg",
  alt_es: "Cartel del almuerzo de prueba",
  alt_en: "Test lunch poster",
};
const fixture = {
  venue: { id: baseVenue.id, slug: baseVenue.slug, name: baseVenue.name },
  event: {
    id: baseEvent.id,
    slug: baseEvent.slug,
    title: { es: baseEvent.title_es, en: baseEvent.title_en },
    occurrenceId: uuid(302),
    startsAt,
    endsAt,
  },
  siteUrl: origin,
};
const unexpected = [];
const counts = new Map();
let nextServer;
let proxyReady = false;
const send = (response, value, status = 200, type = "application/json") => {
  response.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  response.end(type === "application/json" ? JSON.stringify(value) : value);
};
const matches = (row, query, keys) =>
  keys.every((key) => {
    const filter = query.get(key);
    return !filter?.startsWith("eq.") || String(row[key]) === filter.slice(3);
  });
const readBody = async (request) => {
  let value = "";
  for await (const chunk of request) {
    value += chunk;
    if (value.length > 32_768) throw new Error("Oversized fixture request");
  }
  return value ? JSON.parse(value) : {};
};
const signedPath = (path) =>
  `/object/sign/event-media/${path}?token=disposable`;
const artwork = (path) => {
  const isPoster = path.includes("poster");
  const isLogo = path.includes("logo");
  const height = isPoster ? 1600 : isLogo ? 1000 : 900;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 ${height}"><rect width="1400" height="${height}" fill="#122848"/><circle cx="1100" cy="${height * 0.32}" r="300" fill="#ff731d"/><rect x="90" y="${height * 0.52}" width="820" height="${height * 0.25}" rx="34" fill="#e8eef8"/><text x="125" y="${height * 0.65}" fill="#122848" font-family="sans-serif" font-size="66">${isPoster ? "TEST LUNCH" : "SPOTLIGHT QA"}</text></svg>`;
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", origin);
    const method = request.method || "GET";
    if (url.pathname === "/__spotlight_fixture" && method === "GET")
      return send(response, fixture);
    if (
      url.pathname.startsWith("/storage/v1/object/sign/event-media/") &&
      method === "GET"
    )
      return send(response, artwork(url.pathname), 200, "image/svg+xml");
    if (
      url.pathname.startsWith("/storage/v1/object/sign/event-media") &&
      method === "POST"
    ) {
      const body = await readBody(request);
      if (Array.isArray(body.paths))
        return send(
          response,
          body.paths.map((path) => ({
            path,
            signedURL: signedPath(path),
            error: null,
          })),
        );
      const path = url.pathname.split("/event-media/")[1];
      return send(response, { signedURL: signedPath(path) });
    }
    if (url.pathname.startsWith("/rest/v1/")) {
      const table = url.pathname.slice("/rest/v1/".length);
      counts.set(
        `${method} ${table}`,
        (counts.get(`${method} ${table}`) || 0) + 1,
      );
      const body = method === "POST" ? await readBody(request) : {};
      if (table === "rpc/public_venue_is_claimed" && method === "POST")
        return send(response, false);
      if (table === "rpc/public_venue_catalogue" && method === "POST")
        return send(
          response,
          body.p_venue === uuid(20) ? null : { document: catalogue },
        );
      if (table === "rpc/event_public_engagement" && method === "POST")
        return send(response, { going: 0 });
      if (method !== "GET" && method !== "HEAD") {
        unexpected.push(`${method} ${table}`);
        return send(
          response,
          { message: "Only fixture reads are allowed" },
          405,
        );
      }
      let rows = [];
      if (table === "venues")
        rows = venues.filter((row) =>
          matches(row, url.searchParams, ["id", "slug", "status"]),
        );
      else if (table === "events")
        rows = events.filter((row) =>
          matches(row, url.searchParams, ["id", "slug", "venue_id", "status"]),
        );
      else if (table === "venue_booking_settings") {
        rows = venues
          .map((venue) => ({
            venue_id: venue.id,
            active: venue.id !== uuid(20),
            mode:
              venue.id === uuid(20)
                ? "disabled"
                : venue.id === uuid(10)
                  ? "external"
                  : "request",
            external_url:
              venue.id === uuid(10)
                ? "https://example.com/spotlight-venue-booking"
                : null,
          }))
          .filter((row) =>
            matches(row, url.searchParams, ["venue_id", "active"]),
          );
      } else if (table === "venue_media") {
        rows =
          url.searchParams.get("venue_id") === `eq.${uuid(20)}` ? [] : media;
      } else if (table === "venue_media_placements") {
        const eventPlacement = url.searchParams.get("target_key") !== "eq.";
        const venueId = url.searchParams.get("venue_id");
        rows = eventPlacement
          ? [
              "event_banner",
              "event_profile",
              "event_background",
              "event_explore",
            ].map((placement) => ({
              placement,
              media_id: poster.id,
              sort_order: 0,
              venue_media: poster,
            }))
          : venueId === `eq.${uuid(20)}`
            ? []
            : [
                "venue_profile",
                "venue_cover",
                "venue_menu",
                "venue_events",
                "venue_explore",
              ].map((placement) => ({
                placement,
                media_id:
                  placement === "venue_profile" ? media[1].id : media[0].id,
              }));
      } else if (table === "offers") {
        rows =
          url.searchParams.get("venue_id") === `eq.${uuid(20)}`
            ? []
            : [
                {
                  id: uuid(501),
                  title_es: "Oferta de prueba",
                  title_en: "Test offer",
                  terms_es: "Consulta las condiciones del local.",
                  terms_en: "Check the venue's terms.",
                  starts_at: pastStart,
                  ends_at: endsAt,
                },
              ];
      }
      const single = request.headers.accept?.includes(
        "application/vnd.pgrst.object+json",
      );
      return send(response, single ? rows[0] || null : rows);
    }
    if (!proxyReady)
      return send(response, { message: "Next server is starting" }, 503);
    if (method !== "GET" && method !== "HEAD") {
      unexpected.push(`${method} ${url.pathname}`);
      return send(
        response,
        { message: "No application writes in Spotlight layout acceptance" },
        405,
      );
    }
    const upstream = httpRequest(
      new URL(url.pathname + url.search, nextOrigin),
      {
        method,
        headers: { ...request.headers, host: `127.0.0.1:${fixturePort}` },
      },
      (upstreamResponse) => {
        response.writeHead(
          upstreamResponse.statusCode || 502,
          upstreamResponse.headers,
        );
        upstreamResponse.pipe(response);
      },
    );
    upstream.on("error", () =>
      send(response, { message: "Next is unavailable" }, 502),
    );
    request.pipe(upstream);
  } catch (error) {
    unexpected.push(
      error instanceof Error ? error.message : "Fixture adapter error",
    );
    send(response, { message: "Fixture adapter failed" }, 500);
  }
});

const env = {
  ...process.env,
  NEXT_PUBLIC_DATA_PROVIDER: "supabase",
  NEXT_PUBLIC_SUPABASE_URL: origin,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "spotlight-local-disposable",
  NEXT_PUBLIC_SITE_URL: origin,
  SUPABASE_SERVICE_ROLE_KEY: "",
  NEXT_TELEMETRY_DISABLED: "1",
  PLAYWRIGHT_EXTERNAL_SERVER: "1",
  PLAYWRIGHT_BASE_URL: origin,
  SPOTLIGHT_E2E: "1",
  PW_TEST_SCREENSHOT_NO_FONTS_READY: "1",
};
const run = (args) =>
  new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolveRun()
        : reject(new Error(`${args.join(" ")} exited ${code}`)),
    );
  });
try {
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(fixturePort, "127.0.0.1", resolveListen);
  });
  await run(["scripts/assert-current-site.mjs"]);
  await run(["node_modules/next/dist/bin/next", "build"]);
  nextServer = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(nextPort),
    ],
    { cwd: root, env, stdio: "inherit" },
  );
  nextServer.once("error", (error) => unexpected.push(error.message));
  proxyReady = true;
  const deadline = Date.now() + 60_000;
  let ready = false;
  while (Date.now() < deadline) {
    if (nextServer.exitCode !== null)
      throw new Error(`Next exited ${nextServer.exitCode}`);
    try {
      const response = await fetch(`${origin}/en/venues/${baseVenue.slug}`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  if (!ready)
    throw new Error("The Spotlight venue did not become ready in 60 seconds");
  await run([
    "node_modules/@playwright/test/cli.js",
    "test",
    "tests/e2e/spotlight-public-layout.spec.ts",
    "--workers=1",
    "--output=test-results/spotlight-routes",
    ...process.argv.slice(2),
  ]);
  if (unexpected.length)
    throw new Error(`Unexpected fixture operations: ${unexpected.join(", ")}`);
  console.log(
    "PASS: Spotlight real-route responsive, menu, action and SEO acceptance; synthetic local reads only.",
  );
} finally {
  await mkdir(resolve(root, "test-results/spotlight-routes"), {
    recursive: true,
  });
  await writeFile(
    resolve(root, "test-results/spotlight-routes/fixture-requests.json"),
    JSON.stringify(
      { operations: Object.fromEntries(counts), unexpected },
      null,
      2,
    ),
  );
  nextServer?.kill("SIGTERM");
  server.closeAllConnections();
  await new Promise((resolveClose) => server.close(resolveClose));
}
