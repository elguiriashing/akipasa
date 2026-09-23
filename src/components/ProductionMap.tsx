"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { mapVenueDetailSchema, type MapVenueDetail } from "@/lib/map-snapshot";
import {
  accommodationLabel,
  markerIsVisible,
  markerSource,
  type DiscoveryVertical,
} from "@/lib/accommodation";
import { stayHref } from "@/lib/akiduermo-routing";
import { MapTileLoader } from "@/lib/map-tiles";
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
  startsAt?: string;
  priceLabel?: string;
  source:
    | "verified_venue"
    | "community"
    | "claimed"
    | "unclaimed"
    | "accommodation";
  kind?: "event" | "venue";
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

function clusterImage(diameter: number, fill: string): ImageData {
  const pixelRatio = 2;
  const canvas = document.createElement("canvas");
  canvas.width = diameter * pixelRatio;
  canvas.height = diameter * pixelRatio;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create the map cluster image.");

  const center = canvas.width / 2;
  context.beginPath();
  context.arc(center, center, center - 3 * pixelRatio, 0, Math.PI * 2);
  context.fillStyle = fill;
  context.globalAlpha = 0.94;
  context.fill();
  context.globalAlpha = 1;
  context.lineWidth = 3 * pixelRatio;
  context.strokeStyle = "#fff7ea";
  context.stroke();
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function markerImage(fill: string, kind: "event" | "venue"): ImageData {
  const width = 36;
  const height = 44;
  const pixelRatio = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create the map marker image.");
  context.scale(pixelRatio, pixelRatio);
  context.beginPath();
  context.moveTo(18, 42);
  context.bezierCurveTo(15, 35, 5, 27, 5, 18);
  context.arc(18, 18, 13, Math.PI, 0);
  context.bezierCurveTo(31, 27, 21, 35, 18, 42);
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.lineWidth = 2.5;
  context.strokeStyle = "#fff7ea";
  context.stroke();
  context.strokeStyle = "#fff7ea";
  context.fillStyle = "#fff7ea";
  context.lineWidth = 2;
  if (kind === "event") {
    context.strokeRect(12, 13, 12, 11);
    context.beginPath();
    context.moveTo(12, 17);
    context.lineTo(24, 17);
    context.moveTo(15, 11);
    context.lineTo(15, 15);
    context.moveTo(21, 11);
    context.lineTo(21, 15);
    context.stroke();
  } else {
    context.fillRect(12, 15, 12, 10);
    context.fillRect(15, 11, 6, 4);
    context.fillStyle = fill;
    context.fillRect(15, 18, 2, 2);
    context.fillRect(19, 18, 2, 2);
    context.fillRect(17, 22, 2, 3);
  }
  return context.getImageData(0, 0, canvas.width, canvas.height);
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
  const date = point.startsAt
    ? new Intl.DateTimeFormat(locale, {
        timeZone: "Europe/Madrid",
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(point.startsAt))
    : "";
  meta.textContent =
    point.kind === "venue"
      ? point.source === "accommodation"
        ? accommodationLabel(locale)
        : point.source === "claimed"
          ? locale === "es"
            ? "Local"
            : "Venue"
          : locale === "es"
            ? "Local sin reclamar"
            : "Unclaimed venue"
      : `${date} · ${point.priceLabel}`;
  const link = document.createElement("a");
  link.href = point.href;
  link.textContent =
    point.kind === "venue"
      ? point.source === "accommodation"
        ? locale === "es"
          ? "Ver alojamiento"
          : "View stay"
        : locale === "es"
          ? "Ver negocio"
          : "View business"
      : locale === "es"
        ? "Ver evento"
        : "View event";
  link.addEventListener("click", () =>
    trackBehaviour({
      eventType: "map_pin_clicked",
      surface: "map",
      entityType: point.kind === "venue" ? "venue" : "event",
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
  initialVertical = "activities",
  showVerticalTabs = true,
  venueDestination = "akipasa",
  venueIds = null,
}: {
  locale: Locale;
  venueDestination?: "akipasa" | "akiduermo";
  venueIds?: ReadonlySet<string> | null;
  initialVertical?: DiscoveryVertical;
  showVerticalTabs?: boolean;
  points: MapPoint[];
  styleUrl: string;
  center: { latitude: number; longitude: number };
}) {
  const container = useRef<HTMLDivElement>(null);
  const [venueStatus, setVenueStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [loadedVenues, setLoadedVenues] = useState(0);
  const [vertical, setVertical] = useState<DiscoveryVertical>(initialVertical);
  const venueIdsRef = useRef(venueIds);
  const verticalRef = useRef<DiscoveryVertical>(initialVertical);
  const renderVenuesRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    verticalRef.current = vertical;
    venueIdsRef.current = venueIds;
    renderVenuesRef.current?.();
  }, [vertical, venueIds]);

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
    let visiblePoints = points;
    let pointIndex = new Map(points.map((point) => [point.id, point]));
    const details = new Map<string, MapVenueDetail>();
    let activePopup: import("maplibre-gl").Popup | undefined;
    let activePopupId: string | undefined;
    let popupRequest: AbortController | undefined;
    const request = new AbortController();
    const tileLoader = new MapTileLoader();
    let timer: ReturnType<typeof setTimeout> | undefined;
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
        cooperativeGestures: true,
        renderWorldCopies: false,
      });
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      navigator.geolocation?.getCurrentPosition(
        ({ coords }) => {
          if (disposed) return;
          map.jumpTo({
            center: [coords.longitude, coords.latitude],
            zoom: 10.5,
          });
        },
        () => {
          // The selected search location remains the fallback when GPS is
          // unavailable or the visitor declines browser location access.
        },
        { enableHighAccuracy: false, maximumAge: 300_000, timeout: 5_000 },
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
      map.once("load", () => {
        tuneMapPalette(map);
        map.addSource("discovery-points", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: points.map((point) => ({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [point.longitude, point.latitude],
              },
              properties: { id: point.id, source: point.source },
            })),
          },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 52,
        });
        map.addImage("cluster-small", clusterImage(38, "#f59e0b"), {
          pixelRatio: 2,
        });
        map.addImage("cluster-medium", clusterImage(48, "#f07818"), {
          pixelRatio: 2,
        });
        map.addImage("cluster-large", clusterImage(60, "#d94f0b"), {
          pixelRatio: 2,
        });
        map.addImage("pin-verified", markerImage("#ff6413", "event"), {
          pixelRatio: 2,
        });
        map.addImage("pin-community", markerImage("#a43ee8", "event"), {
          pixelRatio: 2,
        });
        map.addImage("pin-claimed", markerImage("#2784e6", "venue"), {
          pixelRatio: 2,
        });
        map.addImage("pin-unclaimed", markerImage("#7b858f", "venue"), {
          pixelRatio: 2,
        });
        map.addImage("pin-accommodation", markerImage("#166534", "venue"), {
          pixelRatio: 2,
        });
        map.addLayer({
          id: "discovery-clusters",
          type: "symbol",
          source: "discovery-points",
          filter: ["has", "point_count"],
          layout: {
            "icon-image": [
              "step",
              ["get", "point_count"],
              "cluster-small",
              10,
              "cluster-medium",
              35,
              "cluster-large",
            ],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 13,
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          },
          paint: {
            "text-color": "#171008",
            "text-halo-color": "#fff7ea",
            "text-halo-width": 1,
          },
        });
        map.addLayer({
          id: "discovery-unclustered",
          type: "symbol",
          source: "discovery-points",
          filter: ["!", ["has", "point_count"]],
          layout: {
            "icon-image": [
              "match",
              ["get", "source"],
              "accommodation",
              "pin-accommodation",
              "community",
              "pin-community",
              "claimed",
              "pin-claimed",
              "unclaimed",
              "pin-unclaimed",
              "pin-verified",
            ],
            "icon-anchor": "bottom",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });

        map.on("click", "discovery-clusters", async (event) => {
          const feature = map.queryRenderedFeatures(event.point, {
            layers: ["discovery-clusters"],
          })[0];
          const clusterId = Number(feature?.properties?.cluster_id);
          if (!Number.isFinite(clusterId)) return;
          const source = map.getSource(
            "discovery-points",
          ) as import("maplibre-gl").GeoJSONSource;
          const zoom = await source.getClusterExpansionZoom(clusterId);
          const coordinates = (
            feature.geometry as { type: "Point"; coordinates: [number, number] }
          ).coordinates;
          map.easeTo({ center: coordinates, zoom });
        });
        map.on("click", "discovery-unclustered", async (event) => {
          const feature = event.features?.[0];
          const point = pointIndex.get(String(feature?.properties?.id));
          if (!point) return;
          popupRequest?.abort();
          const controller = new AbortController();
          popupRequest = controller;
          activePopup?.remove();
          activePopupId = point.id;
          const popup = new maplibregl.Popup({
            offset: 16,
            closeButton: false,
            className: "akipasa-map-popup",
            maxWidth: "260px",
          }).setLngLat([point.longitude, point.latitude]);
          activePopup = popup;
          popup.on("close", () => controller.abort());
          if (point.kind !== "venue") {
            popup.setDOMContent(popupContent(point, locale)).addTo(map);
          } else {
            const loading = document.createElement("p");
            loading.textContent =
              locale === "es" ? "Cargando negocio…" : "Loading business…";
            popup.setDOMContent(loading).addTo(map);
            try {
              let detail = details.get(point.id);
              if (!detail) {
                const response = await fetch(`/api/map/venue/${point.id}`, {
                  signal: controller.signal,
                });
                if (!response.ok) throw new Error("Venue unavailable");
                detail = mapVenueDetailSchema.parse(await response.json());
                if (detail.id !== point.id) throw new Error("Unexpected venue");
                if (details.size >= 200) details.clear();
                details.set(point.id, detail);
              }
              if (disposed || controller.signal.aborted) return;
              popup.setDOMContent(
                popupContent(
                  {
                    ...point,
                    title: detail.name,
                    venue: detail.address ?? "",
                    href:
                      venueDestination === "akiduermo"
                        ? stayHref(detail.slug, locale)
                        : `/${locale}/venues/${detail.slug}`,
                    source:
                      detail.discoveryVertical === "accommodation"
                        ? "accommodation"
                        : detail.claimStatus,
                    category:
                      detail.discoveryVertical === "accommodation"
                        ? accommodationLabel(locale)
                        : point.category,
                  },
                  locale,
                ),
              );
            } catch {
              if (disposed || controller.signal.aborted) return;
              loading.textContent =
                locale === "es"
                  ? "No se pudo cargar este negocio. Vuelve a tocar el marcador para reintentar."
                  : "Could not load this business. Tap its pin to retry.";
            }
          }
          trackBehaviour({
            eventType: "map_pin_clicked",
            surface: "map",
            entityType: point.kind === "venue" ? "venue" : "event",
            entityId: point.id,
          });
        });
        const renderVenues = () => {
          if (disposed) return;
          const markers = tileLoader
            .values()
            .filter(
              (marker) =>
                markerIsVisible(marker, verticalRef.current) &&
                (!venueIdsRef.current || venueIdsRef.current.has(marker[0])),
            );
          visiblePoints = [
            ...(verticalRef.current === "activities" ? points : []),
            ...markers.map((marker) => {
              const [id, longitude, latitude] = marker;
              return {
                id,
                longitude,
                latitude,
                title: "",
                venue: "",
                href: "",
                category:
                  marker[4] === 1
                    ? accommodationLabel(locale)
                    : locale === "es"
                      ? "Local"
                      : "Venue",
                source: markerSource(marker),
                kind: "venue" as const,
              };
            }),
          ];
          pointIndex = new Map(visiblePoints.map((point) => [point.id, point]));
          if (activePopupId && !pointIndex.has(activePopupId))
            activePopup?.remove();
          setLoadedVenues(markers.length);
          (
            map.getSource(
              "discovery-points",
            ) as import("maplibre-gl").GeoJSONSource
          ).setData({
            type: "FeatureCollection",
            features: visiblePoints.map((point) => ({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [point.longitude, point.latitude],
              },
              properties: { id: point.id, source: point.source },
            })),
          });
        };
        renderVenuesRef.current = renderVenues;
        renderVenues();
        let loading = false,
          queued = false;
        const loadVenues = async () => {
          if (disposed) return;
          if (loading) {
            queued = true;
            return;
          }
          loading = true;
          setVenueStatus("loading");
          const bounds = map.getBounds();
          try {
            const result = await tileLoader.load(
              {
                west: bounds.getWest(),
                east: bounds.getEast(),
                south: bounds.getSouth(),
                north: bounds.getNorth(),
              },
              map.getZoom(),
              request.signal,
              fetch,
              renderVenues,
            );
            if (disposed) return;
            if (result.added) {
              renderVenues();
            }
            setVenueStatus(result.failed ? "error" : "ready");
          } finally {
            loading = false;
            if (queued && !disposed) {
              queued = false;
              void loadVenues();
            }
          }
        };
        const scheduleLoad = () => {
          clearTimeout(timer);
          timer = setTimeout(() => void loadVenues(), 180);
        };
        map.on("moveend", scheduleLoad);
        void loadVenues();
        for (const layer of ["discovery-clusters", "discovery-unclustered"]) {
          map.on("mouseenter", layer, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", layer, () => {
            map.getCanvas().style.cursor = "";
          });
        }
      });
      cleanup = () => {
        map.remove();
      };
    });

    return () => {
      disposed = true;
      renderVenuesRef.current = null;
      clearTimeout(timer);
      request.abort();
      popupRequest?.abort();
      cleanup();
    };
  }, [
    center.latitude,
    center.longitude,
    locale,
    points,
    styleUrl,
    venueDestination,
  ]);

  return (
    <section className="map-panel" aria-labelledby="production-map-title">
      <div className="map-heading">
        <div>
          <h2 id="production-map-title">
            {vertical === "accommodation"
              ? accommodationLabel(locale)
              : locale === "es"
                ? "Mapa de eventos"
                : "Event map"}
          </h2>
          <p>
            {locale === "es"
              ? "Explora España. Los locales se cargan al explorar el mapa."
              : "Explore Spain. Venues load as you explore the map."}
          </p>
        </div>
        <a className="back-link" href="#map-filters">
          {locale === "es" ? "Cambiar filtros" : "Change filters"}
        </a>
      </div>
      {showVerticalTabs && (
        <div
          className="map-vertical-tabs"
          role="group"
          aria-label={locale === "es" ? "Tipo de lugares" : "Place type"}
        >
          <button
            type="button"
            aria-pressed={vertical === "activities"}
            onClick={() => setVertical("activities")}
          >
            {locale === "es" ? "Planes y locales" : "Events & venues"}
          </button>
          <button
            type="button"
            aria-pressed={vertical === "accommodation"}
            onClick={() => setVertical("accommodation")}
          >
            {accommodationLabel(locale)}
          </button>
        </div>
      )}
      <p className="result-caption" role="status">
        {venueStatus === "loading"
          ? locale === "es"
            ? "Cargando locales de esta zona…"
            : "Loading venues in this area…"
          : venueStatus === "error"
            ? locale === "es"
              ? "No se pudo completar esta zona. Mueve el mapa para reintentar; los locales cargados se conservan."
              : "Could not finish loading this area. Move the map to retry; loaded venues are retained."
            : locale === "es"
              ? `Locales cargados: ${loadedVenues.toLocaleString(locale)}.`
              : `Loaded venues: ${loadedVenues.toLocaleString(locale)}.`}
      </p>
      <div className="production-map-wrap">
        <div
          className="production-map"
          ref={container}
          role="application"
          aria-label={locale === "es" ? "Mapa interactivo" : "Interactive map"}
        />
        <aside
          className="map-legend"
          aria-label={locale === "es" ? "Leyenda del mapa" : "Map legend"}
        >
          <strong>{locale === "es" ? "Leyenda" : "Legend"}</strong>
          {vertical === "accommodation" ? (
            <span>
              <i className="map-legend-pin map-legend-accommodation">
                <b>A</b>
              </i>
              {accommodationLabel(locale)}
            </span>
          ) : (
            <>
              <span>
                <i className="map-legend-pin map-legend-verified">
                  <b>E</b>
                </i>
                {locale === "es" ? "Evento verificado" : "Verified event"}
              </span>
              <span>
                <i className="map-legend-pin map-legend-community">
                  <b>E</b>
                </i>
                {locale === "es" ? "Evento comunitario" : "Community event"}
              </span>
              <span>
                <i className="map-legend-pin map-legend-claimed">
                  <b>V</b>
                </i>
                {locale === "es" ? "Local" : "Venue"}
              </span>
              <span>
                <i className="map-legend-pin map-legend-unclaimed">
                  <b>V</b>
                </i>
                {locale === "es" ? "Local sin reclamar" : "Unclaimed venue"}
              </span>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
