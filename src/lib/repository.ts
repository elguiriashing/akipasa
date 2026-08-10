import { config } from "./config";
import type { DiscoveryQuery, DiscoveryResult, Event, Venue } from "./domain";
import { fixtureEvents, venues } from "./fixtures";
import { distanceKm } from "./geo";
import { occurrenceMatches } from "./time";
import { isSpainLocation } from "./locations";
import { createSupabasePublicClient } from "./supabase/public";

export interface DiscoveryRepository {
  discover(query: DiscoveryQuery): Promise<DiscoveryResult[]>;
  eventBySlug(slug: string): Promise<Event | null>;
  venueBySlug(slug: string): Promise<Venue | null>;
  venueById(id: string): Promise<Venue | null>;
  eventsForVenue(venueId: string): Promise<Event[]>;
}

export class FixtureRepository implements DiscoveryRepository {
  constructor(private now = new Date()) {}
  async discover(query: DiscoveryQuery) {
    const localityKey = query.locality || "fuengirola";
    const locality = isSpainLocation(localityKey)
      ? config.localities[localityKey]
      : config.localities.fuengirola;
    const radius = query.radiusKm || 25;
    const time = query.time || "all";
    return fixtureEvents(this.now)
      .flatMap((event) => {
        const venue = venues.find((v) => v.id === event.venueId)!;
        const distance = distanceKm(
          locality.latitude,
          locality.longitude,
          venue.latitude,
          venue.longitude,
        );
        if (
          distance > radius ||
          (query.category && event.category !== query.category) ||
          (query.price === "free" && event.priceCents > 0) ||
          (query.price === "paid" && event.priceCents === 0) ||
          (query.minPriceCents !== undefined &&
            event.priceCents < query.minPriceCents) ||
          (query.maxPriceCents !== undefined &&
            event.priceCents > query.maxPriceCents) ||
          (query.accessible && !venue.accessible)
        )
          return [];
        return event.occurrences
          .filter(
            (o) =>
              o.status === "scheduled" &&
              occurrenceMatches(o.startsAt, o.endsAt, time, this.now) &&
              (!query.dateFrom || new Date(o.endsAt) > query.dateFrom) &&
              (!query.dateTo || new Date(o.startsAt) < query.dateTo),
          )
          .map((occurrence) => ({
            event,
            occurrence,
            venue,
            distanceKm: distance,
          }));
      })
      .sort((a, b) => {
        const aActive =
          new Date(a.occurrence.startsAt) <= this.now &&
          new Date(a.occurrence.endsAt) > this.now;
        const bActive =
          new Date(b.occurrence.startsAt) <= this.now &&
          new Date(b.occurrence.endsAt) > this.now;
        return (
          Number(bActive) - Number(aActive) ||
          +new Date(a.occurrence.startsAt) - +new Date(b.occurrence.startsAt) ||
          a.distanceKm - b.distanceKm
        );
      });
  }
  async eventBySlug(slug: string) {
    return fixtureEvents(this.now).find((e) => e.slug === slug) || null;
  }
  async venueBySlug(slug: string) {
    return venues.find((v) => v.slug === slug) || null;
  }
  async venueById(id: string) {
    return venues.find((v) => v.id === id) || null;
  }
  async eventsForVenue(venueId: string) {
    return fixtureEvents(this.now).filter((e) => e.venueId === venueId);
  }
}

type DbPoint =
  | { type?: string; coordinates?: [number, number] }
  | string
  | null;
type DbRecord = Record<string, unknown>;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function one(value: unknown): DbRecord | null {
  if (Array.isArray(value)) return (value[0] as DbRecord | undefined) || null;
  return value && typeof value === "object" ? (value as DbRecord) : null;
}

