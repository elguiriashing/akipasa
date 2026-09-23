"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { StayDetail } from "@/lib/stay-detail";
import { staySchema, stayTypeNames } from "@/lib/akiduermo";
import { stayText, type StayLocale } from "@/lib/akiduermo-i18n";
import { stayOrigin } from "@/lib/akiduermo-routing";
import { googleMapsDirectionsUrl } from "@/lib/maps";
import { Icon } from "./Icons";
import { ThemeToggle } from "./ThemeModeControls";
import base from "./AkiDuermo.module.css";
import styles from "./StayProperty.module.css";

export function StayProperty({
  stay,
  initialLocale,
}: {
  stay: StayDetail;
  initialLocale: StayLocale;
}) {
  const [locale, setLocale] = useState(initialLocale);
  const es = locale === "es";
  const text = (en: string, spanish: string) => (es ? spanish : en);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [plan, setPlan] = useState(false);
  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("akiduermo-saved-v1") || "[]",
      );
      setSaved(
        Array.isArray(stored) &&
          stored.some(
            (row) => staySchema.safeParse(row).success && row.id === stay.id,
          ),
      );
    } catch {}
  }, [stay.id]);
  function toggleSaved() {
    try {
      const data = JSON.parse(
        localStorage.getItem("akiduermo-saved-v1") || "[]",
      );
      const rows = Array.isArray(data)
        ? data.filter((row) => staySchema.safeParse(row).success)
        : [];
      const exists = rows.some((row) => row.id === stay.id);
      const value = staySchema.parse(stay);
      localStorage.setItem(
        "akiduermo-saved-v1",
        JSON.stringify(
          exists
            ? rows.filter((row) => row.id !== stay.id)
            : [value, ...rows].slice(0, 100),
        ),
      );
      setSaved(!exists);
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }
  function changeLanguage() {
    const next = es ? "en" : "es";
    setLocale(next);
    document.documentElement.lang = next;
    document.cookie = `akiduermo_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    const url = new URL(location.href);
    url.searchParams.set("lang", next);
    history.replaceState(history.state, "", url);
  }
  const home = `${stayOrigin}/?lang=${locale}`;
  const type = stayText(
    locale,
    stayTypeNames[stay.accommodationType] || "Accommodation",
  );
  const description = es
    ? stay.descriptionEs
    : stay.descriptionEn || stay.descriptionEs;
  return (
    <div className={base.app}>
      <header className={base.header}>
        <Link
          href={home}
          className={`app-rail-brand ${base.logo}`}
          aria-label={text("AkiDuermo home", "Inicio de AkiDuermo")}
        >
          <span className="app-rail-mark" aria-hidden="true">
            A
          </span>
          <span>
            AkiDuermo<i className="app-rail-brand-dot">.</i>
          </span>
        </Link>
        <div className={base.headerRight}>
          <span className={base.preview}>
            {text("EARLY PREVIEW", "VISTA PREVIA")}
          </span>
          <ThemeToggle locale={locale} />
          <button
            className={base.languageToggle}
            onClick={changeLanguage}
            aria-label={es ? "Switch to English" : "Cambiar a español"}
            lang={es ? "en" : "es"}
          >
            {es ? "EN" : "ES"}
          </button>
        </div>
      </header>
      <main className={styles.page}>
        <Link href={home} className={styles.back}>
          <Icon name="arrow-right" size={18} className={base.backArrow} />
          {text("Explore stays", "Explorar alojamientos")}
        </Link>
        <section className={styles.heading}>
          <div>
            <span className={base.kicker}>
              {type} · {stay.city}
            </span>
            <h1>{stay.name}</h1>
            <a href="#location" className={styles.address}>
              <Icon name="map" size={18} />
              {stay.address || stay.city}
            </a>
          </div>
          <button
            className={base.mapButton}
            onClick={toggleSaved}
            aria-pressed={saved}
          >
            <Icon name={saved ? "heart-fill" : "heart"} size={20} />
            {saved ? text("Saved", "Guardado") : text("Save stay", "Guardar")}
          </button>
        </section>
        {saveError && (
          <p role="alert">
            {text(
              "Your browser couldn’t save this stay.",
              "Tu navegador no ha podido guardar este alojamiento.",
            )}
          </p>
        )}
        <section
          className={styles.gallery}
          aria-label={text("Property photos", "Fotos del alojamiento")}
        >
          {stay.photos.length ? (
            <div className={styles.photos}>
              {stay.photos.map((photo, i) => (
                <div key={photo.url}>
                  <Image
                    src={photo.url}
                    alt={es ? photo.altEs : photo.altEn}
                    fill
                    unoptimized
                    priority={i === 0}
                    sizes="(max-width: 700px) 100vw, 60vw"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.photoPlaceholder}>
              <Icon name="bed" size={60} />
              <strong>
                {text(
                  "Your next stay starts here",
                  "Tu próxima estancia empieza aquí",
                )}
              </strong>
              <p>
                {text(
                  "Property photos are on their way",
                  "Las fotos del alojamiento llegarán pronto",
                )}
              </p>
              <span>
                {text(
                  "No verified property photos available yet",
                  "Todavía no hay fotos verificadas del alojamiento",
                )}
              </span>
            </div>
          )}
          <div className={styles.galleryNote}>
            <Icon name="moon" size={27} />
            <div>
              <strong>
                {text(
                  "A place to stay. A world to discover.",
                  "Un lugar donde dormir. Un mundo por descubrir.",
                )}
              </strong>
              <p>
                {text(
                  "Part of the AkiPasa family",
                  "Parte de la familia AkiPasa",
                )}
              </p>
            </div>
            <span className={styles.previewBadge}>
              {text("Discovery preview", "Vista previa")}
            </span>
          </div>
        </section>
        <nav
          className={styles.tabs}
          aria-label={text("Property sections", "Secciones del alojamiento")}
        >
          <a href="#overview">{text("Overview", "Descripción")}</a>
          <a href="#rooms">
            {text("Rooms & availability", "Habitaciones y disponibilidad")}
          </a>
          <a href="#location">{text("Location", "Ubicación")}</a>
          <a href="#details">{text("Good to know", "Información útil")}</a>
        </nav>
        <div className={styles.columns}>
          <div className={styles.content}>
            <section id="overview">
              <span className={base.kicker}>
                {text("MAKE YOURSELF AT HOME", "SIÉNTETE COMO EN CASA")}
              </span>
              <h2>
                {text("Meet your next escape", "Descubre tu próxima escapada")}
              </h2>
              {description ? (
                <p lang={es || !stay.descriptionEn ? "es" : "en"}>
                  {description}
                </p>
              ) : (
                <p>
                  {text(
                    `Discover ${stay.name} in ${stay.city}. More information will be added when the property’s details have been confirmed.`,
                    `Descubre ${stay.name} en ${stay.city}. Añadiremos más información cuando se confirmen los datos del alojamiento.`,
                  )}
                </p>
              )}
              <div className={styles.facts}>
                <div>
                  <Icon name="bed" size={22} />
                  <span>
                    {text("Property type", "Tipo de alojamiento")}
                    <strong>{type}</strong>
                  </span>
                </div>
                <div>
                  <Icon name="map" size={22} />
                  <span>
                    {text("Destination", "Destino")}
                    <strong>{stay.city}</strong>
                  </span>
                </div>
              </div>
            </section>
            <section id="rooms">
              <h2>{text("Find your room", "Encuentra tu habitación")}</h2>
              <div className={styles.notice}>
                <Icon name="calendar" size={28} />
                <div>
                  <strong>
                    {text(
                      "Rooms and rates are coming later",
                      "Habitaciones y precios próximamente",
                    )}
                  </strong>
                  <p>
                    {text(
                      "This property has not connected its room inventory or live availability to AkiDuermo. Save it for later, or visit its website if one is listed.",
                      "Este alojamiento aún no ha conectado sus habitaciones ni su disponibilidad en tiempo real a AkiDuermo. Guárdalo para más adelante o visita su web si está disponible.",
                    )}
                  </p>
                </div>
              </div>
            </section>
            <section id="location">
              <h2>
                {text("A good place to begin", "Un buen punto de partida")}
              </h2>
              <div className={styles.location}>
                <Icon name="map" size={36} />
                <div>
                  <strong>{stay.city}</strong>
                  <p>{stay.address}</p>
                  <a
                    href={googleMapsDirectionsUrl({
                      address: stay.address || `${stay.name}, ${stay.city}`,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {text("Get directions", "Cómo llegar")}{" "}
                    <Icon name="arrow-right" size={17} />
                  </a>
                </div>
              </div>
            </section>
            <section id="details">
              <h2>{text("Good to know", "Información útil")}</h2>
              <dl className={styles.details}>
                <div>
                  <dt>
                    {text(
                      "Property information",
                      "Información del alojamiento",
                    )}
                  </dt>
                  <dd>
                    {text(
                      "Imported listing · awaiting property verification",
                      "Ficha importada · pendiente de verificación",
                    )}
                  </dd>
                </div>
                <div>
                  <dt>
                    {text(
                      "Check-in / check-out times",
                      "Horarios de entrada y salida",
                    )}
                  </dt>
                  <dd>{text("Not yet confirmed", "Aún no confirmados")}</dd>
                </div>
                <div>
                  <dt>
                    {text(
                      "Facilities & accessibility",
                      "Servicios y accesibilidad",
                    )}
                  </dt>
                  <dd>
                    {text(
                      "Please confirm directly with the property",
                      "Confirma estos detalles directamente con el alojamiento",
                    )}
                  </dd>
                </div>
                <div>
                  <dt>
                    {text(
                      "Cancellation & payment policies",
                      "Cancelación y condiciones de pago",
                    )}
                  </dt>
                  <dd>
                    {text(
                      "No booking terms are available on AkiDuermo yet",
                      "AkiDuermo todavía no ofrece condiciones de reserva",
                    )}
                  </dd>
                </div>
              </dl>
            </section>
            <section className={styles.crossSell}>
              <Icon name="discover" size={30} />
              <h2>
                {text(
                  "Stay here. Go everywhere.",
                  "Quédate aquí. Descúbrelo todo.",
                )}
              </h2>
              <p>
                {text(
                  "Food, music and little adventures. Find your next plan with AkiPasa.",
                  "Gastronomía, música y pequeñas aventuras. Encuentra tu próximo plan con AkiPasa.",
                )}
              </p>
              <a
                className={base.mapButton}
                href={`https://akipasa.com/${locale}`}
              >
                {text("Explore AkiPasa", "Descubre AkiPasa")}
                <Icon name="arrow-right" size={18} />
              </a>
            </section>
          </div>
          <aside id="plan" className={styles.booking}>
            <span className={base.kicker}>
              {text("ONE MORE NIGHT?", "¿UNA NOCHE MÁS?")}
            </span>
            <h2>{text("Plan your stay", "Planifica tu estancia")}</h2>
            <p>
              {text(
                "Choose your dates for planning. Live prices and booking will arrive later.",
                "Elige fechas para planificar tu viaje. Los precios y las reservas llegarán más adelante.",
              )}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const values = new FormData(e.currentTarget);
                const arrival = String(values.get("checkIn") || "");
                const departure = String(values.get("checkOut") || "");
                if (!arrival || departure <= arrival) return;
                setCheckIn(arrival);
                setCheckOut(departure);
                setPlan(true);
              }}
              onChange={() => setPlan(false)}
            >
              <div className={styles.dates}>
                <label>
                  {text("Check in", "Entrada")}
                  <input
                    aria-label={text("Check in", "Entrada")}
                    name="checkIn"
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={checkIn}
                    onChange={(e) => {
                      setCheckIn(e.target.value);
                      if (checkOut <= e.target.value) setCheckOut("");
                    }}
                  />
                </label>
                <label>
                  {text("Check out", "Salida")}
                  <input
                    aria-label={text("Check out", "Salida")}
                    name="checkOut"
                    type="date"
                    required
                    min={
                      checkIn
                        ? new Date(new Date(checkIn).getTime() + 86400000)
                            .toISOString()
                            .slice(0, 10)
                        : new Date().toISOString().slice(0, 10)
                    }
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                </label>
              </div>
              <label>
                {text("Guests", "Huéspedes")}
                <select
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                >
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}{" "}
                      {n === 1
                        ? text("guest", "huésped")
                        : text("guests", "huéspedes")}
                    </option>
                  ))}
                </select>
              </label>
              <button className={base.searchButton} type="submit">
                <Icon name="calendar" size={18} />
                {text("Preview my trip", "Ver mi estancia")}
              </button>
            </form>
            {plan && (
              <p className={styles.planResult} role="status">
                {checkIn} → {checkOut} · {guests} {text("guests", "huéspedes")}.{" "}
                {text(
                  "Planning only: availability has not been checked and no reservation has been made.",
                  "Solo planificación: no se ha comprobado la disponibilidad ni realizado ninguna reserva.",
                )}
              </p>
            )}
            <div className={styles.bookingStatus}>
              <Icon name="lock" size={18} />
              {text(
                "Bookings & payments are not open yet",
                "Las reservas y los pagos aún no están disponibles",
              )}
            </div>
            {stay.website && (
              <a
                className={base.mapButton}
                href={stay.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                {text(
                  "Visit property website",
                  "Visitar la web del alojamiento",
                )}
                <Icon name="arrow-right" size={18} />
              </a>
            )}
            <button
              className={styles.saveLink}
              onClick={toggleSaved}
              aria-pressed={saved}
            >
              <Icon name={saved ? "heart-fill" : "heart"} size={18} />
              {saved
                ? text("Remove from saved", "Quitar de guardados")
                : text("Save for later", "Guardar para después")}
            </button>
          </aside>
        </div>
        <footer className={styles.footer}>
          AkiDuermo ·{" "}
          {text("Part of the AkiPasa family", "Parte de la familia AkiPasa")}
          <div>
            <a href={`https://akipasa.com/${locale}/privacy`}>
              {text("Privacy", "Privacidad")}
            </a>
            <a href={`https://akipasa.com/${locale}/terms`}>
              {text("Terms", "Condiciones")}
            </a>
          </div>
        </footer>
      </main>
      <div className={styles.mobileBar}>
        <span>
          <strong>{text("Your next escape", "Tu próxima escapada")}</strong>
          <small>
            {text("Bookings coming later", "Reservas próximamente")}
          </small>
        </span>
        <a href="#plan" className={base.searchButton}>
          {text("Plan your stay", "Planificar estancia")}
          <Icon name="arrow-right" size={18} />
        </a>
      </div>
    </div>
  );
}
