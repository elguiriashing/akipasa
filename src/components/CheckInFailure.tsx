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
        ? "No se pudo confirmar que estés dentro de la zona de check-in del local. Si ya estás allí, activa la ubicación precisa, espera a que mejore la señal y vuelve a escanear su QR oficial."
        : "We could not confirm that you are within the venue’s check-in area. If you are already there, enable precise location, wait for a better signal and scan its official QR again.",
    },
    cooldown: {
      title: es ? "Esta visita ya cuenta" : "This visit already counts",
      detail: es
        ? "Ya hay un check-in aceptado en este local en las últimas seis horas. Puedes seguir disfrutando de tu visita; este nuevo intento no añade XP ni sellos."
        : "You already have an accepted check-in at this venue within the last six hours. Enjoy your visit; this new attempt adds no XP or stamp.",
    },
    rate_limited: {
      title: es
        ? "Has llegado al límite de check-ins"
        : "You’ve reached the check-in limit",
      detail: es
        ? "No se pueden aceptar más check-ins por ahora. Espera antes de volver a intentarlo; escanear varias veces no elimina el límite."
        : "More check-ins cannot be accepted right now. Wait before trying again; repeated scans will not remove the limit.",
    },
    invalid_token: {
      title: es ? "Este QR no está disponible" : "This QR is unavailable",
      detail: es
        ? "El código no es válido o ya no está activo. Pide al personal el QR oficial actual del local y vuelve a escanearlo."
        : "The code is invalid or no longer active. Ask the staff for the venue’s current official QR and scan it again.",
    },
    account: {
      title: es ? "Revisa tu cuenta" : "Check your account",
      detail: es
        ? "Tu cuenta necesita atención antes de confirmar una visita. Revisa el acceso y cualquier paso pendiente de tu perfil."
        : "Your account needs attention before a visit can be confirmed. Check your access and any unfinished profile steps.",
    },
    weak_location: {
      title: es
        ? "Necesitamos una ubicación más precisa"
        : "We need a more precise location",
      detail: es
        ? "La ubicación recibida no permite comprobar esta visita. Activa la ubicación precisa del navegador, busca una mejor señal y vuelve a intentarlo desde el QR del local."
        : "The location received cannot be used to check this visit. Enable precise browser location, find a better signal and try again from the venue’s QR.",
    },
    location_unavailable: {
      title: es
        ? "No se ha recibido tu ubicación"
        : "Your location was not received",
      detail: es
        ? "Permite el acceso a la ubicación en el navegador y en el dispositivo. Después, vuelve a escanear el QR del local para solicitarla de nuevo."
        : "Allow location access in your browser and device settings. Then scan the venue’s QR again to request a fresh location.",
    },
    network: {
      title: es
        ? "No podemos confirmar el resultado"
        : "We cannot confirm the result",
      detail: es
        ? "Se perdió la conexión al comprobar la visita. Consulta primero tu progreso en el Pasaporte; puede que la confirmación haya llegado aunque no se haya mostrado."
        : "The connection was interrupted while checking your visit. Check your Passport progress first; confirmation may have arrived even if it was not displayed.",
    },
    unknown: {
      title: es
        ? "No podemos confirmar este check-in"
        : "We cannot confirm this check-in",
      detail: es
        ? "No tenemos un resultado confirmado para este intento. Revisa tu progreso antes de volver a escanear el QR oficial del local."
        : "We do not have a confirmed result for this attempt. Check your progress before scanning the venue’s official QR again.",
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
        <div>
          <p className={styles.eyebrow}>
            {es ? "Tu check-in" : "Your check-in"}
          </p>
          <h2>{message.title}</h2>
        </div>
      </div>
      <p>{message.detail}</p>
      {distance !== null && (
        <p className={styles.distance}>
          {es
            ? "Distancia comprobada en este intento"
            : "Distance checked for this attempt"}
          : {distance} m.
        </p>
      )}
      {!uncertain && reason !== "cooldown" && (
        <p className={styles.note}>
          {es
            ? "Este intento no añade XP ni sellos."
            : "This attempt adds no XP or stamp."}
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
      <p className={styles.photoNote}>
        {es
          ? "El QR y tu ubicación se usan para verificar tu visita. Compartir una foto es opcional, se hace por separado y necesita revisión antes de aparecer en las historias públicas."
          : "The QR and your location are used to verify your visit. Sharing a photo is optional, happens separately and needs review before appearing in public stories."}
      </p>
    </section>
  );
}
