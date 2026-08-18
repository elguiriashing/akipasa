import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { isLocale } from "@/lib/config";
import { msg } from "@/lib/messages";
import { repository } from "@/lib/repository";
import { googleMapsDirectionsUrl } from "@/lib/maps";
import { translated } from "@/lib/domain";
import { optionalUser } from "@/lib/auth";
import { setEventPreference, toggleSavedEvent } from "../../engagement/actions";
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
  const [{ data: saved }, { data: premium }, { data: eventPreference }] = user
    ? await Promise.all([
        supabase
          .from("saved_event_refs")
          .select("event_key")
          .eq("profile_id", user.id)
          .eq("event_key", event.id)
          .maybeSingle(),
        supabase.rpc("has_active_entitlement", {
          p_profile: user.id,
          p_plan: "premium",
        }),
        supabase
          .from("user_event_preferences")
          .select("state,reason")
          .eq("profile_id", user.id)
          .eq("event_id", event.id)
          .maybeSingle(),
      ])
    : [{ data: null }, { data: false }, { data: null }];
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
  const bgImage = resolvedVenue.media?.[0]?.url;

  return (
    <>
      {bgImage && (
        <div
          className="liquid-glass-bg"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      )}
      <main className="shell detail-layout">
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
        <article className="detail-card detail-card-primary">
          {bgImage ? (
            <div
              className="detail-cover"
              style={{ backgroundImage: `url(${bgImage})` }}
              aria-hidden
            />
          ) : null}
          <div className="detail-intro">
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
            <p className="detail-copy">
              {translated(event.description, locale)}
            </p>
            <Link
              className="venue-context-link"
              href={`/${locale}/venues/${resolvedVenue.slug}`}
            >
              {resolvedVenue.name} →
            </Link>
          </div>
        </article>
        <aside className="detail-sidebar detail-sidebar-polished">
          <div className="detail-sidebar-heading">
            <span>{locale === "es" ? "En resumen" : "At a glance"}</span>
            <strong>{translated(event.title, locale)}</strong>
          </div>
          <dl className="detail-facts">
            <div>
              <dt>{m.time}</dt>
              <dd>{date}</dd>
            </div>
            <div>
              <dt>{m.price}</dt>
              <dd>
                {event.priceCents ? `${event.priceCents / 100} €` : m.free}
              </dd>
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
          <div className="actions detail-actions">
            <TrackedLink
              className="button"
              href={googleMapsDirectionsUrl(resolvedVenue)}
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
            {user ? (
              <form
                action={setEventPreference}
                className="event-preference-form"
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="eventId" value={event.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <input
                  type="hidden"
                  name="state"
                  value={eventPreference?.state === "going" ? "clear" : "going"}
                />
                <button className="button secondary" type="submit">
                  {eventPreference?.state === "going"
                    ? locale === "es"
                      ? "Ya no voy"
                      : "No longer going"
                    : locale === "es"
                      ? "Voy"
                      : "Going"}
                </button>
              </form>
            ) : null}
            {user ? (
              <details className="event-preference-form">
                <summary>
                  {eventPreference?.state === "not_interested"
                    ? locale === "es"
                      ? "No me interesa ✓"
                      : "Not interested ✓"
                    : locale === "es"
                      ? "No me interesa"
                      : "Not interested"}
                </summary>
                <form action={setEventPreference} className="stack">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input
                    type="hidden"
                    name="state"
                    value={
                      eventPreference?.state === "not_interested"
                        ? "clear"
                        : "not_interested"
                    }
                  />
                  {eventPreference?.state !== "not_interested" ? (
                    <select
                      name="reason"
                      defaultValue=""
                      aria-label={
                        locale === "es" ? "Motivo opcional" : "Optional reason"
                      }
                    >
                      <option value="">
                        {locale === "es"
                          ? "Motivo opcional"
                          : "Optional reason"}
                      </option>
                      <option value="not_my_thing">
                        {locale === "es" ? "No es lo mío" : "Not my thing"}
                      </option>
                      <option value="too_far">
                        {locale === "es" ? "Demasiado lejos" : "Too far"}
                      </option>
                      <option value="too_expensive">
                        {locale === "es" ? "Demasiado caro" : "Too expensive"}
                      </option>
                      <option value="wrong_time">
                        {locale === "es" ? "Mal horario" : "Wrong time"}
                      </option>
                      <option value="already_seen">
                        {locale === "es" ? "Ya lo he visto" : "Already seen"}
                      </option>
                    </select>
                  ) : (
                    <input type="hidden" name="reason" value="" />
                  )}
                  <button className="button secondary" type="submit">
                    {eventPreference?.state === "not_interested"
                      ? locale === "es"
                        ? "Deshacer"
                        : "Undo"
                      : locale === "es"
                        ? "Confirmar"
                        : "Confirm"}
                  </button>
                </form>
              </details>
            ) : null}
            <ShareButton
              title={translated(event.title, locale)}
              label={locale === "es" ? "Compartir" : "Share"}
              copiedLabel={locale === "es" ? "Enlace copiado" : "Link copied"}
              venueId={resolvedVenue.id}
              eventId={event.id}
              locale={locale}
            />
            {premium ? (
              <TrackedLink
                className="button secondary"
                href={"/" + locale + "/events/" + event.slug + "/calendar"}
                action="calendar_add"
                venueId={resolvedVenue.id}
                eventId={event.id}
                locale={locale}
              >
                {locale === "es" ? "Añadir al calendario" : "Add to calendar"}
              </TrackedLink>
            ) : user ? (
              <Link
                className="button secondary"
                href={"/" + locale + "/account/subscription?plan=premium"}
              >
                {locale === "es"
                  ? "Calendario con Premium"
                  : "Calendar with Premium"}
              </Link>
            ) : null}
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
    </>
  );
}
