"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./AkiConduzco.module.css";
import {
  rentalCategories,
  rentalCategoryLabels,
  type RentalListing,
} from "@/lib/akiconduzco";

type Locale = "en" | "es";
const copy = {
  en: {
    explore: "Explore",
    map: "Map",
    account: "Account",
    login: "Log in",
    heroTag: "THE ROAD IS PART OF THE TRIP",
    first: "Find your",
    second: "way there.",
    intro:
      "Browse local rental cars for the places you want to go. Compare the details, choose your dates, and send a request directly to the rental company.",
    search: "Find a car",
    where: "PICK-UP AREA",
    city: "City or airport",
    from: "PICK-UP",
    until: "DROP-OFF",
    category: "VEHICLE TYPE",
    all: "Any type",
    cars: "Cars for your trip",
    mapLink: "See the map",
    empty: "No published rental cars match yet.",
    emptyNote:
      "We’re opening AkiConduzco with local rental partners. Check another area or come back soon.",
    error: "We couldn’t load rentals just now.",
    retry: "Try again",
    perDay: "/ day",
    seats: "seats",
    luggage: "bags",
    automatic: "Automatic",
    manual: "Manual",
    fuel: "fuel",
    at: "in",
    operator: "Run a rental company?",
    operatorNote: "Set up your fleet on AkiBusiness. No venue claim needed.",
    operatorLink: "Open AkiBusiness",
    family: "PART OF THE AKIPASA FAMILY",
    go: "Find events",
    stays: "Find a stay",
    terms: "Terms",
    privacy: "Privacy",
    lang: "ES",
  },
  es: {
    explore: "Explorar",
    map: "Mapa",
    account: "Cuenta",
    login: "Entrar",
    heroTag: "EL CAMINO TAMBIÉN ES PARTE DEL VIAJE",
    first: "Encuentra",
    second: "cómo llegar.",
    intro:
      "Descubre coches de alquiler para los lugares que quieres visitar. Compara opciones, elige las fechas y envía tu solicitud directamente a la empresa.",
    search: "Buscar coche",
    where: "ZONA DE RECOGIDA",
    city: "Ciudad o aeropuerto",
    from: "RECOGIDA",
    until: "DEVOLUCIÓN",
    category: "TIPO DE VEHÍCULO",
    all: "Todos",
    cars: "Coches para tu viaje",
    mapLink: "Ver el mapa",
    empty: "Aún no hay coches de alquiler publicados.",
    emptyNote:
      "Estamos abriendo AkiConduzco con empresas locales. Prueba otra zona o vuelve pronto.",
    error: "No se han podido cargar los alquileres.",
    retry: "Reintentar",
    perDay: "/ día",
    seats: "plazas",
    luggage: "maletas",
    automatic: "Automático",
    manual: "Manual",
    fuel: "combustible",
    at: "en",
    operator: "¿Gestionas una empresa de alquiler?",
    operatorNote:
      "Configura tu flota en AkiBusiness. Sin reclamar ningún local.",
    operatorLink: "Abrir AkiBusiness",
    family: "PARTE DE LA FAMILIA AKIPASA",
    go: "Descubrir eventos",
    stays: "Buscar alojamiento",
    terms: "Condiciones",
    privacy: "Privacidad",
    lang: "EN",
  },
};

