"use client";

import React, { useEffect, useRef, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

export function MapResultsDrawer({
  locale,
  locality,
  children,
}: {
  locale: string;
  locality: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const query = useSearchParams();
  const es = locale === "es";
  useEffect(() => {
    if (query.has("eventPage") || query.has("venuePage"))
      dialog.current?.showModal();
  }, [query]);
  return (
    <>
      <button
        type="button"
        className="map-list-toggle"
        onClick={() => dialog.current?.showModal()}
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
              <h2 id="map-drawer-title">{es ? "Cerca de ti" : "Nearby"}</h2>
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
              ? "Resultados de tu zona y filtros de búsqueda."
              : "Results for your selected area and search filters."}
          </p>
          {children}
        </div>
      </dialog>
    </>
  );
}
