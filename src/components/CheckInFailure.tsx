import type { Locale } from "@/lib/config";
import styles from "./CheckInFailure.module.css";

import type { CheckInFailureReason } from "@/lib/checkin-feedback";
export type { CheckInFailureReason } from "@/lib/checkin-feedback";

/** Presentation only. Optional distance must come from an owned, server-read
 * rejected receipt; never pass a distance taken from search parameters. */
export function CheckInFailure({
  locale,
  reason,
  verifiedDistanceMeters,
  venuePath,
}: {
  locale: Locale;
  reason: CheckInFailureReason;
  verifiedDistanceMeters?: number | null;
  venuePath?: string | null;
}) {
  const es = locale === "es";
  const copy = {
    outside_geofence: {
      title: es ? "Acércate al local" : "Move closer to the venue",
      detail: es
        ? "Activa la ubicación precisa y vuelve a escanear en el local."
        : "Enable precise location and scan again at the venue.",
    },
    cooldown: {
      title: es ? "Check-in ya registrado" : "Already checked in",
      detail: es
        ? "Espera seis horas entre check-ins en el mismo local."
        : "Allow six hours between check-ins at the same venue.",
    },
    rate_limited: {
      title: es ? "Límite de check-ins alcanzado" : "Check-in limit reached",
      detail: es
        ? "Espera antes de volver a intentarlo."
        : "Wait before trying again.",
    },
    invalid_token: {
      title: es ? "QR no disponible" : "QR unavailable",
      detail: es
        ? "Pide al personal el QR oficial actual del local."
        : "Ask staff for the venue’s current official QR.",
    },
    account: {
      title: es ? "Revisa tu cuenta" : "Check your account",
      detail: es
        ? "Completa los pasos pendientes de tu cuenta."
        : "Complete any unfinished account steps.",
    },
    weak_location: {
      title: es ? "Ubicación poco precisa" : "Location too imprecise",
      detail: es
        ? "Activa la ubicación precisa y busca una mejor señal."
        : "Enable precise location and find a better signal.",
    },
    location_unavailable: {
      title: es ? "Ubicación no disponible" : "Location unavailable",
      detail: es
        ? "Permite la ubicación en los ajustes del navegador y vuelve a intentarlo."
        : "Allow location in your browser settings and try again.",
    },
    network: {
      title: es ? "Conexión interrumpida" : "Connection interrupted",
      detail: es
        ? "Revisa tu progreso antes de reintentar: el check-in podría haberse confirmado."
        : "Check your progress before retrying: the check-in may have succeeded.",
    },
    unknown: {
      title: es ? "Check-in sin confirmar" : "Check-in unconfirmed",
      detail: es
        ? "Revisa tu progreso antes de volver a intentarlo."
        : "Check your progress before trying again.",
    },
  };
  const knownReason = Object.hasOwn(copy, reason);
  const message = knownReason ? copy[reason] : copy.unknown;
  const distance =
    reason === "outside_geofence" &&
    typeof verifiedDistanceMeters === "number" &&
    Number.isFinite(verifiedDistanceMeters) &&
    verifiedDistanceMeters >= 0
      ? Math.round(verifiedDistanceMeters)
      : null;
  const safeVenuePath =
    typeof venuePath === "string" &&
    new RegExp(`^/${locale}/venues/[a-zA-Z0-9_-]+$`).test(venuePath)
      ? venuePath
      : null;
  const uncertain =
    reason === "network" || reason === "unknown" || !knownReason;
  return (
    <section className={styles.failure} role="status" aria-live="polite">
      <div className={styles.heading}>
        <span className={styles.marker} aria-hidden="true">
          !
        </span>
        <h2>{message.title}</h2>
      </div>
      <p>{message.detail}</p>
      {distance !== null && (
        <p className={styles.distance}>
          {es ? "Distancia" : "Distance"}: <span>{distance} m</span>
        </p>
      )}
      <nav
        className={styles.actions}
        aria-label={
          es ? "Opciones para tu check-in" : "Check-in recovery options"
        }
      >
        <a
          className={styles.primary}
          href={
            reason === "account"
              ? `/${locale}/account`
              : uncertain || reason === "cooldown" || reason === "rate_limited"
                ? `/${locale}/passports?view=progress`
                : `/${locale}/check-in`
          }
        >
          {reason === "account"
            ? es
              ? "Revisar mi cuenta"
              : "Review my account"
            : uncertain || reason === "cooldown" || reason === "rate_limited"
              ? es
                ? "Ver mi progreso"
                : "Check my progress"
              : es
                ? "Escanear QR oficial"
                : "Scan official QR"}
        </a>
        <a
          className={styles.secondary}
          href={safeVenuePath || `/${locale}/map`}
        >
          {safeVenuePath
            ? es
              ? "Ver el local"
              : "View venue"
            : es
              ? "Explorar el mapa"
              : "Explore the map"}
        </a>
      </nav>
    </section>
  );
}
