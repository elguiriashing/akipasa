import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { requireLocalDatabaseUrl } from "./lib/local-database-safety.mjs";

const databaseUrl = requireLocalDatabaseUrl(process.env.AKIPASA_LOCAL_DATABASE_URL);

const sql = postgres(databaseUrl.toString(), {
  max: 1,
  connect_timeout: 5,
  idle_timeout: 1,
});

// The 9 localities from the screenshot
const targetLocalities = [
  { slug: "barcelona", name: "Barcelona", lat: 41.3874, lon: 2.1686, niches: ["food", "social", "music"] },
  { slug: "bilbao", name: "Bilbao", lat: 43.263, lon: -2.935, niches: ["food", "music", "workshop"] },
  { slug: "carvajal", name: "Torreblanca / Carvajal", lat: 36.569, lon: -4.595, niches: ["family", "sport", "food"] },
  { slug: "fuengirola", name: "Fuengirola", lat: 36.539, lon: -4.624, niches: ["music", "social", "food"] },
  { slug: "boliches", name: "Los Boliches", lat: 36.551, lon: -4.615, niches: ["family", "food", "social"] },
  { slug: "madrid", name: "Madrid", lat: 40.4168, lon: -3.7038, niches: ["social", "music", "food"] },
  { slug: "palma", name: "Palma", lat: 39.5696, lon: 2.6502, niches: ["music", "social", "sport"] },
  { slug: "sevilla", name: "Sevilla", lat: 37.3891, lon: -5.9845, niches: ["music", "food", "workshop"] },
  { slug: "valencia", name: "València", lat: 39.4699, lon: -0.3763, niches: ["family", "food", "social"] },
];

// Mapping to categories
const categoryMap = {
  music: "20000000-0000-4000-8000-000000000001",
  social: "20000000-0000-4000-8000-000000000002",
  workshop: "20000000-0000-4000-8000-000000000003",
  food: "20000000-0000-4000-8000-000000000004",
  family: "20000000-0000-4000-8000-000000000005",
  sport: "20000000-0000-4000-8000-000000000006",
};

function generateVenuesForLocality(locality) {
  const venues = [];
  const offsetLat = 0.005;
  const offsetLon = 0.005;

  for (let i = 0; i < 3; i++) {
    const niche = locality.niches[i];
    const lat = locality.lat + (Math.random() * offsetLat - offsetLat / 2);
    const lon = locality.lon + (Math.random() * offsetLon - offsetLon / 2);
    
    let name, desc;
    if (niche === "food") {
      name = `El Asador de ${locality.name}`;
      desc = `The best local traditional food in ${locality.name}, highly rated on TripAdvisor.`;
    } else if (niche === "music") {
      name = `Live Room ${locality.name}`;
      desc = `Top live music venue in the heart of ${locality.name}.`;
    } else if (niche === "social") {
      name = `Club Social ${locality.name}`;
      desc = `A popular meeting point and nightlife spot in ${locality.name}.`;
    } else if (niche === "family") {
      name = `Family Park ${locality.name}`;
      desc = `A great place for kids and families to spend the day in ${locality.name}.`;
    } else if (niche === "workshop") {
      name = `Creative Space ${locality.name}`;
      desc = `Workshops and creative classes for all ages.`;
    } else {
      name = `Active Center ${locality.name}`;
      desc = `Sports and fitness events happening all week.`;
    }

    venues.push({
      id: randomUUID(),
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name,
      description: desc,
      locality_slug: locality.slug,
      niche,
      lat,
      lon,
    });
  }
  return venues;
}

async function run() {
  try {
    console.log("Cleaning up existing events and venues...");
    // Delete all events and venues (safely for local)
    await sql`DELETE FROM event_occurrences`;
    await sql`DELETE FROM events`;
    await sql`DELETE FROM venues`;

    console.log("Populating new top venues and events...");
    
    for (const loc of targetLocalities) {
      // Ensure the city exists (just in case, but they are from the screenshot)
      const cityExists = await sql`SELECT id FROM cities WHERE slug = ${loc.slug}`;
      if (cityExists.length === 0) {
        await sql`
          INSERT INTO cities (id, slug, name_es, name_en, center, timezone)
          VALUES (
            ${randomUUID()}, ${loc.slug}, ${loc.name}, ${loc.name},
            st_setsrid(st_makepoint(${loc.lon}, ${loc.lat}), 4326)::geography,
            'Europe/Madrid'
          )
        `;
      }
      const cityId = (await sql`SELECT id FROM cities WHERE slug = ${loc.slug}`)[0].id;

      const venues = generateVenuesForLocality(loc);
      for (const v of venues) {
        // Insert Venue
        await sql`
          INSERT INTO venues (
            id, slug, name, description_es, description_en, address, 
            city_id, status, verified, location, accessibility
          ) VALUES (
            ${v.id}, ${v.slug}, ${v.name}, ${v.description}, ${v.description},
            ${'Centro de ' + loc.name}, ${cityId}, 'published', true,
            st_setsrid(st_makepoint(${v.lon}, ${v.lat}), 4326)::geography,
            '{"step_free": true}'::jsonb
          )
        `;

        // Insert Event
        const eventId = randomUUID();
        const eventTitle = `Special Event at ${v.name}`;
        const catId = categoryMap[v.niche];
        await sql`
          INSERT INTO events (
            id, venue_id, category_id, slug, title_es, title_en, 
            description_es, description_en, status, price_cents, currency, source
          ) VALUES (
            ${eventId}, ${v.id}, ${catId}, ${v.slug + '-event'}, ${eventTitle}, ${eventTitle},
            ${'Join us for ' + eventTitle}, ${'Join us for ' + eventTitle}, 'published', 0, 'EUR', 'verified_venue'
          )
        `;

        // Insert Occurrences (one now, one in 3 days)
        const occ1Id = randomUUID();
        const occ2Id = randomUUID();
        const starts1 = new Date();
        starts1.setHours(20, 0, 0, 0);
        const ends1 = new Date(starts1.getTime() + 4 * 3600 * 1000);
        
        const starts2 = new Date(starts1.getTime() + 3 * 24 * 3600 * 1000);
        const ends2 = new Date(starts2.getTime() + 4 * 3600 * 1000);

        await sql`
          INSERT INTO event_occurrences (id, event_id, starts_at, ends_at, status)
          VALUES 
          (${occ1Id}, ${eventId}, ${starts1.toISOString()}, ${ends1.toISOString()}, 'scheduled'),
          (${occ2Id}, ${eventId}, ${starts2.toISOString()}, ${ends2.toISOString()}, 'scheduled')
        `;
      }
    }

    console.log("Successfully populated 27 top venues and events across 9 localities.");
  } catch (err) {
    console.error("Error populating database:", err);
  } finally {
    await sql.end();
  }
}

run();
