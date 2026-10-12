/* eslint-disable @next/next/no-img-element -- Venue media uses native images with existing layout controls. */
import { eventStayHref } from "@/lib/trip-links";
import { notFound } from "next/navigation";
import { cache } from "react";
import { localizedMetadata, languageUrls, serializeJsonLd } from "@/lib/seo";
import Link from "next/link";
import { isLocale } from "@/lib/config";
import { msg } from "@/lib/messages";
import { repository } from "@/lib/repository";
import { googleMapsDirectionsUrl } from "@/lib/maps";
import { translated } from "@/lib/domain";
import { optionalUser } from "@/lib/auth";
import { setEventPreference, toggleSavedEvent } from "../../engagement/actions";
import { Icon } from "@/components/Icons";
import "@/components/spotlight-detail.css";
import "./event-spotlight.css";
import { ShareButton } from "@/components/ShareButton";
import { AnalyticsView, TrackedLink } from "@/components/AnalyticsSignal";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { PublicVenueCatalogue } from "@/components/PublicVenueCatalogue";
import { parseCatalogueDocument } from "@/lib/venue-catalogue";

const loadEvent = cache((slug: string) => repository.eventBySlug(slug));
const loadVenue = cache((id: string) => repository.venueById(id));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const event = await loadEvent(slug);
  if (!event?.occurrences.length || !(await loadVenue(event.venueId)))
    notFound();
  return localizedMetadata(
    locale,
    `/events/${encodeURIComponent(event.slug)}`,
    translated(event.title, locale),
    translated(event.description, locale),
  );
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const event = await loadEvent(slug);
  if (!event?.occurrences.length) notFound();
  const resolvedVenue = await loadVenue(event.venueId);
  if (!resolvedVenue) notFound();
  const occurrence =
    event.occurrences.find(
      (item) =>
        new Date(item.endsAt) > new Date() && item.status !== "cancelled",
    ) || event.occurrences[0];
  const bookingUrl = occurrence.bookingUrl || event.bookingUrl;
  const eventPlace = event.location
    ? {
        ...resolvedVenue,
        latitude: event.location.latitude,
        longitude: event.location.longitude,
        address: event.location.label,
      }
    : resolvedVenue;
  const directionsPlace = event.location
    ? {
        address: event.location.directionsAddress || "",
        latitude: event.location.directionsAddress
          ? undefined
          : event.location.latitude,
        longitude: event.location.directionsAddress
          ? undefined
          : event.location.longitude,
      }
    : resolvedVenue;
  const m = msg(locale);
  const returnTo = `/${locale}/events/${event.slug}`;
  const { supabase, user } = await optionalUser();
  const [{ data: bookingSettings }, { data: publicEngagement }] =
    await Promise.all([
      supabase
        .from("venue_booking_settings")
        .select("mode")
        .eq("venue_id", resolvedVenue.id)
        .eq("active", true)
        .maybeSingle(),
      supabase.rpc("event_public_engagement", { p_event: event.id }),
    ]);
  // Show only this venue's published catalogue content; event stores IDs, not a copy.
  const [{ data: eventMenuLink }, { data: publishedCatalogue }] =
    await Promise.all([
      supabase
        .from("events")
        .select("catalogue_section_ids")
        .eq("id", event.id)
        .eq("venue_id", resolvedVenue.id)
        .eq("status", "published")
        .maybeSingle(),
      supabase.rpc("public_venue_catalogue", { p_venue: resolvedVenue.id }),
    ]);
  const linkedIds = Array.isArray(eventMenuLink?.catalogue_section_ids)
    ? eventMenuLink.catalogue_section_ids.filter(
        (id: unknown): id is string => typeof id === "string",
      )
    : [];
  const completeMenu =
    publishedCatalogue &&
    typeof publishedCatalogue === "object" &&
    "document" in publishedCatalogue
      ? parseCatalogueDocument(
          (publishedCatalogue as { document?: unknown }).document,
          locale,
        )
      : null;
  const eventMenu =
    completeMenu && linkedIds.length
      ? {
          ...completeMenu,
          sections: linkedIds.flatMap((id: string) => {
            const section = completeMenu.sections.find(
              (item) => item.id === id,
            );
            return section ? [section] : [];
          }),
        }
      : null;
  const eventMenuMediaIds = new Set(
    eventMenu?.sections.flatMap((section) =>
      section.items.flatMap((item) =>
        item.visible !== false && item.mediaId ? [item.mediaId] : [],
      ),
    ) || [],
  );
  const goingCount =
    publicEngagement &&
    typeof publicEngagement === "object" &&
    "going" in publicEngagement
      ? Number(publicEngagement.going) || 0
      : 0;
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
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  });
  const date = dateFormatter.format(new Date(occurrence.startsAt));
  const endDate = dateFormatter.format(new Date(occurrence.endsAt));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: translated(event.title, locale),
    description: translated(event.description, locale),
    url: languageUrls(`/events/${encodeURIComponent(event.slug)}`)[locale],
    inLanguage: locale,
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
      name:
        event.source === "akipasa_selection"
          ? translated(event.title, locale)
          : resolvedVenue.name,
      address:
        event.location?.directionsAddress ||
        event.location?.label ||
        resolvedVenue.address,
    },
    ...(event.priceDisplayMode === "hide"
      ? {}
      : {
          offers: {
            "@type": "Offer",
            price: event.priceCents / 100,
            priceCurrency: event.currency,
            url: bookingUrl,
          },
        }),
  };
  const posterMedia =
    event.bannerImage || resolvedVenue.eventsImage || resolvedVenue.media?.[0];
  const profileImage = event.profileImage || resolvedVenue.logoImage;
  const hostImage =
    resolvedVenue.coverImage ||
    resolvedVenue.exploreImage ||
    resolvedVenue.media?.[0];
  const title = translated(event.title, locale);
  const es = locale === "es";
  const startsAt = new Date(occurrence.startsAt);
  const endsAt = new Date(occurrence.endsAt);
  const dayFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    timeZone: "Europe/Madrid",
  });
  const monthFormatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: "Europe/Madrid",
  });
  const civilDateFormatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Madrid",
  });
  const startCivil = civilDateFormatter.format(startsAt);
  const endCivil = civilDateFormatter.format(endsAt);
  const multiDay = startCivil !== endCivil;
  const sameMonth = startCivil.slice(0, 7) === endCivil.slice(0, 7);
  const dayLabel =
    multiDay && sameMonth
      ? `${dayFormatter.format(startsAt)}–${dayFormatter.format(endsAt)}`
      : dayFormatter.format(startsAt);
  const monthLabel = monthFormatter.format(startsAt).replace(/\.$/, "");
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
  const fullDateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeZone: "Europe/Madrid",
  });
  const ageLabel =
    event.minimumAge === undefined
      ? es
        ? "Todas las edades"
        : "All ages"
      : `${event.minimumAge}+`;
  const priceLabel = event.priceCents
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: event.currency,
        maximumFractionDigits: event.priceCents % 100 ? 2 : 0,
      }).format(event.priceCents / 100)
    : m.free;
  const saveLabel = saved
    ? es
      ? "Quitar de favoritos"
      : "Remove favorite"
    : es
      ? "Guardar evento"
      : "Save event";
  const goingLabel =
    eventPreference?.state === "going"
      ? es
        ? "Ya no voy"
        : "No longer going"
      : es
        ? "Voy"
        : "Going";
  const canBook =
    occurrence.status !== "cancelled" &&
    occurrence.status !== "sold_out" &&
    Boolean(bookingUrl || bookingSettings?.mode === "request");
  const authHref = `/${locale}/auth?next=${encodeURIComponent(returnTo)}`;
  const directionsHref = googleMapsDirectionsUrl(directionsPlace);
  const venueHref = `/${locale}/venues/${resolvedVenue.slug}`;
  const bookingClassName = (mobile: boolean) =>
    [
      "button",
      "event-spotlight-booking",
      mobile && "event-spotlight-mobile-primary",
    ]
      .filter(Boolean)
      .join(" ");
  const primaryAction = (mobile = false) =>
    canBook ? (
      bookingUrl ? (
        <TrackedLink
          className={bookingClassName(mobile)}
          href={bookingUrl}
          target="_blank"
          rel="noreferrer"
          action="booking_click"
          venueId={resolvedVenue.id}
          eventId={event.id}
          locale={locale}
        >
          <Icon name="calendar" size={19} />
          {m.booking}
        </TrackedLink>
      ) : (
        <Link
          className={bookingClassName(mobile)}
          href={`/${locale}/events/${event.slug}/book`}
        >
          <Icon name="calendar" size={19} />
          {es ? "Solicitar reserva" : "Request booking"}
        </Link>
      )
    ) : (
      <TrackedLink
        className="button event-spotlight-directions-primary"
        href={directionsHref}
        target="_blank"
        rel="noreferrer"
        action="directions_click"
        venueId={resolvedVenue.id}
        eventId={event.id}
        locale={locale}
      >
        <Icon name="map" size={19} />
        {m.directions}
      </TrackedLink>
    );

  return (
    <main className="shell app-detail-page compact-event-page spotlight-page spotlight-event">
      <AnalyticsView
        action="event_view"
        venueId={resolvedVenue.id}
        eventId={event.id}
        locale={locale}
      />
      <script
        id="event-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <nav
        className="event-spotlight-breadcrumb"
        aria-label={es ? "Volver a descubrir" : "Back to discovery"}
      >
        <Link href={`/${locale}`}>
          <Icon name="arrow-right" size={17} />
          {m.discover}
        </Link>
        <span aria-hidden="true">/</span>
        <span>{es ? "Evento" : "Event"}</span>
      </nav>

      <article className="event-spotlight-card">
        <div className="event-spotlight-hero">
          <div className="event-spotlight-poster">
            {posterMedia ? (
              <img
                className="event-spotlight-poster-image"
                src={posterMedia.url}
                alt={translated(posterMedia.alt, locale) || title}
                fetchPriority="high"
                decoding="async"
              />
            ) : (
              <div className="event-spotlight-poster-placeholder">
                <span className="event-spotlight-wordmark">
                  <Icon name="map" size={24} />
                  AkiPasa
                </span>
                <Icon name="calendar" size={48} />
                <strong>{title}</strong>
                <span>{resolvedVenue.name}</span>
              </div>
            )}
            <div className="event-spotlight-date-ribbon">
              <div
                className="event-spotlight-date-badge"
                title={`${date} – ${endDate}`}
              >
                <strong>{dayLabel}</strong>
                <span>{monthLabel}</span>
                {multiDay && !sameMonth && (
                  <small>
                    → {dayFormatter.format(endsAt)}{" "}
                    {monthFormatter.format(endsAt).replace(/\.$/, "")}
                  </small>
                )}
              </div>
              <div className="event-spotlight-ribbon-info">
                <span>{es ? "Empieza a las" : "Starts at"}</span>
                <strong>{timeFormatter.format(startsAt)}</strong>
                <small>{ageLabel}</small>
              </div>
            </div>
          </div>

          <section
            className="event-spotlight-summary"
            aria-labelledby="event-title"
          >
            <div className="event-spotlight-source">
              {event.source === "akipasa_selection" ? (
                <span className="akipasa-selection-chip">
                  {es ? "Selección AkiPasa" : "AkiPasa Selection"}
                </span>
              ) : event.source === "verified_venue" ? (
                <VerifiedBadge locale={locale} />
              ) : (
                <span className="event-spotlight-chip">{m.community}</span>
              )}
            </div>
            <div className="event-spotlight-title-row">
              {profileImage && profileImage.url !== posterMedia?.url ? (
                <img
                  className="event-spotlight-profile"
                  src={profileImage.url}
                  alt={translated(profileImage.alt, locale)}
                  width={48}
                  height={48}
                />
              ) : null}
              <h1 id="event-title">{title}</h1>
            </div>
            <Link className="event-spotlight-venue-link" href={venueHref}>
              {event.source === "akipasa_selection"
                ? es
                  ? "Publicado por AkiPasa"
                  : "Published by AkiPasa"
                : resolvedVenue.name}
              <Icon name="chevron" size={16} />
            </Link>
            <div className="event-spotlight-chips">
              <span className="event-spotlight-chip">{ageLabel}</span>
              {event.priceDisplayMode !== "hide" && (
                <span className="event-spotlight-chip event-spotlight-price">
                  {priceLabel}
                </span>
              )}
              {goingCount > 0 && (
                <span className="event-spotlight-chip">
                  <Icon name="users" size={14} />
                  {goingCount} {es ? "personas van" : "going"}
                </span>
              )}
            </div>
            {occurrence.status !== "scheduled" && (
              <p className="notice event-spotlight-status" role="status">
                {es
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
            <dl className="event-spotlight-facts">
              <div>
                <dt>
                  <Icon name="calendar" size={20} />
                  <span>{es ? "Fecha" : "Date"}</span>
                </dt>
                <dd>
                  <time dateTime={occurrence.startsAt}>
                    {fullDateFormatter.format(startsAt)}
                  </time>
                  {multiDay && (
                    <small>
                      {es ? "Hasta" : "Until"}{" "}
                      <time dateTime={occurrence.endsAt}>
                        {fullDateFormatter.format(endsAt)}
                      </time>
                    </small>
                  )}
                </dd>
              </div>
              <div>
                <dt>
                  <Icon name="clock" size={20} />
                  <span>{m.time}</span>
                </dt>
                <dd>
                  <time dateTime={occurrence.startsAt} title={date}>
                    {timeFormatter.format(startsAt)}
                  </time>
                  <small>
                    {es ? "Hasta" : "Until"}{" "}
                    <time dateTime={occurrence.endsAt} title={endDate}>
                      {timeFormatter.format(endsAt)}
                      {multiDay
                        ? ` · ${new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Europe/Madrid" }).format(endsAt)}`
                        : ""}
                    </time>
                  </small>
                </dd>
              </div>
              <div>
                <dt>
                  <Icon name="map" size={20} />
                  <span>{m.location}</span>
                </dt>
                <dd>
                  {event.source !== "akipasa_selection" && (
                    <Link href={venueHref}>{resolvedVenue.name}</Link>
                  )}
                  <span>{eventPlace.address}</span>
                  <TrackedLink
                    className="event-spotlight-directions-link"
                    href={directionsHref}
                    target="_blank"
                    rel="noreferrer"
                    action="directions_click"
                    venueId={resolvedVenue.id}
                    eventId={event.id}
                    locale={locale}
                  >
                    {m.directions}
                    <Icon name="arrow-right" size={15} />
                  </TrackedLink>
                </dd>
              </div>
            </dl>
            <div className="event-spotlight-primary-action spotlight-actions">
              {primaryAction()}
            </div>
            <div className="event-spotlight-social spotlight-secondary">
              {user ? (
                <form action={setEventPreference}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input
                    type="hidden"
                    name="state"
                    value={
                      eventPreference?.state === "going" ? "clear" : "going"
                    }
                  />
                  <button
                    className="button secondary event-spotlight-going"
                    type="submit"
                    aria-pressed={eventPreference?.state === "going"}
                  >
                    <Icon name="users" size={18} />
                    {goingLabel}
                  </button>
                </form>
              ) : (
                <Link
                  className="button secondary event-spotlight-going"
                  href={authHref}
                >
                  <Icon name="users" size={18} />
                  {goingLabel}
                </Link>
              )}
              {user ? (
                <form action={toggleSavedEvent}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="key" value={event.id} />
                  <input type="hidden" name="label" value={title} />
                  <input type="hidden" name="href" value={returnTo} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input
                    type="hidden"
                    name="intent"
                    value={saved ? "remove" : "add"}
                  />
                  <button
                    className="button secondary event-spotlight-save"
                    type="submit"
                    aria-label={saveLabel}
                    title={saveLabel}
                    aria-pressed={Boolean(saved)}
                  >
                    <Icon name={saved ? "heart-fill" : "heart"} size={20} />
                  </button>
                </form>
              ) : (
                <Link
                  className="button secondary event-spotlight-save"
                  href={authHref}
                  aria-label={saveLabel}
                  title={saveLabel}
                >
                  <Icon name="heart" size={20} />
                </Link>
              )}
              <ShareButton
                title={title}
                label={es ? "Compartir" : "Share"}
                copiedLabel={es ? "Enlace copiado" : "Link copied"}
                venueId={resolvedVenue.id}
                eventId={event.id}
                locale={locale}
                iconOnly
                className="event-spotlight-share"
              />
            </div>
          </section>
        </div>

        <Link className="event-spotlight-host" href={venueHref}>
          {hostImage ? (
            <img
              src={hostImage.url}
              alt={translated(hostImage.alt, locale)}
              width={104}
              height={76}
              loading="lazy"
            />
          ) : (
            <span className="event-spotlight-host-placeholder">
              <Icon name="venue" size={26} />
            </span>
          )}
          <span className="event-spotlight-host-copy">
            <small>
              {event.source === "akipasa_selection"
                ? es
                  ? "Publicado por"
                  : "Published by"
                : es
                  ? "El local del evento"
                  : "Event venue"}
            </small>
            <strong>{resolvedVenue.name}</strong>
            <span>{resolvedVenue.address}</span>
          </span>
          <span className="event-spotlight-host-action">
            {es ? "Ver local" : "View venue"}
            <Icon name="arrow-right" size={18} />
          </span>
        </Link>
      </article>

      <div className="event-spotlight-details">
        <section className="event-spotlight-about">
          <h2>{es ? "Sobre este evento" : "About this event"}</h2>
          <p>{translated(event.description, locale)}</p>
        </section>
        <aside className="event-spotlight-access">
          <h2>
            <Icon name="shield" size={18} />
            {es ? "Accesibilidad" : "Accessibility"}
          </h2>
          <p>
            {event.accessibilityNotes
              ? translated(event.accessibilityNotes, locale)
              : resolvedVenue.accessible
                ? es
                  ? "Acceso sin escalones indicado"
                  : "Step-free access indicated"
                : es
                  ? "Contacta con el local para confirmar"
                  : "Contact the venue to confirm"}
          </p>
        </aside>
      </div>
      {eventMenu && eventMenu.sections.length > 0 && (
        <details className="event-spotlight-menu event-menu-linked">
          <summary>
            <span>{es ? "Carta del evento" : "Event menu"}</span>
            <Icon name="chevron" size={18} />
          </summary>
          <PublicVenueCatalogue
            locale={locale}
            document={eventMenu}
            media={(resolvedVenue.media || [])
              .filter((item) => eventMenuMediaIds.has(item.id))
              .map((item) => ({
                id: item.id,
                url: item.url,
                alt: translated(item.alt, locale),
              }))}
          />
        </details>
      )}
      <details className="event-spotlight-more">
        <summary>{locale === "es" ? "Más opciones" : "More options"}</summary>
        <div className="event-spotlight-more-actions">
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
                      {locale === "es" ? "Motivo opcional" : "Optional reason"}
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
          <a
            className="button secondary"
            href={eventStayHref(
              locale,
              resolvedVenue.locality,
              occurrence.startsAt,
              occurrence.endsAt,
              {
                latitude: resolvedVenue.latitude,
                longitude: resolvedVenue.longitude,
              },
            )}
          >
            {locale === "es"
              ? "Buscar alojamiento para este evento"
              : "Find a stay for this event"}
          </a>
          <p className="muted">
            {locale === "es"
              ? "AkiDuermo está en vista previa: las fechas son orientativas, sin disponibilidad ni pago de reservas."
              : "AkiDuermo is a preview: dates are for planning, with no live availability or booking payment."}
          </p>

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
        </div>
      </details>
      <div
        className="spotlight-mobile-actions event-spotlight-mobile-actions"
        aria-label={es ? "Acciones del evento" : "Event actions"}
      >
        <div className="event-spotlight-mobile-summary">
          <strong>
            {dayLabel} {monthLabel}
          </strong>
          <span>{title}</span>
        </div>
        <div className="spotlight-actions">
          {primaryAction(true)}
          {canBook && (
            <TrackedLink
              className="button secondary event-spotlight-mobile-directions"
              href={directionsHref}
              target="_blank"
              rel="noreferrer"
              action="directions_click"
              venueId={resolvedVenue.id}
              eventId={event.id}
              locale={locale}
            >
              <Icon name="map" size={19} />
              <span>{m.directions}</span>
            </TrackedLink>
          )}
        </div>
      </div>
    </main>
  );
}
