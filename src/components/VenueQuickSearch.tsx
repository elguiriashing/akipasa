"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/config";
import type { VenueSearchResult } from "@/lib/venue-search";
import { Icon } from "./Icons";
import styles from "./VenueQuickSearch.module.css";

export function VenueQuickSearch({ locale }: { locale: Locale }) {
  const es = locale === "es";
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<VenueSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const latestQuery = useRef("");

  useEffect(() => {
    const trimmed = query.trim();
    latestQuery.current = trimmed;

    if (trimmed.length < 2) {
      setRows([]);
      setLoading(false);
      setFailed(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const response = await fetch(
          `/api/search/venues?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Venue search unavailable");
        const result = (await response.json()) as {
          rows?: VenueSearchResult[];
        };
        if (latestQuery.current === trimmed) setRows(result.rows || []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setRows([]);
          setFailed(true);
        }
      } finally {
        if (latestQuery.current === trimmed) setLoading(false);
      }
    }, 240);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const showResults = query.trim().length >= 2;

  return (
    <section className={styles.search} aria-labelledby="venue-search-label">
      <div className={styles.heading}>
        <span id="venue-search-label">
          {es ? "Ir directamente a un local" : "Jump straight to a venue"}
        </span>
        <small>
          {es ? "Nombre, ciudad o dirección" : "Name, city or address"}
        </small>
      </div>

      <div className={styles.inputWrap}>
        <Icon name="search" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            es
              ? "Local, ciudad o dirección…"
              : "Venue, city or address…"
          }
          autoComplete="off"
          spellCheck={false}
          aria-label={es ? "Buscar locales" : "Search venues"}
          aria-controls="venue-search-results"
          aria-expanded={showResults}
        />
        {loading && (
          <span
            className={styles.loading}
            aria-label={es ? "Buscando" : "Searching"}
          >
            …
          </span>
        )}
      </div>

      {showResults && (
        <div
          id="venue-search-results"
          className={styles.results}
          role="list"
          aria-live="polite"
        >
          {failed ? (
            <p className={styles.status}>
              {es
                ? "La búsqueda no está disponible ahora mismo."
                : "Search is temporarily unavailable."}
            </p>
          ) : !loading && rows.length === 0 ? (
            <p className={styles.status}>
              {es ? "No encontramos ningún local." : "No venues found."}
            </p>
          ) : (
            rows.map((venue) => (
              <Link
                key={venue.id}
                className={styles.result}
                href={`/${locale}/venues/${encodeURIComponent(venue.slug)}`}
                prefetch={false}
              >
                <span>
                  <strong>{venue.name}</strong>
                  {venue.address && <small>{venue.address}</small>}
                </span>
                <Icon name="arrow-right" />
              </Link>
            ))
          )}
        </div>
      )}
    </section>
  );
}
