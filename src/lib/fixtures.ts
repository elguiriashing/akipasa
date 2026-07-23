import type { Event, Venue } from "./domain";

export const venues: Venue[] = [
  {
    id: "v-sal",
    slug: "la-salina-social",
    name: "La Salina Social",
    description: {
      es: "Espacio ficticio de música y cultura junto al paseo.",
      en: "Fictional music and culture space near the promenade.",
    },
    locality: "fuengirola",
    address: "Paseo Marítimo, zona centro (demo)",
    latitude: 36.5405,
    longitude: -4.622,
    verified: true,
    accessible: true,
    phone: "+34951000001",
  },
  {
    id: "v-patio",
    slug: "patio-limon",
    name: "Patio Limón",
    description: {
      es: "Café ficticio con talleres y encuentros.",
      en: "Fictional café hosting workshops and meetups.",
    },
    locality: "boliches",
    address: "Calle del Mercado (demo)",
    latitude: 36.552,
    longitude: -4.614,
    verified: true,
    accessible: true,
  },
  {
    id: "v-faro",
    slug: "el-faro-lab",
    name: "El Faro Lab",
    description: {
      es: "Espacio creativo ficticio en Carvajal.",
      en: "Fictional creative space in Carvajal.",
    },
    locality: "carvajal",
    address: "Avenida del Sol (demo)",
    latitude: 36.568,
    longitude: -4.596,
    verified: false,
    accessible: false,
  },
  {
    id: "v-madrid",
    slug: "azotea-cobalto",
    name: "Azotea Cobalto",
    description: {
      es: "Espacio cultural ficticio en Madrid.",
      en: "Fictional cultural venue in Madrid.",
    },
    locality: "madrid",
    address: "Calle de la Luna, Madrid (demo)",
    latitude: 40.421,
    longitude: -3.706,
    verified: true,
    accessible: true,
  },
  {
    id: "v-barcelona",
    slug: "taller-mar-blau",
    name: "Taller Mar Blau",
    description: {
      es: "Taller creativo ficticio en Barcelona.",
      en: "Fictional creative workshop in Barcelona.",
    },
    locality: "barcelona",
    address: "Carrer de la Marina, Barcelona (demo)",
    latitude: 41.392,
    longitude: 2.177,
    verified: true,
    accessible: true,
  },
  {
    id: "v-valencia",
    slug: "patio-turia",
    name: "Patio Turia",
    description: {
      es: "Patio gastronómico ficticio en València.",
      en: "Fictional food courtyard in Valencia.",
    },
    locality: "valencia",
    address: "Carrer del Túria, València (demo)",
    latitude: 39.476,
    longitude: -0.384,
    verified: true,
    accessible: true,
  },
  {
    id: "v-sevilla",
    slug: "corral-naranja",
    name: "Corral Naranja",
    description: {
      es: "Escenario vecinal ficticio en Sevilla.",
      en: "Fictional neighbourhood stage in Seville.",
    },
    locality: "sevilla",
    address: "Alameda, Sevilla (demo)",
    latitude: 37.399,
    longitude: -5.993,
    verified: true,
    accessible: false,
  },
  {
    id: "v-bilbao",
    slug: "ria-sonora",
    name: "Ría Sonora",
    description: {
      es: "Sala musical ficticia en Bilbao.",
      en: "Fictional music room in Bilbao.",
    },
    locality: "bilbao",
    address: "Muelle de la Ría, Bilbao (demo)",
    latitude: 43.267,
    longitude: -2.929,
    verified: true,
    accessible: true,
  },
  {
    id: "v-palma",
    slug: "illa-oberta",
    name: "Illa Oberta",
    description: {
      es: "Espacio social ficticio en Palma.",
      en: "Fictional social venue in Palma.",
    },
    locality: "palma",
    address: "Carrer de la Mar, Palma (demo)",
    latitude: 39.572,
    longitude: 2.646,
    verified: true,
    accessible: true,
  },
];

function isoFrom(
  now: Date,
  dayOffset: number,
  hour: number,
  durationHours: number,
) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  date.setUTCHours(hour, 0, 0, 0);
  return {
    startsAt: date.toISOString(),
    endsAt: new Date(date.getTime() + durationHours * 3_600_000).toISOString(),
  };
}

