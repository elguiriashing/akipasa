"use client";

import React, { useEffect, useRef, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type MapCenter = { latitude: number; longitude: number };

export function MapResultsDrawer({
  locale,
  locality,
  initialCenter,
  children,
}: {
  locale: string;
  locality: string;
  initialCenter: MapCenter;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const latestCenter = useRef<MapCenter>(initialCenter);
  const query = useSearchParams();
  const router = useRouter();
  const es = locale === "es";

  useEffect(() => {
    const receiveCenter = (event: Event) => {
      const detail = (event as CustomEvent<MapCenter>).detail;
      if (
        detail &&
        Number.isFinite(detail.latitude) &&
        Number.isFinite(detail.longitude)
      ) {
        latestCenter.current = detail;
      }
    };
    window.addEventListener("akipasa:map-center", receiveCenter);
    return () => window.removeEventListener("akipasa:map-center", receiveCenter);
  }, []);

  useEffect(() => {
    if (
      query.has("list") ||
      query.has("eventPage") ||
      query.has("venuePage")
    ) {
      if (dialog.current && !dialog.current.open) dialog.current.showModal();
    }
  }, [query]);

  const openForCurrentMapCenter = () => {
    const center = latestCenter.current;
    const currentLatitude = Number(query.get("latitude"));
    const currentLongitude = Number(query.get("longitude"));
    const alreadyCentered =
      query.get("list") === "1" &&
      Number.isFinite(currentLatitude) &&
      Number.isFinite(currentLongitude) &&
      Math.abs(currentLatitude - center.latitude) < 0.000001 &&
      Math.abs(currentLongitude - center.longitude) < 0.000001;

    if (alreadyCentered) {
      if (dialog.current && !dialog.current.open) dialog.current.showModal();
      return;
    }

    const next = new URLSearchParams(query.toString());
    next.set("latitude", center.latitude.toFixed(6));
    next.set("longitude", center.longitude.toFixed(6));
    next.set("locationName", es ? "Centro del mapa" : "Map centre");
    next.set("list", "1");
    next.delete("eventPage");
    next.delete("venuePage");
    router.replace(`?${next.toString()}`, { scroll: false });
  };

  return (
    <>
      <button
        type="button"
        className="map-list-toggle"
        onClick={openForCurrentMapCenter}
        aria-haspopup="dialog"
        aria-controls="map-results-drawer"
      >
        <span aria-hidden="true">☰</span> {es ? "Lista" : "List"}
      </button>
      <dialog
        ref={dialog}
        id="map-results-drawer"
        className="map-results-drawer"
        aria-labelledby="map-drawer-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="map-drawer-content">
          <header>
            <div>
              <h2 id="map-drawer-title">{es ? "Cerca de aquí" : "Nearby here"}</h2>
              <p>{locality}</p>
            </div>
            <button
              type="button"
              className="app-icon-button"
              aria-label={es ? "Cerrar lista" : "Close list"}
              onClick={() => dialog.current?.close()}
            >
              ×
            </button>
          </header>
          <p className="map-drawer-hint">
            {es
              ? "Resultados calculados desde el centro actual del mapa al abrir la lista."
              : "Results calculated from the map's current centre when you open the list."}
          </p>
          {children}
        </div>
      </dialog>
    </>
  );
}