export function parseDatabasePoint(value: DbPoint) {
  if (value && typeof value === "object" && Array.isArray(value.coordinates)) {
    return {
      longitude: Number(value.coordinates[0]),
      latitude: Number(value.coordinates[1]),
    };
  }
  const match =
    typeof value === "string"
      ? value.match(/POINT\(([-\d.]+) ([-\d.]+)\)/i)
      : null;
  if (match) {
    return { longitude: Number(match[1]), latitude: Number(match[2]) };
  }
  if (
    typeof value === "string" &&
    value.length >= 42 &&
    /^[0-9a-f]+$/i.test(value)
  ) {
    const bytes = Uint8Array.from(value.match(/.{2}/g) || [], (byte) =>
      Number.parseInt(byte, 16),
    );
    const view = new DataView(bytes.buffer);
    const littleEndian = view.getUint8(0) === 1;
    const geometryType = view.getUint32(1, littleEndian);
    const coordinateOffset = geometryType & 0x20000000 ? 9 : 5;
    if (bytes.length >= coordinateOffset + 16) {
      return {
        longitude: view.getFloat64(coordinateOffset, littleEndian),
        latitude: view.getFloat64(coordinateOffset + 8, littleEndian),
      };
    }
  }
  return { longitude: 0, latitude: 0 };
}

function venueFromRow(row: DbRecord): Venue {
  const city = one(row.cities);
  const coordinates = parseDatabasePoint(row.location as DbPoint);
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: {
      es: String(row.description_es || ""),
      en: row.description_en ? String(row.description_en) : undefined,
    },
    locality: String(city?.slug || "fuengirola"),
    address: String(row.address),
    ...coordinates,
    verified: Boolean(row.verified),
    accessible: Boolean(
      (row.accessibility as { step_free?: boolean } | null)?.step_free,
    ),
    phone: row.contact_phone ? String(row.contact_phone) : undefined,
    whatsappPhone: row.whatsapp_phone ? String(row.whatsapp_phone) : undefined,
    websiteUrl: row.website_url ? String(row.website_url) : undefined,
  };
}

function eventFromRow(row: DbRecord): Event | null {
  const category = one(row.categories);
  const occurrences = Array.isArray(row.event_occurrences)
    ? (row.event_occurrences as DbRecord[])
        .map((item) => ({
          id: String(item.id),
          startsAt: String(item.starts_at),
          endsAt: String(item.ends_at),
          status: String(item.status) as Event["occurrences"][number]["status"],
          bookingUrl: item.booking_url ? String(item.booking_url) : undefined,
        }))
        .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
    : [];
  if (!category || !occurrences.length) return null;
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: {
      es: String(row.title_es),
      en: row.title_en ? String(row.title_en) : undefined,
    },
    description: {
      es: String(row.description_es),
      en: row.description_en ? String(row.description_en) : undefined,
    },
    venueId: String(row.venue_id),
    category: String(category.slug),
    priceCents: Number(row.price_cents || 0),
    currency: "EUR",
    source: row.source === "community" ? "community" : "verified_venue",
    sponsored: Boolean(row.sponsored),
    bookingUrl: row.booking_url ? String(row.booking_url) : undefined,
    minimumAge:
      row.minimum_age === null || row.minimum_age === undefined
        ? undefined
        : Number(row.minimum_age),
    accessibilityNotes: row.accessibility_notes_es
      ? {
          es: String(row.accessibility_notes_es),
          en: row.accessibility_notes_en
            ? String(row.accessibility_notes_en)
            : undefined,
        }
      : undefined,
    occurrences,
  };
}

const venueFields =
  "id,slug,name,description_es,description_en,address,location,verified,accessibility,contact_phone,whatsapp_phone,website_url,cities(slug)";
const eventFields =
  "id,venue_id,slug,title_es,title_en,description_es,description_en,price_cents,currency,source,sponsored,booking_url,minimum_age,accessibility_notes_es,accessibility_notes_en,categories(slug),event_occurrences(id,starts_at,ends_at,status,booking_url)";

