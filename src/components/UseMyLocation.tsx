"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/config";
import { distanceKm } from "@/lib/geo";
import { spainLocations } from "@/lib/locations";

type State = "idle" | "locating" | "denied" | "unavailable";

export function UseMyLocation({ locale }: { locale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>("idle");
  const es = locale === "es";

  function locate() {
    if (!("geolocation" in navigator)) {
      setState("unavailable");
      return;
    }
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nearest = Object.entries(spainLocations).reduce(
          (best, [key, item]) => {
            const distance = distanceKm(
              coords.latitude,
              coords.longitude,
              item.latitude,
              item.longitude,
            );
            return distance < best.distance ? { key, distance } : best;
          },
          { key: "fuengirola", distance: Number.POSITIVE_INFINITY },
        );
        const query = new URLSearchParams(searchParams.toString());
        query.set("locality", nearest.key);
        router.push(`${pathname}?${query.toString()}`);
        setState("idle");
      },
      (error) =>
        setState(
          error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        ),
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 300_000 },
    );
  }

  const label =
    state === "locating"
      ? es
        ? "Buscando…"
        : "Locating…"
      : es
        ? "Usar mi ubicación"
        : "Use my location";
  return (
    <span className="location-helper">
      <button
        type="button"
        className="text-button"
        onClick={locate}
        disabled={state === "locating"}
      >
        {label}
      </button>
      <small aria-live="polite">
        {state === "denied"
          ? es
            ? "Permiso denegado. Elige una zona manualmente."
            : "Permission denied. Choose an area manually."
          : state === "unavailable"
            ? es
              ? "Ubicación no disponible. Elige una zona."
              : "Location unavailable. Choose an area."
            : es
              ? "Solo se usa para elegir la zona más cercana."
              : "Only used to choose the nearest area."}
      </small>
    </span>
  );
}
