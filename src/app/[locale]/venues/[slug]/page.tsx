/* eslint-disable @next/next/no-img-element -- Venue media uses native images with existing layout controls. */
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { localizedMetadata, languageUrls, serializeJsonLd } from "@/lib/seo";
import Link from "next/link";
import { isLocale } from "@/lib/config";
import { translated } from "@/lib/domain";
import { msg } from "@/lib/messages";
import { repository } from "@/lib/repository";
import { googleMapsDirectionsUrl } from "@/lib/maps";
import { optionalUser } from "@/lib/auth";
import { toggleFollowedVenue } from "../../engagement/actions";
import { AnalyticsView, TrackedLink } from "@/components/AnalyticsSignal";
import { accommodationLabel } from "@/lib/accommodation";
import { ShareButton } from "@/components/ShareButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { PublicVenueCatalogue } from "@/components/PublicVenueCatalogue";
import { parseCatalogueDocument } from "@/lib/venue-catalogue";

const loadVenue = cache((slug: string) => repository.venueBySlug(slug));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const venue = await loadVenue(slug);
  if (!venue) notFound();
  return localizedMetadata(
    locale,
    `/venues/${encodeURIComponent(venue.slug)}`,
    venue.name,
    `${venue.address}. ${translated(venue.description, locale)}`,
  );
}

