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
import { ShareButton } from "@/components/ShareButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Icon } from "@/components/Icons";
import { VenueSpotlightSections } from "@/components/VenueSpotlightSections";
import {
  catalogueTextForDisplay,
  parseCatalogueDocument,
} from "@/lib/venue-catalogue";
import "@/components/spotlight-detail.css";
import "./venue-spotlight.css";

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
  // Ownership is independent of listing edits or editorial verification.
  // Fail closed on claim availability when the lookup is unavailable.
  const { supabase, user } = await optionalUser();
  const { data: ownedFlag, error: ownershipError } = await supabase.rpc(
    "public_venue_is_claimed",
    { p_venue: venue.id },
  );
  const canClaimVenue =
    !ownershipError &&
    ownedFlag === false &&
    venue.claimStatus === "unclaimed";
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
  const heroImage = venue.coverImage || venue.media?.[0];
  const es = locale === "es";
  const catalogueSections =
    catalogueDocument?.sections.filter((section) =>
      section.items.some((item) => item.visible !== false),
    ) || [];
  const catalogueSummary = catalogueSections
    .slice(0, 3)
    .map((section) =>
      catalogueTextForDisplay(section.title, locale, "section_title"),
    )
    .filter(Boolean)
    .join(" · ");
  // Keep the media bin private: only images explicitly referenced by the
  // published catalogue enter this client-side menu, plus its selected cover.
  const catalogueMediaIds = new Set(
    catalogueSections.flatMap((section) =>
      section.items
        .filter((item) => item.visible !== false && item.mediaId)
        .map((item) => item.mediaId),
    ),
  );
  const catalogueMedia = (venue.media || [])
    .filter((item) => catalogueMediaIds.has(item.id))
    .map((item) => ({
      id: item.id,
      url: item.url,
      alt: translated(item.alt, locale),
    }));
  const followLabel = followed
    ? es
      ? "Dejar de seguir"
      : "Unfollow"
    : es
      ? "Seguir local"
      : "Follow venue";

  const upcomingEventCards = upcomingEvents.map(({ event, occurrence }) => {
    const artwork =
      event.exploreImage ||
      event.bannerImage ||
      event.profileImage ||
      venue.eventsImage;
    const startsAt = new Date(occurrence.startsAt);
    const formatDate = (options: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(es ? "es-ES" : "en-GB", {
        ...options,
        timeZone: "Europe/Madrid",
      }).format(startsAt);
    return (
      <Link
        className="venue-spotlight-event"
        href={`/${locale}/events/${event.slug}`}
        key={event.id}
      >
        <div className="venue-spotlight-event-art">
          {artwork ? (
            <img
              src={artwork.url}
              alt={translated(artwork.alt, locale)}
              loading="lazy"
            />
          ) : (
            <Icon name="calendar" size={30} />
          )}
        </div>
        <div className="venue-spotlight-event-copy">
          <time
            className="venue-spotlight-event-date"
            dateTime={occurrence.startsAt}
          >
            {formatDate({ day: "numeric", month: "short" })}
            <span> · {formatDate({ hour: "2-digit", minute: "2-digit" })}</span>
          </time>
          <h3>{translated(event.title, locale)}</h3>
          <p>{translated(event.description, locale)}</p>
          <span className="venue-spotlight-event-link">
            {es ? "Ver evento" : "View event"}
            <Icon name="arrow-right" size={15} />
          </span>
        </div>
      </Link>
    );
  });

  const information = (
    <div className="venue-spotlight-information">
      <section>
        <h2>{es ? "Así es el local" : "About the venue"}</h2>
        <p className="venue-spotlight-description">
          {translated(venue.description, locale)}
        </p>
      </section>
      <section className="venue-spotlight-visit">
        <h2>{es ? "Tu visita" : "Your visit"}</h2>
        <p className="venue-spotlight-location">
          <Icon name="map" size={20} />
          <span>{venue.address}</span>
        </p>
        {venue.accessible && (
          <p className="venue-spotlight-access">
            <Icon name="shield" size={18} />
            {es
              ? "Acceso sin escalones indicado"
              : "Step-free access indicated"}
          </p>
        )}
        <div className="venue-spotlight-contact-actions">
          {venue.phone && (
            <TrackedLink
              className="button secondary"
              href={`tel:${venue.phone}`}
              action="phone_click"
              venueId={venue.id}
              locale={locale}
            >
              {es ? "Llamar" : "Call"}
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
              <Icon name="globe" size={17} />
              {es ? "Sitio web" : "Website"}
            </TrackedLink>
          )}
        </div>
        <details className="venue-spotlight-more">
          <summary>
            {es ? "Más opciones" : "More options"}
            <Icon name="chevron" size={16} />
          </summary>
          <div>
            {canClaimVenue && (
              <Link
                href={`/${locale}/business?view=claims&venueId=${venue.id}`}
              >
                {es ? "Reclamar este local" : "Claim this venue"}
                <Icon name="arrow-right" size={16} />
              </Link>
            )}
            <Link href={`/${locale}/community?target=venue:${venue.id}`}>
              {es ? "Informar de un problema" : "Report a problem"}
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </details>
      </section>
    </div>
  );

  const extras = (
    <div className="venue-spotlight-perks">
      {visibleOffers.length > 0 && (
        <section>
          <h2>{es ? "Ofertas" : "Offers"}</h2>
          <div className="venue-spotlight-perk-list">
            {visibleOffers.map((offer) => (
              <article className="venue-spotlight-perk" key={offer.id}>
                <Icon name="gift" size={24} />
                <div>
                  {offer.premium && (
                    <span className="status-pill">
                      {es ? "Oferta Premium" : "Premium offer"}
                    </span>
                  )}
                  <h3>{translated(offer.title, locale)}</h3>
                  <p>{translated(offer.terms, locale)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {venue.loyalty?.length ? (
        <section>
          <h2>{es ? "Fidelidad" : "Loyalty"}</h2>
          <div className="venue-spotlight-perk-list">
            {venue.loyalty.map((program) => (
              <article className="venue-spotlight-perk" key={program.id}>
                <Icon name="passport" size={24} />
                <div>
                  <h3>{translated(program.title, locale)}</h3>
                  <p>
                    {program.stampsRequired} {es ? "sellos" : "stamps"} ·{" "}
                    {translated(program.reward, locale)}
                  </p>
                  <Link href={`/${locale}/passports`}>
                    {es ? "Ver mi progreso" : "View my progress"}
                    <Icon name="arrow-right" size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );

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
      <main className="shell app-detail-page spotlight-page spotlight-venue">
        <AnalyticsView action="venue_view" venueId={venue.id} locale={locale} />
        <article className="venue-spotlight-card">
          <header
            className={["venue-spotlight-hero", !heroImage && "without-image"]
              .filter(Boolean)
              .join(" ")}
          >
            <div
              className="venue-spotlight-art"
              data-logo-media={Boolean(
                heroImage && heroImage.id === venue.logoImage?.id,
              )}
            >
              {heroImage ? (
                <img
                  src={heroImage.url}
                  alt={translated(heroImage.alt, locale) || venue.name}
                  fetchPriority="high"
                />
              ) : (
                <div
                  className="venue-spotlight-art-placeholder"
                  aria-hidden="true"
                >
                  <Icon name="venue" size={56} />
                  <span>AkiPasa</span>
                </div>
              )}
              <Link className="venue-spotlight-back" href={`/${locale}`}>
                <Icon name="arrow-right" size={18} />
                <span>{m.discover}</span>
              </Link>
            </div>
            <div className="venue-spotlight-summary">
              <div className="venue-spotlight-status">
                {venue.verified ? (
                  <VerifiedBadge locale={locale} />
                ) : canClaimVenue ? (
                  <span>{es ? "Local sin reclamar" : "Unclaimed venue"}</span>
                ) : (
                  <span>{m.community}</span>
                )}
              </div>
              <div className="venue-spotlight-title">
                {venue.logoImage && venue.logoImage.id !== heroImage?.id ? (
                  <img
                    src={venue.logoImage.url}
                    alt={translated(venue.logoImage.alt, locale)}
                    width="56"
                    height="56"
                  />
                ) : null}
                <h1>{venue.name}</h1>
              </div>
              {catalogueSummary && (
                <p className="venue-spotlight-categories-summary">
                  {catalogueSummary}
                </p>
              )}
              <p className="venue-spotlight-location">
                <Icon name="map" size={20} />
                <span>{venue.address}</span>
              </p>
              {venue.accessible && (
                <p className="venue-spotlight-access">
                  <Icon name="shield" size={17} />
                  {es
                    ? "Acceso sin escalones indicado"
                    : "Step-free access indicated"}
                </p>
              )}
              <div
                className={[
                  "venue-spotlight-visit-controls",
                  (externalBookingUrl || nativeBooking) && "has-booking",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="spotlight-actions venue-spotlight-primary-actions venue-spotlight-mobile-actions">
                  <TrackedLink
                    className="button venue-spotlight-directions"
                    href={googleMapsDirectionsUrl(venue)}
                    target="_blank"
                    rel="noreferrer"
                    action="directions_click"
                    venueId={venue.id}
                    locale={locale}
                  >
                    <Icon name="directions" size={19} />
                    {m.directions}
                  </TrackedLink>
                  {externalBookingUrl && (
                    <TrackedLink
                      className="button secondary venue-spotlight-book"
                      href={externalBookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      action="booking_click"
                      venueId={venue.id}
                      locale={locale}
                    >
                      <Icon name="calendar" size={18} />
                      {es ? "Reservar" : "Book now"}
                    </TrackedLink>
                  )}
                  {nativeBooking && (
                    <TrackedLink
                      className="button secondary venue-spotlight-book"
                      href={`/${locale}/venues/${encodeURIComponent(venue.slug)}/book`}
                      action="booking_click"
                      venueId={venue.id}
                      locale={locale}
                    >
                      <Icon name="calendar" size={18} />
                      {es ? "Reservar" : "Book now"}
                    </TrackedLink>
                  )}
                </div>
                <div className="spotlight-secondary venue-spotlight-social">
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
                      <button
                        className="button secondary venue-spotlight-icon-button"
                        type="submit"
                        aria-label={followLabel}
                        title={followLabel}
                        aria-pressed={Boolean(followed)}
                      >
                        <Icon
                          name={followed ? "heart-fill" : "heart"}
                          size={20}
                        />
                      </button>
                    </form>
                  ) : (
                    <Link
                      className="button secondary venue-spotlight-icon-button"
                      href={`/${locale}/auth?next=${encodeURIComponent(returnTo)}`}
                      aria-label={followLabel}
                      title={followLabel}
                    >
                      <Icon name="heart" size={20} />
                    </Link>
                  )}
                  <ShareButton
                    title={venue.name}
                    label={es ? "Compartir" : "Share"}
                    copiedLabel={es ? "Enlace copiado" : "Link copied"}
                    venueId={venue.id}
                    locale={locale}
                    iconOnly
                    className="venue-spotlight-icon-button"
                  />
                </div>
              </div>
            </div>
          </header>
          <VenueSpotlightSections
            locale={locale}
            catalogueDocument={catalogueDocument}
            media={catalogueMedia}
            menuImage={
              venue.menuImage
                ? {
                    id: venue.menuImage.id,
                    url: venue.menuImage.url,
                    alt: translated(venue.menuImage.alt, locale),
                  }
                : undefined
            }
            events={upcomingEventCards}
            eventCount={upcomingEvents.length}
            information={information}
            extras={extras}
            hasExtras={
              visibleOffers.length > 0 || Boolean(venue.loyalty?.length)
            }
          />
        </article>
      </main>
    </>
  );
}
