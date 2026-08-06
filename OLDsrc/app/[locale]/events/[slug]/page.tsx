import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { isLocale } from "@/lib/config";
import { msg } from "@/lib/messages";
import { repository } from "@/lib/repository";
import { translated } from "@/lib/domain";
import { optionalUser } from "@/lib/auth";
import { toggleSavedEvent } from "../../engagement/actions";
import { ShareButton } from "@/components/ShareButton";
import { AnalyticsView, TrackedLink } from "@/components/AnalyticsSignal";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export default async function EventPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const event = await repository.eventBySlug(slug);
  if (!event) notFound();
  const resolvedVenue = await repository.venueById(event.venueId);
  if (!resolvedVenue) notFound();
  const occurrence =
    event.occurrences.find(
      (item) =>
        new Date(item.endsAt) > new Date() && item.status !== "cancelled",
    ) || event.occurrences[0];
  const bookingUrl = occurrence.bookingUrl || event.bookingUrl;
  const m = msg(locale);
  const returnTo = `/${locale}/events/${event.slug}`;
  const { supabase, user } = await optionalUser();
  const { data: saved } = user
    ? await supabase
        .from("saved_event_refs")
        .select("event_key")
        .eq("profile_id", user.id)
        .eq("event_key", event.id)
        .maybeSingle()
    : { data: null };
  if (user) {
    await supabase.from("recent_event_view_refs").upsert(
      {
        profile_id: user.id,
        event_key: event.id,
        title: translated(event.title, locale),
        href: returnTo,
        viewed_at: new Date().toISOString(),
      },
      { onConflict: "profile_id,event_key" },
    );
  }
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(new Date(occurrence.startsAt));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: translated(event.title, locale),
    startDate: occurrence.startsAt,
    endDate: occurrence.endsAt,
    eventStatus:
      occurrence.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : occurrence.status === "postponed"
          ? "https://schema.org/EventPostponed"
          : "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: resolvedVenue.name,
      address: resolvedVenue.address,
    },
    offers: {
      "@type": "Offer",
      price: event.priceCents / 100,
      priceCurrency: event.currency,
      url: bookingUrl,
    },
  };
  return (
    <main className="shell detail">
      <AnalyticsView
        action="event_view"
        venueId={resolvedVenue.id}
        eventId={event.id}
        locale={locale}
      />
      <Script
        id="event-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article>
        <div className="eyebrow">
          {event.source === "verified_venue" ? (
            <VerifiedBadge locale={locale} />
          ) : (
            m.community
          )}
        </div>
        <h1>{translated(event.title, locale)}</h1>
        {occurrence.status !== "scheduled" && (
          <p className="notice" role="status">
            {locale === "es"
              ? {
                  cancelled: "Este evento está cancelado.",
                  postponed: "Este evento ha sido aplazado.",
                  sold_out: "Este evento está agotado.",
                }[occurrence.status]
              : {
                  cancelled: "This event is cancelled.",
                  postponed: "This event has been postponed.",
                  sold_out: "This event is sold out.",
                }[occurrence.status]}
          </p>
        )}
        <p className="lede">
          {date} · {resolvedVenue.name}
        </p>
        <p className="detail-copy">{translated(event.description, locale)}</p>
        <Link href={`/${locale}/venues/${resolvedVenue.slug}`}>
          {resolvedVenue.name} →
        </Link>
      </article>
      <aside className="panel">
        <dl>
          <div>
            <dt>{m.time}</dt>
            <dd>{date}</dd>
          </div>
          <div>
            <dt>{m.price}</dt>
            <dd>{event.priceCents ? `${event.priceCents / 100} €` : m.free}</dd>
          </div>
          <div>
            <dt>{m.location}</dt>
            <dd>{resolvedVenue.address}</dd>
          </div>
          <div>
            <dt>{locale === "es" ? "Edad" : "Age"}</dt>
            <dd>
              {event.minimumAge === undefined
                ? locale === "es"
                  ? "Todas las edades"
                  : "All ages"
                : `${event.minimumAge}+`}
            </dd>
          </div>
          <div>
            <dt>{locale === "es" ? "Accesibilidad" : "Accessibility"}</dt>
            <dd>
              {event.accessibilityNotes
                ? translated(event.accessibilityNotes, locale)
                : resolvedVenue.accessible
                  ? locale === "es"
                    ? "Acceso sin escalones indicado"
                    : "Step-free access indicated"
                  : locale === "es"
                    ? "Contacta con el local para confirmar"
                    : "Contact the venue to confirm"}
            </dd>
          </div>
        </dl>
        <div className="actions">
          <TrackedLink
            className="button"
            href={`https://www.google.com/maps/search/?api=1&query=${resolvedVenue.latitude},${resolvedVenue.longitude}`}
            target="_blank"
            rel="noreferrer"
            action="directions_click"
            venueId={resolvedVenue.id}
            eventId={event.id}
            locale={locale}
          >
            {m.directions}
          </TrackedLink>
          {bookingUrl &&
            occurrence.status !== "cancelled" &&
            occurrence.status !== "sold_out" && (
              <TrackedLink
                className="button secondary"
                href={bookingUrl}
                target="_blank"
                rel="noreferrer"
                action="booking_click"
                venueId={resolvedVenue.id}
                eventId={event.id}
                locale={locale}
              >
                {m.booking}
              </TrackedLink>
            )}
          {user ? (
            <form action={toggleSavedEvent}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="key" value={event.id} />
              <input
                type="hidden"
                name="label"
                value={translated(event.title, locale)}
              />
              <input type="hidden" name="href" value={returnTo} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <input
                type="hidden"
                name="intent"
                value={saved ? "remove" : "add"}
              />
              <button className="button secondary" type="submit">
                {saved
                  ? locale === "es"
                    ? "Quitar de favoritos"
                    : "Remove favorite"
                  : locale === "es"
                    ? "Guardar evento"
                    : "Save event"}
              </button>
            </form>
          ) : (
            <Link
              className="button secondary"
              href={`/${locale}/auth?next=${encodeURIComponent(returnTo)}`}
            >
              {locale === "es" ? "Guardar evento" : "Save event"}
            </Link>
          )}
          <ShareButton
            title={translated(event.title, locale)}
            label={locale === "es" ? "Compartir" : "Share"}
            copiedLabel={locale === "es" ? "Enlace copiado" : "Link copied"}
            venueId={resolvedVenue.id}
            eventId={event.id}
            locale={locale}
          />
          <Link
            className="button secondary"
            href={`/${locale}/community?target=event:${event.id}`}
          >
            {locale === "es" ? "Informar de un problema" : "Report a problem"}
          </Link>
          <Link className="button secondary" href={`/${locale}`}>
            {m.back}
          </Link>
        </div>
      </aside>
    </main>
  );
}
