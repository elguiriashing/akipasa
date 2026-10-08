"use client";

import { useEffect } from "react";
import { readPrivacyChoices } from "@/lib/privacy-consent";

const destination = "AW-18500420718/rrnDCMeI-5QdEO6I2PVE";

export function PremiumAdsConversion({ sessionId }: { sessionId: string }) {
  useEffect(() => {
    if (!/^cs_(?:test_|live_)[A-Za-z0-9]+$/.test(sessionId)) return;
    let cancelled = false;
    let sent = false;
    async function verifyAndReport() {
      if (cancelled || sent || !readPrivacyChoices().marketing) return;
      try {
        const response = await fetch(
          `/api/ads/premium-conversion?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const result = (await response.json()) as {
          ready?: boolean;
          transactionId?: string;
          value?: number;
          currency?: string;
        };
        if (
          cancelled ||
          sent ||
          !result.ready ||
          !result.transactionId ||
          result.currency !== "EUR" ||
          typeof result.value !== "number"
        )
          return;
        const key = `ak_ads_subscribe_${result.transactionId}`;
        if (window.localStorage.getItem(key) === "sent") return;
        const w = window as Window & { gtag?: (...args: unknown[]) => void };
        if (!w.gtag) return;
        w.gtag("event", "conversion", {
          send_to: destination,
          value: result.value,
          currency: "EUR",
          transaction_id: result.transactionId,
        });
        window.localStorage.setItem(key, "sent");
        sent = true;
      } catch {
        // The checkout and membership remain valid even when attribution is unavailable.
      }
    }
    void verifyAndReport();
    const interval = window.setInterval(() => void verifyAndReport(), 3000);
    window.addEventListener("akipasa:consent-changed", verifyAndReport);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("akipasa:consent-changed", verifyAndReport);
    };
  }, [sessionId]);
  return null;
}
