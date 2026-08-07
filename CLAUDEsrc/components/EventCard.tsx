import Link from "next/link";
import type { DiscoveryResult } from "@/lib/domain";
import { translated } from "@/lib/domain";
import type { Locale } from "@/lib/config";
import { msg } from "@/lib/messages";
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

  return (
    <Link className="card" href={`/${locale}/events/${result.event.slug}`}>
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
      </div>
      <div className="card-body">
        <div className="card-topline">
          <span className="pill">{date}</span>
        </div>
        <div className="card-title-row">
          <h3>{translated(result.event.title, locale)}</h3>
          <span className="pill-pill">
            {result.event.priceCents === 0
              ? m.free
              : `${(result.event.priceCents / 100).toFixed(0)}€`}
          </span>
        </div>
        <p className="card-venue">{result.venue.name}</p>
        <p className="card-distance">{`${result.distanceKm.toFixed(1)} km`}</p>
        <div className="card-meta">
          <span className="pill-muted">{categoryLabel}</span>
          {result.event.source === "verified_venue" ? (
            <VerifiedBadge locale={locale} />
          ) : (
            <span className="community-chip">{m.community}</span>
          )}
        </div>
        <div className="card-footer">
          <span>
            {result.event.sponsored ? (
              locale === "es" ? (
                "Patrocinado"
              ) : (
                "Sponsored"
              )
            ) : result.event.source === "verified_venue" ? (
              <VerifiedBadge locale={locale} size="sm" />
            ) : (
              <span className="community-chip">{m.community}</span>
            )}
          </span>
          <span className="card-arrow" aria-hidden>
            {locale === "es" ? "Ver" : "View"}
          </span>
        </div>
      </div>
    </Link>
  );
}
