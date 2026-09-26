"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/config";

// Only refresh server-owned state. A checkout URL never grants an entitlement.
export function SubscriptionRefresh({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [waiting, setWaiting] = useState(true);
  useEffect(() => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      router.refresh();
      if (++attempts >= 12) {
        window.clearInterval(timer);
        setWaiting(false);
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [router]);
  return (
    <p className="notice" role="status">
      {waiting
        ? locale === "es"
          ? "Actualizando tu membresía…"
          : "Updating your membership…"
        : locale === "es"
          ? "La confirmación está tardando. No vuelvas a pagar; contacta con soporte si no aparece."
          : "Confirmation is taking longer. Do not pay again; contact support if your membership does not appear."}
    </p>
  );
}
