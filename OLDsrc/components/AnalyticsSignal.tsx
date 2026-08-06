"use client";

import { useEffect, type ReactNode } from "react";
import type { Locale } from "@/lib/config";

type AnalyticsAction =
  | "event_view"
  | "venue_view"
  | "directions_click"
  | "booking_click"
  | "share";

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
  const body = JSON.stringify(signal);
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/analytics",
      new Blob([body], { type: "application/json" }),
    );
    return;
  }
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  });
}

export function AnalyticsView(
  props: Omit<Signal, "action"> & {
    action: "event_view" | "venue_view";
  },
) {
  useEffect(() => {
    const key = `akipasa:${props.action}:${props.eventId || props.venueId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    trackAnalytics(props);
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
  function handleClick() {
    trackAnalytics(signal);
  }
  return (
    <a
      className={className}
      href={href}
      target={target}
      rel={rel}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
