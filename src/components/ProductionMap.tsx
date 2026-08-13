"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/config";
import { trackBehaviour } from "@/lib/personalisation/client";

export type MapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  venue: string;
  href: string;
};

export function ProductionMap({
  locale,
  points,
  styleUrl,
}: {
  locale: Locale;
  points: MapPoint[];
  styleUrl: string;
}) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackBehaviour({
      eventType: "map_opened",
      surface: "map",
      entityType: "feed",
      entityId: crypto.randomUUID(),
      metadata: { result_count: points.length },
    });
    if (!container.current || !styleUrl || points.length === 0) return;
    let disposed = false;
    let cleanup = () => {};

    void import("maplibre-gl").then((maplibregl) => {
      if (disposed || !container.current) return;
      const map = new maplibregl.Map({
        container: container.current,
        style: styleUrl,
        center: [-3.7, 40.2],
        zoom: 4.6,
        attributionControl: false,
      });
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        "bottom-right",
      );

      const bounds = new maplibregl.LngLatBounds();
      const markers = points.map((point) => {
        bounds.extend([point.longitude, point.latitude]);
        const marker = document.createElement("a");
        marker.className = "map-marker";
        marker.href = point.href;
        marker.setAttribute("aria-label", `${point.title}, ${point.venue}`);
        marker.title = `${point.title} · ${point.venue}`;
        marker.addEventListener("click", () =>
          trackBehaviour({
            eventType: "map_pin_clicked",
            surface: "map",
            entityType: "event",
            entityId: point.id,
          }),
        );
        return new maplibregl.Marker({ element: marker })
          .setLngLat([point.longitude, point.latitude])
          .addTo(map);
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, {
          padding: 48,
          maxZoom: points.length === 1 ? 13 : 11,
          duration: 0,
        });
      }
      cleanup = () => {
        markers.forEach((marker) => marker.remove());
        map.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [points, styleUrl]);

  return (
    <section className="map-panel" aria-labelledby="production-map-title">
      <div className="map-heading">
        <div>
          <h2 id="production-map-title">
            {locale === "es" ? "Mapa de eventos" : "Event map"}
          </h2>
          <p>
            {locale === "es"
              ? "Selecciona un marcador o usa la lista accesible."
              : "Choose a marker or use the accessible list."}
          </p>
        </div>
        <Link className="back-link" href={`/${locale}`}>
          {locale === "es" ? "Cambiar filtros" : "Change filters"}
        </Link>
      </div>
      <div
        className="production-map"
        ref={container}
        role="application"
        aria-label={locale === "es" ? "Mapa interactivo" : "Interactive map"}
      />
    </section>
  );
}
