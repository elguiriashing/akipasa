"use client";

import { useEffect } from "react";
import { trackBehaviour } from "@/lib/personalisation/client";

export function DiscoveryIntentSignal({
  active,
  metadata,
}: {
  active: boolean;
  metadata: Record<string, string | number | boolean | null>;
}) {
  useEffect(() => {
    if (!active) return;
    trackBehaviour({
      eventType: "search_performed",
      surface: "discover",
      entityType: "search",
      entityId: crypto.randomUUID(),
      metadata,
    });
  }, [active, metadata]);
  return null;
}
