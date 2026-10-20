"use client";
import { useState, useTransition } from "react";
import type { Locale } from "@/lib/config";
import { prestigeMemberAction } from "@/app/[locale]/passports/prestige/actions";
export function PassportPrestigeShipping({
  locale,
  awardId,
  enabled = false,
  reviewed = false,
  status,
}: {
  locale: Locale;
  awardId: string;
  enabled?: boolean;
  reviewed?: boolean;
  status?: string | null;
}) {
  const [pending, start] = useTransition(),
    [message, setMessage] = useState("");
  const es = locale === "es";
  const allowed =
    enabled &&
    reviewed &&
    ["disabled", "awaiting_address", "ready"].includes(status || "disabled");
  if (!allowed)
    return (
      <p>
        {es
          ? "Recogida de direcciones cerrada o no disponible para este reconocimiento."
          : "Address collection is closed or unavailable for this award."}
      </p>
    );
  return (
    <details>
      <summary>
        {es ? "Dirección privada de envío" : "Private shipping address"}
      </summary>
      <p>
        {es
          ? "Solo para el programa físico aprobado. La dirección no aparece en certificados, tarjetas ni análisis."
          : "For the approved physical programme only. The address never appears in certificates, sharing cards or analytics."}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const values = Object.fromEntries(new FormData(event.currentTarget));
          start(async () => {
            setMessage("");
            try {
              const result = await prestigeMemberAction(locale, {
                ...values,
                action: "shipping_submit",
                award_id: awardId,
              });
              setMessage(
                result.error || (es ? "Dirección guardada." : "Address saved."),
              );
            } catch {
              setMessage(
                es
                  ? "No disponible. Reinténtalo."
                  : "Unavailable. Please retry.",
              );
            }
          });
        }}
      >
        <label>
          {es ? "Destinatario" : "Recipient"}
          <input
            name="recipient_name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="shipping name"
          />
        </label>
        <label>
          {es ? "Dirección" : "Address"}
          <input
            name="address_line1"
            required
            minLength={3}
            maxLength={200}
            autoComplete="shipping address-line1"
          />
        </label>
        <label>
          {es ? "Dirección adicional (opcional)" : "Address line 2 (optional)"}
          <input
            name="address_line2"
            maxLength={200}
            autoComplete="shipping address-line2"
          />
        </label>
        <label>
          {es ? "Código postal" : "Postal code"}
          <input
            name="postal_code"
            required
            maxLength={32}
            autoComplete="shipping postal-code"
          />
        </label>
        <label>
          {es ? "Ciudad" : "City"}
          <input
            name="city"
            required
            maxLength={100}
            autoComplete="shipping address-level2"
          />
        </label>
        <label>
          {es ? "Provincia (opcional)" : "Region (optional)"}
          <input
            name="region"
            maxLength={100}
            autoComplete="shipping address-level1"
          />
        </label>
        <label>
          {es ? "Código de país (ES, GB…)" : "Country code (ES, GB…)"}
          <input
            name="country_code"
            required
            pattern="[A-Z]{2}"
            minLength={2}
            maxLength={2}
            autoComplete="shipping country"
          />
        </label>
        <label>
          {es
            ? "Teléfono para entrega (opcional)"
            : "Delivery phone (optional)"}
          <input
            name="phone"
            type="tel"
            maxLength={40}
            autoComplete="shipping tel"
          />
        </label>
        <button disabled={pending}>
          {es ? "Guardar dirección privada" : "Save private address"}
        </button>
      </form>
      <p role="status">{message}</p>
    </details>
  );
}
