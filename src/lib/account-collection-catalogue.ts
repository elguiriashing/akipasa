import type { Locale } from "./config";
import type { requireUser } from "./auth";

type AccountClient = Awaited<ReturnType<typeof requireUser>>["supabase"];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function currentEventCollectionItems<
  T extends { event_key: string; title: string; href: string },
>(supabase: AccountClient, refs: T[], locale: Locale) {
  const ids = Array.from(
    new Set(
      refs.map((item) => item.event_key).filter((id) => uuidPattern.test(id)),
    ),
  );
  const { data, error } = ids.length
    ? await supabase
        .from("events")
        .select("id,slug,title_es,title_en")
        .in("id", ids)
    : { data: [], error: null };
  const current = new Map(
    (error ? [] : data || []).map((item) => [item.id, item]),
  );
  return refs.map((item) => {
    const event = current.get(item.event_key);
    return {
      ...item,
      displayLabel: event
        ? locale === "es"
          ? event.title_es
          : event.title_en || event.title_es
        : item.title,
      displayHref: event?.slug ? `/${locale}/events/${event.slug}` : item.href,
    };
  });
}

export async function currentVenueCollectionItems<
  T extends { venue_key: string; name: string; href: string },
>(supabase: AccountClient, refs: T[], locale: Locale) {
  const ids = Array.from(
    new Set(
      refs.map((item) => item.venue_key).filter((id) => uuidPattern.test(id)),
    ),
  );
  const { data, error } = ids.length
    ? await supabase.from("venues").select("id,slug,name").in("id", ids)
    : { data: [], error: null };
  const current = new Map(
    (error ? [] : data || []).map((item) => [item.id, item]),
  );
  return refs.map((item) => {
    const venue = current.get(item.venue_key);
    return {
      ...item,
      displayLabel: venue?.name || item.name,
      displayHref: venue?.slug ? `/${locale}/venues/${venue.slug}` : item.href,
    };
  });
}
