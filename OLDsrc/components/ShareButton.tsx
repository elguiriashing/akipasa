"use client";

import { useState } from "react";
import { trackAnalytics } from "./AnalyticsSignal";
import type { Locale } from "@/lib/config";

export function ShareButton({
  title,
  label,
  copiedLabel,
  venueId,
  eventId,
  locale,
}: {
  title: string;
  label: string;
  copiedLabel: string;
  venueId?: string;
  eventId?: string;
  locale: Locale;
}) {
  const [copied, setCopied] = useState(false);
  async function share() {
    trackAnalytics({
      action: "share",
      venueId,
      eventId,
      locale,
    });
    if (navigator.share)
      await navigator.share({ title, url: window.location.href });
    else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    }
  }
  return (
    <button className="button secondary" type="button" onClick={share}>
      {copied ? copiedLabel : label}
    </button>
  );
}
