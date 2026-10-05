"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/config";
import { compactMarkerSchema, mapVenueDetailSchema, type CompactMapMarker } from "@/lib/map-snapshot";
import { applyMapTheme, readMapTheme } from "@/lib/map-theme";
import { Icon } from "@/components/Icons";

type ClaimVenue = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  locality?: string | null;
  latitude: number;
  longitude: number;
};

export function ClaimVenuePicker({
  locale,
  styleUrl,
  initialVenueId,
}: {
  locale: Locale;
  styleUrl: string;
  initialVenueId?: string;
}) {
  const es = locale === "es";
  const mapRoot = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const popupRef = useRef<import("maplibre-gl").Popup | null>(null);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<ClaimVenue[]>([]);
  const [selected, setSelected] = useState<ClaimVenue | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapMessage, setMapMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!initialVenueId) return;
    const controller = new AbortController();
    fetch(`/api/map/venue/${initialVenueId}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        const detail = mapVenueDetailSchema.parse(await response.json());
        if (detail.claimStatus !== "unclaimed") return null;
        return detail;
      })
      .then((detail) => {
        if (!detail) return;
        setQuery(detail.name);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [initialVenueId]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setRows([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/business/claim-search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("search failed");
        const data = (await response.json()) as { rows?: ClaimVenue[] };
        if (!controller.signal.aborted) setRows(data.rows || []);
      } catch {
        if (!controller.signal.aborted) setRows([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const chooseVenue = useCallback((venue: ClaimVenue) => {
    setSelected(venue);
    setQuery(venue.name);
    setRows([]);
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      center: [venue.longitude, venue.latitude],
      zoom: Math.max(map.getZoom(), 14),
    });
    void import("maplibre-gl").then((maplibregl) => {
      popupRef.current?.remove();
      const node = document.createElement("div");
      node.className = "claim-map-popup";
      const strong = document.createElement("strong");
      strong.textContent = venue.name;
      const small = document.createElement("span");
      small.textContent =
        venue.address || venue.locality || (es ? "Local seleccionado" : "Selected venue");
      node.append(strong, small);
      popupRef.current = new maplibregl.Popup({
        offset: 14,
        closeButton: false,
        maxWidth: "260px",
      })
        .setLngLat([venue.longitude, venue.latitude])
        .setDOMContent(node)
        .addTo(map);
    });
  }, [es]);

  useEffect(() => {
    if (!mapRoot.current || !styleUrl) return;
    let disposed = false;
    let cleanup = () => {};

    void import("maplibre-gl").then((maplibregl) => {
      if (disposed || !mapRoot.current) return;
      const map = new maplibregl.Map({
        container: mapRoot.current,
        style: styleUrl,
        center: [-4.4214, 36.7213],
        zoom: 9.5,
        attributionControl: false,
        renderWorldCopies: false,
      });
      mapRef.current = map;
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

      const syncTheme = () => {
        try {
          applyMapTheme(map, readMapTheme(document.documentElement));
        } catch {}
      };
      const observer = new MutationObserver(syncTheme);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "data-theme"],
      });

      map.on("load", () => {
        syncTheme();
        setMapReady(true);

        map.addSource("claimable-venues", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 46,
        });
        map.addLayer({
          id: "claimable-clusters",
          type: "circle",
          source: "claimable-venues",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#ffd447",
            "circle-radius": [
              "step",
              ["get", "point_count"],
              16,
              12,
              20,
              40,
              25,
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#14213d",
          },
        });
        map.addLayer({
          id: "claimable-cluster-count",
          type: "symbol",
          source: "claimable-venues",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 12,
          },
          paint: { "text-color": "#14213d" },
        });
        map.addLayer({
          id: "claimable-pins",
          type: "circle",
          source: "claimable-venues",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "#ffd447",
            "circle-radius": 8,
            "circle-stroke-width": 3,
            "circle-stroke-color": "#14213d",
          },
        });

        async function refresh() {
          const bounds = map.getBounds();
          const params = new URLSearchParams({
            west: String(bounds.getWest()),
            east: String(bounds.getEast()),
            south: String(bounds.getSouth()),
            north: String(bounds.getNorth()),
          });
          try {
            const response = await fetch(`/api/map/venues?${params}`);
            if (!response.ok) throw new Error("map venues failed");
            const payload = await response.json();
            const raw = Array.isArray(payload)
              ? payload
              : Array.isArray(payload?.markers)
                ? payload.markers
                : [];
            const markers = (raw as unknown[]).reduce<CompactMapMarker[]>(
              (items, value) => {
              const parsed = compactMarkerSchema.safeParse(value);
              if (
                parsed.success &&
                parsed.data[3] === 1 &&
                parsed.data[4] === 0
              ) {
                items.push(parsed.data);
              }
                return items;
              },
              [],
            );
            const source = map.getSource(
              "claimable-venues",
            ) as import("maplibre-gl").GeoJSONSource;
            source.setData({
              type: "FeatureCollection",
              features: markers.map(([id, longitude, latitude]) => ({
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [longitude, latitude],
                },
                properties: { id },
              })),
            });
            setMapMessage(null);
          } catch {
            setMapMessage(
              es
                ? "No se pudieron cargar los locales de esta zona."
                : "Could not load venues in this area.",
            );
          }
        }

        map.on("moveend", refresh);
        void refresh();

        map.on("click", "claimable-clusters", async (event) => {
          const feature = map.queryRenderedFeatures(event.point, {
            layers: ["claimable-clusters"],
          })[0];
          const clusterId = Number(feature?.properties?.cluster_id);
          if (!Number.isFinite(clusterId)) return;
          const source = map.getSource(
            "claimable-venues",
          ) as import("maplibre-gl").GeoJSONSource;
          const zoom = await source.getClusterExpansionZoom(clusterId);
          if (!feature || feature.geometry.type !== "Point") return;
          const coords = feature.geometry.coordinates as [number, number];
          map.easeTo({ center: coords, zoom });
        });

        map.on("click", "claimable-pins", async (event) => {
          const id = String(event.features?.[0]?.properties?.id || "");
          if (!id) return;
          try {
            const response = await fetch(`/api/map/venue/${id}`);
            if (!response.ok) throw new Error("venue failed");
            const detail = mapVenueDetailSchema.parse(await response.json());
            if (detail.claimStatus !== "unclaimed") return;
            const geometry = event.features?.[0]?.geometry;
            if (!geometry || geometry.type !== "Point") return;
            const coords = geometry.coordinates as [number, number];
            const venue: ClaimVenue = {
              id: detail.id,
              slug: detail.slug,
              name: detail.name,
              address: detail.address,
              latitude: coords[1],
              longitude: coords[0],
            };
            chooseVenue(venue);
          } catch {}
        });

        map.on("mouseenter", "claimable-pins", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "claimable-pins", () => {
          map.getCanvas().style.cursor = "";
        });
      });

      cleanup = () => {
        observer.disconnect();
        popupRef.current?.remove();
        map.remove();
        mapRef.current = null;
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [chooseVenue, es, styleUrl]);

  function chooseSearchResult(venue: ClaimVenue) {
    chooseVenue(venue);
  }

  return (
    <div className="claim-venue-picker">
      <input type="hidden" name="venueId" value={selected?.id || ""} required />
      <section className="claim-search-panel">
        <div className="claim-search-heading">
          <div>
            <span>{es ? "Encuentra tu local" : "Find your venue"}</span>
            <h3>{es ? "Busca o toca el mapa" : "Search or tap the map"}</h3>
          </div>
          {selected && (
            <button type="button" onClick={() => setSelected(null)}>
              {es ? "Cambiar" : "Change"}
            </button>
          )}
        </div>
        <label className="claim-search-input">
          <Icon name="search" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(null);
            }}
            placeholder={
              es
                ? "Nombre, ciudad o dirección..."
                : "Name, city or address..."
            }
            autoComplete="off"
          />
          {loading && <span aria-hidden="true">…</span>}
        </label>
        {query.trim().length >= 2 && !selected && (
          <div className="claim-search-results">
            {rows.length ? (
              rows.map((venue) => (
                <button
                  type="button"
                  key={venue.id}
                  onClick={() => chooseSearchResult(venue)}
                >
                  <span>
                    <strong>{venue.name}</strong>
                    <small>
                      {[venue.address, venue.locality].filter(Boolean).join(" · ")}
                    </small>
                  </span>
                  <Icon name="arrow-right" />
                </button>
              ))
            ) : (
              <p>
                {loading
                  ? es
                    ? "Buscando…"
                    : "Searching…"
                  : es
                    ? "No encontramos locales sin reclamar con esa búsqueda."
                    : "No unclaimed venues match that search."}
              </p>
            )}
          </div>
        )}
        {selected && (
          <div className="claim-selected-venue" role="status">
            <span>{es ? "Local seleccionado" : "Selected venue"}</span>
            <strong>{selected.name}</strong>
            <small>{selected.address || selected.locality || ""}</small>
          </div>
        )}
      </section>

      <section className="claim-map-panel">
        <div ref={mapRoot} className="claim-map-canvas" />
        {!mapReady && (
          <div className="claim-map-loading">
            {es ? "Cargando mapa…" : "Loading map…"}
          </div>
        )}
        {mapMessage && <p className="claim-map-message">{mapMessage}</p>}
        <div className="claim-map-legend">
          <i />
          <span>
            {es
              ? "Locales disponibles para reclamar"
              : "Venues available to claim"}
          </span>
        </div>
      </section>
    </div>
  );
}
