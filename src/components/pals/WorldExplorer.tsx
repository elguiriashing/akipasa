"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Appearance } from "@/lib/pals/avatar-v2";
import {
  coarseWorldCell,
  normalizeWorldVenues,
  WORLD_START,
  type WorldVenue,
} from "@/lib/pals/world";
import styles from "./WorldExplorer.module.css";
import { PALS_RENDERER_VERSION } from "@/lib/pals/renderer-version";

type Coordinates = { latitude: number; longitude: number };
type Maplibre = typeof import("maplibre-gl");
type MapInstance = import("maplibre-gl").Map;
type Marker = import("maplibre-gl").Marker;
type WorldStage = {
  setAppearance(appearance: Appearance): Promise<void>;
  setMotion?(motion: { walking: boolean; headingDegrees?: number }): void;
  dispose(): void;
};
type AvatarRuntime = {
  mount(element: HTMLElement, options?: { mode?: "world" }): WorldStage;
};

function distanceMetres(a: Coordinates, b: Coordinates): number {
  const radians = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * radians;
  const dLng = (b.longitude - a.longitude) * radians;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * radians) *
      Math.cos(b.latitude * radians) *
      Math.sin(dLng / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(x)));
}
function distanceLabel(metres: number) {
  return metres < 950
    ? Math.max(0, Math.round(metres / 10) * 10) + " m"
    : (metres / 1000).toFixed(1) + " km";
}
function makeMarker(
  venue: WorldVenue,
  onSelect: () => void,
  es = false,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = styles.venuePin;
  button.title = venue.name;
  button.setAttribute(
    "aria-label",
    (es ? "Explorar " : "Explore ") + venue.name,
  );
  const core = document.createElement("span");
  core.className = styles.venueCore;
  core.textContent = "✦";
  core.setAttribute("aria-hidden", "true");
  const name = document.createElement("span");
  name.className = styles.venueLabel;
  name.textContent = venue.name;
  button.append(core, name);
  button.addEventListener("click", onSelect);
  return button;
}

