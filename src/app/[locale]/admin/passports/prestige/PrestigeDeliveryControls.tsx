"use client";
import { useState, useTransition } from "react";
import type { Locale } from "@/lib/config";
import { prestigeDeliveryLabel } from "@/lib/passport-prestige";
import { prestigeAdminAction } from "./actions";
export function PrestigeDeliveryControls({
  locale,
  awardId,
  status = "disabled",
  enabled = false,
}: {
  locale: Locale;
  awardId: string;
  status?: string;
  enabled?: boolean;
}) {
  const es = locale === "es",
    [pending, start] = useTransition(),
    [message, setMessage] = useState(""),
    [address, setAddress] = useState<Record<string, unknown> | null>(null);
  const transitions: Record<string, string[]> = {
    disabled: ["cancelled"],
    awaiting_address: ["cancelled"],
    ready: ["preparing", "cancelled"],
    preparing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
  };
  return (
    <details>
      <summary>
        {es ? "Dirección y estado de entrega" : "Address and delivery status"}
      </summary>
      <p>{prestigeDeliveryLabel(status, locale)}</p>
      <p>
        {es
          ? "Cada lectura de dirección queda auditada. El cambio de estado no compra ni solicita un envío."
          : "Every address read is audited. A status change does not purchase or request a shipment."}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          start(async () => {
            setAddress(null);
            setMessage("");
            try {
              const result = await prestigeAdminAction(locale, {
                action: "read_shipping",
                award_id: awardId,
                reason: f.get("reason"),
              });
              setMessage(result.error || "");
              if (result.data) setAddress(result.data);
            } catch {
              setMessage(es ? "No disponible." : "Unavailable.");
            }
          });
        }}
      >
        <label>
          {es ? "Motivo de acceso" : "Access reason"}
          <input name="reason" required minLength={3} maxLength={500} />
        </label>
        <button disabled={pending || !enabled}>
          {es ? "Consultar dirección privada" : "Read private address"}
        </button>
      </form>
      {address && (
        <div>
          <p>{String(address.recipient_name || "")}</p>
          <p>
            {String(address.address_line1 || "")}{" "}
            {String(address.address_line2 || "")}
          </p>
          <p>
            {String(address.postal_code || "")} {String(address.city || "")}{" "}
            {String(address.region || "")} {String(address.country_code || "")}
          </p>
          <p>{String(address.phone || "")}</p>
          <button type="button" onClick={() => setAddress(null)}>
            {es ? "Ocultar dirección" : "Hide address"}
          </button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          start(async () => {
            setMessage("");
            try {
              const result = await prestigeAdminAction(locale, {
                action: "delivery",
                award_id: awardId,
                expected_status: status,
                status: f.get("status"),
                reason: f.get("reason"),
                tracking_reference: f.get("tracking_reference"),
              });
              setMessage(result.error || (es ? "Guardado." : "Saved."));
            } catch {
              setMessage(es ? "No disponible." : "Unavailable.");
            }
          });
        }}
      >
        <fieldset
          disabled={!enabled || pending || !transitions[status]?.length}
        >
          <legend>
            {es ? "Actualización manual de entrega" : "Manual delivery update"}
          </legend>
          <label>
            {es ? "Siguiente estado" : "Next status"}
            <select name="status">
              {(transitions[status] || []).map((s) => (
                <option key={s} value={s}>
                  {prestigeDeliveryLabel(s, locale)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {es
              ? "Referencia de seguimiento (opcional)"
              : "Tracking reference (optional)"}
            <input name="tracking_reference" maxLength={100} />
          </label>
          <label>
            {es ? "Motivo" : "Reason"}
            <input name="reason" required minLength={3} maxLength={500} />
          </label>
          <button>{es ? "Registrar estado" : "Record status"}</button>
        </fieldset>
      </form>
      <p role="status">{message}</p>
    </details>
  );
}
