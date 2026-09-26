"use client";

import React, { useState } from "react";
import {
  readPrivacyChoices,
  writePrivacyChoices,
  openPrivacyChoices,
} from "../lib/privacy-consent";
import type { Locale } from "@/lib/config";

export function PersonalisationSettings({
  locale,
  initialEnabled,
}: {
  locale: Locale;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const es = locale === "es";
  async function save(next: boolean) {
    setStatus("saving");
    const choices = { ...readPrivacyChoices(), personalisation: next };
    if (!next) writePrivacyChoices(choices);
    const response = await fetch("/api/v1/personalisation/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...choices,
      }),
    }).catch(() => null);
    if (!response?.ok) return setStatus("error");
    writePrivacyChoices(choices);
    setEnabled(next);
    setStatus("saved");
  }
  async function reset() {
    if (
      !window.confirm(
        es
          ? "¿Borrar tu historial y perfil de recomendaciones?"
          : "Clear your recommendation history and profile?",
      )
    )
      return;
    setStatus("saving");
    const response = await fetch("/api/v1/personalisation/consent", {
      method: "DELETE",
    }).catch(() => null);
    if (!response?.ok) return setStatus("error");
    writePrivacyChoices({
      analytics: false,
      personalisation: false,
      marketing: false,
    });
    setEnabled(false);
    setStatus("saved");
  }
  return (
    <article className="panel console-card">
      <h2>{es ? "Personalización" : "Personalisation"}</h2>
      <p>
        {es
          ? "Controla si tu comportamiento mejora el orden de eventos y locales. Las acciones verificadas necesarias para prestar el servicio se conservan por separado."
          : "Control whether your behaviour improves event and venue ordering. Verified actions needed to provide the service are retained separately."}
      </p>
      <label className="consent-row">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => void save(event.target.checked)}
          disabled={status === "saving"}
        />
        {es
          ? "Personalizar recomendaciones usando mis interacciones"
          : "Personalise recommendations using my interactions"}
      </label>
      <p className="muted">
        {es
          ? "La medición y la publicidad tienen opciones separadas. Puedes retirar el permiso en cualquier momento."
          : "Measurement and advertising have separate choices. You can withdraw permission at any time."}
      </p>
      <button
        className="button secondary"
        type="button"
        onClick={openPrivacyChoices}
      >
        {es ? "Todas las opciones de privacidad" : "All privacy choices"}
      </button>
      <button
        className="button secondary"
        type="button"
        onClick={() => void reset()}
        disabled={status === "saving"}
      >
        {es
          ? "Borrar historial de recomendaciones"
          : "Clear recommendation history"}
      </button>
      {status === "saved" ? (
        <p className="notice" role="status">
          {es ? "Preferencias actualizadas." : "Preferences updated."}
        </p>
      ) : null}
      {status === "error" ? (
        <p className="notice" role="alert">
          {es ? "No se pudo actualizar." : "Could not update preferences."}
        </p>
      ) : null}
    </article>
  );
}
