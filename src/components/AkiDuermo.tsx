"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { config } from "@/lib/config";
import { stayTypeNames, staySchema, type Stay } from "@/lib/akiduermo";
import { stayText, type StayLocale } from "@/lib/akiduermo-i18n";
import { stayHref } from "@/lib/akiduermo-routing";
import { Icon } from "./Icons";
import { ThemeToggle } from "./ThemeModeControls";
import styles from "./AkiDuermo.module.css";
const StayMap = dynamic(
  () => import("./ProductionMap").then((m) => m.ProductionMap),
  { ssr: false },
);
const noEvents: [] = [];
const destinations = [
  {
    name: "Málaga",
    slug: "malaga",
    tag: "Sea, sun & slow mornings",
    lat: 36.72,
    lng: -4.42,
  },
  {
    name: "Granada",
    slug: "granada",
    tag: "Stay a little closer to magic",
    lat: 37.18,
    lng: -3.6,
  },
  {
    name: "Madrid",
    slug: "madrid",
    tag: "One more night in the city",
    lat: 40.42,
    lng: -3.7,
  },
  {
    name: "Barcelona",
    slug: "barcelona",
    tag: "City energy. Coastal soul.",
    lat: 41.39,
    lng: 2.17,
  },
];
export function AkiDuermo({
  initialLocale = "en",
}: {
  initialLocale?: StayLocale;
}) {
  const [locale, setLocale] = useState<StayLocale>(initialLocale);
  const t = (text: string) => stayText(locale, text);
  function changeLanguage() {
    const next = locale === "en" ? "es" : "en";
    setLocale(next);
    document.documentElement.lang = next;
    document.cookie = `akiduermo_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(window.history.state, "", url);
  }
  useEffect(() => {
    document.title =
      locale === "es"
        ? "AkiDuermo · Un buen día merece una gran estancia"
        : "AkiDuermo · A good day deserves a great stay";
  }, [locale]);
  const [destination, setDestination] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Stay[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [saved, setSaved] = useState<Stay[]>([]);
  const [view, setView] = useState<"explore" | "saved" | "map">("explore");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [trip, setTrip] = useState<{
    checkIn: string;
    checkOut: string;
    guests: string;
  } | null>(null);
  useEffect(() => {
    try {
      const data = JSON.parse(
        localStorage.getItem("akiduermo-saved-v1") || "[]",
      );
      if (Array.isArray(data))
        setSaved(
          data.filter((x) => staySchema.safeParse(x).success).slice(0, 100),
        );
    } catch {}
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    fetch(
      `/api/stays?${new URLSearchParams({ q: search, type, page: String(page) })}`,
      { signal: abort.signal },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error("We couldn’t load stays just now.");
        return r.json();
      })
      .then((data) => {
        setRows(data.rows);
        setTotal(data.total);
      })
      .catch(() => {
        if (!abort.signal.aborted) setError("We couldn’t load stays just now.");
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [search, type, page, retry]);
  function toggleSaved(stay: Stay) {
    setSaved((prev) => {
      const next = prev.some((x) => x.id === stay.id)
        ? prev.filter((x) => x.id !== stay.id)
        : [stay, ...prev].slice(0, 100);
      try {
        localStorage.setItem("akiduermo-saved-v1", JSON.stringify(next));
      } catch {
        setError(
          "Your browser couldn’t save this stay. Allow local storage to keep favourites.",
        );
      }
      return next;
    });
  }
  function chooseDestination(name: string) {
    setDestination(name);
    setSearch(name);
    setType("all");
    setPage(1);
    setView("explore");
    document.getElementById("stays")?.scrollIntoView({ behavior: "smooth" });
  }
  const shown = view === "saved" ? saved : rows;
  const center = destinations.find((d) => d.name === search) || destinations[0];
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <Link
          href={`/akiduermo?lang=${locale}`}
          className={`app-rail-brand ${styles.logo}`}
          aria-label={t("AkiDuermo home")}
        >
          <span className="app-rail-mark" aria-hidden="true">
            A
          </span>
          <span>
            AkiDuermo
            <i className="app-rail-brand-dot" aria-hidden="true">
              .
            </i>
          </span>
        </Link>
        <div className={styles.headerRight}>
          <span className={styles.preview}>{t("EARLY PREVIEW")}</span>
          <ThemeToggle locale={locale} />
          <button
            type="button"
            className={styles.languageToggle}
            onClick={changeLanguage}
            aria-label={
              locale === "en" ? "Cambiar a español" : "Switch to English"
            }
            lang={locale === "en" ? "es" : "en"}
          >
            {locale === "en" ? "ES" : "EN"}
          </button>
          <a href={`https://akipasa.com/${locale}`}>
            {t("Go out with AkiPasa")} <Icon name="arrow-right" size={18} />
          </a>
        </div>
      </header>
      <main>
        <section className={styles.hero}>
          <Image
            src="/images/cities/malaga.webp"
            alt={t("Málaga, Spain")}
            fill
            priority
            sizes="100vw"
          />
          <div className={styles.heroShade} />
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>
              {t("GO OUT. STAY A LITTLE LONGER.")}
            </span>
            <h1>
              {t("A good day deserves")}
              <br />
              <em>{t("a great stay.")}</em>
            </h1>
            <p>
              {t("Little hideaways. City weekends. One more night.")}
              <br />
              {t("Find your place in Spain.")}
            </p>
            <span className={styles.heroLocation}>
              <Icon name="map" size={16} /> Málaga, Costa del Sol
            </span>
          </div>
        </section>
        <section className={styles.searchWrap} aria-label={t("Plan your stay")}>
          <form
            className={styles.search}
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(destination);
              setPage(1);
              setView("explore");
              setTrip(
                checkIn && checkOut ? { checkIn, checkOut, guests } : null,
              );
              document
                .getElementById("stays")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <label className={styles.destination}>
              <Icon name="search" size={20} />
              <span>
                {t("WHERE TO?")}
                <input
                  aria-label={t("Destination")}
                  placeholder={t("City, town or property")}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  maxLength={100}
                />
              </span>
            </label>
            <label>
              <span>
                {t("CHECK IN")}
                <input
                  aria-label={t("Check in")}
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={checkIn}
                  required={Boolean(checkOut)}
                  onChange={(e) => {
                    setCheckIn(e.target.value);
                    if (checkOut <= e.target.value) setCheckOut("");
                  }}
                />
              </span>
            </label>
            <label>
              <span>
                {t("CHECK OUT")}
                <input
                  aria-label={t("Check out")}
                  type="date"
                  min={
                    checkIn
                      ? new Date(new Date(checkIn).getTime() + 86400000)
                          .toISOString()
                          .slice(0, 10)
                      : new Date().toISOString().slice(0, 10)
                  }
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  required={Boolean(checkIn)}
                />
              </span>
            </label>
            <label>
              <span>
                {t("WHO’S COMING?")}
                <select
                  aria-label={t("Guests")}
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? t("guest") : t("guests")}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <button className={styles.searchButton} type="submit">
              <Icon name="search" size={20} /> {t("Find a stay")}
            </button>
          </form>
          <p className={styles.searchNote}>
            {t("A new way to stay, from the people behind AkiPasa.")}{" "}
            <span>{t("Browse now · Bookings coming later")}</span>
          </p>
        </section>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.kicker}>{t("A CHANGE OF SCENERY")}</span>
              <h2>{t("Where will you wake up?")}</h2>
            </div>
            <span className={styles.quiet}>{t("A few places to start")}</span>
          </div>
          <div className={styles.destinations}>
            {destinations.map((d) => (
              <button
                key={d.slug}
                onClick={() => chooseDestination(d.name)}
                className={styles.destinationCard}
              >
                <Image
                  src={`/images/cities/${d.slug}.webp`}
                  alt={d.name}
                  fill
                  sizes="(max-width:600px) 64vw,25vw"
                />
                <span>
                  <strong>{d.name}</strong>
                  <small>{t(d.tag)}</small>
                </span>
                <i>
                  <Icon name="arrow-right" size={18} />
                </i>
              </button>
            ))}
          </div>
        </section>
        <section id="stays" className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.kicker}>
                {t("MAKE YOURSELF AT HOME")}
              </span>
              <h2>
                {view === "saved"
                  ? t("Your saved stays")
                  : search
                    ? `${t("Find your stay in")} ${search}`
                    : t("A place for every kind of trip")}
              </h2>
            </div>
            <button
              className={styles.mapButton}
              onClick={() => setView(view === "map" ? "explore" : "map")}
            >
              <Icon name={view === "map" ? "audit" : "map"} size={18} />
              {view === "map" ? t("List view") : t("Map view")}
            </button>
          </div>
          <div
            className={styles.filters}
            role="group"
            aria-label={t("Property type")}
          >
            {[["all", "All stays"], ...Object.entries(stayTypeNames)].map(
              ([key, name]) => (
                <button
                  key={key}
                  aria-pressed={type === key}
                  onClick={() => {
                    setType(key);
                    setPage(1);
                    setView("explore");
                  }}
                >
                  {t(name)}
                </button>
              ),
            )}
          </div>
          <p className={styles.results} role="status">
            {view === "saved"
              ? `${saved.length} ${t("saved on this device")}`
              : loading
                ? t("Finding your next stay…")
                : error
                  ? t(error)
                  : `${total.toLocaleString(locale === "es" ? "es-ES" : "en-GB")} ${t("places to explore")} ${search ? `${t("around")} ${search}` : t("across Spain")}`}{" "}
            · <span>{t("Listings awaiting property verification")}</span>
          </p>
          {trip && (
            <p className={styles.trip}>
              {trip.checkIn} → {trip.checkOut} · {trip.guests}{" "}
              {t(Number(trip.guests) === 1 ? "guest" : "guests")}.{" "}
              {t("Dates are for planning; availability is not checked yet.")}
            </p>
          )}
          {view === "map" ? (
            <div className={styles.stayMap}>
              <StayMap
                locale={locale}
                points={noEvents}
                styleUrl={config.mapStyleUrl}
                center={{ latitude: center.lat, longitude: center.lng }}
                initialVertical="accommodation"
                showVerticalTabs={false}
                venueDestination="akiduermo"
              />
            </div>
          ) : (
            <>
              {error ? (
                <button
                  className={styles.mapButton}
                  onClick={() => setRetry((v) => v + 1)}
                >
                  {t("Try again")}
                </button>
              ) : loading && view !== "saved" ? (
                <div className={styles.cards}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={styles.skeleton} />
                  ))}
                </div>
              ) : (
                <div className={styles.cards}>
                  {shown.map((stay) => (
                    <article key={stay.id} className={styles.card}>
                      <div className={styles.propertyVisual}>
                        <div>
                          <Icon name="bed" size={40} />
                          <span>
                            {t(
                              stayTypeNames[stay.accommodationType] ||
                                "Accommodation",
                            )}
                          </span>
                        </div>
                        <small>{t("Property photos coming soon")}</small>
                        <button
                          className={styles.saveButton}
                          aria-label={`${saved.some((x) => x.id === stay.id) ? t("Unsave") : t("Save")} ${stay.name}`}
                          aria-pressed={saved.some((x) => x.id === stay.id)}
                          onClick={() => toggleSaved(stay)}
                        >
                          <Icon
                            name={
                              saved.some((x) => x.id === stay.id)
                                ? "heart-fill"
                                : "heart"
                            }
                            size={21}
                          />
                        </button>
                      </div>
                      <div className={styles.cardBody}>
                        <span className={styles.city}>
                          <Icon name="map" size={14} /> {stay.city}
                        </span>
                        <h3>
                          <Link href={stayHref(stay.slug, locale)}>
                            {stay.name}
                          </Link>
                        </h3>
                        <p>{stay.address}</p>
                        <div className={styles.cardFoot}>
                          <span>
                            {t("Discover the property")}
                            <small>
                              {t("Rates & availability coming later")}
                            </small>
                          </span>
                          <Link
                            className={styles.viewStay}
                            href={stayHref(stay.slug, locale)}
                            aria-label={`${t("View")} ${stay.name}`}
                          >
                            <Icon name="arrow-right" size={20} />
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {!loading && !error && !shown.length && (
                <p className={styles.empty}>
                  {view === "saved"
                    ? t("Tap the heart on a stay to keep it here.")
                    : t(
                        "No stays found. Try a nearby town or another property type.",
                      )}
                </p>
              )}
              {view === "explore" && total > 12 && !error && (
                <div className={styles.pagination}>
                  <button
                    disabled={page === 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <Icon
                      name="arrow-right"
                      size={16}
                      className={styles.backArrow}
                    />{" "}
                    {t("Previous")}
                  </button>
                  <span>
                    {t("Page")} {page} {t("of")} {Math.ceil(total / 12)}
                  </span>
                  <button
                    disabled={page * 12 >= total || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {t("Next")} <Icon name="arrow-right" size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
        <section className={styles.crossSell}>
          <Icon name="discover" size={32} />
          <div>
            <span className={styles.kicker}>
              {t("THE NIGHT IS ONLY HALF THE STORY")}
            </span>
            <h2>{t("Stay here. Go everywhere.")}</h2>
            <p>
              {t(
                "Find a place to stay, then discover the food, music and little adventures around it.",
              )}
            </p>
          </div>
          <a href={`https://akipasa.com/${locale}`}>
            {t("Explore AkiPasa")} <Icon name="arrow-right" size={18} />
          </a>
        </section>
        <footer className={styles.footer}>
          <strong>
            AkiDuermo<span>.</span>
          </strong>
          <p>{t("A new chapter in the AkiPasa family.")}</p>
          <div>
            <span>
              {t("Discovery preview. No bookings or payments are taken.")}
            </span>
            <a href={`https://akipasa.com/${locale}/privacy`}>{t("Privacy")}</a>
            <a href={`https://akipasa.com/${locale}/terms`}>{t("Terms")}</a>
          </div>
        </footer>
      </main>
      <nav className={styles.bottomNav} aria-label={t("AkiDuermo navigation")}>
        <button
          aria-pressed={view === "explore"}
          onClick={() => {
            setView("explore");
            document
              .getElementById("stays")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <Icon name="discover" size={22} />
          {t("Explore")}
        </button>
        <button
          aria-pressed={view === "saved"}
          onClick={() => {
            setView("saved");
            document
              .getElementById("stays")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <Icon name="saved" size={22} />
          {t("Saved")}
          {saved.length ? ` (${saved.length})` : ""}
        </button>
        <button
          aria-pressed={view === "map"}
          onClick={() => {
            setView("map");
            document
              .getElementById("stays")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <Icon name="map" size={22} />
          {t("Map")}
        </button>
        <a href={`https://akipasa.com/${locale}`}>
          <Icon name="activity" size={22} />
          AkiPasa
        </a>
      </nav>
    </div>
  );
}
