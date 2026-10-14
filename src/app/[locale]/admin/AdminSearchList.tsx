"use client";

import React, { useMemo, useState, type ReactNode } from "react";
import { Icon } from "../../../components/Icons";

export type AdminSearchItem = {
  id: string;
  search: string;
  status?: string | null;
  content: ReactNode;
};

export function AdminSearchList({
  locale,
  items,
  label,
  statuses = [],
  statusLabels = {},
  className = "",
  limit = 24,
}: {
  locale: "en" | "es";
  items: AdminSearchItem[];
  label: string;
  statuses?: string[];
  statusLabels?: Record<string, string>;
  className?: string;
  limit?: number;
}) {
  const es = locale === "es";
  const [search, setSearch] = useState("");
  const [state, setState] = useState("all");
  const [visibleCount, setVisibleCount] = useState(limit);
  const result = useMemo(() => {
    const term = search.trim().toLocaleLowerCase(locale);
    return items.filter(
      (item) =>
        (state === "all" || item.status === state) &&
        (!term || item.search.toLocaleLowerCase(locale).includes(term)),
    );
  }, [items, locale, search, state]);
  const statusOptions = statuses.length
    ? statuses
    : [
        ...new Set(
          items
            .map((item) => item.status)
            .filter((value): value is string => Boolean(value)),
        ),
      ];
  const loadedLabel = es ? "registros cargados" : "loaded records";
  return (
    <section className="admin-search-list" aria-label={label}>
      <div className="admin-list-controls">
        <label className="admin-list-search">
          <Icon name="search" />
          <span className="sr-only">
            {es ? "Buscar en" : "Search"} {label}
          </span>
          <input
            type="search"
            aria-label={es ? `Buscar en ${label}` : `Search ${label}`}
            placeholder={
              es
                ? "Buscar por nombre, estado o contenido…"
                : "Search names, status or content…"
            }
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(limit);
            }}
          />
        </label>
        {statusOptions.length > 0 && (
          <label className="admin-list-select">
            <span>{es ? "Estado" : "Status"}</span>
            <select
              aria-label={
                es ? `Filtrar ${label} por estado` : `Filter ${label} by status`
              }
              value={state}
              onChange={(event) => {
                setState(event.target.value);
                setVisibleCount(limit);
              }}
            >
              <option value="all">
                {es ? "Todos los estados" : "All statuses"}
              </option>
              {statusOptions.map((value) => (
                <option key={value} value={value}>
                  {Object.hasOwn(statusLabels, value)
                    ? statusLabels[value]
                    : value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="admin-list-meta" role="status" aria-live="polite">
        <span>
          <strong>{result.length}</strong> {es ? "coincidencias" : "matches"}
        </span>
        <span>
          {items.length} {loadedLabel}
        </span>
      </div>
      {result.length ? (
        <div className={`admin-list-results ${className}`}>
          {result.slice(0, visibleCount).map((item) => (
            <div className="admin-list-entry" key={item.id}>
              {item.content}
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-list-no-results">
          <Icon name="inbox" />
          <p>
            {items.length === 0
              ? es
                ? "No hay registros en esta vista."
                : "No records in this view."
              : es
                ? "No hay coincidencias. Cambia la búsqueda o el estado."
                : "No matches. Try a different search or status."}
          </p>
          {(search || state !== "all") && (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setSearch("");
                setState("all");
                setVisibleCount(limit);
              }}
            >
              {es ? "Limpiar filtros" : "Clear filters"}
            </button>
          )}
        </div>
      )}
      {visibleCount < result.length && (
        <button
          className="button secondary admin-load-more"
          type="button"
          onClick={() => setVisibleCount((current) => current + limit)}
        >
          {es ? "Ver más" : "Show more"} ({result.length - visibleCount})
        </button>
      )}
    </section>
  );
}