export function ConduzcoHeader({ locale }: { locale: Locale }) {
  const t = copy[locale];
  function switchLocale() {
    const next = locale === "en" ? "es" : "en";
    document.cookie = `akiconduzco_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    const url = new URL(location.href);
    url.searchParams.set("lang", next);
    location.assign(url.toString());
  }
  return (
    <header className={styles.header}>
      <Link
        href={`/?lang=${locale}`}
        className={styles.brand}
        aria-label="AkiConduzco home"
      >
        <Image
          src="/brand/v3/coches.svg"
          alt=""
          width={38}
          height={38}
          priority
        />
        <span>
          Aki<span>Conduzco</span>.
        </span>
      </Link>
      <nav className={styles.tools} aria-label="AkiConduzco">
        <Link className={styles.navlink} href={`/map?lang=${locale}`}>
          {t.map}
        </Link>
        <Link className={styles.navlink} href={`/account?lang=${locale}`}>
          {t.account}
        </Link>
        <button
          type="button"
          onClick={switchLocale}
          aria-label={
            locale === "en"
              ? "Cambiar idioma a español"
              : "Switch language to English"
          }
        >
          {t.lang}
        </button>
      </nav>
    </header>
  );
}

export function RentalCard({
  listing,
  locale,
  start,
  end,
}: {
  listing: RentalListing;
  locale: Locale;
  start?: string;
  end?: string;
}) {
  const category =
    rentalCategoryLabels[listing.category]?.[locale] || listing.category;
  const query = new URLSearchParams({
    lang: locale,
    ...(start ? { start } : {}),
    ...(end ? { end } : {}),
    vehicle: listing.vehicle_id,
  });
  return (
    <Link
      className={styles.card}
      href={`/rentals/${encodeURIComponent(listing.company_slug)}?${query}`}
    >
      <div className={styles.vehicleArt}>
        {listing.image_url ? (
          <Image
            src={listing.image_url}
            alt=""
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
            unoptimized
            style={{ objectFit: "cover" }}
          />
        ) : (
          <span className={styles.vehicleIcon} aria-hidden="true" />
        )}
        <span className={styles.priceTag}>
          €{(listing.daily_price_cents / 100).toFixed(0)}{" "}
          <small>{locale === "es" ? "por día" : "/ day"}</small>
        </span>
      </div>
      <div className={styles.cardBody}>
        <h3>{listing.vehicle_name}</h3>
        <div className={styles.company}>
          {listing.company_name} · {listing.city}
        </div>
        <div className={styles.specs}>
          <span>{category}</span>
          <span>
            {listing.seats} {locale === "es" ? "plazas" : "seats"}
          </span>
          <span>
            {locale === "es"
              ? listing.transmission === "automatic"
                ? "Automático"
                : "Manual"
              : listing.transmission === "automatic"
                ? "Automatic"
                : "Manual"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function AkiConduzco({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [rows, setRows] = useState<RentalListing[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const searchUrl = useMemo(
    () =>
      new URLSearchParams({
        q,
        city,
        category,
        ...(start ? { start } : {}),
        ...(end ? { end } : {}),
      }).toString(),
    [q, city, category, start, end],
  );
  const load = useCallback(() => {
    const abort = new AbortController();
    setBusy(true);
    setError(false);
    fetch(`/api/car-rentals?${searchUrl}`, { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        return response.json();
      })
      .then((data) => {
        if (!abort.signal.aborted) {
          setRows(Array.isArray(data.rows) ? data.rows : []);
          setTotal(Number(data.total || 0));
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!abort.signal.aborted) setBusy(false);
      });
    return () => abort.abort();
  }, [searchUrl]);
  useEffect(() => load(), [load, retry]);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRetry((n) => n + 1);
  }
  return (
    <div className={styles.app}>
      <ConduzcoHeader locale={locale} />
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>{t.heroTag}</span>
            <h1>
              {t.first}
              <br />
              <em>{t.second}</em>
            </h1>
            <p>{t.intro}</p>
            <div className={styles.heroMeta}>
              <strong />
              {locale === "es"
                ? "Alquiler local. Tu viaje."
                : "Local car hire. Your trip."}
            </div>
          </div>
        </section>
        <section className={styles.searchPanel} aria-label={t.search}>
          <form className={styles.searchGrid} onSubmit={submit}>
            <label className={styles.field}>
              {t.where}
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={100}
                placeholder={t.city}
              />
            </label>
            <label className={styles.field}>
              {t.from}
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              {t.until}
              <input
                type="date"
                value={end}
                min={start || undefined}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              {t.category}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">{t.all}</option>
                {rentalCategories.map((value) => (
                  <option key={value} value={value}>
                    {rentalCategoryLabels[value][locale]}
                  </option>
                ))}
              </select>
            </label>
            <button className={styles.button} type="submit">
              {t.search}
            </button>
          </form>
          <label
            className={`${styles.field} ${styles.queryField}`}
            style={{ maxWidth: 420, marginTop: 12 }}
          >
            {locale === "es" ? "COCHE O EMPRESA" : "CAR OR COMPANY"}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              maxLength={100}
              placeholder={
                locale === "es"
                  ? "Ej. SUV, Málaga, nombre de empresa"
                  : "e.g. SUV, Málaga, company name"
              }
            />
          </label>
        </section>
        <div className={styles.sectionHead}>
          <div>
            <h2>{t.cars}</h2>
            <p>
              {total
                ? `${total} ${locale === "es" ? "opciones disponibles" : "options available"}`
                : t.emptyNote}
            </p>
          </div>
          <Link
            href={`/map?lang=${locale}${city ? `&q=${encodeURIComponent(city)}` : ""}`}
          >
            {t.mapLink} →
          </Link>
        </div>
        {error ? (
          <div className={styles.error} role="alert">
            {t.error}{" "}
            <button
              className={styles.navlink}
              onClick={() => setRetry((n) => n + 1)}
            >
              {t.retry}
            </button>
          </div>
        ) : busy ? (
          <div className={styles.empty} aria-live="polite">
            {locale === "es" ? "Buscando coches…" : "Finding rental cars…"}
          </div>
        ) : rows.length ? (
          <div className={styles.grid}>
            {rows.map((row) => (
              <RentalCard
                key={row.vehicle_id}
                listing={row}
                locale={locale}
                start={start}
                end={end}
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <strong>{t.empty}</strong>
            <p>{t.emptyNote}</p>
          </div>
        )}
        <section className={styles.businessIntro}>
          <strong>{t.operator}</strong>
          <p>{t.operatorNote}</p>
          <Link
            className={styles.button}
            href={`https://business.akipasa.com/${locale}/business/mobility`}
          >
            {t.operatorLink}
          </Link>
        </section>
        <footer className={styles.footer}>
          <span>{t.family} · AkiPasa × AkiDuermo × AkiConduzco</span>
          <span>
            <Link href={`https://akipasa.com/${locale}`}>{t.go}</Link>　
            <Link href={`https://akiduermo.akipasa.com/?lang=${locale}`}>
              {t.stays}
            </Link>
            　
            <Link href={`https://akipasa.com/${locale}/terms`}>{t.terms}</Link>
            　
            <Link href={`https://akipasa.com/${locale}/privacy`}>
              {t.privacy}
            </Link>
          </span>
        </footer>
      </main>
    </div>
  );
}

