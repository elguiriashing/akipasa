"use client";
import { useState, useTransition } from "react";
import type { Locale } from "@/lib/config";
import type { PrestigeAward } from "@/lib/passport-prestige";
import { prestigeMemberAction } from "./actions";
export function PrestigeControls({
  locale,
  award,
  programmeKey,
  physicalEligible = false,
  shippingIntakeEnabled = false,
}: {
  locale: Locale;
  award?: PrestigeAward;
  programmeKey?: string;
  physicalEligible?: boolean;
  shippingIntakeEnabled?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const es = locale === "es";
  function send(input: unknown) {
    start(async () => {
      setMessage("");
      try {
        const result = await prestigeMemberAction(locale, input);
        setMessage(result.error || (es ? "Guardado." : "Saved."));
      } catch {
        setMessage(
          es ? "No disponible. Reinténtalo." : "Unavailable. Please retry.",
        );
      }
    });
  }
  return (
    <>
      {programmeKey && (
        <button
          disabled={pending}
          onClick={() => send({ action: "claim", programme_key: programmeKey })}
        >
          {es ? "Comprobar y desbloquear" : "Verify and unlock"}
        </button>
      )}
      {award && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              send({
                action: "visibility",
                award_id: award.id,
                public_alias: f.get("public_alias"),
                shared: f.has("shared"),
                hall_of_fame: f.has("hall_of_fame"),
              });
            }}
          >
            <label>
              {es
                ? "Alias público (solo si compartes)"
                : "Public alias (only when sharing)"}
              <input
                name="public_alias"
                maxLength={40}
                defaultValue={award.public_alias || ""}
              />
            </label>
            <label>
              <input
                name="shared"
                type="checkbox"
                defaultChecked={award.shared}
              />
              {es
                ? "Permitir certificado y tarjeta públicos"
                : "Enable public certificate and sharing card"}
            </label>
            <label>
              <input
                name="hall_of_fame"
                type="checkbox"
                defaultChecked={award.hall_of_fame}
              />
              {es
                ? "Aparecer en el Salón de la Fama (opcional)"
                : "Join the Hall of Fame (optional)"}
            </label>
            <button disabled={pending}>
              {es ? "Guardar privacidad" : "Save privacy"}
            </button>
          </form>
          {physicalEligible && (
            <>
              <p>
                {shippingIntakeEnabled
                  ? es
                    ? "Los participantes revisados pueden facilitar una dirección privada más abajo. No se garantiza un envío."
                    : "Reviewed participants can provide a private address below. Shipping is not guaranteed."
                  : es
                    ? "Programa físico en preparación. No se recogen direcciones ni se prometen envíos."
                    : "Physical programme in preparation. No addresses collected or shipping promised."}
              </p>
              <button
                disabled={pending || !!award.physical_status}
                onClick={() =>
                  send({ action: "request_physical", award_id: award.id })
                }
              >
                {award.physical_status
                  ? es
                    ? "Interés registrado"
                    : "Interest registered"
                  : es
                    ? "Registrar interés en trofeo físico"
                    : "Register interest in a physical trophy"}
              </button>
            </>
          )}
        </>
      )}
      <p role="status" aria-live="polite">
        {pending ? (es ? "Comprobando…" : "Checking…") : message}
      </p>
    </>
  );
}