export default async function VenuePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const venue = await loadVenue(slug);
  if (!venue) notFound();
  // Accommodation is presented exclusively through the AkiDuermo stay experience.
  if (venue.discoveryVertical === "accommodation") {
    redirect(
      `https://akiduermo.akipasa.com/stays/${encodeURIComponent(venue.slug)}?lang=${locale}`,
    );
  }
  const events = await repository.eventsForVenue(venue.id);
  const now = Date.now();
  const upcomingEvents = events
    .map((event) => ({
      event,
      occurrence: event.occurrences
        .filter(
          (item) =>
            item.status !== "cancelled" &&
            new Date(item.endsAt).getTime() > now,
        )
        .sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        )[0],
    }))
    .filter(
      (
        item,
      ): item is typeof item & {
        occurrence: NonNullable<typeof item.occurrence>;
      } => Boolean(item.occurrence),
    )
    .sort(
      (a, b) =>
        new Date(a.occurrence.startsAt).getTime() -
        new Date(b.occurrence.startsAt).getTime(),
    );
  const m = msg(locale);
  const returnTo = `/${locale}/venues/${venue.slug}`;
  const { supabase, user } = await optionalUser();
  const { data: cataloguePayload } = await supabase.rpc(
    "public_venue_catalogue",
    {
      p_venue: venue.id,
    },
  );
  const catalogueDocument =
    cataloguePayload &&
    typeof cataloguePayload === "object" &&
    "document" in cataloguePayload
      ? parseCatalogueDocument(
          (cataloguePayload as { document?: unknown }).document,
          locale,
        )
      : null;
  const { data: followed } = user
    ? await supabase
        .from("followed_venue_refs")
        .select("venue_key")
        .eq("profile_id", user.id)
        .eq("venue_key", venue.id)
        .maybeSingle()
    : { data: null };
  const { data: premiumOfferRows } = user
    ? await supabase
        .from("offers")
        .select("id,title_es,title_en,terms_es,terms_en,starts_at,ends_at")
        .eq("venue_id", venue.id)
        .eq("status", "published")
        .eq("audience", "premium")
        .lte("starts_at", new Date().toISOString())
        .gte("ends_at", new Date().toISOString())
    : { data: null };
  const visibleOffers = [
    ...(venue.offers || []).map((offer) => ({ ...offer, premium: false })),
    ...(premiumOfferRows || []).map((offer) => ({
      id: offer.id,
      title: { es: offer.title_es, en: offer.title_en || undefined },
      terms: { es: offer.terms_es, en: offer.terms_en || undefined },
      startsAt: offer.starts_at,
      endsAt: offer.ends_at,
      premium: true,
    })),
  ];
  const { data: bookingSettings } = await supabase
    .from("venue_booking_settings")
    .select("mode,active,external_url")
    .eq("venue_id", venue.id)
    .maybeSingle();
  const externalBookingUrl =
    bookingSettings?.mode === "external" &&
    bookingSettings.active &&
    typeof bookingSettings.external_url === "string" &&
    /^https?:\/\/[^\s/]+/i.test(bookingSettings.external_url)
      ? bookingSettings.external_url
      : null;
  const nativeBooking =
    bookingSettings?.mode === "request" && bookingSettings.active;
  const bgImage = venue.coverImage?.url || venue.media?.[0]?.url;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "Place",
            name: venue.name,
            description: translated(venue.description, locale),
            address: venue.address,
            url: languageUrls(`/venues/${encodeURIComponent(venue.slug)}`)[
              locale
            ],
          }),
        }}
      />
      {bgImage && (
        <div
          className="liquid-glass-bg"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      )}
      <main className="shell detail-layout app-detail-page compact-venue-page">
        <AnalyticsView action="venue_view" venueId={venue.id} locale={locale} />
        <Link className="detail-back" href={`/${locale}`}>
          ← {m.discover}
        </Link>
        <article className="detail-card detail-card-primary">
          {venue.discoveryVertical === "accommodation" && (
            <span className="accommodation-badge">
              {accommodationLabel(locale)}
            </span>
          )}
          {bgImage ? (
            <div
              className="detail-cover"
              style={{ backgroundImage: `url(${bgImage})` }}
              aria-hidden
            />
          ) : null}
          <div className="detail-intro">
            <div className="eyebrow">
              {venue.verified ? (
                <VerifiedBadge locale={locale} />
              ) : venue.claimStatus === "unclaimed" ? (
                locale === "es" ? (
                  "Local sin reclamar"
                ) : (
                  "Unclaimed venue"
                )
              ) : (
                m.community
              )}
            </div>
            <div className="venue-title-row">
              {venue.logoImage ? (
                <img
                  className="venue-profile-logo"
                  src={venue.logoImage.url}
                  alt={translated(venue.logoImage.alt, locale)}
                />
              ) : null}
              <div>
                <h1>{venue.name}</h1>
                <p className="lede">{venue.address}</p>
              </div>
            </div>
            <div className="detail-overview">
              {venue.accessible && (
                <p className="detail-access">
                  ✓{" "}
                  {locale === "es"
                    ? "Acceso sin escalones indicado"
                    : "Step-free access indicated"}
                </p>
              )}
              <div className="actions detail-actions">
                <TrackedLink
                  className="button"
                  href={googleMapsDirectionsUrl(venue)}
                  target="_blank"
                  rel="noreferrer"
                  action="directions_click"
                  venueId={venue.id}
                  locale={locale}
                >
                  {m.directions}
                </TrackedLink>
                {externalBookingUrl && (
                  <TrackedLink
                    className="button secondary"
                    href={externalBookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    action="booking_click"
                    venueId={venue.id}
                    locale={locale}
                  >
                    {locale === "es" ? "Reservar" : "Book now"}
                  </TrackedLink>
                )}
                {nativeBooking && (
                  <TrackedLink
                    className="button secondary"
                    href={`/${locale}/venues/${encodeURIComponent(venue.slug)}/book`}
                    action="booking_click"
                    venueId={venue.id}
                    locale={locale}
                  >
                    {locale === "es" ? "Reservar" : "Book now"}
                  </TrackedLink>
                )}
                {venue.phone && (
                  <TrackedLink
                    className="button secondary"
                    href={`tel:${venue.phone}`}
                    action="phone_click"
                    venueId={venue.id}
                    locale={locale}
                  >
                    {locale === "es" ? "Llamar" : "Call"}
                  </TrackedLink>
                )}
                {venue.whatsappPhone && (
                  <TrackedLink
                    className="button secondary"
                    href={`https://wa.me/${venue.whatsappPhone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    action="whatsapp_click"
                    venueId={venue.id}
                    locale={locale}
                  >
                    WhatsApp
                  </TrackedLink>
                )}
                {venue.websiteUrl && (
                  <TrackedLink
                    className="button secondary"
                    href={venue.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    action="booking_click"
                    venueId={venue.id}
                    locale={locale}
                  >
                    {locale === "es" ? "Sitio web" : "Website"}
                  </TrackedLink>
                )}
                {user ? (
                  <form action={toggleFollowedVenue}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="key" value={venue.id} />
                    <input type="hidden" name="label" value={venue.name} />
                    <input type="hidden" name="href" value={returnTo} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input
                      type="hidden"
                      name="intent"
                      value={followed ? "remove" : "add"}
                    />
                    <button className="button secondary" type="submit">
                      {followed
                        ? locale === "es"
                          ? "Dejar de seguir"
                          : "Unfollow"
                        : locale === "es"
                          ? "Seguir local"
                          : "Follow venue"}
                    </button>
                  </form>
                ) : (
                  <Link
                    className="button secondary"
                    href={`/${locale}/auth?next=${encodeURIComponent(returnTo)}`}
                  >
                    {locale === "es" ? "Seguir local" : "Follow venue"}
                  </Link>
                )}
                <ShareButton
                  title={venue.name}
                  label={locale === "es" ? "Compartir" : "Share"}
                  copiedLabel={
                    locale === "es" ? "Enlace copiado" : "Link copied"
                  }
                  venueId={venue.id}
                  locale={locale}
                />
                <details className="detail-more">
                  <summary>
                    {locale === "es" ? "Más opciones" : "More options"}
                  </summary>
                  <div className="detail-more-actions">
                    {venue.claimStatus === "unclaimed" && (
                      <Link
                        className="button secondary"
                        href={`/${locale}/business?view=claims&venueId=${venue.id}`}
                      >
                        {locale === "es"
                          ? "Reclamar este local"
                          : "Claim this venue"}
                      </Link>
                    )}
                    <Link
                      className="button secondary"
                      href={`/${locale}/community?target=venue:${venue.id}`}
                    >
                      {locale === "es"
                        ? "Informar de un problema"
                        : "Report a problem"}
                    </Link>
                  </div>
                </details>
              </div>
            </div>
            <p className="detail-copy">
              {translated(venue.description, locale)}
            </p>
            {upcomingEvents.length > 0 && (
              <section
                className="venue-section"
                aria-label={
                  locale === "es" ? "Próximos eventos" : "Upcoming events"
                }
              >
                <div className="venue-events-heading">
                  <div>
                    <span className="eyebrow">
                      {locale === "es"
                        ? "Descubre qué pasa"
                        : "What's happening"}
                    </span>
                    <h2>
                      {locale === "es" ? "Próximos eventos" : "Upcoming events"}
                    </h2>
                  </div>
                  <span className="status-pill">
                    {upcomingEvents.length}{" "}
                    {locale === "es" ? "eventos" : "events"}
                  </span>
                </div>
                <div className="venue-event-grid">
                  {upcomingEvents.map(({ event, occurrence }) => {
                    const artwork =
                      event.exploreImage ||
                      event.bannerImage ||
                      event.profileImage ||
                      venue.eventsImage;
                    const startsAt = new Date(occurrence.startsAt);
                    return (
                      <Link
                        className="venue-event-feature"
                        href={`/${locale}/events/${event.slug}`}
                        key={event.id}
                      >
                        <div className="venue-event-feature-art">
                          {artwork ? (
                            <img
                              src={artwork.url}
                              alt={translated(artwork.alt, locale)}
                              loading="lazy"
                            />
                          ) : (
                            <span aria-hidden="true">✦</span>
                          )}
                          <span className="venue-event-feature-date">
                            <strong>
                              {new Intl.DateTimeFormat(
                                locale === "es" ? "es-ES" : "en-GB",
                                { day: "numeric", timeZone: "Europe/Madrid" },
                              ).format(startsAt)}
                            </strong>
                            <small>
                              {new Intl.DateTimeFormat(
                                locale === "es" ? "es-ES" : "en-GB",
                                { month: "short", timeZone: "Europe/Madrid" },
                              ).format(startsAt)}
                            </small>
                          </span>
                        </div>
                        <div className="venue-event-feature-body">
                          <span className="eyebrow">
                            {new Intl.DateTimeFormat(
                              locale === "es" ? "es-ES" : "en-GB",
                              {
                                weekday: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Europe/Madrid",
                              },
                            ).format(startsAt)}
                          </span>
                          <h3>{translated(event.title, locale)}</h3>
                          <p>{translated(event.description, locale)}</p>
                          <span className="venue-event-feature-action">
                            {locale === "es" ? "Ver evento" : "View event"}{" "}
                            <span aria-hidden="true">→</span>
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
            {/* Raw media-library items are internal. Public images render only
                through explicit placements such as cover/profile/menu. */}
            {catalogueDocument && catalogueDocument.sections.length > 0 && (
              <PublicVenueCatalogue
                locale={locale}
                document={catalogueDocument}
                media={(venue.media || []).map((item) => ({
                  id: item.id,
                  url: item.url,
                  alt: translated(item.alt, locale),
                }))}
                heroMedia={
                  venue.menuImage
                    ? {
                        id: venue.menuImage.id,
                        url: venue.menuImage.url,
                        alt: translated(venue.menuImage.alt, locale),
                      }
                    : undefined
                }
              />
            )}
            {visibleOffers.length ? (
              <section className="venue-section">
                <h2>{locale === "es" ? "Ofertas" : "Offers"}</h2>
                {visibleOffers.map((offer) => (
                  <article className="offer-card" key={offer.id}>
                    {offer.premium && (
                      <span className="status-pill">
                        {locale === "es" ? "Oferta Premium" : "Premium offer"}
                      </span>
                    )}
                    <h3>{translated(offer.title, locale)}</h3>
                    <p>{translated(offer.terms, locale)}</p>
                  </article>
                ))}
              </section>
            ) : null}
            {venue.loyalty?.length ? (
              <section className="venue-section">
                <h2>{locale === "es" ? "Fidelidad" : "Loyalty"}</h2>
                {venue.loyalty.map((program) => (
                  <article className="offer-card" key={program.id}>
                    <h3>{translated(program.title, locale)}</h3>
                    <p>
                      {program.stampsRequired}{" "}
                      {locale === "es" ? "sellos" : "stamps"} ·{" "}
                      {translated(program.reward, locale)}
                    </p>
                    <Link href={`/${locale}/passports`}>
                      {locale === "es" ? "Ver mi progreso" : "View my progress"}{" "}
                      →
                    </Link>
                  </article>
                ))}
              </section>
            ) : null}
          </div>
        </article>
      </main>
    </>
  );
}
