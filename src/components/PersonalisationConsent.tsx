"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/config";

export function PersonalisationConsent({ locale }: { locale: Locale }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(
      !document.cookie
        .split("; ")
        .some((item) => item.startsWith("ak_personalisation=")),
    );
  }, []);

  async function choose(enabled: boolean) {
    document.cookie = `ak_personalisation=${enabled ? "granted" : "denied"}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setVisible(false);
    await fetch("/api/v1/personalisation/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ analytics: enabled, personalisation: enabled }),
    }).catch(() => undefined);
  }

  if (!visible) return null;
  return (
    <aside
      className="personalisation-consent"
      aria-label={
        locale === "es"
          ? "Opciones de personalización"
          : "Personalisation choices"
      }
    >
      <div>
        <strong>
          {locale === "es"
            ? "Recomendaciones que mejoran contigo"
            : "Recommendations that improve with you"}
        </strong>
        <p>
          {locale === "es"
            ? "Con tu permiso, usamos interacciones como aperturas, guardados y saltos para ordenar mejor tus planes. Puedes desactivarlo o borrarlo cuando quieras."
            : "With your permission, we use interactions such as opens, saves and skips to rank plans better. You can disable or erase this whenever you want."}
        </p>
      </div>
      <div className="personalisation-consent-actions">
        <button
          className="button secondary"
          type="button"
          onClick={() => void choose(false)}
        >
          {locale === "es" ? "Ahora no" : "Not now"}
        </button>
        <button
          className="button"
          type="button"
          onClick={() => void choose(true)}
        >
          {locale === "es" ? "Personalizar" : "Personalise"}
        </button>
      </div>
    </aside>
  );
}
