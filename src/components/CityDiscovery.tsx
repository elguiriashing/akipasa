"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/lib/config";
import {
  featuredCityKeys,
  majorCities,
  nearestMajorCities,
  cityDiscoveryHref,
  type DiscoveryCity,
} from "@/lib/city-discovery";
import { discoveryLocationFromQuery } from "@/lib/discovery-location";
import { Icon } from "./Icons";
import styles from "./CityDiscovery.module.css";

const subscribeToHydration = () => () => {};

function CityRow({
  cities,
  locale,
  nearby = false,
}: {
  cities: (DiscoveryCity & { distance?: number })[];
  locale: Locale;
  nearby?: boolean;
}) {
  const row = useRef<HTMLUListElement>(null);
  const es = locale === "es";
  return (
    <div className={styles.rowWrap}>
      <ul ref={row} className={`${styles.row} ${nearby ? styles.nearby : ""}`}>
        {cities.map((city, index) => (
          <li key={city.key}>
            <Link
              className={styles.tile}
              href={cityDiscoveryHref(city, locale)}
              prefetch={false}
            >
              <div className={styles.photo}>
                <Image
                  src={city.photo.src}
                  alt={`${city[locale]} — ${city.photo.landmark}`}
                  fill
                  sizes={
                    nearby
                      ? "(max-width: 650px) 78vw, (max-width: 1000px) 40vw, 30vw"
                      : "(max-width: 650px) 72vw, (max-width: 1000px) 35vw, 20vw"
                  }
                  priority={!nearby && index < 2}
                  unoptimized
                />
                <span className={styles.arrow} aria-hidden="true">
                  <Icon name="arrow-right" />
                </span>
              </div>
              <div className={styles.caption}>
                <h3>{city[locale]}</h3>
                {city.distance !== undefined && (
                  <span>
                    {es ? "A" : "About"}{" "}
                    {Math.round(city.distance).toLocaleString(locale)} km
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <div className={styles.scrollControls}>
        <button
          className="app-icon-button"
          aria-label={es ? "Ciudades anteriores" : "Previous cities"}
          onClick={() =>
            row.current?.scrollBy({
              left: -(row.current.clientWidth * 0.8),
              behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "instant"
                : "smooth",
            })
          }
        >
          <Icon name="arrow-right" />
        </button>
        <button
          className="app-icon-button"
          aria-label={es ? "Más ciudades" : "More cities"}
          onClick={() =>
            row.current?.scrollBy({
              left: row.current.clientWidth * 0.8,
              behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "instant"
                : "smooth",
            })
          }
        >
          <Icon name="arrow-right" />
        </button>
      </div>
    </div>
  );
}

export function CityDiscovery({ locale }: { locale: Locale }) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const es = locale === "es";
  const searchParams = useSearchParams();
  const selected = discoveryLocationFromQuery(
    Object.fromEntries(searchParams),
    locale,
  );
  const hasSelectedLocation = searchParams.has("locality") || selected.custom;
  const [gps, setGps] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [status, setStatus] = useState<
    "idle" | "locating" | "denied" | "unavailable"
  >("idle");
  const mounted = useRef(false);
  function locate() {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!mounted.current) return;
        setGps({ latitude: coords.latitude, longitude: coords.longitude });
        setStatus("idle");
      },
      (error) => {
        if (mounted.current)
          setStatus(error.code === 1 ? "denied" : "unavailable");
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 },
    );
  }
  useEffect(() => {
    mounted.current = true;
    // Reuse GPS automatically when already allowed; a new permission prompt
    // is only triggered by the visible location button.
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((permission) => {
        if (mounted.current && permission.state === "granted") locate();
      })
      .catch(() => {});
    const update = (event: Event) => {
      setGps(
        (event as CustomEvent<{ latitude: number; longitude: number }>).detail,
      );
      setStatus("idle");
    };
    window.addEventListener("akipasa:location", update);
    return () => {
      mounted.current = false;
      window.removeEventListener("akipasa:location", update);
    };
  }, []);
  const featured = featuredCityKeys.map(
    (key) => majorCities.find((city) => city.key === key)!,
  );
  const center = gps || (hasSelectedLocation ? selected.center : null);
  const nearby = center
    ? nearestMajorCities(center)
    : ["granada", "bilbao", "palma"].map(
        (key) => majorCities.find((city) => city.key === key)!,
      );
  return (
    <div className={styles.discovery}>
      <section aria-labelledby="city-discovery-title">
        <div className={styles.heading}>
          <div>
            <span className={styles.eyebrow}>
              {es ? "Sal. Explora. Vive." : "Go out. Explore. Enjoy."}
            </span>
            <h1 id="city-discovery-title">
              {es
                ? "Tu próximo plan empieza aquí"
                : "Your next plan starts here"}
            </h1>
            <p>
              {es
                ? "Cinco ciudades, mil formas de disfrutarlas."
                : "Five cities. So many ways to enjoy them."}
            </p>
          </div>
        </div>
        <CityRow cities={featured} locale={locale} />
      </section>
      <section aria-labelledby="nearby-cities-title">
        <div className={styles.heading}>
          <div>
            <span className={styles.eyebrow}>
              {es ? "Sigue explorando" : "Keep exploring"}
            </span>
            <h2 id="nearby-cities-title">
              {gps
                ? es
                  ? "Ciudades cerca de ti"
                  : "Cities near you"
                : hasSelectedLocation
                  ? es
                    ? `Ciudades cerca de ${selected.name}`
                    : `Cities near ${selected.name}`
                  : es
                    ? "Tu próxima escapada"
                    : "Your next city escape"}
            </h2>
            <p aria-live="polite">
              {status === "denied"
                ? es
                  ? "Permiso denegado. Puedes elegir una zona en la búsqueda."
                  : "Permission denied. You can choose an area in search."
                : status === "unavailable"
                  ? es
                    ? "Ubicación no disponible. Elige una zona en la búsqueda."
                    : "Location unavailable. Choose an area in search."
                  : center
                    ? es
                      ? "Las tres ciudades más cercanas · distancias en línea recta."
                      : "Your three closest cities · straight-line distances."
                    : es
                      ? "Activa tu ubicación para descubrir las tres ciudades más cercanas."
                      : "Use your location to discover your three closest cities."}
            </p>
          </div>
          {!gps && (
            <button
              type="button"
              className={styles.locate}
              onClick={locate}
              disabled={!hydrated || status === "locating"}
            >
              <Icon name="map" />
              {status === "locating"
                ? es
                  ? "Buscando…"
                  : "Locating…"
                : es
                  ? "Usar mi ubicación"
                  : "Use my location"}
            </button>
          )}
        </div>
        <CityRow cities={nearby} locale={locale} nearby />
      </section>
      <Link className={styles.credits} href={`/${locale}/photo-credits`}>
        {es ? "Créditos de las fotografías" : "Photo credits"}
      </Link>
    </div>
  );
}
