"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import styles from "./CityStories.module.css";
import Image from "next/image";
import cityPhotos from "@/lib/city-photos.json";
const landmarkPhotos: Record<
  string,
  (typeof cityPhotos)[keyof typeof cityPhotos]
> = cityPhotos;

import type { StoryCity, CityStory } from "@/lib/community-stories/contracts";
type City = StoryCity;
type Story = CityStory;
function cityName(city: City, es: boolean) {
  return (
    (es ? city.nameEs : city.nameEn)?.trim() || city.nameEs.trim() || city.slug
  );
}
const distance = (a: { latitude: number; longitude: number }, b: City) => {
  const rad = Math.PI / 180;
  const x =
    Math.sin(((b.latitude - a.latitude) * rad) / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(((b.longitude - a.longitude) * rad) / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};
export function rankStoryCities(
  cities: City[],
  location: { latitude: number; longitude: number } | null,
) {
  const nearest = location
    ? [...cities]
        .sort(
          (a, b) =>
            distance(location, a) - distance(location, b) ||
            a.slug.localeCompare(b.slug),
        )
        .slice(0, 3)
    : [];
  const active = [...cities]
    .filter((c) => c.approvedStories24h > 0)
    .sort(
      (a, b) =>
        b.approvedStories24h - a.approvedStories24h ||
        a.slug.localeCompare(b.slug),
    )
    .slice(0, 3);
  return [...new Map([...nearest, ...active].map((c) => [c.slug, c])).values()];
}

export function CityStories({
  locale,
  initialCenter = { latitude: 36.7213, longitude: -4.4214 },
  areaLabel = "Costa del Sol",
  leadingContent,
}: {
  locale: "en" | "es";
  initialCenter?: { latitude: number; longitude: number };
  areaLabel?: string;
  leadingContent?: ReactNode;
}) {
  const es = locale === "es";
  const [cities, setCities] = useState<City[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    "loading",
  );
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [geoMessage, setGeoMessage] = useState("");
  const [selected, setSelected] = useState<City | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [viewerStatus, setViewerStatus] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportState, setReportState] = useState<
    "idle" | "sending" | "sent" | "signin" | "error" | "limited"
  >("idle");
  const reportRequest = useRef(0);
  useEffect(() => {
    reportRequest.current++;
    setReportOpen(false);
    setReportReason("");
    setReportState("idle");
  }, [selected, index]);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const touch = useRef<number | null>(null);
  async function loadCities() {
    setStatus("loading");
    try {
      const response = await fetch("/api/community/stories/cities", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("unavailable");
      const data = await response.json();
      if (!data.available || !Array.isArray(data.cities))
        throw new Error("unavailable");
      setCities(data.cities);
      setStatus("ready");
    } catch {
      setStatus("unavailable");
    }
  }
  useEffect(() => {
    void loadCities();
  }, []);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setViewerStatus("loading");
    setStories([]);
    setIndex(0);
    setPaused(false);
    dialog.current?.showModal();
    void (async () => {
      try {
        const response = await fetch(
          `/api/community/stories?city=${encodeURIComponent(selected.slug)}`,
          {
            signal: controller.signal,
            credentials: "same-origin",
            cache: "no-store",
          },
        );
        if (!response.ok) throw new Error("unavailable");
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (!data.available || !Array.isArray(data.stories))
          throw new Error("unavailable");
        setStories(
          data.stories.filter(
            (story: Story) =>
              story.citySlug === selected.slug &&
              Date.parse(story.expiresAt) > Date.now() &&
              story.mediaUrl ===
                `/api/community/stories/${encodeURIComponent(story.id)}/media`,
          ),
        );
        setViewerStatus("ready");
      } catch {
        if (!controller.signal.aborted) setViewerStatus("unavailable");
      }
    })();
    return () => controller.abort();
  }, [selected]);
  function close() {
    dialog.current?.close();
    setSelected(null);
    opener.current?.focus();
  }
  function locate() {
    if (!navigator.geolocation) {
      setGeoMessage(
        es ? "La ubicación no está disponible." : "Location is unavailable.",
      );
      return;
    }
    setGeoMessage(
      es ? "Buscando ciudades cercanas…" : "Finding nearby cities…",
    );
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setGeoMessage(
          es
            ? "La ubicación se usa solo en este dispositivo."
            : "Location is used only on this device.",
        );
      },
      () =>
        setGeoMessage(
          es
            ? "No se compartió tu ubicación. Puedes explorar las ciudades activas."
            : "Location was not shared. You can explore active cities.",
        ),
      { maximumAge: 60000, timeout: 10000 },
    );
  }
  const ranked = rankStoryCities(cities, location || initialCenter);
  const story = stories[index];
  async function reportStory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!story || !reportReason || reportState === "sending") return;
    const request = ++reportRequest.current;
    setReportState("sending");
    try {
      const response = await fetch(
        `/api/community/stories/${encodeURIComponent(story.id)}/report`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reportReason }),
        },
      );
      if (request !== reportRequest.current) return;
      if (response.status === 401) {
        setReportState("signin");
        return;
      }
      if (response.status === 429) {
        setReportState("limited");
        return;
      }
      if (!response.ok || (await response.json()).reported !== true)
        throw new Error("report-failed");
      if (request !== reportRequest.current) return;
      setReportState("sent");
    } catch {
      if (request !== reportRequest.current) return;
      setReportState("error");
    }
  }
  return (
    <section
      className={styles.section}
      aria-label={es ? "Historias de ciudades" : "City stories"}
    >
      <header>
        <div>
          <h2>{es ? "Historias" : "City stories"}</h2>
          <span className={styles.area}>
            {location
              ? es
                ? "Ubicación compartida"
                : "Shared location"
              : areaLabel}{" "}
            · 24 h
          </span>
        </div>
        <button onClick={locate}>
          {es ? "Usar mi ubicación" : "Use my location"}
        </button>
      </header>
      {geoMessage && <p role="status">{geoMessage}</p>}
      {status === "loading" && (
        <p role="status">{es ? "Cargando historias…" : "Loading stories…"}</p>
      )}
      {status === "unavailable" && (
        <p role="status">
          {es
            ? "Las historias no están disponibles ahora."
            : "Stories are unavailable right now."}{" "}
          <button onClick={() => void loadCities()}>
            {es ? "Reintentar" : "Retry"}
          </button>
        </p>
      )}
      {status !== "ready" && leadingContent && (
        <div className={styles.row}>{leadingContent}</div>
      )}
      {status === "ready" && (
        <>
          <div className={styles.row}>
            {leadingContent}
            {ranked.map((city) => (
              <button
                key={city.slug}
                className={styles.city}
                onClick={(e) => {
                  opener.current = e.currentTarget;
                  setSelected(city);
                }}
              >
                <span
                  className={`${styles.ring} ${city.approvedStories24h === 0 ? styles.emptyRing : ""}`}
                  aria-hidden="true"
                >
                  {landmarkPhotos[city.slug] ? (
                    <Image
                      src={landmarkPhotos[city.slug].src}
                      alt=""
                      width={68}
                      height={68}
                      unoptimized
                    />
                  ) : (
                    cityName(city, es).slice(0, 1)
                  )}
                </span>
                <strong>{cityName(city, es)}</strong>
                <small>
                  {city.approvedStories24h > 0
                    ? `${city.approvedStories24h} ${es ? (city.approvedStories24h === 1 ? "historia" : "historias") : city.approvedStories24h === 1 ? "story" : "stories"}`
                    : es
                      ? "Sin historias todavía"
                      : "No stories yet"}
                </small>
              </button>
            ))}
          </div>
          {ranked.some((city) => landmarkPhotos[city.slug]) && (
            <details className={styles.credits}>
              <summary>
                {es
                  ? "Fotos de ciudades · créditos"
                  : "City landmark photos · credits"}
              </summary>
              {ranked
                .filter((city) => landmarkPhotos[city.slug])
                .map((city) => {
                  const photo = landmarkPhotos[city.slug];
                  return (
                    <p key={city.slug}>
                      {cityName(city, es)}:{" "}
                      <a href={photo.source} target="_blank" rel="noreferrer">
                        {photo.title}
                      </a>{" "}
                      · {photo.credit} ·{" "}
                      <a
                        href={photo.licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {photo.license}
                      </a>{" "}
                      · {photo.changes}
                    </p>
                  );
                })}
            </details>
          )}
          {ranked.length === 0 && (
            <p>
              {es
                ? "Todavía no hay historias públicas de las últimas 24 horas. Elige ciudades cercanas o comparte un momento después de un check-in verificado."
                : "No public stories from the last 24 hours yet. Choose nearby cities or share a moment after a verified check-in."}
            </p>
          )}
        </>
      )}
      <dialog
        ref={dialog}
        className={styles.viewer}
        aria-labelledby="city-story-title"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onKeyDown={(e) => {
          if (!paused && e.key === "ArrowRight") {
            e.preventDefault();
            setIndex((i) => Math.min(stories.length - 1, i + 1));
          }
          if (!paused && e.key === "ArrowLeft") {
            e.preventDefault();
            setIndex((i) => Math.max(0, i - 1));
          }
        }}
      >
        <header>
          <h2 id="city-story-title">
            {selected ? cityName(selected, es) : ""}
          </h2>
          <button
            onClick={close}
            aria-label={es ? "Cerrar historias" : "Close stories"}
          >
            ×
          </button>
        </header>
        {viewerStatus === "loading" && (
          <p role="status">{es ? "Cargando historias…" : "Loading stories…"}</p>
        )}
        {viewerStatus === "unavailable" && (
          <p role="status">
            {es
              ? "No se pudieron cargar las historias. Cierra y vuelve a intentarlo."
              : "Stories could not load. Close and try again."}
          </p>
        )}
        {viewerStatus === "ready" && !story && (
          <div className={styles.empty}>
            <h3>
              {es
                ? "El próximo momento puede ser tuyo"
                : "The next moment could be yours"}
            </h3>
            <p>
              {es
                ? "Aún no hay historias públicas recientes en esta ciudad. Solo se comparten momentos reales tras un check-in verificado."
                : "No recent public stories in this city yet. Only real moments after verified check-ins are shared."}
            </p>
            <a href={`/${locale}/check-in`}>
              {es ? "Hacer check-in" : "Check in"}
            </a>
          </div>
        )}
        {story && (
          <>
            <div
              className={styles.media}
              onTouchStart={(e) => {
                touch.current = e.changedTouches[0].clientX;
              }}
              onTouchEnd={(e) => {
                const start = touch.current;
                touch.current = null;
                const delta =
                  start === null ? 0 : e.changedTouches[0].clientX - start;
                if (!paused && Math.abs(delta) > 50) {
                  const direction = delta < 0 ? 1 : -1;
                  setIndex((i) =>
                    Math.max(0, Math.min(stories.length - 1, i + direction)),
                  );
                }
              }}
            >
              <Image
                src={story.mediaUrl}
                width={720}
                height={960}
                unoptimized
                alt={
                  story.caption ||
                  (es ? "Momento compartido en " : "Shared moment at ") +
                    story.venueName
                }
              />
              <div className={styles.caption}>
                <strong>{story.venueName}</strong>
                <p>{story.caption}</p>
              </div>
            </div>
            <p aria-live="polite">
              {index + 1} / {stories.length}
            </p>
            <nav aria-label={es ? "Controles de historias" : "Story controls"}>
              <button
                disabled={paused || index === 0}
                onClick={() => setIndex((i) => i - 1)}
              >
                {es ? "Anterior" : "Previous"}
              </button>
              <button
                aria-pressed={paused}
                onClick={() => setPaused((p) => !p)}
              >
                {paused
                  ? es
                    ? "Continuar"
                    : "Resume"
                  : es
                    ? "Pausar"
                    : "Pause"}
              </button>
              <button
                disabled={paused || index === stories.length - 1}
                onClick={() => setIndex((i) => i + 1)}
              >
                {es ? "Siguiente" : "Next"}
              </button>
            </nav>
            <button
              onClick={() => {
                setReportOpen(true);
                setPaused(true);
              }}
            >
              {es ? "Denunciar historia" : "Report story"}
            </button>
            {reportOpen && (
              <form className={styles.report} onSubmit={reportStory}>
                <label htmlFor="city-story-report-reason">
                  {es ? "Motivo de la denuncia" : "Report reason"}
                </label>
                <select
                  id="city-story-report-reason"
                  required
                  value={reportReason}
                  disabled={reportState === "sending" || reportState === "sent"}
                  onChange={(event) => setReportReason(event.target.value)}
                >
                  <option value="">
                    {es ? "Selecciona un motivo" : "Choose a reason"}
                  </option>
                  <option value="unsafe">
                    {es ? "Contenido inseguro" : "Unsafe content"}
                  </option>
                  <option value="privacy">
                    {es ? "Problema de privacidad" : "Privacy concern"}
                  </option>
                  <option value="misleading">
                    {es ? "Contenido engañoso" : "Misleading content"}
                  </option>
                  <option value="other">
                    {es ? "Otro motivo" : "Other concern"}
                  </option>
                </select>
                <button
                  type="submit"
                  disabled={
                    !reportReason ||
                    reportState === "sending" ||
                    reportState === "sent"
                  }
                >
                  {reportState === "sending"
                    ? es
                      ? "Enviando…"
                      : "Sending…"
                    : es
                      ? "Enviar denuncia"
                      : "Send report"}
                </button>
                {reportState === "sent" && (
                  <p role="status">
                    {es
                      ? "Denuncia recibida. Nuestro equipo la revisará."
                      : "Report received. Our team will review it."}
                  </p>
                )}
                {reportState === "signin" && (
                  <p role="alert">
                    {es
                      ? "Inicia sesión para enviar una denuncia."
                      : "Sign in to send a report."}{" "}
                    <a
                      href={`/${locale}/auth?next=${encodeURIComponent(`/${locale}/community`)}`}
                    >
                      {es ? "Iniciar sesión" : "Sign in"}
                    </a>
                  </p>
                )}
                {reportState === "limited" && (
                  <p role="alert">
                    {es
                      ? "Has alcanzado el límite de denuncias de hoy. Inténtalo mañana."
                      : "Today's report limit has been reached. Try again tomorrow."}
                  </p>
                )}
                {reportState === "error" && (
                  <p role="alert">
                    {es
                      ? "No se pudo enviar la denuncia. Puedes volver a intentarlo."
                      : "The report could not be sent. You can try again."}
                  </p>
                )}
              </form>
            )}
            <p className={styles.note}>
              {es
                ? "Avanza a tu ritmo. Las historias no cambian automáticamente."
                : "Move at your own pace. Stories never advance automatically."}
            </p>
          </>
        )}
      </dialog>
    </section>
  );
}
