import { notFound } from "next/navigation";
import { buildCalendar } from "@/lib/calendar";
import { requireUser } from "@/lib/auth";
import { config, isLocale } from "@/lib/config";
import { translated } from "@/lib/domain";
import { repository } from "@/lib/repository";
import { occurrenceHref, selectEventOccurrence } from "@/lib/event-occurrence";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string; slug: string }> },
) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const requestedOccurrence = new URL(request.url).searchParams.get(
    "occurrence",
  );
  const { supabase, user } = await requireUser(
    locale,
    requestedOccurrence
      ? occurrenceHref(`/${locale}/events/${slug}`, requestedOccurrence)
      : `/${locale}/events/${slug}`,
  );
  const { data: premium } = await supabase.rpc("has_active_entitlement", {
    p_profile: user.id,
    p_plan: "premium",
  });
  if (!premium)
    return new Response("Premium membership required", { status: 403 });

  const event = await repository.eventBySlug(slug);
  if (!event) notFound();
  const venue = await repository.venueById(event.venueId);
  if (!venue) notFound();
  const occurrence = selectEventOccurrence(
    event.occurrences,
    requestedOccurrence,
  );
  if (!occurrence) notFound();

  const body = buildCalendar([
    {
      uid: `${occurrence.id}@akipasa.com`,
      title: translated(event.title, locale),
      description: translated(event.description, locale),
      location:
        event.location?.directionsAddress ||
        event.location?.label ||
        `${venue.name}, ${venue.address}`,
      startsAt: occurrence.startsAt,
      endsAt: occurrence.endsAt,
      url: `${config.siteUrl}${occurrenceHref(
        `/${locale}/events/${event.slug}`,
        occurrence.id,
      )}`,
    },
  ]);
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="akipasa-${event.slug}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
