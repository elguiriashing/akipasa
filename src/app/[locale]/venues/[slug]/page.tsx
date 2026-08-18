import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { isLocale } from "@/lib/config";
import { translated } from "@/lib/domain";
import { msg } from "@/lib/messages";
import { repository } from "@/lib/repository";
import { googleMapsDirectionsUrl } from "@/lib/maps";
import { optionalUser } from "@/lib/auth";
import { toggleFollowedVenue } from "../../engagement/actions";
import { AnalyticsView, TrackedLink } from "@/components/AnalyticsSignal";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export default async function VenuePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const venue = await repository.venueBySlug(slug);
  if (!venue) notFound();
  const events = await repository.eventsForVenue(venue.id);
  const m = msg(locale);
  const returnTo = `/${locale}/venues/${venue.slug}`;
  const { supabase, user } = await optionalUser();
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
  const bgImage = venue.media?.[0]?.url;

  return (
    <>
      {bgImage && (
        <div
          className="liquid-glass-bg"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      )}
      <main className="shell detail-layout">
        <AnalyticsView action="venue_view" venueId={venue.id} locale={locale} />
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
              {venue.verified ? <VerifiedBadge locale={locale} /> : m.community}
            </div>
            <h1>{venue.name}</h1>
            <p className="lede">{venue.address}</p>
            <p className="detail-copy">
              {translated(venue.description, locale)}
            </p>
            {venue.media?.length && venue.media.length > 1 ? (
              <section className="venue-section mt-8">
                <h2>{locale === "es" ? "Imágenes" : "Images"}</h2>
                <div className="media-gallery-grid">
                  {venue.media.slice(1).map((item) => (
                    <Image
                      key={item.id}
                      src={item.url}
                      alt={translated(item.alt, locale)}
                      width={720}
                      height={480}
                      sizes="(max-width: 700px) 100vw, 50vw"
                    />
                  ))}
                </div>
              </section>
            ) : null}
            <h2>{m.discover}</h2>
            {events.map((event) => (
              <p className="detail-event-row" key={event.id}>
                <Link
                  className="detail-event-link"
                  href={`/${locale}/events/${event.slug}`}
                >
                  {translated(event.title, locale)} →
                </Link>
              </p>
            ))}
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
        <aside className="detail-sidebar detail-sidebar-polished">
          <div className="detail-sidebar-heading">
            <span>{locale === "es" ? "Datos del local" : "Venue details"}</span>
            <strong>{venue.name}</strong>
          </div>
          <dl className="detail-facts">
            <div>
              <dt>{m.location}</dt>
              <dd>{venue.address}</dd>
            </div>
            <div>
              <dt>{m.accessibility}</dt>
              <dd>{venue.accessible ? "✓" : "—"}</dd>
            </div>
          </dl>
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
            <Link
              className="button secondary"
              href={`/${locale}/community?target=venue:${venue.id}`}
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