export function fixtureEvents(now = new Date()): Event[] {
  const activeStart = new Date(now.getTime() - 45 * 60_000).toISOString();
  const activeEnd = new Date(now.getTime() + 75 * 60_000).toISOString();
  const tonight = isoFrom(now, 0, 19, 4);
  const tomorrow = isoFrom(now, 1, 18, 3);
  const nextWeek = isoFrom(now, 7, 19, 2);
  return [
    {
      id: "e-jazz",
      slug: "atardecer-jazz",
      title: { es: "Jazz al atardecer", en: "Sunset jazz" },
      description: {
        es: "Sesión acústica de demostración. Evento y local ficticios.",
        en: "Demo acoustic session. Event and venue are fictional.",
      },
      venueId: "v-sal",
      category: "music",
      priceCents: 0,
      currency: "EUR",
      source: "verified_venue",
      sponsored: false,
      bookingUrl: "https://example.com/demo-booking",
      occurrences: [
        {
          id: "o-jazz-now",
          startsAt: activeStart,
          endsAt: activeEnd,
          status: "scheduled",
        },
        { id: "o-jazz-next", ...nextWeek, status: "scheduled" },
      ],
    },
    {
      id: "e-quiz",
      slug: "quiz-bilingue",
      title: { es: "Quiz bilingüe", en: "Bilingual quiz" },
      description: {
        es: "Preguntas en español e inglés, sin premio en efectivo.",
        en: "Questions in Spanish and English, with no cash prize.",
      },
      venueId: "v-patio",
      category: "social",
      priceCents: 500,
      currency: "EUR",
      source: "verified_venue",
      sponsored: false,
      occurrences: [
        { id: "o-quiz-1", ...tonight, status: "scheduled" },
        { id: "o-quiz-2", ...nextWeek, status: "scheduled" },
      ],
    },
    {
      id: "e-workshop",
      slug: "taller-carteles",
      title: { es: "Taller de carteles", en: "Poster workshop" },
      description: {
        es: "Actividad comunitaria pendiente de verificación.",
        en: "Community activity awaiting verification.",
      },
      venueId: "v-faro",
      category: "workshop",
      priceCents: 1200,
      currency: "EUR",
      source: "community",
      sponsored: false,
      occurrences: [{ id: "o-workshop", ...tomorrow, status: "scheduled" }],
    },
    {
      id: "e-madrid-cine",
      slug: "cine-cobalto",
      title: { es: "Cine bajo las estrellas", en: "Cinema under the stars" },
      description: {
        es: "Proyección ficticia con coloquio posterior.",
        en: "Fictional screening followed by a discussion.",
      },
      venueId: "v-madrid",
      category: "culture",
      priceCents: 800,
      currency: "EUR",
      source: "verified_venue",
      sponsored: false,
      occurrences: [{ id: "o-madrid-cine", ...tonight, status: "scheduled" }],
    },
    {
      id: "e-barcelona-diseno",
      slug: "mercado-diseno-local",
      title: { es: "Mercado de diseño local", en: "Local design market" },
      description: {
        es: "Muestra ficticia de diseño independiente.",
        en: "Fictional independent design showcase.",
      },
      venueId: "v-barcelona",
      category: "market",
      priceCents: 0,
      currency: "EUR",
      source: "verified_venue",
      sponsored: false,
      occurrences: [
        { id: "o-barcelona-diseno", ...tomorrow, status: "scheduled" },
      ],
    },
    {
      id: "e-valencia-tapas",
      slug: "ruta-tapas-turia",
      title: { es: "Ruta de tapas del Turia", en: "Turia tapas trail" },
      description: {
        es: "Encuentro gastronómico ficticio.",
        en: "Fictional food gathering.",
      },
      venueId: "v-valencia",
      category: "food",
      priceCents: 1500,
      currency: "EUR",
      source: "verified_venue",
      sponsored: true,
      occurrences: [
        { id: "o-valencia-tapas", ...tomorrow, status: "scheduled" },
      ],
    },
    {
      id: "e-sevilla-flamenco",
      slug: "patio-flamenco-abierto",
      title: { es: "Patio flamenco abierto", en: "Open flamenco courtyard" },
      description: {
        es: "Actuación ficticia de artistas emergentes.",
        en: "Fictional performance by emerging artists.",
      },
      venueId: "v-sevilla",
      category: "music",
      priceCents: 1000,
      currency: "EUR",
      source: "verified_venue",
      sponsored: false,
      occurrences: [
        { id: "o-sevilla-flamenco", ...tonight, status: "scheduled" },
      ],
    },
    {
      id: "e-bilbao-directo",
      slug: "ria-en-directo",
      title: { es: "La ría en directo", en: "Live by the river" },
      description: {
        es: "Concierto ficticio de grupos locales.",
        en: "Fictional concert by local bands.",
      },
      venueId: "v-bilbao",
      category: "music",
      priceCents: 0,
      currency: "EUR",
      source: "verified_venue",
      sponsored: false,
      occurrences: [
        { id: "o-bilbao-directo", ...tomorrow, status: "scheduled" },
      ],
    },
    {
      id: "e-palma-social",
      slug: "intercambio-illa",
      title: { es: "Intercambio de idiomas", en: "Language exchange" },
      description: {
        es: "Encuentro social ficticio y gratuito.",
        en: "Fictional free social meetup.",
      },
      venueId: "v-palma",
      category: "social",
      priceCents: 0,
      currency: "EUR",
      source: "verified_venue",
      sponsored: false,
      occurrences: [{ id: "o-palma-social", ...tonight, status: "scheduled" }],
    },
  ];
}
