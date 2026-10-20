"use client";
import { PrestigeDeliveryControls } from "./PrestigeDeliveryControls";
import { useState, useTransition } from "react";
import type { Locale } from "@/lib/config";
import styles from "@/components/passport-prestige.module.css";
import { prestigeAdminAction } from "./actions";
type Programme = {
  key: string;
  title_es: string;
  title_en: string;
  achievement_keys: string[];
  active: boolean;
  physical_eligible: boolean;
};
type PhysicalRequest = {
  award_id: string;
  serial: number;
  programme_key: string;
  status: string;
  requested_at: string;
  delivery_status?: string;
};
export function PrestigeStudio({
  locale,
  programmes,
  requests,
  fulfilmentEnabled = false,
}: {
  locale: Locale;
  programmes: Programme[];
  requests: PhysicalRequest[];
  fulfilmentEnabled?: boolean;
}) {
  const es = locale === "es";
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const send = (input: unknown) =>
    start(async () => {
      setMessage("");
      try {
        const result = await prestigeAdminAction(locale, input);
        setMessage(result.error || (es ? "Guardado." : "Saved."));
      } catch {
        setMessage(
          es ? "No disponible. Reinténtalo." : "Unavailable. Please retry.",
        );
      }
    });
  return (
    <>
      <p role="status">{pending ? (es ? "Guardando…" : "Saving…") : message}</p>
      <div className={styles.grid}>
        <section className={styles.panel}>
          <h2>{es ? "Nuevo hito" : "New milestone"}</h2>
          <p>
            {es
              ? "Se crea inactivo. Los requisitos solo cuentan actividad aceptada. Crea una versión nueva para cambiar requisitos."
              : "Created inactive. Requirements count accepted activity only. Create a new version to change requirements."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              send({
                action: "configure",
                key: f.get("key"),
                title_es: f.get("title_es"),
                title_en: f.get("title_en"),
                achievement_keys: String(f.get("keys"))
                  .split(/[\s,]+/)
                  .filter(Boolean),
                physical_eligible: f.has("physical_eligible"),
              });
            }}
          >
            <label>
              {es ? "Identificador único" : "Unique identifier"}
              <input
                name="key"
                required
                pattern="[a-z][a-z0-9_]{2,63}"
                maxLength={64}
              />
            </label>
            <label>
              {es ? "Título español" : "Spanish title"}
              <input name="title_es" required minLength={3} maxLength={100} />
            </label>
            <label>
              {es ? "Título inglés" : "English title"}
              <input name="title_en" required minLength={3} maxLength={100} />
            </label>
            <label>
              {es
                ? "Claves de logros existentes (una por línea)"
                : "Existing achievement keys (one per line)"}
              <textarea name="keys" required rows={6} maxLength={65000} />
            </label>
            <label>
              <input name="physical_eligible" type="checkbox" />
              {es
                ? "Permitir interés en un futuro trofeo físico"
                : "Allow interest in a future physical trophy"}
            </label>
            <button disabled={pending}>
              {es ? "Crear borrador" : "Create draft"}
            </button>
          </form>
        </section>
        <section className={styles.panel}>
          <h2>{es ? "Programas" : "Programmes"}</h2>
          {programmes.map((p) => (
            <article key={p.key}>
              <h3>{es ? p.title_es : p.title_en}</h3>
              <p>
                {p.key} · {p.achievement_keys.length}{" "}
                {es ? "requisitos" : "requirements"}
              </p>
              <details>
                <summary>{es ? "Ver requisitos" : "View requirements"}</summary>
                <ul>
                  {p.achievement_keys.map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ul>
              </details>
              <button
                disabled={pending}
                onClick={() =>
                  send({
                    action: "programme_status",
                    key: p.key,
                    active: !p.active,
                  })
                }
              >
                {p.active
                  ? es
                    ? "Pausar"
                    : "Pause"
                  : es
                    ? "Activar"
                    : "Activate"}
              </button>
            </article>
          ))}
        </section>
        <section className={styles.panel}>
          <h2>{es ? "Revisión física" : "Physical review"}</h2>
          <p>
            {fulfilmentEnabled
              ? es
                ? "Seguimiento manual habilitado. Ningún cambio compra o solicita un envío."
                : "Manual tracking enabled. No change purchases or requests a shipment."
              : es
                ? "Envíos desactivados. Revisar no autoriza compras ni recogida de direcciones."
                : "Shipping disabled. Review does not authorise purchases or address collection."}
          </p>
          {requests.map((r) => (
            <article key={r.award_id}>
              <h3>
                #{r.serial} · {r.programme_key}
              </h3>
              <p>
                {r.status === "requested"
                  ? es
                    ? "Solicitado"
                    : "Requested"
                  : r.status === "reviewed"
                    ? es
                      ? "Revisado"
                      : "Reviewed"
                    : es
                      ? "Rechazado"
                      : "Declined"}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  send({
                    action: "review",
                    award_id: r.award_id,
                    status: f.get("status"),
                    reason: f.get("reason"),
                  });
                }}
              >
                <label>
                  {es ? "Decisión" : "Decision"}
                  <select name="status">
                    <option value="reviewed">
                      {es ? "Revisado" : "Reviewed"}
                    </option>
                    <option value="declined">
                      {es ? "Rechazado" : "Declined"}
                    </option>
                  </select>
                </label>
                <label>
                  {es
                    ? "Motivo (no datos de envío)"
                    : "Reason (no delivery details)"}
                  <textarea
                    name="reason"
                    required
                    minLength={3}
                    maxLength={500}
                  />
                </label>
                <button disabled={pending}>
                  {es ? "Guardar revisión" : "Save review"}
                </button>
              </form>
              <PrestigeDeliveryControls
                locale={locale}
                awardId={r.award_id}
                status={r.delivery_status || "disabled"}
                enabled={fulfilmentEnabled}
              />
            </article>
          ))}
        </section>
      </div>
      <section className={styles.panel}>
        <h2>{es ? "Revocar por fraude" : "Revoke for fraud"}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            send({
              action: "revoke",
              award_id: f.get("award_id"),
              reason: f.get("reason"),
            });
          }}
        >
          <label>
            {es ? "ID privado del reconocimiento" : "Private award ID"}
            <input name="award_id" required />
          </label>
          <label>
            {es ? "Motivo" : "Reason"}
            <textarea name="reason" required minLength={3} maxLength={500} />
          </label>
          <button disabled={pending}>
            {es ? "Revocar reconocimiento" : "Revoke award"}
          </button>
        </form>
      </section>
    </>
  );
}
