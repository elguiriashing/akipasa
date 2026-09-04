"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/lib/config";
import { trackBehaviour } from "@/lib/personalisation/client";

export type MapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  venue: string;
  href: string;
  category: string;
  startsAt: string;
  priceLabel: string;
  source: "verified_venue" | "community";
};

const markerGlyphs: Record<string, string> = {
  music: "♪",
  social: "✦",
  workshop: "◇",
  culture: "◆",
  market: "▦",
  food: "♨",
};

function tuneMapPalette(map: import("maplibre-gl").Map) {
  for (const layer of map.getStyle().layers || []) {
    const id = layer.id.toLowerCase();
    try {
      if (layer.type === "background")
        map.setPaintProperty(layer.id, "background-color", "#071f1e");
      if (layer.type === "fill" && /water/.test(id))
        map.setPaintProperty(layer.id, "fill-color", "#0b4f55");
      if (layer.type === "fill" && /park|wood|forest|grass/.test(id))
        map.setPaintProperty(layer.id, "fill-color", "#123c35");
      if (layer.type === "fill" && /building/.test(id))
        map.setPaintProperty(layer.id, "fill-color", "#31514b");
      if (layer.type === "fill" && /land|residential/.test(id))
        map.setPaintProperty(layer.id, "fill-color", "#0d2d2a");
      if (layer.type === "line" && /motorway|trunk|primary/.test(id))
        map.setPaintProperty(layer.id, "line-color", "#cf7542");
      if (layer.type === "line" && /road|street|path/.test(id))
        map.setPaintProperty(layer.id, "line-color", "#56736d");
      if (
        layer.type === "symbol" &&
        map.getPaintProperty(layer.id, "text-color") !== undefined
      )
        map.setPaintProperty(layer.id, "text-color", "#d7dfd9");
      if (
        layer.type === "symbol" &&
        map.getPaintProperty(layer.id, "text-halo-color") !== undefined
      )
        map.setPaintProperty(layer.id, "text-halo-color", "#082321");
    } catch {
      // External styles do not guarantee that every property is mutable.
    }
  }
}

function popupContent(point: MapPoint, locale: Locale) {
  const wrapper = document.createElement("article");
  wrapper.className = "map-popup-card";
  const category = document.createElement("span");
  category.className = "map-popup-category";
  category.textContent = point.category;
  const title = document.createElement("strong");
  title.textContent = point.title;
  const venue = document.createElement("span");
  venue.className = "map-popup-venue";
  venue.textContent = point.venue;
  const meta = document.createElement("span");
  meta.className = "map-popup-meta";
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: "Europe/Madrid",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(point.startsAt));
  meta.textContent = `${date} · ${point.priceLabel}`;
  const link = document.createElement("a");
  link.href = point.href;
  link.textContent = locale === "es" ? "Ver evento" : "View event";
  link.addEventListener("click", () =>
    trackBehaviour({
      eventType: "map_pin_clicked",
      surface: "map",
      entityType: "event",
      entityId: point.id,
    }),
  );
  wrapper.appendChild(category);
  wrapper.appendChild(title);
  wrapper.appendChild(venue);
  wrapper.appendChild(meta);
  wrapper.appendChild(link);
  return wrapper;
}

export function ProductionMap({
  locale,
  points,
  styleUrl,
  center,
}: {
  locale: Locale;
  points: MapPoint[];
  styleUrl: string;
  center: { latitude: number; longitude: number };
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
    if (!container.current || !styleUrl) return;
    let disposed = false;
    let cleanup = () => {};

    void import("maplibre-gl").then((maplibregl) => {
      if (disposed || !container.current) return;
      const map = new maplibregl.Map({
        container: container.current,
        style: styleUrl,
        center: [center.longitude, center.latitude],
        zoom: 10.5,
        attributionControl: false,
        maxPitch: 48,
      });
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: false },
          trackUserLocation: false,
        }),
        "top-right",
      );
      map.addControl(new maplibregl.ScaleControl({ unit: "metric" }));
      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        "bottom-right",
      );
      map.once("load", () => tuneMapPalette(map));

      const bounds = new maplibregl.LngLatBounds();
      const markers = points.map((point) => {
        bounds.extend([point.longitude, point.latitude]);
        const button = document.createElement("button");
        button.type = "button";
        button.className = `map-marker map-marker-${point.category} map-marker-source-${point.source}`;
        button.setAttribute("aria-label", `${point.title}, ${point.venue}`);
        button.title = `${point.title} / ${point.venue}`;
        const pin = document.createElement("span");
        const glyph = document.createElement("i");
        glyph.textContent = markerGlyphs[point.category] || markerGlyphs.social;
        pin.appendChild(glyph);
        button.appendChild(pin);
        const popup = new maplibregl.Popup({
          offset: 28,
          closeButton: false,
          className: "akipasa-map-popup",
          maxWidth: "260px",
        }).setDOMContent(popupContent(point, locale));
        button.addEventListener("click", () =>
          trackBehaviour({
            eventType: "map_pin_clicked",
            surface: "map",
            entityType: "event",
            entityId: point.id,
          }),
        );
        return new maplibregl.Marker({ element: button, anchor: "bottom" })
          .setLngLat([point.longitude, point.latitude])
          .setPopup(popup)
          .addTo(map);
      });

      if (!bounds.isEmpty())
        map.fitBounds(bounds, {
          padding: { top: 72, right: 72, bottom: 72, left: 72 },
          maxZoom: points.length === 1 ? 14 : 12,
          duration: 0,
        });
      cleanup = () => {
        markers.forEach((marker) => marker.remove());
        map.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [center.latitude, center.longitude, locale, points, styleUrl]);

  return (
    <section className="map-panel" aria-labelledby="production-map-title">
      <div className="map-heading">
        <div>
          <h2 id="production-map-title">
            {locale === "es" ? "Mapa de eventos" : "Event map"}
          </h2>
          <p>
            {locale === "es"
              ? `${points.length} planes listos para descubrir.`
              : `${points.length} plans ready to discover.`}
          </p>
        </div>
        <a className="back-link" href="#map-filters">
          {locale === "es" ? "Cambiar filtros" : "Change filters"}
        </a>
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
