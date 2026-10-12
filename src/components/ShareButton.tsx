"use client";

import { useState } from "react";
import { trackAnalytics } from "./AnalyticsSignal";
import type { Locale } from "@/lib/config";
import { Icon } from "./Icons";

export function ShareButton({
  title,
  label,
  copiedLabel,
  venueId,
  eventId,
  locale,
  iconOnly = false,
  className,
}: {
  title: string;
  label: string;
  copiedLabel: string;
  venueId?: string;
  eventId?: string;
  locale: Locale;
  iconOnly?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  async function share() {
    setFailed(false);
    trackAnalytics({
      action: "share",
      venueId,
      eventId,
      locale,
    });
    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
      }
    } catch (error) {
      // Closing the native share sheet is not a failed action.
      if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "AbortError"
      )
        return;
      setFailed(true);
    }
  }
  return (
    <>
      <button
        className={[
          "button secondary",
          iconOnly && "share-button--icon",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        type="button"
        onClick={share}
        aria-label={iconOnly ? (copied ? copiedLabel : label) : undefined}
        title={iconOnly ? (copied ? copiedLabel : label) : undefined}
      >
        {iconOnly ? (
          <Icon name="share" size={20} />
        ) : copied ? (
          copiedLabel
        ) : (
          label
        )}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {failed
          ? locale === "es"
            ? "No se ha podido compartir. Copia el enlace de la barra de direcciones."
            : "Unable to share. Copy the link from your address bar."
          : copied
            ? copiedLabel
            : ""}
      </span>
    </>
  );
}
