"use client";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import styles from "./CheckInPresentation.module.css";
import { completeCheckIn } from "./actions";

function ConfirmButton({ es, ready }: { es: boolean; ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="button" type="submit" disabled={!ready || pending}>
      {pending
        ? es
          ? "Verificando visita…"
          : "Verifying visit…"
        : es
          ? "Confirmar check-in"
          : "Confirm check-in"}
    </button>
  );
}
export function CheckInForm({
  locale,
  token,
  idempotencyKey,
}: {
  locale: "es" | "en";
  token: string;
  idempotencyKey: string;
}) {
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");
  const locationRequest = useRef(0);
  const es = locale === "es";
  function locate() {
    // A fresh request invalidates previous coordinates and in-flight callbacks.
    // The server, not the browser, decides whether a visit is verified.
    const request = ++locationRequest.current;
    setLocation(null);
    setLocating(true);
    setMessage(
      es ? "Obteniendo tu ubicación..." : "Getting your current location...",
    );
    if (!navigator.geolocation?.getCurrentPosition) {
      setLocating(false);
      setMessage(
        es
          ? "Este dispositivo no permite obtener la ubicación. Comprueba los permisos."
          : "Location is not available on this device. Check its permissions.",
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (request !== locationRequest.current) return;
        setLocating(false);
        if (
          !Number.isFinite(coords.latitude) ||
          Math.abs(coords.latitude) > 90 ||
          !Number.isFinite(coords.longitude) ||
          Math.abs(coords.longitude) > 180 ||
          !Number.isFinite(coords.accuracy) ||
          coords.accuracy < 0 ||
          coords.accuracy > 500
        ) {
          setLocation(null);
          setMessage(
            es
              ? "No se ha recibido una ubicación precisa. Inténtalo de nuevo al acercarte al local."
              : "A precise location was not received. Try again closer to the venue.",
          );
          return;
        }
        setLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: Math.round(coords.accuracy),
        });
        setMessage(
          es
            ? "Ubicación recibida. Verificaremos tu visita al confirmar."
            : "Location received. We will verify your visit when you confirm.",
        );
      },
      () => {
        if (request !== locationRequest.current) return;
        setLocating(false);
        setLocation(null);
        setMessage(
          es
            ? "Activa la ubicación precisa para comprobar que estás en el local."
            : "Enable precise location so we can check that you are at the venue.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }
  return (
    <form action={completeCheckIn} className={`stack ${styles.form}`}>
      <ol
        className={styles.steps}
        aria-label={es ? "Pasos del check-in" : "Check-in steps"}
      >
        <li>{es ? "Local identificado" : "Venue identified"}</li>
        <li aria-current="step">
          {location
            ? es
              ? "GPS listo"
              : "GPS ready"
            : es
              ? "Comparte tu ubicación"
              : "Share your location"}
        </li>
        <li>{es ? "Confirmación del servidor" : "Server confirmation"}</li>
      </ol>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="latitude" value={location?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={location?.longitude ?? ""} />
      <input type="hidden" name="accuracy" value={location?.accuracy ?? ""} />
      <p className="muted">
        {es
          ? "Tu ubicación se usa una vez para comprobar la distancia y no se guarda."
          : "Your location is used once to check distance and is not stored."}
      </p>
      <div className="actions">
        <button
          className="button secondary"
          type="button"
          onClick={locate}
          aria-busy={locating}
        >
          {es ? "Obtener ubicación" : "Get current location"}
        </button>
        <ConfirmButton es={es} ready={Boolean(location)} />
      </div>
      {location && (
        <p className={styles.accuracy}>
          {es ? "Precisión del dispositivo" : "Device accuracy"}: ±
          {location.accuracy} m.{" "}
          {es
            ? "Esto no confirma la distancia al local; el servidor la comprueba al enviar."
            : "This does not confirm your distance from the venue; the server checks it when you submit."}
        </p>
      )}
      {message && (
        <p className="notice" aria-live="polite">
          {message}
        </p>
      )}
    </form>
  );
}
