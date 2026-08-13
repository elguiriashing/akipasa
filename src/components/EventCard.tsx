"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { DiscoveryResult } from "@/lib/domain";
import { translated } from "@/lib/domain";
import type { Locale } from "@/lib/config";
import { msg } from "@/lib/messages";
import { Icon } from "@/components/Icons";
import { VerifiedBadge } from "./VerifiedBadge";
import { trackBehaviour } from "@/lib/personalisation/client";
import type { RecommendationReason } from "@/lib/personalisation/ranking";

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
  position,
  recommendationRequestId,
  reasonCodes = [],
  surface = "discover",
}: {
  result: DiscoveryResult;
  locale: Locale;
  position?: number;
  recommendationRequestId?: string;
  reasonCodes?: RecommendationReason[];
  surface?: "discover" | "map";
}) {
  const m = msg(locale);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const impressed = useRef(false);
  const interacted = useRef(false);
  const visibleSince = useRef<number | undefined>(undefined);
  const visibleDuration = useRef(0);
  const impressionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
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

  useEffect(() => {
    const element = cardRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const tracking = {
      surface,
      entityType: "event" as const,
      entityId: result.event.id,
      position,
      recommendationRequestId,
      context: {
        category: result.event.category,
        distance_km: Number(result.distanceKm.toFixed(2)),
        language: locale,
        sponsored: result.event.sponsored,
      },
    };
    const stopVisible = () => {
      if (visibleSince.current !== undefined) {
        visibleDuration.current += performance.now() - visibleSince.current;
        visibleSince.current = undefined;
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6) {
          if (visibleSince.current === undefined)
            visibleSince.current = performance.now();
          if (!impressed.current && !impressionTimer.current) {
            impressionTimer.current = setTimeout(() => {
              impressed.current = true;
              trackBehaviour({ ...tracking, eventType: "event_impression" });
            }, 750);
          }
          return;
        }
        clearTimeout(impressionTimer.current);
        impressionTimer.current = undefined;
        stopVisible();
        if (
          impressed.current &&
          !interacted.current &&
          entry.boundingClientRect.top < 0
        ) {
          interacted.current = true;
          trackBehaviour({ ...tracking, eventType: "event_skipped" });
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      clearTimeout(impressionTimer.current);
      stopVisible();
      if (impressed.current && visibleDuration.current >= 1500) {
        trackBehaviour({
          ...tracking,
          eventType: "entity_view_duration",
          metadata: {
            duration_ms: Math.round(visibleDuration.current),
            visible_percentage: 60,
            completed: interacted.current,
          },
        });
      }
    };
  }, [locale, position, recommendationRequestId, result, surface]);

  function openEvent() {
    interacted.current = true;
    trackBehaviour({
      eventType: result.event.sponsored
        ? "event_promoted_clicked"
        : recommendationRequestId
          ? "recommendation_clicked"
          : "event_opened",
      surface,
      entityType: "event",
      entityId: result.event.id,
      position,
      recommendationRequestId,
      context: { category: result.event.category, language: locale },
    });
  }

  const reasonLabels: Partial<Record<RecommendationReason, string>> = {
    because_you_like_category:
      locale === "es" ? "Porque te gusta" : "Because you like this",
    from_a_venue_you_like:
      locale === "es" ? "De un local que te gusta" : "From a venue you like",
    matches_your_budget:
      locale === "es" ? "Encaja con tu presupuesto" : "Matches your budget",
    nearby: locale === "es" ? "Cerca de ti" : "Nearby",
    starting_soon: locale === "es" ? "Empieza pronto" : "Starting soon",
    happening_now: locale === "es" ? "Está pasando ahora" : "Happening now",
    verified_quality: locale === "es" ? "Local verificado" : "Verified venue",
    something_new:
      locale === "es" ? "Algo nuevo para ti" : "Something new for you",
  };
  const reason = reasonCodes.map((code) => reasonLabels[code]).find(Boolean);

  return (
    <Link
      ref={cardRef}
      className={`card${result.event.sponsored ? "card-featured" : ""}`}
      href={`/${locale}/events/${result.event.slug}`}
      onClick={openEvent}
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
        {reason ? <p className="card-recommendation-reason">{reason}</p> : null}
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