export function RentalDetail({
  locale,
  slug,
  listings,
  error,
  requestedVehicle,
  initialStart = "",
  initialEnd = "",
}: {
  locale: Locale;
  slug: string;
  listings: RentalListing[];
  error?: boolean;
  requestedVehicle?: string;
  initialStart?: string;
  initialEnd?: string;
}) {
  const router = useRouter();
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [busyVehicle, setBusyVehicle] = useState(requestedVehicle || "");
  const es = locale === "es";
  async function requestBooking(
    event: React.FormEvent<HTMLFormElement>,
    vehicleId: string,
  ) {
    event.preventDefault();
    setBusyVehicle(vehicleId);
    setSending(true);
    setMessage("");
    let idempotencyKey = sessionStorage.getItem(
      `conduzco-request-${vehicleId}`,
    );
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
      sessionStorage.setItem(`conduzco-request-${vehicleId}`, idempotencyKey);
    }
    try {
      const response = await fetch("/api/car-rentals/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          start,
          end,
          name,
          phone,
          note,
          idempotencyKey,
        }),
      });
      if (response.status === 401) {
        router.push(
          `/${locale}/auth?next=${encodeURIComponent(`/rentals/${slug}?vehicle=${vehicleId}&start=${start}&end=${end}`)}`,
        );
        return;
      }
      if (!response.ok)
        throw new Error(response.status === 409 ? "dates" : "failed");
      sessionStorage.removeItem(`conduzco-request-${vehicleId}`);
      setMessage(
        es
          ? "Solicitud enviada. La empresa debe confirmarla; aún no hay reserva ni pago."
          : "Request sent. The rental company must confirm it; no rental or payment is confirmed yet.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === "dates"
          ? es
            ? "Esas fechas ya no están disponibles. Prueba otras."
            : "Those dates are no longer available. Try different dates."
          : es
            ? "No se pudo enviar. Puedes volver a intentarlo."
            : "We couldn't send that request. You can try again.",
      );
    } finally {
      setSending(false);
    }
  }
  if (error)
    return (
      <div className={styles.app}>
        <ConduzcoHeader locale={locale} />
        <main className={styles.main}>
          <p className={styles.error}>
            {es
              ? "No se pudo cargar la disponibilidad."
              : "Rental details are unavailable right now."}
          </p>
        </main>
      </div>
    );
  const company = listings[0];
  if (!company)
    return (
      <div className={styles.app}>
        <ConduzcoHeader locale={locale} />
        <main className={styles.main}>
          <div className={styles.empty}>
            {es
              ? "Esta empresa no tiene coches publicados."
              : "This rental company has no published cars yet."}
          </div>
        </main>
      </div>
    );
  return (
    <div className={styles.app}>
      <ConduzcoHeader locale={locale} />
      <main className={styles.main}>
        <div className={styles.detail}>
          <section className={styles.detailPanel}>
            <span className={styles.eyebrow}>
              {company.city} · {company.company_name}
            </span>
            <h1>{company.company_name}</h1>
            <p>{company.address}</p>
            <p>
              {es
                ? "El precio mostrado es por día. La fianza se indica antes de enviar la solicitud. La empresa confirma directamente la disponibilidad final."
                : "Prices shown are per day. Any deposit is shown before you request. The rental company confirms final availability directly."}
            </p>
            {message && (
              <p className={styles.notice} role="status">
                {message}
              </p>
            )}
            <div className={styles.form}>
              <label>
                {es ? "Nombre" : "Name"}
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </label>
              <label>
                {es ? "Teléfono (opcional)" : "Phone (optional)"}
                <input
                  maxLength={40}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </label>
              <label>
                {es ? "Recogida" : "Pick-up"}
                <input
                  type="date"
                  required
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label>
                {es ? "Devolución" : "Drop-off"}
                <input
                  type="date"
                  required
                  min={start || undefined}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
              <label>
                {es
                  ? "Mensaje para la empresa (opcional)"
                  : "Note for the company (optional)"}
                <textarea
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </div>
          </section>
          <aside className={styles.detailPanel}>
            <h2>{es ? "Coches disponibles" : "Available cars"}</h2>
            {listings.map((listing) => (
              <article
                key={listing.vehicle_id}
                className={styles.businessCard}
                style={{
                  background: "#0f1012",
                  color: "#f6f4f1",
                  borderColor: "#ffffff18",
                  marginTop: 12,
                }}
              >
                <h3>{listing.vehicle_name}</h3>
                <p>
                  {rentalCategoryLabels[listing.category][locale]} ·{" "}
                  {listing.seats} {es ? "plazas" : "seats"} ·{" "}
                  {listing.transmission === "automatic"
                    ? es
                      ? "Automático"
                      : "Automatic"
                    : es
                      ? "Manual"
                      : "Manual"}
                </p>
                <strong>
                  €{(listing.daily_price_cents / 100).toFixed(0)}{" "}
                  {es ? "/ día" : "/ day"}
                </strong>
                {listing.deposit_cents > 0 && (
                  <p>
                    {es ? "Fianza" : "Deposit"}: €
                    {(listing.deposit_cents / 100).toFixed(0)}
                  </p>
                )}
                <form
                  className={styles.form}
                  onSubmit={(event) =>
                    requestBooking(event, listing.vehicle_id)
                  }
                >
                  <button
                    className={styles.button}
                    type="submit"
                    disabled={
                      sending || !start || !end || name.trim().length < 2
                    }
                  >
                    {sending && busyVehicle === listing.vehicle_id
                      ? es
                        ? "Enviando…"
                        : "Sending…"
                      : es
                        ? "Solicitar este coche"
                        : "Request this car"}
                  </button>
                </form>
              </article>
            ))}
            {requestedVehicle &&
              !listings.some((x) => x.vehicle_id === requestedVehicle) && (
                <p className={styles.error}>
                  {es
                    ? "El vehículo elegido ya no está publicado."
                    : "The selected car is no longer listed."}
                </p>
              )}
          </aside>
        </div>
        <p className={styles.notice}>
          {es
            ? "Las solicitudes no son reservas confirmadas. No se cobran pagos en AkiConduzco."
            : "Requests are not confirmed rentals. AkiConduzco does not take payment."}
        </p>
      </main>
    </div>
  );
}

