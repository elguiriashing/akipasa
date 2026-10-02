"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { majorCities, cityDiscoveryHref } from "@/lib/city-discovery";
import type { Locale } from "@/lib/config";
import { foilProperties, foilTarget } from "@/lib/passport-holo";
import {
  readMotionPreference,
  writeMotionPreference,
  motionPreferenceEvent,
  motionPermissionEvent,
  requestPassportMotion,
  type MotionEventType,
} from "@/lib/passport-motion";
import styles from "./PassportBook.module.css";

const cities = [...majorCities].sort((a, b) => a.es.localeCompare(b.es, "es"));
const chapters = [
  "cover",
  "index",
  "progress",
  "passports",
  "stamps",
  "badges",
];

export function PassportBook({
  locale,
  initialView,
  signedIn,
  totalXp,
  totalStamps,
  notices,
  progress,
  routes,
  stamps,
  badges,
}: {
  locale: Locale;
  initialView: string;
  signedIn: boolean;
  totalXp: number;
  totalStamps: number;
  notices: ReactNode;
  progress: ReactNode;
  routes: ReactNode;
  stamps: ReactNode;
  badges: ReactNode;
}) {
  const es = locale === "es";
  const labels = es
    ? ["Portada", "Índice", "Mi viaje", "Rutas", "Sellos", "Insignias"]
    : ["Cover", "Index", "My journey", "Routes", "Stamps", "Badges"];
  const [page, setPage] = useState(Math.max(0, chapters.indexOf(initialView)));
  const [direction, setDirection] = useState(1);
  const [search, setSearch] = useState("");
  const [motion, setMotion] = useState(false);
  const [status, setStatus] = useState("");
  const [reduced, setReduced] = useState(false);
  const [shine, setShine] = useState(true);
  const surface = useRef<HTMLDivElement>(null);
  const pageHeading = useRef<HTMLHeadingElement>(null);
  const firstPage = useRef(true);
  const origin = useRef<{ beta: number; gamma: number } | null>(null);
  const latest = useRef<{ beta: number; gamma: number } | null>(null);
  const target = useRef({ x: 0, y: 0 });
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const total = chapters.length + cities.length;
  const city = page >= chapters.length ? cities[page - chapters.length] : null;
  const title = city ? city[locale] : labels[page];
  const go = useCallback(
    (next: number) => {
      const bounded = Math.max(0, Math.min(total - 1, next));
      setDirection(bounded >= page ? 1 : -1);
      setPage(bounded);
      target.current = { x: 0, y: 0 };
    },
    [page, total],
  );

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduced(media.matches);
      if (media.matches) setMotion(false);
    };
    update();
    const start = () => {
      if (
        !media.matches &&
        window.isSecureContext &&
        window.DeviceOrientationEvent &&
        readMotionPreference() !== false
      )
        setMotion(true);
    };
    const preference = (event: Event) => {
      if ((event as CustomEvent<boolean>).detail) start();
      else {
        setMotion(false);
        target.current = { x: 0, y: 0 };
      }
    };
    const permission = (event: Event) => {
      if ((event as CustomEvent<boolean>).detail) start();
      else setMotion(false);
    };
    start();
    media.addEventListener("change", update);
    window.addEventListener(motionPreferenceEvent, preference);
    window.addEventListener(motionPermissionEvent, permission);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener(motionPreferenceEvent, preference);
      window.removeEventListener(motionPermissionEvent, permission);
    };
  }, []);
  useEffect(() => {
    if (firstPage.current) {
      firstPage.current = false;
      return;
    }
    pageHeading.current?.focus({ preventScroll: true });
  }, [page]);
  useEffect(() => {
    if (reduced || !shine) {
      surface.current?.style.setProperty("--rx", "0deg");
      surface.current?.style.setProperty("--ry", "0deg");
      return;
    }
    let frame = 0,
      last = 0,
      x = 0,
      y = 0;
    const render = (now: number) => {
      const t = 1 - Math.exp(-Math.min(last ? now - last : 16, 64) / 85);
      x += (target.current.x - x) * t;
      y += (target.current.y - y) * t;
      for (const [key, value] of Object.entries(foilProperties(x, y)))
        surface.current?.style.setProperty(key, value);
      last = now;
      frame = requestAnimationFrame(render);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) {
        last = 0;
        frame = requestAnimationFrame(render);
      }
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [page, city, reduced, shine]);
  useEffect(() => {
    if (!motion || reduced || !shine) return;
    let received = false;
    const listener = (event: DeviceOrientationEvent) => {
      if (
        event.beta === null ||
        event.gamma === null ||
        !Number.isFinite(event.beta) ||
        !Number.isFinite(event.gamma)
      )
        return;
      latest.current = { beta: event.beta, gamma: event.gamma };
      if (!origin.current) origin.current = latest.current;
      target.current = foilTarget(
        event.beta,
        event.gamma,
        origin.current,
        screen.orientation?.angle || 0,
      );
      if (!received) {
        received = true;
        setStatus(
          es
            ? "Inclina suavemente. La luz sigue tu móvil."
            : "Tilt gently. The light follows your phone.",
        );
      }
    };
    const recenter = () => {
      origin.current = null;
    };
    window.addEventListener("deviceorientation", listener);
    screen.orientation?.addEventListener("change", recenter);
    const timer = setTimeout(() => {
      if (!received) {
        setMotion(false);
        setStatus(
          (window.DeviceOrientationEvent as MotionEventType)?.requestPermission
            ? es
              ? "Activa la inclinación para permitir el acceso al movimiento."
              : "Enable tilt to allow motion access."
            : es
              ? "No se recibió movimiento. Puedes tocar la foto para mover la luz."
              : "No motion received. Touch the photo to move the light.",
        );
      }
    }, 3500);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("deviceorientation", listener);
      screen.orientation?.removeEventListener("change", recenter);
    };
  }, [motion, reduced, shine, es]);
  async function enableMotion() {
    if (motion) {
      writeMotionPreference(false);
      setMotion(false);
      target.current = { x: 0, y: 0 };
      setStatus("");
      return;
    }
    try {
      if (!(await requestPassportMotion())) throw new Error("denied");
      writeMotionPreference(true);
      origin.current = null;
      latest.current = null;
      setMotion(true);
      setStatus(
        es
          ? "Esperando al sensor del móvil…"
          : "Waiting for your phone’s motion sensor…",
      );
    } catch {
      setMotion(false);
      setStatus(
        es
          ? "Movimiento no disponible. Puedes mover la luz tocando la foto."
          : "Motion unavailable. You can move the light by touching the photo.",
      );
    }
  }
  const layers = (
    <>
      <span className={styles.foil} />
      <span className={styles.microfoil} />
      <span className={styles.glare} />
      <span className={styles.secret} aria-hidden="true">
        <b>
          aki<span>pasa</span>
        </b>
        <small>EXPLORER / ESPAÑA</small>
      </span>
    </>
  );
  return (
    <main
      className={styles.atlas}
      aria-label={es ? "Pasaporte interactivo" : "Interactive passport"}
    >
      <header className={styles.intro}>
        <div>
          <span className={styles.eyebrow}>AKIPASA / EXPLORER COLLECTION</span>
          <h1>
            {es
              ? "Tu mundo, página a página."
              : "Your world, one page at a time."}
          </h1>
          <p>
            {es
              ? "Abre tu pasaporte. Encuentra tu próxima historia."
              : "Open your passport. Find your next story."}
          </p>
        </div>
        <span className={styles.edition}>
          ESPAÑA
          <br />
          <b>01 / ∞</b>
        </span>
      </header>
      <div className={styles.notices}>{notices}</div>
      <div className={styles.desk}>
        <nav
          className={styles.bookmarks}
          aria-label={es ? "Capítulos del pasaporte" : "Passport chapters"}
        >
          {labels.map((label, i) => (
            <button
              key={label}
              onClick={() => go(i)}
              aria-current={page === i ? "page" : undefined}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {label}
            </button>
          ))}
        </nav>
        <div
          className={styles.book}
          data-tilt={motion ? "on" : "off"}
          data-direction={direction}
          data-motion={reduced ? "off" : "on"}
          onKeyDown={(event) => {
            if (
              (event.target as HTMLElement).closest(
                "input,select,textarea,button,a",
              )
            )
              return;
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
              event.preventDefault();
              go(page + (event.key === "ArrowRight" ? 1 : -1));
            }
          }}
          onTouchStart={(event) => {
            if (
              (event.target as HTMLElement).closest(
                "input,select,textarea,button,a",
              )
            )
              return;
            swipe.current = {
              x: event.touches[0].clientX,
              y: event.touches[0].clientY,
            };
          }}
          onTouchEnd={(event) => {
            if (!swipe.current) return;
            const dx = event.changedTouches[0].clientX - swipe.current.x,
              dy = event.changedTouches[0].clientY - swipe.current.y;
            swipe.current = null;
            if (Math.abs(dx) > 75 && Math.abs(dx) > Math.abs(dy) * 1.6)
              go(page + (dx < 0 ? 1 : -1));
          }}
          onTouchCancel={() => {
            swipe.current = null;
          }}
        >
          <div className={styles.page} key={page}>
            <div className={styles.pageHeader}>
              <span>AKIPASA / {es ? "PASAPORTE" : "PASSPORT"}</span>
              <span>
                {String(page + 1).padStart(2, "0")} / {total}
              </span>
            </div>
            <h2 className={styles.pageTitle} ref={pageHeading} tabIndex={-1}>
              {title}
            </h2>
            {page === 0 ? (
              <div
                ref={surface}
                className={`${styles.cover} ${styles.holo}`}
                data-shine={shine && !reduced}
                onPointerMove={(event) => {
                  if (motion || reduced || !shine) return;
                  const r = event.currentTarget.getBoundingClientRect();
                  target.current = {
                    x: ((event.clientX - r.left) / r.width) * 2 - 1,
                    y: ((event.clientY - r.top) / r.height) * 2 - 1,
                  };
                }}
                onPointerLeave={() => {
                  if (!motion) target.current = { x: 0, y: 0 };
                }}
              >
                <Image
                  src="/brand/logo-horizontal-dark.svg"
                  alt="AkiPasa"
                  width={220}
                  height={70}
                  className={styles.brand}
                />
                <div className={styles.compass} aria-hidden="true">
                  ✦
                </div>
                {layers}
                <div className={styles.coverText}>
                  <span>EXPLORER PASSPORT</span>
                  <h3>
                    {es ? "Sal. Explora. Disfruta." : "Go out. Explore. Enjoy."}
                  </h3>
                  <p>
                    {es
                      ? "Ciudades, rutas y recuerdos. Tu viaje empieza aquí."
                      : "Cities, routes and memories. Your journey starts here."}
                  </p>
                  <button onClick={() => go(1)}>
                    {es ? "Abrir pasaporte" : "Open passport"}{" "}
                    <span aria-hidden="true">↗</span>
                  </button>
                </div>
                <div className={styles.coverBottom}>
                  <span>
                    ESPAÑA / {cities.length} {es ? "DESTINOS" : "DESTINATIONS"}
                  </span>
                  <span>AKI / 001</span>
                </div>
              </div>
            ) : page === 1 ? (
              <div className={styles.index}>
                <p>
                  {es
                    ? "Elige un capítulo o salta directamente a una ciudad."
                    : "Choose a chapter or jump straight to a city."}
                </p>
                <div className={styles.chapterList}>
                  {labels.slice(2).map((label, i) => (
                    <button key={label} onClick={() => go(i + 2)}>
                      <span>{label}</span>
                      <b>{String(i + 3).padStart(2, "0")} ↗</b>
                    </button>
                  ))}
                </div>
                <label className={styles.search}>
                  {es ? "Busca una ciudad" : "Find a city"}
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={
                      es
                        ? "Málaga, Madrid, Barcelona…"
                        : "Málaga, Madrid, Barcelona…"
                    }
                  />
                </label>
                <div className={styles.cityIndex}>
                  {cities
                    .filter((c) =>
                      c[locale]
                        .toLocaleLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .includes(
                          search
                            .toLocaleLowerCase()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, ""),
                        ),
                    )
                    .map((c) => (
                      <button
                        key={c.key}
                        onClick={() => go(chapters.length + cities.indexOf(c))}
                      >
                        <span>{c[locale]}</span>
                        <small>
                          {String(
                            chapters.length + cities.indexOf(c) + 1,
                          ).padStart(2, "0")}
                        </small>
                      </button>
                    ))}
                </div>
                {search &&
                  !cities.some((c) =>
                    c[locale]
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .toLowerCase()
                      .includes(
                        search
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .toLowerCase(),
                      ),
                  ) && (
                    <p>
                      {es
                        ? "No hay ciudades con ese nombre."
                        : "No cities match that name."}
                    </p>
                  )}
              </div>
            ) : city ? (
              <div className={styles.spread}>
                <div
                  ref={surface}
                  className={`${styles.cityArt} ${styles.holo}`}
                  data-shine={shine && !reduced}
                  onPointerMove={(event) => {
                    if (motion || reduced || !shine) return;
                    const r = event.currentTarget.getBoundingClientRect();
                    target.current = {
                      x: ((event.clientX - r.left) / r.width) * 2 - 1,
                      y: ((event.clientY - r.top) / r.height) * 2 - 1,
                    };
                  }}
                  onPointerLeave={() => {
                    if (!motion) target.current = { x: 0, y: 0 };
                  }}
                >
                  <Image
                    src={city.photo.src}
                    alt={`${city[locale]} — ${city.photo.landmark}`}
                    fill
                    sizes="(max-width: 700px) 90vw, 480px"
                    unoptimized
                  />
                  <span className={styles.shade} />
                  {layers}
                  <div className={styles.artTop}>
                    <span>AKIPASA / CITY COLLECTION</span>
                    <span>ES</span>
                  </div>
                  <div className={styles.artBottom}>
                    <span>
                      {es ? "DESTINO" : "DESTINATION"}{" "}
                      {String(page - chapters.length + 1).padStart(2, "0")}
                    </span>
                    <h3>{city[locale]}</h3>
                    <p>{city.photo.landmark}</p>
                  </div>
                </div>
                <div className={styles.journal}>
                  <span className={styles.eyebrow}>
                    {es ? "Tu próxima historia" : "Your next story"}
                  </span>
                  <h3>
                    {es ? "Nos vemos en" : "See you in"}
                    <br />
                    {city[locale]}.
                  </h3>
                  <p>
                    {es
                      ? "Descubre sus locales, encuentra nuevos planes y haz check-in en los negocios participantes para ganar XP y sellos."
                      : "Discover its venues, find new plans and check in at participating businesses to earn XP and stamps."}
                  </p>
                  <div className={styles.coordinates}>
                    {Math.abs(city.latitude).toFixed(3)}°{" "}
                    {city.latitude >= 0 ? "N" : "S"}
                    <br />
                    {Math.abs(city.longitude).toFixed(3)}°{" "}
                    {city.longitude >= 0 ? "E" : "W"}
                  </div>
                  <Link
                    className={styles.explore}
                    href={cityDiscoveryHref(city, locale)}
                  >
                    {es ? "Explorar" : "Explore"} {city[locale]}{" "}
                    <span aria-hidden="true">↗</span>
                  </Link>
                  <p className={styles.truth}>
                    {es
                      ? "Las páginas de ciudades son destinos para explorar. Tus visitas y logros verificados aparecen en Mi viaje e Insignias."
                      : "City pages are destinations to explore. Your verified progress and achievements appear in My journey and Badges."}
                  </p>
                  <details className={styles.credit}>
                    <summary>
                      {es ? "Crédito de la foto" : "Photo credit"}
                    </summary>
                    <p>
                      <a
                        href={city.photo.source}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {city.photo.title}
                      </a>{" "}
                      — {city.photo.credit}.{" "}
                      <a
                        href={city.photo.licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {city.photo.license}
                      </a>
                      . {city.photo.changes}{" "}
                      {es
                        ? "Efecto de brillo superpuesto."
                        : "Shine effect overlaid."}
                    </p>
                  </details>
                </div>
              </div>
            ) : (
              <div className={styles.chapter}>
                {page === 2
                  ? progress
                  : page === 3
                    ? routes
                    : page === 4
                      ? stamps
                      : badges}
              </div>
            )}
            <footer className={styles.pageFooter}>
              <span>
                {es ? "Sal. Explora. Disfruta." : "Go out. Explore. Enjoy."}
              </span>
              <span>AKI / {String(page + 1).padStart(3, "0")}</span>
            </footer>
          </div>
        </div>
      </div>
      <div className={styles.controls}>
        <span className={styles.readout} aria-live="polite">
          {title} · {page + 1}/{total}
        </span>
      </div>
      <div className={styles.motionControls}>
        <button
          onClick={enableMotion}
          disabled={reduced || !shine}
          aria-pressed={motion}
        >
          {motion
            ? es
              ? "Desactivar inclinación"
              : "Disable tilt"
            : es
              ? "Activar inclinación"
              : "Enable tilt"}
        </button>
        {motion && (
          <button
            onClick={() => {
              origin.current = latest.current;
              target.current = { x: 0, y: 0 };
            }}
          >
            {es ? "Centrar" : "Recenter"}
          </button>
        )}
        <button
          onClick={() => {
            setShine(!shine);
            setMotion(false);
          }}
          aria-pressed={shine}
        >
          {es ? "Brillo" : "Foil"}: {shine ? "ON" : "OFF"}
        </button>
        <p role="status">
          {status ||
            (reduced
              ? es
                ? "Movimiento reducido activado."
                : "Reduced motion is enabled."
              : es
                ? "Desliza para pasar página. Toca la foto para mover la luz."
                : "Swipe to turn pages. Touch the photo to move the light.")}
        </p>
      </div>
      <div className={styles.summary}>
        <span>{totalXp.toLocaleString(locale)} XP</span>
        <span>
          {totalStamps.toLocaleString(locale)} {es ? "sellos" : "stamps"}
        </span>
        {!signedIn && (
          <Link
            href={`/${locale}/auth?mode=signin&next=${encodeURIComponent(`/${locale}/passports`)}`}
          >
            {es
              ? "Inicia sesión para guardar tu viaje"
              : "Sign in to save your journey"}{" "}
            ↗
          </Link>
        )}
      </div>
    </main>
  );
}