export class SupabaseDiscoveryRepository implements DiscoveryRepository {
  async discover(query: DiscoveryQuery) {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("events")
      .select(
        `${eventFields},venues(${venueFields},venue_media(id,storage_path,alt_es,alt_en))`,
      )
      .eq("status", "published");
    if (error) throw new Error(`Public event query failed: ${error.message}`);
    const localityKey = query.locality || "fuengirola";
    const locality = isSpainLocation(localityKey)
      ? config.localities[localityKey]
      : config.localities.fuengirola;
    const radius = query.radiusKm || 25;
    const now = query.now || new Date();

    // Process rows to extract media paths
    const rows = data as unknown as DbRecord[];
    const mediaPaths = new Set<string>();
    rows.forEach((row) => {
      const venueRow = one(row.venues);
      if (venueRow && Array.isArray(venueRow.venue_media)) {
        venueRow.venue_media.forEach((m: Record<string, unknown>) => {
          if (m.storage_path) mediaPaths.add(String(m.storage_path));
        });
      }
    });

    // Fetch signed URLs in bulk
    const pathList = Array.from(mediaPaths);
    const signedUrlMap = new Map<string, string>();
    if (pathList.length > 0) {
      const { data: signedData } = await supabase.storage
        .from("event-media")
        .createSignedUrls(pathList, 3600);
      if (signedData) {
        signedData.forEach((item) => {
          if (item.signedUrl && item.path) {
            signedUrlMap.set(item.path, item.signedUrl);
          }
        });
      }
    }

    return rows
      .flatMap((row) => {
        const event = eventFromRow(row);
        const venueRow = one(row.venues);
        if (!event || !venueRow) return [];
        const venue = venueFromRow(venueRow);

        if (Array.isArray(venueRow.venue_media)) {
          const mappedMedia = venueRow.venue_media
            .map((item: Record<string, unknown>) => {
              const storagePath = String(item.storage_path);
              const url = signedUrlMap.get(storagePath);
              if (!url) return null;
              return {
                id: String(item.id),
                url,
                alt: {
                  es: String(item.alt_es),
                  ...(item.alt_en ? { en: String(item.alt_en) } : {}),
                },
              };
            })
            .filter(
              (item: unknown): item is NonNullable<typeof item> =>
                item !== null,
            );
          if (mappedMedia.length > 0)
            venue.media = mappedMedia as typeof venue.media;
        }

        const distance = distanceKm(
          locality.latitude,
          locality.longitude,
          venue.latitude,
          venue.longitude,
        );
        if (
          distance > radius ||
          (query.category && event.category !== query.category) ||
          (query.price === "free" && event.priceCents > 0) ||
          (query.price === "paid" && event.priceCents === 0) ||
          (query.minPriceCents !== undefined &&
            event.priceCents < query.minPriceCents) ||
          (query.maxPriceCents !== undefined &&
            event.priceCents > query.maxPriceCents) ||
          (query.accessible && !venue.accessible)
        )
          return [];
        return event.occurrences
          .filter(
            (occurrence) =>
              occurrence.status === "scheduled" &&
              occurrenceMatches(
                occurrence.startsAt,
                occurrence.endsAt,
                query.time || "all",
                now,
              ) &&
              (!query.dateFrom ||
                new Date(occurrence.endsAt) > query.dateFrom) &&
              (!query.dateTo || new Date(occurrence.startsAt) < query.dateTo),
          )
          .map((occurrence) => ({
            event,
            occurrence,
            venue,
            distanceKm: distance,
          }));
      })
      .sort(
        (a, b) =>
          +new Date(a.occurrence.startsAt) - +new Date(b.occurrence.startsAt),
      );
  }

  async eventBySlug(slug: string) {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("events")
      .select(eventFields)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(`Public event query failed: ${error.message}`);
    return data ? eventFromRow(data as unknown as DbRecord) : null;
  }

  async venueBySlug(slug: string) {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("venues")
      .select(venueFields)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(`Public venue query failed: ${error.message}`);
    if (!data) return null;
    const venue = venueFromRow(data as unknown as DbRecord);
    const [{ data: offers }, { data: loyalty }, { data: media }] =
      await Promise.all([
        supabase
          .from("offers")
          .select("id,title_es,title_en,terms_es,terms_en,starts_at,ends_at")
          .eq("venue_id", venue.id)
          .eq("status", "published")
          .lte("starts_at", new Date().toISOString())
          .gte("ends_at", new Date().toISOString()),
        supabase
          .from("loyalty_programs")
          .select("id,title_es,title_en,reward_es,reward_en,stamps_required")
          .eq("venue_id", venue.id)
          .eq("active", true),
        supabase
          .from("venue_media")
          .select("id,storage_path,alt_es,alt_en")
          .eq("venue_id", venue.id)
          .order("sort_order")
          .limit(12),
      ]);
    venue.offers = (offers || []).map((item) => ({
      id: item.id,
      title: { es: item.title_es, en: item.title_en || undefined },
      terms: { es: item.terms_es, en: item.terms_en || undefined },
      startsAt: item.starts_at,
      endsAt: item.ends_at,
    }));
    venue.loyalty = (loyalty || []).map((item) => ({
      id: item.id,
      title: { es: item.title_es, en: item.title_en || undefined },
      reward: { es: item.reward_es, en: item.reward_en || undefined },
      stampsRequired: item.stamps_required,
    }));
    const signedMedia = await Promise.all(
      (media || []).map(async (item) => {
        const { data: signed } = await supabase.storage
          .from("event-media")
          .createSignedUrl(item.storage_path, 3600);
        if (!signed?.signedUrl) return null;
        return {
          id: String(item.id),
          url: signed.signedUrl,
          alt: {
            es: String(item.alt_es),
            ...(item.alt_en ? { en: String(item.alt_en) } : {}),
          },
        };
      }),
    );
    venue.media = signedMedia.filter(
      (item): item is NonNullable<(typeof signedMedia)[number]> =>
        item !== null,
    );
    return venue;
  }

