import Link from "next/link";
import type { DiscoveryResult } from "@/lib/domain";
import { translated } from "@/lib/domain";
import type { Locale } from "@/lib/config";
import { msg } from "@/lib/messages";
import { Icon } from "@/components/Icons";
import { VerifiedBadge } from "./VerifiedBadge";

type EventCategory =
  | "music"
  | "social"
  | "workshop"
  | "culture"
  | "market"
  | "food";

export function EventCard({
  result,
  locale,
}: {
  result: DiscoveryResult;
  locale: Locale;
}) {
  const m = msg(locale);
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: "Europe/Madrid",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(result.occurrence.startsAt));
  const category = result.event.category as EventCategory;
  const categoryLabel = m[category];
  const primaryImage = result.venue.media?.[0];
  const priceLabel =
    result.event.priceCents === 0
      ? m.free
      : `${(result.event.priceCents / 100).toFixed(0)}€`;

  return (
    <Link
      className={`card${result.event.sponsored ? " card-featured" : ""}`}
      href={`/${locale}/events/${result.event.slug}`}
    >
      <div className="card-media">
        {primaryImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={primaryImage.url}
            alt={translated(primaryImage.alt, locale)}
            loading="lazy"
          />
        ) : (
          <div className="card-media-fallback" aria-hidden>
            <span>{result.event.category.slice(0, 1).toUpperCase()}</span>
          </div>
        )}
        <div className="card-media-scrim" aria-hidden />
        <div className="card-media-badges">
          <span className="pill card-pill-date">{date}</span>
          <span className="pill-pill card-pill-price">{priceLabel}</span>
        </div>
      </div>
      <div className="card-body">
        <h3>{translated(result.event.title, locale)}</h3>
        <p className="card-venue">{result.venue.name}</p>
        <p className="card-distance">{`${result.distanceKm.toFixed(1)} km`}</p>
        <div className="card-meta">
          <span className="pill-muted">{categoryLabel}</span>
          {result.event.sponsored ? (
            <span className="pill-price featured-chip">
              {locale === "es" ? "Destacado" : "Featured"}
            </span>
          ) : result.event.source === "verified_venue" ? (
            <VerifiedBadge locale={locale} size="sm" />
          ) : (
            <span className="community-chip">{m.community}</span>
          )}
        </div>
        <div className="card-footer">
          <span className="card-arrow">
            {locale === "es" ? "Ver plan" : "View"}
            <Icon name="arrow-right" />
          </span>
        </div>
      </div>
    </Link>
  );
}