export function ConduzcoMap({
  locale,
  styleUrl,
  initialQuery = "",
}: {
  locale: Locale;
  styleUrl: string;
  initialQuery?: string;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [q, setQ] = useState(initialQuery);
  const [rows, setRows] = useState<RentalListing[]>([]);
  const [error, setError] = useState(false);
  const qRef = useRef(q);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  useEffect(() => {
    qRef.current = q;
    mapRef.current?.fire("moveend");
  }, [q]);
  useEffect(() => {
    if (!container) return;
    let map: import("maplibre-gl").Map | undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abort: AbortController | undefined;
    const markers: import("maplibre-gl").Marker[] = [];
    void import("maplibre-gl").then(({ default: maplibre }) => {
      if (cancelled) return;
      map = new maplibre.Map({
        container,
        style: styleUrl,
        center: [-4.42, 36.72],
        zoom: 8,
      });
      mapRef.current = map;
      map.addControl(new maplibre.NavigationControl(), "bottom-right");
      const load = () => {
        if (!map) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(async () => {
          const b = map!.getBounds();
          abort?.abort();
          abort = new AbortController();
          const bounds = [
            b.getSouth(),
            b.getWest(),
            b.getNorth(),
            b.getEast(),
          ].join(",");
          try {
            const response = await fetch(
              `/api/car-rentals?${new URLSearchParams({ q: qRef.current, bounds })}`,
              { signal: abort.signal },
            );
            if (!response.ok) throw new Error("unavailable");
            const data = await response.json();
            if (cancelled) return;
            setRows(data.rows || []);
            setError(false);
            markers.forEach((marker) => marker.remove());
            markers.length = 0;
            for (const item of (data.rows || []) as RentalListing[]) {
              const el = document.createElement("button");
              el.type = "button";
              el.setAttribute(
                "aria-label",
                `${item.vehicle_name}, €${Math.round(item.daily_price_cents / 100)} per day`,
              );
              el.className = "conduzco-map-marker";
              el.textContent = `€${Math.round(item.daily_price_cents / 100)}`;
              const popup = new maplibre.Popup({ offset: 20 }).setText(
                `${item.vehicle_name} · ${item.company_name} · €${Math.round(item.daily_price_cents / 100)}/day`,
              );
              const marker = new maplibre.Marker({ element: el })
                .setLngLat([item.longitude, item.latitude])
                .setPopup(popup)
                .addTo(map!);
              markers.push(marker);
            }
          } catch {
            if (!abort?.signal.aborted && !cancelled) setError(true);
          }
        }, 220);
      };
      map.on("load", load);
      map.on("moveend", load);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      abort?.abort();
      markers.forEach((marker) => marker.remove());
      mapRef.current = null;
      map?.remove();
    };
  }, [container, styleUrl]);
  return (
    <div className={styles.app}>
      <ConduzcoHeader locale={locale} />
      <main className={styles.mapLayout}>
        <div
          ref={setContainer}
          className={styles.mapCanvas}
          aria-label={
            locale === "es" ? "Mapa de coches de alquiler" : "Rental car map"
          }
        />
        <section className={styles.mapPanel}>
          <h1>
            {locale === "es" ? "Coches cerca de ti" : "Rental cars near you"}
            <span style={{ color: "#f04455" }}>.</span>
          </h1>
          <form onSubmit={(event) => event.preventDefault()}>
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder={
                locale === "es"
                  ? "Busca ciudad o empresa"
                  : "Search city or company"
              }
            />
          </form>
          {error && (
            <p role="alert">
              {locale === "es"
                ? "Mapa no disponible. Inténtalo de nuevo."
                : "Map listings unavailable. Try again."}
            </p>
          )}
          <div className={styles.mapResults}>
            {rows.map((row) => (
              <Link
                key={row.vehicle_id}
                href={`/rentals/${encodeURIComponent(row.company_slug)}?lang=${locale}&vehicle=${row.vehicle_id}`}
              >
                {row.vehicle_name}
                <small>
                  {row.company_name} · {row.city} · €
                  {Math.round(row.daily_price_cents / 100)}/day
                </small>
              </Link>
            ))}
            {!rows.length && !error && (
              <small>
                {locale === "es"
                  ? "Mueve el mapa para buscar en otra zona."
                  : "Move the map to search another area."}
              </small>
            )}
          </div>
        </section>
        <style>{`.conduzco-map-marker{border:1px solid #fff;border-radius:999px;background:#f04455;color:#fff;padding:6px 9px;font:800 12px system-ui;box-shadow:0 3px 12px #0007;cursor:pointer}.maplibregl-popup-content{font:600 13px system-ui;border-radius:10px}.maplibregl-ctrl-group{border-radius:10px!important;overflow:hidden}`}</style>
      </main>
    </div>
  );
}