export function WorldExplorer({
  styleUrl,
  locale = "en",
}: {
  styleUrl: string;
  locale?: "en" | "es";
}) {
  const es = locale === "es";
  const t = useCallback(
    (en: string, spanish: string) => (es ? spanish : en),
    [es],
  );
  const wardrobeHref = es ? "/pals?lang=es" : "/pals";
  const worldHref = es ? "/pals/world?lang=es" : "/pals/world";
  const mapNode = useRef<HTMLDivElement>(null);
  const hudNode = useRef<HTMLDivElement>(null);
  const cardNode = useRef<HTMLDivElement>(null);
  const helpButton = useRef<HTMLButtonElement>(null);
  const placesButton = useRef<HTMLButtonElement>(null);
  const map = useRef<MapInstance | null>(null);
  const lib = useRef<Maplibre | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const avatarMarker = useRef<Marker | null>(null);
  const avatarStage = useRef<WorldStage | null>(null);
  const avatarLabel = useRef<HTMLSpanElement | null>(null);
  const gpsWatch = useRef<number | null>(null);
  const lastGPS = useRef<Coordinates | null>(null);
  const position = useRef<Coordinates | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Coordinates | null>(
    null,
  );
  const [browseCenter, setBrowseCenter] = useState<Coordinates>(WORLD_START);
  const gpsEpoch = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCell = useRef<string | null>(null);
  const fetchSerial = useRef(0);
  const tracking = useRef(false);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsRequested, setGpsRequested] = useState(false);
  const [gpsStatus, setGpsStatus] = useState(
    t("Location off", "Ubicación desactivada"),
  );
  const [venues, setVenues] = useState<WorldVenue[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [worldStatus, setWorldStatus] = useState(
    t("Loading places…", "Cargando lugares…"),
  );
  const [mapError, setMapError] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);

  const center = currentPosition || browseCenter;
  const orderedVenues = useMemo(
    () =>
      [...venues].sort(
        (a, b) => distanceMetres(center, a) - distanceMetres(center, b),
      ),
    [center, venues],
  );
  const selected = venues.find((v) => v.id === selectedId) || null;
  const venueUnavailable = worldStatus.startsWith(
    t("Venue feed unavailable.", "Lugares no disponibles."),
  );

  const requestVenues = useCallback(
    async (at: Coordinates) => {
      const cell = coarseWorldCell(at.latitude, at.longitude);
      if (!cell) return;
      const key = cell.latitude + "/" + cell.longitude;
      if (lastCell.current === key) return;
      lastCell.current = key;
      const seq = ++fetchSerial.current;
      setWorldStatus(t("Finding places…", "Buscando lugares…"));
      try {
        const url =
          "/pals/world/venues?lat=" + cell.latitude + "&lng=" + cell.longitude;
        const response = await fetch(url, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Unavailable");
        const result: unknown = await response.json();
        const data =
          result && typeof result === "object"
            ? (result as { venues?: unknown; truncated?: boolean })
            : {};
        const next = normalizeWorldVenues(data.venues);
        if (seq !== fetchSerial.current) return;
        setVenues(next);
        setSelectedId((current) =>
          next.some((venue) => venue.id === current) ? current : null,
        );
        setWorldStatus(
          next.length
            ? data.truncated
              ? t(
                  "Nearby places · open the map for more",
                  "Lugares cercanos · más en el mapa",
                )
              : t("Select a place", "Elige un lugar")
            : t("No places in this area", "No hay lugares en esta zona"),
        );
      } catch {
        if (seq === fetchSerial.current) {
          lastCell.current = null;
          setWorldStatus(
            t(
              "Venue feed unavailable. Try again.",
              "Lugares no disponibles. Reintentar.",
            ),
          );
        }
      }
    },
    [t],
  );

  // This is the existing first-party 3D studio runtime, re-mounted as a
  // lightweight map character. Do not create a second avatar identity.
  useEffect(() => {
    let cancelled = false;
    let script: HTMLScriptElement | null = null;
    let loading = false;
    const start = async () => {
      if (cancelled || loading || avatarStage.current) return;
      const target = document.querySelector<HTMLElement>(
        "[data-pals-world-avatar]",
      );
      if (!target) return;
      loading = true;
      try {
        const response = await fetch("/pals/identity", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) throw new Error("Saved avatar unavailable");
        const json = (await response.json()) as { appearance?: Appearance };
        if (!json.appearance || cancelled) return;
        const win = window as Window & { AkiPals3D?: AvatarRuntime };
        if (!win.AkiPals3D) {
          script = document.createElement("script");
          script.src = `/pals/runtime/creator.min.js?v=${PALS_RENDERER_VERSION}`;
          script.async = true;
          const loading = new Promise<void>((resolve, reject) => {
            if (!script) return reject(new Error("No script"));
            script.addEventListener("load", () => resolve(), { once: true });
            script.addEventListener(
              "error",
              () => reject(new Error("3D runtime unavailable")),
              { once: true },
            );
          });
          document.head.appendChild(script);
          await loading;
        }
        if (cancelled || !win.AkiPals3D || !target.isConnected) return;
        const stage = win.AkiPals3D.mount(target, { mode: "world" });
        avatarStage.current = stage;
        await stage.setAppearance(json.appearance);
      } catch {
        if (!cancelled) {
          target.textContent = t("3D unavailable", "3D no disponible");
          target.setAttribute("role", "status");
        }
      } finally {
        loading = false;
      }
    };
    const onMapReady = () => {
      void start();
    };
    window.addEventListener("akipals:world-map-ready", onMapReady);
    void start();
    return () => {
      cancelled = true;
      window.removeEventListener("akipals:world-map-ready", onMapReady);
      avatarStage.current?.dispose();
      avatarStage.current = null;
      script?.remove();
    };
  }, [t]);

  useEffect(() => {
    if (!mapNode.current) return;
    let removed = false;
    let localMap: MapInstance | null = null;
    const ownedMarkers = markers.current;
    void import("maplibre-gl")
      .then((maplibre) => {
        if (removed || !mapNode.current) return;
        lib.current = maplibre;
        const nextMap = new maplibre.Map({
          container: mapNode.current,
          style: styleUrl,
          center: [WORLD_START.longitude, WORLD_START.latitude],
          zoom: 16.1,
          pitch: 55,
          bearing: -14,
          maxPitch: 70,
          minZoom: 11,
          attributionControl: false,
          cooperativeGestures: false,
          renderWorldCopies: false,
        });
        localMap = nextMap;
        map.current = nextMap;
        // The compact controls reserve only their actual space. Expanded
        // cards update this inset through the observer below.
        nextMap.setPadding({ top: 64, bottom: 112, left: 16, right: 16 });
        nextMap.addControl(
          new maplibre.AttributionControl({ compact: true }),
          "bottom-right",
        );
        nextMap.on("error", (event) => {
          if (event.error && !nextMap.isStyleLoaded()) setMapError(true);
        });
        nextMap.on("load", () => {
          if (removed) return;
          setMapError(false);
          // Optional visual extrusion. Actual building data depends on the
          // configured map style; missing sources must not break the game.
          if (nextMap.getSource("openmaptiles")) {
            try {
              nextMap.addLayer({
                id: "akipals-world-buildings",
                type: "fill-extrusion",
                source: "openmaptiles",
                "source-layer": "building",
                minzoom: 15,
                paint: {
                  "fill-extrusion-color": "#e4b8a1",
                  "fill-extrusion-height": [
                    "coalesce",
                    ["get", "render_height"],
                    ["get", "height"],
                    8,
                  ],
                  "fill-extrusion-base": [
                    "coalesce",
                    ["get", "render_min_height"],
                    0,
                  ],
                  "fill-extrusion-opacity": 0.73,
                },
              });
            } catch {
              /* Source layer not available in this tile configuration. */
            }
          }
          void requestVenues(WORLD_START);
        });
        nextMap.on("moveend", () => {
          if (removed) return;
          const at = nextMap.getCenter();
          setBrowseCenter({ latitude: at.lat, longitude: at.lng });
          void requestVenues({ latitude: at.lat, longitude: at.lng });
        });
        const pal = document.createElement("div");
        pal.className = styles.avatarPin;
        pal.setAttribute(
          "aria-label",
          t("Your AkiPal game character", "Tu personaje AkiPal"),
        );
        const canvas = document.createElement("div");
        canvas.className = styles.avatarCanvas;
        canvas.dataset.palsWorldAvatar = "true";
        const ground = document.createElement("div");
        ground.className = styles.avatarGround;
        ground.setAttribute("aria-hidden", "true");
        const fallback = document.createElement("div");
        fallback.className = styles.avatarFallback;
        fallback.textContent = "🧍";
        canvas.append(fallback);
        const label = document.createElement("span");
        label.textContent = t("Preview avatar", "Vista previa");
        avatarLabel.current = label;
        pal.append(ground, canvas, label);
        avatarMarker.current = new maplibre.Marker({
          element: pal,
          anchor: "bottom",
        })
          .setLngLat([WORLD_START.longitude, WORLD_START.latitude])
          .addTo(nextMap);
        // Wake avatar loading after the marker is connected to the document.
        window.dispatchEvent(new Event("akipals:world-map-ready"));
      })
      .catch(() => {
        if (!removed) setMapError(true);
      });
    return () => {
      removed = true;
      fetchSerial.current += 1;
      ownedMarkers.forEach((marker) => marker.remove());
      ownedMarkers.clear();
      avatarMarker.current?.remove();
      avatarMarker.current = null;
      avatarLabel.current = null;
      localMap?.remove();
      if (map.current === localMap) map.current = null;
    };
  }, [requestVenues, styleUrl, t]);

  useEffect(() => {
    const world = mapNode.current?.parentElement;
    const update = () => {
      if (!world || !map.current || !hudNode.current) return;
      const bounds = world.getBoundingClientRect();
      const card = cardNode.current || hudNode.current;
      world.style.setProperty(
        "--pals-hud-clearance",
        bounds.bottom - hudNode.current.getBoundingClientRect().top + "px",
      );
      world.style.setProperty(
        "--pals-attribution-clearance",
        bounds.bottom - card.getBoundingClientRect().top + 6 + "px",
      );
      const bottom = Math.min(
        bounds.height * 0.55,
        bounds.bottom - card.getBoundingClientRect().top + 18,
      );
      map.current.setPadding({ top: 64, bottom, left: 16, right: 16 });
    };
    const observer = new ResizeObserver(update);
    for (const node of [world, hudNode.current, cardNode.current]) {
      if (node) observer.observe(node);
    }
    window.addEventListener("akipals:world-map-ready", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("akipals:world-map-ready", update);
    };
  }, [selectedId, helpOpen]);

  // Render pins from the existing public venue discovery source, not fake
  // popularity, hard-coded businesses or unverified live-event counts.
  useEffect(() => {
    if (!map.current || !lib.current) return;
    const ownedMarkers = markers.current;
    markers.current.forEach((marker) => marker.remove());
    markers.current.clear();
    for (const venue of venues) {
      const element = makeMarker(
        venue,
        () => {
          setSelectedId(venue.id);
          setHelpOpen(false);
          setPlacesOpen(false);
        },
        es,
      );
      if (venue.id === selectedId) element.classList.add(styles.venuePinActive);
      markers.current.set(
        venue.id,
        new lib.current.Marker({ element, anchor: "bottom" })
          .setLngLat([venue.longitude, venue.latitude])
          .addTo(map.current),
      );
    }
    return () => {
      ownedMarkers.forEach((marker) => marker.remove());
      ownedMarkers.clear();
    };
  }, [venues, selectedId, es]);

  const stopGPS = useCallback(() => {
    gpsEpoch.current += 1;
    if (idleTimer.current !== null) clearTimeout(idleTimer.current);
    if (gpsWatch.current !== null)
      navigator.geolocation.clearWatch(gpsWatch.current);
    gpsWatch.current = null;
    tracking.current = false;
    lastGPS.current = null;
    position.current = null;
    setCurrentPosition(null);
    setGpsActive(false);
    setGpsRequested(false);
    setGpsStatus(t("Location off", "Ubicación desactivada"));
    avatarStage.current?.setMotion?.({ walking: false });
    if (map.current) {
      const c = map.current.getCenter();
      avatarMarker.current?.setLngLat([c.lng, c.lat]);
    }
    if (avatarLabel.current)
      avatarLabel.current.textContent = t("Preview avatar", "Vista previa");
  }, [t]);

  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus(
        t(
          "This browser does not support location.",
          "Este navegador no admite ubicación.",
        ),
      );
      return;
    }
    if (gpsWatch.current !== null) return;
    const epoch = ++gpsEpoch.current;
    setGpsRequested(true);
    setGpsStatus(t("Waiting for location…", "Esperando ubicación…"));
    gpsWatch.current = navigator.geolocation.watchPosition(
      (sample) => {
        if (epoch !== gpsEpoch.current || document.hidden) return;
        if (
          Date.now() - sample.timestamp > 30000 ||
          sample.timestamp > Date.now() + 5000
        ) {
          setGpsStatus(
            t(
              "Waiting for a fresh GPS position…",
              "Esperando una ubicación reciente…",
            ),
          );
          return;
        }
        const { latitude, longitude, accuracy, heading, speed } = sample.coords;
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          !coarseWorldCell(latitude, longitude)
        )
          return;
        if (!Number.isFinite(accuracy) || accuracy > 100 || accuracy < 0) {
          setGpsStatus(
            t(
              "Location imprecise · try again outside",
              "Ubicación imprecisa · prueba fuera",
            ),
          );
          return;
        }
        const next = { latitude, longitude };
        setCurrentPosition(next);
        const previous = lastGPS.current;
        lastGPS.current = next;
        position.current = next;
        tracking.current = true;
        setGpsActive(true);
        setGpsStatus(
          "GPS ±" + Math.round(accuracy) + t(" m · private", " m · privado"),
        );
        avatarMarker.current?.setLngLat([longitude, latitude]);
        if (avatarLabel.current)
          avatarLabel.current.textContent = t("You", "Tú");
        if (map.current) {
          map.current.easeTo({
            center: [longitude, latitude],
            zoom: Math.max(16.4, map.current.getZoom()),
            duration: 650,
          });
        }
        const walking =
          typeof speed === "number" && Number.isFinite(speed)
            ? speed > 0.45 && speed < 4
            : previous
              ? distanceMetres(previous, next) > Math.max(accuracy, 6)
              : false;
        avatarStage.current?.setMotion?.({
          walking,
          headingDegrees:
            Number.isFinite(heading) && heading !== null ? heading : undefined,
        });
        if (idleTimer.current !== null) clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(
          () => avatarStage.current?.setMotion?.({ walking: false }),
          1800,
        );
        void requestVenues(next);
      },
      (error) => {
        if (epoch !== gpsEpoch.current) return;
        stopGPS();
        setGpsStatus(
          error.code === 1
            ? t(
                "Location denied. Preview still works.",
                "Ubicación denegada. Puedes explorar.",
              )
            : t(
                "Could not get a reliable position. Try again when you have signal.",
                "Sin ubicación fiable. Reintenta con señal.",
              ),
        );
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 18000 },
    );
    tracking.current = true;
  }, [requestVenues, stopGPS, t]);

  useEffect(() => {
    const onHidden = () => {
      if (document.hidden && gpsWatch.current !== null) stopGPS();
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      gpsEpoch.current += 1;
      tracking.current = false;
      if (idleTimer.current !== null) clearTimeout(idleTimer.current);
      if (gpsWatch.current !== null)
        navigator.geolocation.clearWatch(gpsWatch.current);
      gpsWatch.current = null;
    };
  }, [stopGPS]);

  const focusVenue = useCallback((venue: WorldVenue) => {
    setSelectedId(venue.id);
    setHelpOpen(false);
    setPlacesOpen(false);
    map.current?.flyTo({
      center: [venue.longitude, venue.latitude],
      zoom: Math.max(16.2, map.current.getZoom()),
      duration: 550,
    });
  }, []);

  const zoom = (amount: number) => {
    map.current?.zoomTo((map.current?.getZoom() || 15) + amount, {
      duration: 300,
    });
  };
  const selectedDistance = selected ? distanceMetres(center, selected) : null;

  const closeDetails = () => {
    if (selectedId) {
      const id = selectedId;
      setSelectedId(null);
      requestAnimationFrame(() =>
        markers.current.get(id)?.getElement().focus(),
      );
    } else {
      setHelpOpen(false);
      helpButton.current?.focus();
    }
  };

  const closePlaces = () => {
    setPlacesOpen(false);
    placesButton.current?.focus();
  };

  return (
    <main
      className={styles.root}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        if (placesOpen) closePlaces();
        else if (helpOpen || selectedId) closeDetails();
      }}
    >
      <header className={styles.header}>
        <Link className={styles.brand} href={worldHref}>
          Aki<span>Pals.</span>
        </Link>
        <div className={styles.headerActions}>
          <span className={styles.topTag}>
            <i aria-hidden="true" /> {t("Private preview", "Vista privada")}
          </span>
          <button
            ref={helpButton}
            type="button"
            className={styles.helpButton}
            aria-label={t("About AkiWorld", "Acerca de AkiWorld")}
            aria-expanded={helpOpen}
            aria-controls="pals-world-details"
            onClick={() => {
              setHelpOpen(!helpOpen);
              setSelectedId(null);
              setPlacesOpen(false);
            }}
          >
            ?
          </button>
        </div>
      </header>
      <div className={styles.layout}>
        <section
          className={styles.world}
          aria-label={t(
            "AkiPals interactive exploration map",
            "Mapa interactivo de AkiPals",
          )}
        >
          <div
            className={styles.map}
            ref={mapNode}
            aria-label={t(
              "Tilted map with real nearby AkiPasa venues",
              "Mapa inclinado con lugares reales de AkiPasa",
            )}
          />
          <div className={styles.topbar}>
            <span className={styles.tag}>
              ✦ <strong>AkiWorld</strong>
              <span className={styles.tagCaption}></span>
            </span>
            <div className={styles.mapTools}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => zoom(1)}
                aria-label={t("Zoom in", "Acercar")}
              >
                +
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => zoom(-1)}
                aria-label={t("Zoom out", "Alejar")}
              >
                −
              </button>
            </div>
          </div>
          {mapError && (
            <span role="status" className={styles.mapError}>
              {t(
                "Map unavailable. Check your connection.",
                "Mapa no disponible. Revisa tu conexión.",
              )}
            </span>
          )}
          <div className={styles.hud} ref={hudNode} data-pals-world-hud>
            <p className={styles.gpsStatus} role="status" data-pals-gps-status>
              {gpsStatus}
            </p>
            <button
              type="button"
              className={
                styles.locateButton +
                (gpsActive ? " " + styles.locateActive : "")
              }
              aria-pressed={gpsRequested}
              onClick={() =>
                gpsWatch.current !== null ? stopGPS() : startGPS()
              }
              aria-label={
                gpsRequested
                  ? t("Stop location tracking", "Detener ubicación")
                  : t("Locate my AkiPal", "Localizar mi AkiPal")
              }
            >
              <span aria-hidden="true">{gpsRequested ? "■" : "◎"}</span>
              <span className={styles.controlLabel}>
                {gpsRequested ? t("Stop", "Parar") : t("Locate", "Localizar")}
              </span>
            </button>
            <button
              ref={placesButton}
              type="button"
              className={styles.placesButton}
              aria-label={t("Nearby places", "Lugares cercanos")}
              aria-expanded={placesOpen}
              aria-controls="pals-world-places"
              aria-describedby="pals-world-feed-status"
              title={worldStatus}
              onClick={() => {
                setPlacesOpen(!placesOpen);
                setHelpOpen(false);
                setSelectedId(null);
              }}
            >
              <span aria-hidden="true">{venueUnavailable ? "!" : "✦"}</span>
              <span>
                {venueUnavailable ? t("Retry", "Reintentar") : venues.length}
              </span>
            </button>
          </div>
          {(selected || helpOpen) && (
            <div
              className={styles.tourCard}
              ref={cardNode}
              id="pals-world-details"
              data-pals-world-details
            >
              <button
                type="button"
                className={styles.closeButton}
                aria-label={
                  selected
                    ? t("Close venue details", "Cerrar detalles del lugar")
                    : t("Close World help", "Cerrar ayuda del mapa")
                }
                onClick={closeDetails}
              >
                ×
              </button>
              {selected ? (
                <>
                  <span className={styles.eyebrow}>
                    {t("✦ Place", "✦ Lugar")}
                  </span>
                  <h2>{selected.name}</h2>
                  <p>
                    {selectedDistance === null
                      ? t(
                          "Explore this location on the map.",
                          "Explora este lugar en el mapa.",
                        )
                      : (gpsActive
                          ? t("About ", "A unos ")
                          : t(
                              "From map center: ",
                              "Desde el centro del mapa: ",
                            )) + distanceLabel(selectedDistance)}
                    {" · "}
                    {selected.claimStatus === "claimed"
                      ? t("Claimed listing", "Local reclamado")
                      : t("Unclaimed listing", "Local sin reclamar")}
                  </p>
                  <div className={styles.ctas}>
                    <Link
                      className={styles.primary}
                      href={`/${locale}/venues/${selected.slug}`}
                    >
                      {t("View place ↗", "Ver lugar ↗")}
                    </Link>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => focusVenue(selected)}
                    >
                      {t("Show on map", "Ver en el mapa")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className={styles.eyebrow}>
                    {gpsActive
                      ? t("✦ Your live position", "✦ Tu posición")
                      : t(
                          "✦ Demo start · Fuengirola",
                          "✦ Vista previa · Fuengirola",
                        )}
                  </span>
                  <h2>{t("Map & location", "Mapa y ubicación")}</h2>
                  <p>
                    {t(
                      "Locate starts private GPS. It stops when you leave or hide this screen. Map browsing never verifies a visit.",
                      "Localizar activa el GPS privado. Se detiene al salir u ocultar esta pantalla. Explorar el mapa no verifica visitas.",
                    )}
                  </p>
                  <div className={styles.ctas}>
                    <Link className={styles.secondary} href={wardrobeHref}>
                      {t("Open Wardrobe ↗", "Abrir armario ↗")}
                    </Link>
                    <a
                      className={styles.secondary}
                      href="/pals/models/professional/ATTRIBUTION.txt"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("Character credits ↗", "Créditos del personaje ↗")}
                    </a>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
        <aside
          className={styles.side + (placesOpen ? " " + styles.sideOpen : "")}
          id="pals-world-places"
        >
          <section
            className={styles.panel}
            aria-label={t("Nearby venue list", "Lista de lugares cercanos")}
          >
            <button
              type="button"
              className={styles.closeButton}
              aria-label={t("Close nearby places", "Cerrar lugares cercanos")}
              onClick={closePlaces}
            >
              ×
            </button>
            <span className={styles.eyebrow}>
              {t("Around the map", "En el mapa")}
            </span>
            <h2>{t("Nearby places", "Lugares cercanos")}</h2>
            <p
              className={styles.status}
              role="status"
              id="pals-world-feed-status"
            >
              {worldStatus}
            </p>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                lastCell.current = null;
                void requestVenues(browseCenter);
              }}
            >
              {t("Refresh nearby places", "Actualizar lugares")}
            </button>
            <div className={styles.venueList}>
              {orderedVenues.slice(0, 12).map((venue) => (
                <button
                  key={venue.id}
                  type="button"
                  onClick={() => focusVenue(venue)}
                  className={
                    styles.venueRow +
                    (venue.id === selectedId ? " " + styles.venueRowActive : "")
                  }
                >
                  <span className={styles.venueRowIcon}>✦</span>
                  <span style={{ minWidth: 0 }}>
                    <span className={styles.venueRowName}>{venue.name}</span>
                    <span className={styles.venueRowMeta}>
                      {distanceLabel(distanceMetres(center, venue))} ·{" "}
                      {venue.claimStatus === "claimed"
                        ? t("Claimed", "Reclamado")
                        : t("Unclaimed", "Sin reclamar")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
      <nav
        className={styles.bottomNav}
        aria-label={t("AkiPals mobile tabs", "Pestañas de AkiPals")}
      >
        <Link href={worldHref} className={styles.active} aria-current="page">
          <span aria-hidden="true">◉</span>
          <span>{t("World", "Mundo")}</span>
        </Link>
        <Link href={wardrobeHref}>
          <span aria-hidden="true">♧</span>
          <span>{t("Wardrobe", "Armario")}</span>
        </Link>
      </nav>
    </main>
  );
}
