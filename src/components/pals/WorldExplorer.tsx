"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Appearance } from "@/lib/pals/avatar-v2";
import { coarseWorldCell, normalizeWorldVenues, WORLD_START, type WorldVenue } from "@/lib/pals/world";
import styles from "./WorldExplorer.module.css";

type Coordinates = { latitude: number; longitude: number };
type Maplibre = typeof import("maplibre-gl");
type MapInstance = import("maplibre-gl").Map;
type Marker = import("maplibre-gl").Marker;
type WorldStage = {
  setAppearance(appearance: Appearance): Promise<void>;
  setMotion?(motion: { walking: boolean; headingDegrees?: number }): void;
  dispose(): void;
};
type AvatarRuntime = { mount(element: HTMLElement, options?: { mode?: "world" }): WorldStage };

function distanceMetres(a: Coordinates, b: Coordinates): number {
  const radians = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * radians;
  const dLng = (b.longitude - a.longitude) * radians;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) *
    Math.sin(dLng / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(x)));
}
function distanceLabel(metres: number) {
  return metres < 950 ? Math.max(0, Math.round(metres / 10) * 10) + " m" :
    (metres / 1000).toFixed(1) + " km";
}
function makeMarker(venue: WorldVenue, onSelect: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = styles.venuePin;
  button.title = venue.name;
  button.setAttribute("aria-label", "Explore " + venue.name);
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

export function WorldExplorer({ styleUrl }: { styleUrl: string }) {
  const mapNode = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const lib = useRef<Maplibre | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const avatarMarker = useRef<Marker | null>(null);
  const avatarStage = useRef<WorldStage | null>(null);
  const avatarLabel = useRef<HTMLSpanElement | null>(null);
  const gpsWatch = useRef<number | null>(null);
  const lastGPS = useRef<Coordinates | null>(null);
  const position = useRef<Coordinates | null>(null);
  const lastCell = useRef<string | null>(null);
  const fetchSerial = useRef(0);
  const tracking = useRef(false);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("Preview mode · no location access");
  const [venues, setVenues] = useState<WorldVenue[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [worldStatus, setWorldStatus] = useState("Loading real places…");
  const [mapError, setMapError] = useState(false);

  const center = useMemo(() => position.current || WORLD_START, [gpsActive, venues]);
  const orderedVenues = useMemo(() => [...venues].sort((a, b) =>
    distanceMetres(center, a) - distanceMetres(center, b)), [center, venues]);
  const selected = venues.find((v) => v.id === selectedId) || null;

  const requestVenues = useCallback(async (at: Coordinates) => {
    const cell = coarseWorldCell(at.latitude, at.longitude);
    if (!cell) return;
    const key = cell.latitude + "/" + cell.longitude;
    if (lastCell.current === key) return;
    lastCell.current = key;
    const seq = ++fetchSerial.current;
    setWorldStatus("Looking for real venues nearby…");
    try {
      const url = "/pals/world/venues?lat=" + cell.latitude + "&lng=" + cell.longitude;
      const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("Unavailable");
      const result: unknown = await response.json();
      const data = result && typeof result === "object" ? result as { venues?: unknown; truncated?: boolean } : {};
      const next = normalizeWorldVenues(data.venues);
      if (seq !== fetchSerial.current) return;
      setVenues(next);
      setSelectedId((current) => next.some((venue) => venue.id === current) ? current : null);
      setWorldStatus(next.length ?
        (data.truncated ? "Showing the first nearby places. More are available on the ordinary map." : "Tap a glowing venue to explore.") :
        "No published venues returned for this area. Move the map to explore.");
    } catch {
      if (seq === fetchSerial.current) {
        lastCell.current = null;
        setWorldStatus("Venue feed unavailable. The map still works; try moving it.");
      }
    }
  }, []);

  // This is the existing first-party 3D studio runtime, re-mounted as a
  // lightweight map character. Do not create a second avatar identity.
  useEffect(() => {
    let cancelled = false;
    let script: HTMLScriptElement | null = null;
    const start = async () => {
      const target = document.querySelector<HTMLElement>("[data-pals-world-avatar]");
      if (!target) return;
      try {
        const response = await fetch("/pals/identity", { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) return;
        const json = await response.json() as { appearance?: Appearance };
        if (!json.appearance || cancelled) return;
        const win = window as Window & { AkiPals3D?: AvatarRuntime };
        if (!win.AkiPals3D) {
          script = document.createElement("script");
          script.src = "/pals/runtime/creator.min.js";
          script.async = true;
          const loading = new Promise<void>((resolve, reject) => {
            if (!script) return reject(new Error("No script"));
            script.addEventListener("load", () => resolve(), { once: true });
            script.addEventListener("error", () => reject(new Error("3D runtime unavailable")), { once: true });
          });
          document.head.appendChild(script);
          await loading;
        }
        if (cancelled || !win.AkiPals3D || !target.isConnected) return;
        const stage = win.AkiPals3D.mount(target, { mode: "world" });
        avatarStage.current = stage;
        await stage.setAppearance(json.appearance);
      } catch {
        // Show the explicit avatar fallback; the map must not fail due to WebGL.
      }
    };
    void start();
    return () => {
      cancelled = true;
      avatarStage.current?.dispose();
      avatarStage.current = null;
      script?.remove();
    };
  }, [mapError]);

  useEffect(() => {
    if (!mapNode.current) return;
    let removed = false;
    let localMap: MapInstance | null = null;
    void import("maplibre-gl").then((maplibre) => {
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
      nextMap.addControl(new maplibre.AttributionControl({ compact: true }), "bottom-right");
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
                "fill-extrusion-height": ["coalesce", ["get", "render_height"], ["get", "height"], 8],
                "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
                "fill-extrusion-opacity": 0.73,
              },
            });
          } catch { /* Source layer not available in this tile configuration. */ }
        }
        void requestVenues(WORLD_START);
      });
      nextMap.on("moveend", () => {
        if (removed) return;
        const at = nextMap.getCenter();
        void requestVenues({ latitude: at.lat, longitude: at.lng });
      });
      const pal = document.createElement("div");
      pal.className = styles.avatarPin;
      pal.setAttribute("aria-label", "Your AkiPal game character");
      const canvas = document.createElement("div");
      canvas.className = styles.avatarCanvas;
      canvas.dataset.palsWorldAvatar = "true";
      const fallback = document.createElement("div");
      fallback.className = styles.avatarFallback;
      fallback.textContent = "🧍";
      canvas.append(fallback);
      const label = document.createElement("span");
      label.textContent = "Preview avatar";
      avatarLabel.current = label;
      pal.append(canvas, label);
      avatarMarker.current = new maplibre.Marker({ element: pal, anchor: "bottom" })
        .setLngLat([WORLD_START.longitude, WORLD_START.latitude])
        .addTo(nextMap);
      // Wake avatar loading after the marker is connected to the document.
      window.dispatchEvent(new Event("akipals:world-map-ready"));
    }).catch(() => { if (!removed) setMapError(true); });
    return () => {
      removed = true;
      fetchSerial.current += 1;
      markers.current.forEach((marker) => marker.remove());
      markers.current.clear();
      avatarMarker.current?.remove();
      avatarMarker.current = null;
      avatarLabel.current = null;
      localMap?.remove();
      if (map.current === localMap) map.current = null;
    };
  }, [requestVenues, styleUrl]);

  // Render pins from the existing public venue discovery source, not fake
  // popularity, hard-coded businesses or unverified live-event counts.
  useEffect(() => {
    if (!map.current || !lib.current) return;
    markers.current.forEach((marker) => marker.remove());
    markers.current.clear();
    for (const venue of venues) {
      const element = makeMarker(venue, () => setSelectedId(venue.id));
      if (venue.id === selectedId) element.classList.add(styles.venuePinActive);
      markers.current.set(venue.id, new lib.current.Marker({ element, anchor: "bottom" })
        .setLngLat([venue.longitude, venue.latitude])
        .addTo(map.current));
    }
    return () => {
      markers.current.forEach((marker) => marker.remove());
      markers.current.clear();
    };
  }, [venues, selectedId]);

  const stopGPS = useCallback(() => {
    if (gpsWatch.current !== null) navigator.geolocation.clearWatch(gpsWatch.current);
    gpsWatch.current = null;
    tracking.current = false;
    lastGPS.current = null;
    position.current = null;
    setGpsActive(false);
    setGpsStatus("Location off · not shared with anyone");
    avatarStage.current?.setMotion?.({ walking: false });
    if (map.current) {
      const c = map.current.getCenter();
      avatarMarker.current?.setLngLat([c.lng, c.lat]);
    }
    if (avatarLabel.current) avatarLabel.current.textContent = "Preview avatar";
  }, []);

  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus("This browser does not support location.");
      return;
    }
    if (gpsWatch.current !== null) return;
    setGpsStatus("Waiting for device location permission…");
    gpsWatch.current = navigator.geolocation.watchPosition(
      (sample) => {
        if (!tracking.current && gpsWatch.current === null) return;
        const { latitude, longitude, accuracy, heading, speed } = sample.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !coarseWorldCell(latitude, longitude)) return;
        const next = { latitude, longitude };
        const previous = lastGPS.current;
        lastGPS.current = next;
        position.current = next;
        tracking.current = true;
        setGpsActive(true);
        setGpsStatus(accuracy > 100 ?
          "GPS weak (±" + Math.round(accuracy) + " m). Avatar position is approximate." :
          "Following you · ±" + Math.round(accuracy) + " m accuracy · private to this screen");
        avatarMarker.current?.setLngLat([longitude, latitude]);
        if (avatarLabel.current) avatarLabel.current.textContent = "You · private";
        if (map.current) {
          map.current.easeTo({ center: [longitude, latitude], zoom: Math.max(16.4, map.current.getZoom()), duration: 650 });
        }
        const walking = typeof speed === "number" && Number.isFinite(speed) ?
          speed > 0.45 && speed < 4 :
          previous ? distanceMetres(previous, next) > Math.max(accuracy, 6) : false;
        avatarStage.current?.setMotion?.({
          walking,
          headingDegrees: Number.isFinite(heading) && heading !== null ? heading : undefined,
        });
        void requestVenues(next);
      },
      (error) => {
        stopGPS();
        setGpsStatus(error.code === 1 ? "Location denied. Preview still works." :
          "Could not get a reliable position. Try again when you have signal.");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 18000 },
    );
    tracking.current = true;
  }, [requestVenues, stopGPS]);

  useEffect(() => {
    const onHidden = () => { if (document.hidden && gpsWatch.current !== null) stopGPS(); };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      if (gpsWatch.current !== null) navigator.geolocation.clearWatch(gpsWatch.current);
      gpsWatch.current = null;
    };
  }, [stopGPS]);

  const focusVenue = useCallback((venue: WorldVenue) => {
    setSelectedId(venue.id);
    map.current?.flyTo({ center: [venue.longitude, venue.latitude], zoom: Math.max(16.2, map.current.getZoom()), duration: 550 });
  }, []);

  const zoom = (amount: number) => { map.current?.zoomTo((map.current?.getZoom() || 15) + amount, { duration: 300 }); };
  const selectedDistance = selected ? distanceMetres(position.current || WORLD_START, selected) : null;

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <a className={styles.brand} href="/pals/world">Aki<span>Pals.</span></a>
        <span className={styles.topTag}><i aria-hidden="true" /> Private game prototype</span>
      </header>
      <div className={styles.layout}>
        <section className={styles.world} aria-label="AkiPals interactive exploration map">
          <div className={styles.map} ref={mapNode} aria-label="Tilted map with real nearby AkiPasa venues" />
          <div className={styles.topbar}>
            <span className={styles.tag}>✦ <strong>AkiWorld</strong> · Explore the real world</span>
            <div className={styles.mapTools}>
              <button type="button" className={styles.iconButton} onClick={() => zoom(1)} aria-label="Zoom in">+</button>
              <button type="button" className={styles.iconButton} onClick={() => zoom(-1)} aria-label="Zoom out">−</button>
            </div>
          </div>
          <div className={styles.tourCard}>
            {selected ? (
              <>
                <span className={styles.eyebrow}>✦ Nearby discovery · real listing</span>
                <h2>{selected.name}</h2>
                <p>{selectedDistance === null ? "Explore this location on the map." :
                  (gpsActive ? "About " : "From preview center: ") + distanceLabel(selectedDistance)}
                  {" · "}{selected.claimStatus === "claimed" ? "Claimed listing" : "Unclaimed listing"}
                </p>
                <div className={styles.ctas}>
                  <button type="button" className={styles.primary} onClick={() => setSelectedId(null)}>Back to AkiWorld</button>
                  <button type="button" className={styles.secondary} onClick={() => focusVenue(selected)}>Show on map</button>
                </div>
              </>
            ) : (
              <>
                <span className={styles.eyebrow}>{gpsActive ? "✦ Your live position" : "✦ Demo start · Fuengirola"}</span>
                <h2>Your city. Your adventure.</h2>
                <p>Explore nearby venues with your own 3D AkiPal. AR hunts, crew quests and real-world stamps are upcoming features.</p>
                <div className={styles.ctas}>
                  <button type="button" className={styles.primary} onClick={gpsActive ? stopGPS : startGPS}>
                    {gpsActive ? "Stop following me" : "Make my Pal follow me ↗"}
                  </button>
                  <a className={styles.secondary} href="/pals">Open Wardrobe ↗</a>
                </div>
              </>
            )}
          </div>
        </section>
        <aside className={styles.side}>
          <div className={styles.intro}>
            <span className={styles.eyebrow}>BE YOU. GO PLACES.</span>
            <h1>Go out.<br />Level up life.</h1>
            <p className={styles.muted}>The start of a game where exploring actual places will eventually unlock experiences, stamps and avatar styles.</p>
          </div>
          <nav className={styles.nav} aria-label="AkiPals areas">
            <a href="/pals/world" className={styles.active} aria-current="page">◉ World</a>
            <a href="/pals">♧ Wardrobe</a>
            <button type="button" disabled title="Passport quests are not connected yet">◎ Passport · Soon</button>
            <button type="button" disabled title="Crew gameplay is planned">♧ Crews · Soon</button>
          </nav>
          <section className={styles.panel} aria-label="Private map controls">
            <span className={styles.eyebrow}>YOUR ADVENTURE</span>
            <h2>{gpsActive ? "Walking the world" : "Explore before you go"}</h2>
            <p>{gpsStatus}</p>
            <div className={styles.stat}><span>Real venue listings</span><strong>{venues.length}</strong></div>
            <div className={styles.stat}><span>AR stamps</span><strong>Not live</strong></div>
            <div className={styles.stat}><span>Check-ins and rewards</span><strong>Not live</strong></div>
          </section>
          <section className={styles.panel} aria-label="Nearby venue list">
            <span className={styles.eyebrow}>REAL PLACES, NO FAKE ACTIVITY</span>
            <h2>Places to discover</h2>
            <p className={styles.status} role="status">{worldStatus}</p>
            <div className={styles.venueList}>
              {orderedVenues.slice(0, 12).map((venue) => (
                <button key={venue.id} type="button" onClick={() => focusVenue(venue)}
                  className={styles.venueRow + (venue.id === selectedId ? " " + styles.venueRowActive : "")}>
                  <span className={styles.venueRowIcon}>✦</span>
                  <span style={{ minWidth: 0 }}>
                    <span className={styles.venueRowName}>{venue.name}</span>
                    <span className={styles.venueRowMeta}>{distanceLabel(distanceMetres(center, venue))} · {venue.claimStatus === "claimed" ? "Claimed" : "Unclaimed"}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
          <p className={styles.tip}>Your position stays in this browser session. GPS only starts when you tap the button, and automatically stops in the background. Nearby venue queries use a coarse map cell; there is no public location sharing, automatic filming, spatial capture, earned XP or verification yet.</p>
        </aside>
      </div>
      <nav className={styles.bottomNav} aria-label="AkiPals mobile tabs">
        <a href="/pals/world" className={styles.active} aria-current="page">◉<span>World</span></a>
        <a href="/pals">♧<span>Wardrobe</span></a>
        <button type="button" disabled>◎<span>Passport soon</span></button>
        <button type="button" disabled>✧<span>Hunts soon</span></button>
      </nav>
      {mapError && <span role="status" className={styles.status}>Map tiles could not load on this device. Please retry when connected.</span>}
    </main>
  );
}
