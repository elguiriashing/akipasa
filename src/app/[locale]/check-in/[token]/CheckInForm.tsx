"use client";
import { useState } from "react";
import { completeCheckIn } from "./actions";
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
  const [message, setMessage] = useState("");
  const es = locale === "es";
  function locate() {
    setMessage(
      es ? "Comprobando tu ubicacion..." : "Checking your location...",
    );
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: Math.round(coords.accuracy),
        });
        setMessage(
          es
            ? "Ubicacion verificada. Ya puedes hacer check-in."
            : "Location verified. You can now check in.",
        );
      },
      () =>
        setMessage(
          es
            ? "Activa la ubicacion precisa para verificar que estas en el local."
            : "Enable precise location so we can verify that you are at the venue.",
        ),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }
  return (
    <form action={completeCheckIn} className="stack">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="latitude" value={location?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={location?.longitude ?? ""} />
      <input type="hidden" name="accuracy" value={location?.accuracy ?? ""} />
      <p className="muted">
        {es
          ? "Tu ubicacion se usa una vez para comprobar la distancia y no se guarda."
          : "Your location is used once to check distance and is not stored."}
      </p>
      <div className="actions">
        <button className="button secondary" type="button" onClick={locate}>
          {es ? "Verificar ubicacion" : "Verify location"}
        </button>
        <button className="button" type="submit" disabled={!location}>
          {es ? "Confirmar check-in" : "Confirm check-in"}
        </button>
      </div>
      {message && (
        <p className="notice" aria-live="polite">
          {message}
        </p>
      )}
    </form>
  );
}
