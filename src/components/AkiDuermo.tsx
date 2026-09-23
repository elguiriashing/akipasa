"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { config } from "@/lib/config";
import {
  stayTypeNames,
  safePropertyWebsite,
  staySchema,
  type Stay,
} from "@/lib/akiduermo";
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
function Moon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M25 20A12 12 0 0 1 12 5a12 12 0 1 0 13 15Z"
        fill="currentColor"
      />
      <path
        d="M24 4v6M21 7h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function Bed() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M7 36V19m34 17V23H7m0 10h34M12 22v-9h24v9m-12-9v9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function AkiDuermo() {
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
  const [selected, setSelected] = useState<Stay | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selected && dialogRef.current && !dialogRef.current.open)
      dialogRef.current.showModal();
  }, [selected]);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [trip, setTrip] = useState("");
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
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [search, type, page, retry]);
  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selected]);
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
        <Link href="/akiduermo" className={styles.logo}>
          <Moon />
          <span>
            Aki<span>Duermo</span>
            <i>•</i>
          </span>
        </Link>
        <div className={styles.headerRight}>
          <span className={styles.preview}>EARLY PREVIEW</span>
          <a href="https://akipasa.com/en">Go out with AkiPasa ↗</a>
        </div>
      </header>
      <main>
        <section className={styles.hero}>
          <Image
            src="/images/cities/malaga.webp"
            alt="Málaga, Spain"
            fill
            priority
            sizes="100vw"
          />
          <div className={styles.heroShade} />
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>
              GO OUT. STAY A LITTLE LONGER.
            </span>
            <h1>
              A good day deserves
              <br />a <em>great stay.</em>
            </h1>
            <p>
              Little hideaways. City weekends. One more night.
              <br />
              Find your place in Spain.
            </p>
            <span className={styles.heroLocation}>
              ↗ Málaga, Costa del Sol
            </span>
          </div>
        </section>
        <section className={styles.searchWrap} aria-label="Plan your stay">
          <form
            className={styles.search}
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(destination);
              setPage(1);
              setView("explore");
              setTrip(
                checkIn && checkOut
                  ? `${checkIn} → ${checkOut} · ${guests} guests. Dates are for planning; availability is not checked yet.`
                  : "",
              );
              document
                .getElementById("stays")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <label className={styles.destination}>
              ⌖{" "}
              <span>
                WHERE TO?
                <input
                  aria-label="Destination"
                  placeholder="City, town or property"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  maxLength={100}
                />
              </span>
            </label>
            <label>
              <span>
                CHECK IN
                <input
                  aria-label="Check in"
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
                CHECK OUT
                <input
                  aria-label="Check out"
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
                WHO’S COMING?
                <select
                  aria-label="Guests"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "guest" : "guests"}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <button className={styles.searchButton} type="submit">
              Find a stay <span>↗</span>
            </button>
          </form>
          <p className={styles.searchNote}>
            ✧ A new way to stay, from the people behind AkiPasa.{" "}
            <span>Browse now · Bookings coming later</span>
          </p>
        </section>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.kicker}>A CHANGE OF SCENERY</span>
              <h2>Where will you wake up?</h2>
            </div>
            <span className={styles.quiet}>A few places to start</span>
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
                  <small>{d.tag}</small>
                </span>
                <i>↗</i>
              </button>
            ))}
          </div>
        </section>
        <section id="stays" className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.kicker}>MAKE YOURSELF AT HOME</span>
              <h2>
                {view === "saved"
                  ? "Your saved stays"
                  : search
                    ? `Find your stay in ${search}`
                    : "A place for every kind of trip"}
              </h2>
            </div>
            <button
              className={styles.mapButton}
              onClick={() => setView(view === "map" ? "explore" : "map")}
            >
              {view === "map" ? "☷ List view" : "⌖ Map view"}
            </button>
          </div>
          <div
            className={styles.filters}
            role="group"
            aria-label="Property type"
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
                  {name}
                </button>
              ),
            )}
          </div>
          <p className={styles.results} role="status">
            {view === "saved"
              ? `${saved.length} saved on this device`
              : loading
                ? "Finding your next stay…"
                : error
                  ? error
                  : `${total.toLocaleString()} places to explore${search ? ` around ${search}` : " across Spain"}`}{" "}
            · <span>Listings awaiting property verification</span>
          </p>
          {trip && <p className={styles.trip}>{trip}</p>}
          {view === "map" ? (
            <div className={styles.stayMap}>
              <StayMap
                locale="en"
                points={noEvents}
                styleUrl={config.mapStyleUrl}
                center={{ latitude: center.lat, longitude: center.lng }}
                initialVertical="accommodation"
                showVerticalTabs={false}
              />
            </div>
          ) : (
            <>
              {error ? (
                <button
                  className={styles.mapButton}
                  onClick={() => setRetry((v) => v + 1)}
                >
                  Try again
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
                          <Bed />
                          <span>
                            {stayTypeNames[stay.accommodationType] ||
                              "Accommodation"}
                          </span>
                        </div>
                        <small>Property photos coming soon</small>
                        <button
                          className={styles.saveButton}
                          aria-label={`${saved.some((x) => x.id === stay.id) ? "Unsave" : "Save"} ${stay.name}`}
                          aria-pressed={saved.some((x) => x.id === stay.id)}
                          onClick={() => toggleSaved(stay)}
                        >
                          {saved.some((x) => x.id === stay.id) ? "♥" : "♡"}
                        </button>
                      </div>
                      <div className={styles.cardBody}>
                        <span className={styles.city}>⌖ {stay.city}</span>
                        <h3>{stay.name}</h3>
                        <p>{stay.address}</p>
                        <div className={styles.cardFoot}>
                          <span>
                            Discover the property
                            <small>Rates & availability coming later</small>
                          </span>
                          <button
                            aria-label={`View ${stay.name}`}
                            onClick={() => setSelected(stay)}
                          >
                            ↗
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {!loading && !error && !shown.length && (
                <p className={styles.empty}>
                  {view === "saved"
                    ? "Tap the heart on a stay to keep it here."
                    : "No stays found. Try a nearby town or another property type."}
                </p>
              )}
              {view === "explore" && total > 12 && !error && (
                <div className={styles.pagination}>
                  <button
                    disabled={page === 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Previous
                  </button>
                  <span>
                    Page {page} of {Math.ceil(total / 12)}
                  </span>
                  <button
                    disabled={page * 12 >= total || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </section>
        <section className={styles.crossSell}>
          <Moon />
          <div>
            <span className={styles.kicker}>
              THE NIGHT IS ONLY HALF THE STORY
            </span>
            <h2>Stay here. Go everywhere.</h2>
            <p>
              Find a place to stay, then discover the food, music and little
              adventures around it.
            </p>
          </div>
          <a href="https://akipasa.com/en">Explore AkiPasa ↗</a>
        </section>
        <footer className={styles.footer}>
          <strong>
            AkiDuermo<span>•</span>
          </strong>
          <p>A new chapter in the AkiPasa family.</p>
          <div>
            <span>Discovery preview. No bookings or payments are taken.</span>
            <a href="https://akipasa.com/en/privacy">Privacy</a>
            <a href="https://akipasa.com/en/terms">Terms</a>
          </div>
        </footer>
      </main>
      <nav className={styles.bottomNav} aria-label="AkiDuermo navigation">
        <button
          aria-pressed={view === "explore"}
          onClick={() => {
            setView("explore");
            document
              .getElementById("stays")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <span>⌕</span>Explore
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
          <span>♡</span>Saved{saved.length ? ` (${saved.length})` : ""}
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
          <span>⌖</span>Map
        </button>
        <a href="https://akipasa.com/en">
          <span>↗</span>AkiPasa
        </a>
      </nav>
      {selected && (
        <dialog
          ref={dialogRef}
          onCancel={() => setSelected(null)}
          onClose={() => setSelected(null)}
          className={styles.dialog}
          aria-labelledby="stay-title"
        >
          <form method="dialog">
            <button
              aria-label="Close property details"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
          </form>
          <Bed />
          <span className={styles.kicker}>
            {stayTypeNames[selected.accommodationType] || "Accommodation"}
          </span>
          <h2 id="stay-title">{selected.name}</h2>
          <p>{selected.address}</p>
          <p className={styles.trip}>
            This listing is unclaimed and awaits property verification. Prices,
            facilities and availability have not been confirmed.
          </p>
          {selected.website && (
            <a
              className={styles.dialogCta}
              href={safePropertyWebsite(selected.website) || undefined}
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              Visit property website ↗
            </a>
          )}
          <a
            href={`https://akipasa.com/en/venues/${encodeURIComponent(selected.slug)}`}
          >
            View listing on AkiPasa ↗
          </a>
          <button
            className={styles.mapButton}
            onClick={() => toggleSaved(selected)}
          >
            {saved.some((x) => x.id === selected.id)
              ? "Remove from saved"
              : "Save this stay"}
          </button>
        </dialog>
      )}
    </div>
  );
}
