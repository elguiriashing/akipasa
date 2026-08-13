"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { Locale } from "@/lib/config";
import { trackBehaviour } from "@/lib/personalisation/client";

type AnalyticsAction =
  | "event_view"
  | "venue_view"
  | "directions_click"
  | "booking_click"
  | "share"
  | "calendar_add"
  | "phone_click"
  | "whatsapp_click";
type Signal = {
  action: AnalyticsAction;
  venueId?: string;
  eventId?: string;
  locale: Locale;
};

export function trackAnalytics(signal: Signal) {
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (
    (signal.venueId && !uuid.test(signal.venueId)) ||
    (signal.eventId && !uuid.test(signal.eventId))
  )
    return;
  const event = signal.eventId
    ? {
        entityType: "event" as const,
        entityId: signal.eventId,
        eventType:
          signal.action === "event_view"
            ? ("event_opened" as const)
            : signal.action === "calendar_add"
              ? ("event_calendar_added" as const)
              : signal.action === "directions_click"
                ? ("event_directions_clicked" as const)
                : signal.action === "booking_click"
                  ? ("event_booking_clicked" as const)
                  : ("event_shared" as const),
      }
    : {
        entityType: "venue" as const,
        entityId: signal.venueId!,
        eventType:
          signal.action === "venue_view"
            ? ("venue_opened" as const)
            : signal.action === "phone_click"
              ? ("venue_phone_clicked" as const)
              : signal.action === "whatsapp_click"
                ? ("venue_whatsapp_clicked" as const)
                : signal.action === "directions_click"
                  ? ("venue_directions_clicked" as const)
                  : signal.action === "booking_click"
                    ? ("venue_website_clicked" as const)
                    : ("venue_shared" as const),
      };
  trackBehaviour({
    ...event,
    surface: signal.eventId ? "event_detail" : "venue_detail",
    metadata: { language: signal.locale },
  });
}

export function AnalyticsView(
  props: Omit<Signal, "action"> & { action: "event_view" | "venue_view" },
) {
  const startedAt = useRef(0);
  const scrolled = useRef(false);
  useEffect(() => {
    const key = `akipasa:${props.action}:${props.eventId || props.venueId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    startedAt.current = performance.now();
    trackAnalytics(props);
    const onScroll = () => {
      scrolled.current = true;
    };
    window.addEventListener("scroll", onScroll, { passive: true, once: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      const duration = Math.round(performance.now() - startedAt.current);
      const entity = props.eventId
        ? {
            entityType: "event" as const,
            entityId: props.eventId,
            surface: "event_detail",
          }
        : {
            entityType: "venue" as const,
            entityId: props.venueId!,
            surface: "venue_detail",
          };
      trackBehaviour({
        ...entity,
        eventType: "entity_view_duration",
        metadata: {
          duration_ms: duration,
          visible_percentage: document.visibilityState === "visible" ? 100 : 0,
          completed: scrolled.current,
        },
      });
      if (props.eventId && duration < 2500 && !scrolled.current)
        trackBehaviour({
          ...entity,
          eventType: "event_quick_exit",
          metadata: {
            duration_ms: duration,
            scrolled: false,
            cta_clicked: false,
          },
        });
    };
  }, [props]);
  return null;
}

export function TrackedLink({
  children,
  className,
  href,
  target,
  rel,
  ...signal
}: Signal & {
  children: ReactNode;
  className?: string;
  href: string;
  target?: string;
  rel?: string;
}) {
  return (
    <a
      className={className}
      href={href}
      target={target}
      rel={rel}
      onClick={() => trackAnalytics(signal)}
    >
      {children}
    </a>
  );
}
