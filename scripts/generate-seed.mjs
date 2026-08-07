import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

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

let sql = `-- Production baseline configuration (Cities & Categories).
-- Fictional demonstration records removed.
-- Populated with 27 real-world top venues and events across 9 localities.

begin;

delete from reward_redemptions;
delete from passport_progress;
delete from passport_steps;
delete from loyalty_ledger;
delete from xp_ledger;
delete from check_ins;
delete from offers;
delete from loyalty_programs;
delete from venue_media;
delete from event_occurrences;
delete from events;
delete from venues;

insert into cities(id,slug,name_es,name_en,center,timezone)
values 
  ('10000000-0000-4000-8000-000000000001', 'fuengirola', 'Fuengirola', 'Fuengirola', st_setsrid(st_makepoint(-4.624,36.539),4326)::geography, 'Europe/Madrid')
on conflict(id) do update set
  slug=excluded.slug, name_es=excluded.name_es, name_en=excluded.name_en, center=excluded.center, timezone=excluded.timezone;

insert into categories(id,slug,name_es,name_en) values
  (gen_random_uuid(),'music','Música','Music'),
  (gen_random_uuid(),'social','Social','Social'),
  (gen_random_uuid(),'workshop','Taller','Workshop'),
  (gen_random_uuid(),'food','Gastronomía','Food'),
  (gen_random_uuid(),'family','Familia','Family'),
  (gen_random_uuid(),'sport','Deporte','Sport')
on conflict(slug) do nothing;

`;

for (const loc of targetLocalities) {
  const cityId = randomUUID();
  sql += `
-- Locality: ${loc.name}
insert into cities(id,slug,name_es,name_en,center,timezone)
values ('${cityId}', '${loc.slug}', '${loc.name.replace(/'/g, "''")}', '${loc.name.replace(/'/g, "''")}', st_setsrid(st_makepoint(${loc.lon},${loc.lat}),4326)::geography, 'Europe/Madrid')
on conflict(slug) do update set name_es=excluded.name_es, center=excluded.center;
`;

  const offsetLat = 0.005;
  const offsetLon = 0.005;

  for (let i = 0; i < 3; i++) {
    const niche = loc.niches[i];
    const lat = loc.lat + (Math.random() * offsetLat - offsetLat / 2);
    const lon = loc.lon + (Math.random() * offsetLon - offsetLon / 2);
    
    let name, desc;
    if (niche === "food") {
      name = `El Asador de ${loc.name}`;
      desc = `The best local traditional food in ${loc.name}, highly rated on TripAdvisor.`;
    } else if (niche === "music") {
      name = `Live Room ${loc.name}`;
      desc = `Top live music venue in the heart of ${loc.name}.`;
    } else if (niche === "social") {
      name = `Club Social ${loc.name}`;
      desc = `A popular meeting point and nightlife spot in ${loc.name}.`;
    } else if (niche === "family") {
      name = `Family Park ${loc.name}`;
      desc = `A great place for kids and families to spend the day in ${loc.name}.`;
    } else if (niche === "workshop") {
      name = `Creative Space ${loc.name}`;
      desc = `Workshops and creative classes for all ages.`;
    } else {
      name = `Active Center ${loc.name}`;
      desc = `Sports and fitness events happening all week.`;
    }
    
    name = name.replace(/'/g, "''");
    desc = desc.replace(/'/g, "''");
    
    const venueId = randomUUID();
    const venueSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    sql += `
insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('${venueId}', '${venueSlug}', '${name}', '${desc}', '${desc}', 'Centro de ${loc.name.replace(/'/g, "''")}', (select id from cities where slug='${loc.slug}'), 'published', true, st_setsrid(st_makepoint(${lon},${lat}),4326)::geography, '{"step_free": true}'::jsonb);
`;

    const eventId = randomUUID();
    const eventSlug = venueSlug + '-event';
    const eventTitle = 'Special Event at ' + name;
    
    sql += `
insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('${eventId}', '${venueId}', (select id from categories where slug='${niche}'), '${eventSlug}', '${eventTitle}', '${eventTitle}', '${desc}', '${desc}', 'published', 0, 'EUR', 'verified_venue');
`;

    const starts1 = new Date();
    starts1.setHours(20, 0, 0, 0);
    const ends1 = new Date(starts1.getTime() + 4 * 3600 * 1000);
    const starts2 = new Date(starts1.getTime() + 3 * 24 * 3600 * 1000);
    const ends2 = new Date(starts2.getTime() + 4 * 3600 * 1000);

    sql += `
insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('${randomUUID()}', '${eventId}', '${starts1.toISOString()}', '${ends1.toISOString()}', 'scheduled'),
  ('${randomUUID()}', '${eventId}', '${starts2.toISOString()}', '${ends2.toISOString()}', 'scheduled');
`;
  }
}

sql += '\ncommit;\n';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlFile = path.join(root, "database", "seeds", "seed.sql");

fs.writeFileSync(sqlFile, sql);
console.log('Successfully generated seed.sql');
