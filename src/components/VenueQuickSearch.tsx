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
  const [offset, setOffset] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    const timer = window.setTimeout(
      async () => {
        try {
          const response = await fetch(
            `/api/search/venues?${new URLSearchParams({ q: trimmed, offset: String(offset) })}`,
            { signal: controller.signal },
          );
          if (!response.ok) throw new Error("Venue search unavailable");
          const result = (await response.json()) as {
            rows: VenueSearchResult[];
            total: number;
            nextOffset: number | null;
          };
          if (controller.signal.aborted) return;
          setRows((previous) =>
            offset === 0
              ? result.rows
              : [
                  ...previous,
                  ...result.rows.filter(
                    (row) => !previous.some((old) => old.id === row.id),
                  ),
                ],
          );
          setTotal(result.total);
          setNextOffset(result.nextOffset);
        } catch {
          if (!controller.signal.aborted) setFailed(true);
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      offset === 0 ? 240 : 0,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, offset, retry]);
  function loadMore() {
    if (!loading && !failed && nextOffset !== null) {
      setLoading(true);
      setOffset(nextOffset);
    }
  }
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
          onChange={(event) => {
            setQuery(event.target.value);
            setRows([]);
            setOffset(0);
            setNextOffset(null);
            setTotal(0);
            setFailed(false);
            setLoading(event.target.value.trim().length >= 2);
            if (resultsRef.current) resultsRef.current.scrollTop = 0;
          }}
          placeholder={
            es ? "Local, ciudad o dirección…" : "Venue, city or address…"
          }
          autoComplete="off"
          spellCheck={false}
          aria-label={es ? "Buscar locales" : "Search venues"}
          aria-controls="venue-search-results"
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
      {query.trim().length >= 2 && (
        <div
          id="venue-search-results"
          className={styles.results}
          ref={resultsRef}
          role="region"
          aria-label={es ? "Resultados de locales" : "Venue results"}
          tabIndex={0}
          onScroll={(event) => {
            const el = event.currentTarget;
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 80)
              loadMore();
          }}
        >
          <p className={styles.status} role="status">
            {loading && !rows.length
              ? es
                ? "Buscando…"
                : "Searching…"
              : rows.length
                ? `${rows.length} / ${total} ${es ? "locales" : "venues"}`
                : !failed
                  ? es
                    ? "No encontramos ningún local."
                    : "No venues found."
                  : ""}
          </p>
          {rows.map((venue) => (
            <Link
              key={venue.id}
              className={styles.result}
              href={
                venue.discovery_vertical === "accommodation"
                  ? `https://akiduermo.akipasa.com/stays/${encodeURIComponent(venue.slug)}?lang=${locale}`
                  : `/${locale}/venues/${encodeURIComponent(venue.slug)}`
              }
              prefetch={false}
            >
              <span>
                <strong>{venue.name}</strong>
                {venue.address && <small>{venue.address}</small>}
              </span>
              <Icon name="arrow-right" />
            </Link>
          ))}
          {failed ? (
            <div className={styles.status}>
              <p>
                {es
                  ? "No se pudieron cargar los resultados."
                  : "Could not load results."}
              </p>
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
              >
                {es ? "Reintentar" : "Retry"}
              </button>
            </div>
          ) : (
            nextOffset !== null && (
              <button
                className={styles.more}
                type="button"
                onClick={loadMore}
                disabled={loading}
              >
                {loading
                  ? es
                    ? "Cargando…"
                    : "Loading…"
                  : es
                    ? "Ver más locales"
                    : "Show more venues"}
              </button>
            )
          )}
        </div>
      )}
    </section>
  );
}
