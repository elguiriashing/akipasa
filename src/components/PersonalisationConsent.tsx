"use client";
import React, { useEffect, useState } from "react";
import type { Locale } from "@/lib/config";
import {
  deniedChoices,
  readPrivacyChoices,
  writePrivacyChoices,
  type PrivacyChoices,
} from "../lib/privacy-consent";

export function PersonalisationConsent({ locale }: { locale: Locale }) {
  const [visible, setVisible] = useState(false);
  const [choices, setChoices] = useState<PrivacyChoices>(deniedChoices);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const es = locale === "es";
  useEffect(() => {
    setChoices(readPrivacyChoices());
    setVisible(!document.cookie.split("; ").includes("ak_consent_version=2"));
    const open = () => {
      setChoices(readPrivacyChoices());
      setVisible(true);
    };
    window.addEventListener("akipasa:privacy-open", open);
    return () => window.removeEventListener("akipasa:privacy-open", open);
  }, []);
  async function choose(next: PrivacyChoices) {
    setSaving(true);
    setError(false);
    // Withdrawal takes effect locally even when the server is unavailable.
    const previous = readPrivacyChoices();
    writePrivacyChoices({
      analytics: previous.analytics && next.analytics,
      personalisation: previous.personalisation && next.personalisation,
      marketing: previous.marketing && next.marketing,
    });
    const response = await fetch("/api/v1/personalisation/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      setError(true);
      return;
    }
    writePrivacyChoices(next);
    setChoices(next);
    setVisible(false);
  }
  return (
    <>
      <div className="privacy-preferences">
        <button
          type="button"
          className="button secondary"
          onClick={() => setVisible(true)}
        >
          {es ? "Opciones de privacidad" : "Privacy choices"}
        </button>
      </div>
      {visible && (
        <aside
          className="personalisation-consent"
          aria-label={es ? "Opciones de privacidad" : "Privacy choices"}
        >
          <div>
            <strong>
              {es
                ? "Tú eliges cómo usamos tus datos"
                : "Choose how we use your data"}
            </strong>
            <p>
              {es
                ? "Las funciones esenciales siempre están activas. Elige por separado los usos opcionales; puedes cambiarlos aquí cuando quieras."
                : "Essential functions are always active. Choose optional uses separately; you can change them here anytime."}
            </p>
            {(
              [
                [
                  "analytics",
                  es
                    ? "Medición de audiencia (Google Analytics)"
                    : "Audience measurement (Google Analytics)",
                ],
                [
                  "personalisation",
                  es
                    ? "Recomendaciones según mis interacciones"
                    : "Recommendations based on my interactions",
                ],
                [
                  "marketing",
                  es
                    ? "Personalización publicitaria"
                    : "Advertising personalisation",
                ],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="consent-row">
                <input
                  type="checkbox"
                  checked={choices[key]}
                  disabled={saving}
                  onChange={(e) =>
                    setChoices({ ...choices, [key]: e.target.checked })
                  }
                />
                {label}
              </label>
            ))}
            {error && (
              <p role="alert">
                {es
                  ? "No se pudieron guardar las opciones. Los permisos retirados ya están desactivados en este navegador. Reintenta guardar."
                  : "Could not save your choices. Withdrawn permissions are already disabled in this browser. Please retry saving."}
              </p>
            )}
          </div>
          <div className="personalisation-consent-actions">
            <button
              className="button secondary"
              disabled={saving}
              onClick={() => void choose({ ...deniedChoices })}
            >
              {es ? "Rechazar opcionales" : "Reject optional"}
            </button>
            <button
              className="button"
              disabled={saving}
              onClick={() => void choose(choices)}
            >
              {es ? "Guardar opciones" : "Save choices"}
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