  async venueById(id: string) {
    if (!uuidPattern.test(id)) return null;
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("venues")
      .select(venueFields)
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(`Public venue query failed: ${error.message}`);
    const venue = data ? venueFromRow(data as unknown as DbRecord) : null;
    if (!venue) return null;
    const { data: media } = await supabase
      .from("venue_media")
      .select("id,storage_path,alt_es,alt_en")
      .eq("venue_id", venue.id)
      .order("sort_order")
      .limit(12);
    const signedMedia = await Promise.all(
      (media || []).map(async (item) => {
        const { data: signed } = await supabase.storage
          .from("event-media")
          .createSignedUrl(item.storage_path, 3600);
        if (!signed?.signedUrl) return null;
        return {
          id: String(item.id),
          url: signed.signedUrl,
          alt: {
            es: String(item.alt_es),
            ...(item.alt_en ? { en: String(item.alt_en) } : {}),
          },
        };
      }),
    );
    venue.media = signedMedia.filter(
      (item): item is NonNullable<(typeof signedMedia)[number]> =>
        item !== null,
    );
    return venue;
  }

  async eventsForVenue(venueId: string) {
    if (!uuidPattern.test(venueId)) return [];
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("events")
      .select(eventFields)
      .eq("venue_id", venueId)
      .eq("status", "published");
    if (error) throw new Error(`Public event query failed: ${error.message}`);
    return (data as unknown as DbRecord[])
      .map(eventFromRow)
      .filter((event): event is Event => Boolean(event));
  }
}

export class HybridDiscoveryRepository implements DiscoveryRepository {
  constructor(
    private live = new SupabaseDiscoveryRepository(),
    private fallback = new FixtureRepository(),
  ) {}
  async discover(query: DiscoveryQuery) {
    const [live, fallback] = await Promise.all([
      this.live.discover(query).catch(() => []),
      this.fallback.discover(query),
    ]);
    const liveSlugs = new Set(live.map((item) => item.event.slug));
    return [
      ...live,
      ...fallback.filter((item) => !liveSlugs.has(item.event.slug)),
    ].sort(
      (a, b) =>
        +new Date(a.occurrence.startsAt) - +new Date(b.occurrence.startsAt),
    );
  }
  async eventBySlug(slug: string) {
    return (
      (await this.live.eventBySlug(slug).catch(() => null)) ||
      this.fallback.eventBySlug(slug)
    );
  }
  async venueBySlug(slug: string) {
    return (
      (await this.live.venueBySlug(slug).catch(() => null)) ||
      this.fallback.venueBySlug(slug)
    );
  }
  async venueById(id: string) {
    return (
      (await this.live.venueById(id).catch(() => null)) ||
      this.fallback.venueById(id)
    );
  }
  async eventsForVenue(venueId: string) {
    const [live, fallback] = await Promise.all([
      this.live.eventsForVenue(venueId).catch(() => []),
      this.fallback.eventsForVenue(venueId),
    ]);
    return [
      ...live,
      ...fallback.filter(
        (item) => !live.some((candidate) => candidate.slug === item.slug),
      ),
    ];
  }
}

export const repository: DiscoveryRepository =
  config.dataProvider === "fixtures"
    ? new FixtureRepository()
    : config.dataProvider === "supabase"
      ? new SupabaseDiscoveryRepository()
      : new HybridDiscoveryRepository();
