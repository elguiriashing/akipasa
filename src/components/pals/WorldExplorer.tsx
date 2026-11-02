"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Appearance } from "@/lib/pals/avatar-v2";
import {
  coarseWorldCell,
  normalizeWorldVenues,
  worldPositionIssue,
  groupWorldVenues,
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
  const gpsWatch = useRef<number | null>(null);
  const lastGPS = useRef<Coordinates | null>(null);
  const position = useRef<Coordinates | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Coordinates | null>(
    null,
  );
  const [gpsPhase, setGpsPhase] = useState<
    "starting" | "ready" | "error" | "paused"
  >("starting");
  const [mapRevision, setMapRevision] = useState(0);
  const freshnessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const acquireTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshSampleTime = useRef<number | null>(null);
  const gpsEpoch = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCell = useRef<string | null>(null);
  const fetchSerial = useRef(0);
  const tracking = useRef(false);
  const gpsActive = currentPosition !== null;
  const worldReady = gpsActive;
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

  const center = currentPosition;
  const orderedVenues = useMemo(
    () =>
      center
        ? [...venues].sort(
            (a, b) => distanceMetres(center, a) - distanceMetres(center, b),
          )
        : [],
    [center, venues],
  );
  const selected = venues.find((v) => v.id === selectedId) || null;
  const venueUnavailable = worldStatus.startsWith(
    t("Venue feed unavailable.", "Lugares no disponibles."),
  );

  const requestVenues = useCallback(
    async (at: Coordinates) => {
      if (!position.current || document.hidden) return;
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
    if (!worldReady) return;
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
  }, [t, worldReady]);

  useEffect(() => {
    if (!worldReady || !mapNode.current || !position.current) return;
    let removed = false;
    let localMap: MapInstance | null = null;
    let removeGestures = () => {};
    const ownedMarkers = markers.current;
    void import("maplibre-gl")
      .then((maplibre) => {
        if (removed || !mapNode.current || document.hidden || !position.current)
          return;
        const initial = position.current;
        lib.current = maplibre;
        const nextMap = new maplibre.Map({
          container: mapNode.current,
          style: styleUrl,
          center: [initial.longitude, initial.latitude],
          zoom: 16.1,
          pitch: 55,
          bearing: -14,
          maxPitch: 70,
          minZoom: 11,
          attributionControl: false,
          cooperativeGestures: false,
          renderWorldCopies: false,
          dragPan: false,
          dragRotate: false,
          keyboard: false,
          touchPitch: false,
          doubleClickZoom: false,
        });
        localMap = nextMap;
        map.current = nextMap;
        // The compact controls reserve only their actual space. Expanded
        // cards update this inset through the observer below.
        nextMap.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
        nextMap.scrollZoom.enable({ around: "center" });
        nextMap.touchZoomRotate.enable({ around: "center" });
        nextMap.touchZoomRotate.disableRotation();
        nextMap.addControl(
          new maplibre.AttributionControl({ compact: false }),
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
          if (position.current) void requestVenues(position.current);
          setMapRevision((n) => n + 1);
        });
        let recentering = false;
        nextMap.on("move", () => {
          if (removed || recentering || !position.current) return;
          const at = nextMap.getCenter();
          const fix = position.current;
          if (
            Math.abs(at.lat - fix.latitude) < 1e-10 &&
            Math.abs(at.lng - fix.longitude) < 1e-10
          )
            return;
          recentering = true;
          nextMap.jumpTo({ center: [fix.longitude, fix.latitude] });
          recentering = false;
        });
        nextMap.on("moveend", () => {
          if (!removed) setMapRevision((n) => n + 1);
        });
        const canvasElement = nextMap.getCanvas();
        const pointers = new Map<number, number>();
        const down = (event: PointerEvent) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          pointers.set(event.pointerId, event.clientX);
          canvasElement.setPointerCapture?.(event.pointerId);
        };
        const move = (event: PointerEvent) => {
          const before = pointers.get(event.pointerId);
          if (before === undefined) return;
          pointers.set(event.pointerId, event.clientX);
          if (pointers.size !== 1 || !position.current) return;
          const delta = event.clientX - before;
          if (!delta) return;
          nextMap.jumpTo({
            center: [position.current.longitude, position.current.latitude],
            bearing: nextMap.getBearing() - delta * 0.35,
          });
        };
        const up = (event: PointerEvent) => {
          pointers.delete(event.pointerId);
        };
        canvasElement.addEventListener("pointerdown", down);
        canvasElement.addEventListener("pointermove", move);
        canvasElement.addEventListener("pointerup", up);
        canvasElement.addEventListener("pointercancel", up);
        removeGestures = () => {
          pointers.clear();
          canvasElement.removeEventListener("pointerdown", down);
          canvasElement.removeEventListener("pointermove", move);
          canvasElement.removeEventListener("pointerup", up);
          canvasElement.removeEventListener("pointercancel", up);
        };
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
        pal.append(ground, canvas);
        avatarMarker.current = new maplibre.Marker({
          element: pal,
          anchor: "bottom",
        })
          .setLngLat([initial.longitude, initial.latitude])
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
      removeGestures();
      localMap?.remove();
      if (map.current === localMap) map.current = null;
    };
  }, [requestVenues, styleUrl, t, worldReady]);

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
  }, [selectedId, helpOpen, worldReady]);

  // Render pins from the existing public venue discovery source, not fake
  // popularity, hard-coded businesses or unverified live-event counts.
  useEffect(() => {
    if (!map.current || !lib.current) return;
    const ownedMarkers = markers.current;
    markers.current.forEach((marker) => marker.remove());
    markers.current.clear();
    const ordered = selectedId
      ? [
          ...venues.filter((venue) => venue.id === selectedId),
          ...venues.filter((venue) => venue.id !== selectedId),
        ]
      : venues;
    for (const members of groupWorldVenues(ordered, (venue) =>
      map.current!.project([venue.longitude, venue.latitude]),
    )) {
      const venue = members[0];
      const element = makeMarker(
        venue,
        () => {
          setSelectedId(members.length === 1 ? venue.id : null);
          setHelpOpen(false);
          setPlacesOpen(members.length > 1);
        },
        es,
      );
      if (members.length > 1) {
        element.querySelector("span")!.textContent = String(members.length);
        element.setAttribute(
          "aria-label",
          t(
            `${members.length} nearby places`,
            `${members.length} lugares cercanos`,
          ),
        );
        element.title = members.map((member) => member.name).join(" · ");
      }
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
  }, [venues, selectedId, es, t, mapRevision, worldReady]);

  const stopGPS = useCallback(() => {
    gpsEpoch.current += 1;
    if (idleTimer.current !== null) clearTimeout(idleTimer.current);
    if (freshnessTimer.current !== null) clearTimeout(freshnessTimer.current);
    if (acquireTimer.current !== null) clearTimeout(acquireTimer.current);
    if (refreshTimer.current !== null) clearTimeout(refreshTimer.current);
    refreshSampleTime.current = null;
    if (gpsWatch.current !== null)
      navigator.geolocation.clearWatch(gpsWatch.current);
    gpsWatch.current = null;
    tracking.current = false;
    lastGPS.current = null;
    position.current = null;
    fetchSerial.current += 1;
    lastCell.current = null;
    setCurrentPosition(null);
    setVenues([]);
    setSelectedId(null);
    setPlacesOpen(false);
    setHelpOpen(false);
    avatarStage.current?.setMotion?.({ walking: false });
  }, []);

  const startGPS = useCallback(() => {
    stopGPS();
    setGpsPhase("starting");
    setGpsStatus(t("Finding your location…", "Buscando tu ubicación…"));
    if (document.hidden) {
      setGpsPhase("paused");
      return;
    }
    if (!navigator.geolocation) {
      setGpsPhase("error");
      setGpsStatus(t("Location unavailable", "Ubicación no disponible"));
      return;
    }
    const epoch = gpsEpoch.current;
    const fail = (message: string) => {
      stopGPS();
      setGpsPhase("error");
      setGpsStatus(message);
    };
    acquireTimer.current = setTimeout(() => {
      if (epoch === gpsEpoch.current && !position.current)
        fail(t("No precise location yet", "Sin ubicación precisa"));
    }, 20000);
    const acceptSample = (sample: GeolocationPosition) => {
      if (epoch !== gpsEpoch.current || document.hidden) return;
      const issue = worldPositionIssue(sample);
      if (issue) {
        // Initial samples can improve while the bounded watch remains active.
        setGpsStatus(
          issue === "inaccurate"
            ? t("Waiting for precise GPS…", "Esperando GPS preciso…")
            : t("Waiting for fresh GPS…", "Esperando GPS reciente…"),
        );
        return;
      }
      if (acquireTimer.current !== null) clearTimeout(acquireTimer.current);
      const { latitude, longitude, accuracy, heading, speed } = sample.coords;
      const next = { latitude, longitude };
      const previous = lastGPS.current;
      lastGPS.current = next;
      position.current = next;
      tracking.current = true;
      setCurrentPosition(next);
      setGpsPhase("ready");
      setGpsStatus(
        "GPS ±" + Math.round(accuracy) + t(" m · private", " m · privado"),
      );
      avatarMarker.current?.setLngLat([longitude, latitude]);
      map.current?.jumpTo({ center: [longitude, latitude] });
      const walking =
        typeof speed === "number" && Number.isFinite(speed)
          ? speed > 0.45 && speed < 4
          : previous
            ? distanceMetres(previous, next) > Math.max(accuracy, 6)
            : false;
      avatarStage.current?.setMotion?.({
        walking,
        headingDegrees:
          typeof heading === "number" && Number.isFinite(heading)
            ? heading
            : undefined,
      });
      if (idleTimer.current !== null) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(
        () => avatarStage.current?.setMotion?.({ walking: false }),
        1800,
      );
      if (freshnessTimer.current !== null) clearTimeout(freshnessTimer.current);
      freshnessTimer.current = setTimeout(
        () => {
          if (epoch === gpsEpoch.current)
            fail(t("Location expired", "Ubicación caducada"));
        },
        Math.max(1, 30000 - (Date.now() - sample.timestamp)),
      );
      if (refreshTimer.current !== null) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(
        () => {
          if (
            epoch !== gpsEpoch.current ||
            document.hidden ||
            refreshSampleTime.current === sample.timestamp
          )
            return;
          refreshSampleTime.current = sample.timestamp;
          navigator.geolocation.getCurrentPosition(
            acceptSample,
            (error) => {
              // A failed refresh never extends the last genuine fix deadline.
              if (error.code === 1 && epoch === gpsEpoch.current)
                fail(
                  t(
                    "Location permission required",
                    "Permiso de ubicación necesario",
                  ),
                );
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
          );
        },
        Math.max(0, 20000 - (Date.now() - sample.timestamp)),
      );
      void requestVenues(next);
    };
    const id = navigator.geolocation.watchPosition(
      acceptSample,
      (error) => {
        if (epoch !== gpsEpoch.current) return;
        // A temporary watch timeout must not discard a still-fresh stationary
        // fix; the independent refresh/deadline remains authoritative.
        if (position.current && error.code !== 1) {
          setGpsStatus(t("Refreshing location…", "Actualizando ubicación…"));
          return;
        }
        fail(
          error.code === 1
            ? t(
                "Allow location in browser settings",
                "Permite la ubicación en el navegador",
              )
            : t(
                "Location unavailable · try again",
                "Ubicación no disponible · reintentar",
              ),
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 18000 },
    );
    if (epoch === gpsEpoch.current) gpsWatch.current = id;
    else navigator.geolocation.clearWatch(id);
  }, [requestVenues, stopGPS, t]);

  useEffect(() => {
    let disposed = false;
    let observedPermission: PermissionStatus | undefined;
    const permissionChanged = () => {
      if (disposed || document.hidden) return;
      if (observedPermission?.state !== "denied") {
        // Granting the browser's first prompt must not restart its live watch.
        if (observedPermission?.state === "prompt" && position.current)
          stopGPS();
        if (gpsWatch.current === null && !position.current) startGPS();
        return;
      }
      stopGPS();
      setGpsPhase("error");
      setGpsStatus(
        t("Location permission required", "Permiso de ubicación necesario"),
      );
    };
    const checkPermission = async () => {
      if (document.hidden) return;
      setGpsPhase("starting");
      try {
        const permission = await navigator.permissions?.query({
          name: "geolocation",
        });
        if (disposed || document.hidden) return;
        observedPermission?.removeEventListener?.("change", permissionChanged);
        observedPermission = permission;
        observedPermission?.addEventListener?.("change", permissionChanged);
        if (permission?.state !== "denied") {
          if (gpsWatch.current === null && !position.current) startGPS();
        } else {
          stopGPS();
          setGpsPhase("error");
          setGpsStatus(
            t(
              "Location required to enter World",
              "La ubicación es necesaria para entrar",
            ),
          );
        }
      } catch {
        // Permissions API support is optional. Only the browser can grant GPS;
        // entering World initiates its native prompt, never a fake app grant.
        if (
          !disposed &&
          !document.hidden &&
          gpsWatch.current === null &&
          !position.current
        )
          startGPS();
      }
    };
    const visibility = () => {
      if (document.hidden) {
        stopGPS();
        setGpsPhase("paused");
        setGpsStatus(t("World paused", "Mundo en pausa"));
      } else void checkPermission();
    };
    document.addEventListener("visibilitychange", visibility);
    void checkPermission();
    return () => {
      disposed = true;
      observedPermission?.removeEventListener?.("change", permissionChanged);
      document.removeEventListener("visibilitychange", visibility);
      stopGPS();
    };
  }, [startGPS, stopGPS, t]);

  const focusVenue = useCallback((venue: WorldVenue) => {
    setSelectedId(venue.id);
    setHelpOpen(false);
    setPlacesOpen(false);
  }, []);

  const zoom = (amount: number) => {
    map.current?.zoomTo((map.current?.getZoom() || 15) + amount, {
      duration: 300,
    });
  };
  const selectedDistance =
    selected && center ? distanceMetres(center, selected) : null;

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

  if (!center)
    return (
      <main className={styles.root}>
        <section
          className={styles.locationGate}
          aria-label={t("World location", "Ubicación del mundo")}
          data-pals-world-location-gate
        >
          <span className={styles.gateIcon} aria-hidden="true">
            ◎
          </span>
          <h1>{t("Enter your World", "Entra en tu mundo")}</h1>
          <p role="status" data-pals-gps-status>
            {gpsStatus}
          </p>
          {gpsPhase !== "starting" && (
            <button className={styles.primary} type="button" onClick={startGPS}>
              {t("Try again", "Reintentar")}
            </button>
          )}
          <Link className={styles.secondary} href={wardrobeHref}>
            {t("Wardrobe", "Armario")}
          </Link>
          <nav
            className={styles.gateLinks}
            aria-label={t(
              "World location information",
              "Información de ubicación",
            )}
          >
            <a href={`/${locale}/terms#akipals-world`}>
              {t("Terms", "Condiciones")}
            </a>
            <a href={`/${locale}/privacy#akipals-world`}>
              {t("Privacy", "Privacidad")}
            </a>
          </nav>
        </section>
      </main>
    );

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
                      onClick={closeDetails}
                    >
                      {t("Back to World", "Volver al mundo")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className={styles.eyebrow}>
                    {t("✦ Your live position", "✦ Tu posición")}
                  </span>
                  <h2>{t("Map & location", "Mapa y ubicación")}</h2>
                  <p>
                    {t(
                      "World uses foreground GPS. Drag to rotate; pinch to zoom. Visits are not verified here.",
                      "World usa GPS en primer plano. Arrastra para girar; pellizca para ampliar. Aquí no se verifican visitas.",
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
                if (position.current) void requestVenues(position.current);
              }}
            >
              {t("Refresh nearby places", "Actualizar lugares")}
            </button>
            <div className={styles.venueList}>
              {orderedVenues.map((venue) => (
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
