"use client";

import React, { useMemo, useState } from "react";
import { Icon } from "../../../../components/Icons";

export type StaffPromotion = {
  id: string;
  venueName: string | null;
  service: string;
  message: string | null;
  state: string;
  operatorNotes: string | null;
  createdAt: string;
};

type Filter = "all" | "new" | "working" | "closed";

const knownStates: Record<string, { en: string; es: string; tone: string }> = {
  new: { en: "New", es: "Nueva", tone: "new" },
  contacted: { en: "Contacted", es: "Contactada", tone: "working" },
  qualified: { en: "Qualified", es: "Cualificada", tone: "working" },
  won: { en: "Won", es: "Ganada", tone: "won" },
  lost: { en: "Lost", es: "Perdida", tone: "lost" },
};

const knownServices: Record<string, { en: string; es: string }> = {
  featured_listing: { en: "Featured listing", es: "Local destacado" },
  featured_event: { en: "Featured event", es: "Evento destacado" },
  sponsored_event: { en: "Sponsored event", es: "Evento patrocinado" },
  sponsored_listing: { en: "Sponsored listing", es: "Local patrocinado" },
};

function stateLabel(state: string, es: boolean) {
  return (
    (es ? knownStates[state]?.es : knownStates[state]?.en) ||
    state.replaceAll("_", " ")
  );
}

function serviceLabel(service: string, es: boolean) {
  const known = knownServices[service];
  if (known) return es ? known.es : known.en;
  const human = service.replaceAll("_", " ").trim();
  return human
    ? human[0].toUpperCase() + human.slice(1)
    : es
      ? "Servicio"
      : "Service";
}

function requestDate(value: string, es: boolean) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat(es ? "es-ES" : "en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/Madrid",
  }).format(date);
}

export function StaffPromotionsInbox({
  locale,
  requests,
}: {
  locale: "en" | "es";
  requests: StaffPromotion[];
}) {
  const es = locale === "es";
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const lowerSearch = search.trim().toLocaleLowerCase(locale);

  const counts = useMemo(
    () => ({
      all: requests.length,
      new: requests.filter((item) => item.state === "new").length,
      working: requests.filter((item) =>
        ["contacted", "qualified"].includes(item.state),
      ).length,
      closed: requests.filter((item) => ["won", "lost"].includes(item.state))
        .length,
    }),
    [requests],
  );

  const shown = useMemo(
    () =>
      requests.filter((item) => {
        const inGroup =
          filter === "all" ||
          (filter === "new" && item.state === "new") ||
          (filter === "working" &&
            ["contacted", "qualified"].includes(item.state)) ||
          (filter === "closed" && ["won", "lost"].includes(item.state));
        if (!inGroup) return false;
        if (!lowerSearch) return true;
        return [
          item.venueName,
          item.service,
          serviceLabel(item.service, es),
          item.message,
          item.operatorNotes,
          stateLabel(item.state, es),
        ].some((value) =>
          value?.toLocaleLowerCase(locale).includes(lowerSearch),
        );
      }),
    [requests, filter, lowerSearch, es, locale],
  );

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: es ? "Todas" : "All", count: counts.all },
    { value: "new", label: es ? "Nuevas" : "New", count: counts.new },
    {
      value: "working",
      label: es ? "En gestión" : "In progress",
      count: counts.working,
    },
    {
      value: "closed",
      label: es ? "Cerradas" : "Closed",
      count: counts.closed,
    },
  ];

  return (
    <div className="staff-promotions-page">
      <header className="staff-promotions-intro">
        <span className="staff-promotions-eyebrow">
          <Icon name="megaphone" />
          {es ? "Bandeja comercial" : "Commercial inbox"}
        </span>
        <div className="staff-promotions-intro-row">
          <div>
            <h1>{es ? "Promociones" : "Promotions"}</h1>
            <p>
              {es
                ? "Solicitudes de visibilidad de negocios, organizadas para que encuentres lo importante."
                : "Business visibility requests, organised so you can find what matters."}
            </p>
          </div>
          <div className="staff-promotions-total">
            <strong>{counts.all}</strong>
            <span>{es ? "solicitudes recientes" : "recent requests"}</span>
          </div>
        </div>
      </header>

      <section
        className="staff-promotions-highlights"
        aria-label={es ? "Resumen de solicitudes" : "Request summary"}
      >
        {[
          {
            value: counts.new,
            label: es ? "Por revisar" : "To review",
            tone: "new",
            group: "new" as Filter,
          },
          {
            value: counts.working,
            label: es ? "En seguimiento" : "In progress",
            tone: "working",
            group: "working" as Filter,
          },
          {
            value: counts.closed,
            label: es ? "Finalizadas" : "Closed",
            tone: "closed",
            group: "closed" as Filter,
          },
        ].map((item) => (
          <button
            key={item.group}
            className={
              "staff-promotions-highlight staff-promotions-highlight--" +
              item.tone
            }
            type="button"
            aria-pressed={filter === item.group}
            onClick={() =>
              setFilter((current) =>
                current === item.group ? "all" : item.group,
              )
            }
          >
            <strong>{item.value}</strong>
            <span>{item.label}</span>
            <Icon name="chevron" />
          </button>
        ))}
      </section>

      <section
        className="staff-promotions-worklist"
        aria-label={es ? "Lista de solicitudes" : "Requests list"}
      >
        <div className="staff-promotions-controls">
          <div className="staff-promotions-search">
            <Icon name="search" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                es
                  ? "Buscar local, servicio o mensaje"
                  : "Search venue, service or message"
              }
              aria-label={es ? "Buscar solicitudes" : "Search requests"}
            />
          </div>
          <div
            className="staff-promotions-filters"
            role="group"
            aria-label={es ? "Filtrar por estado" : "Filter by status"}
          >
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                className={filter === item.value ? "active" : ""}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
                <span>{item.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="staff-promotions-results-line" aria-live="polite">
          <strong>{shown.length}</strong>{" "}
          {es ? "solicitudes visibles" : "requests shown"}
          <span>
            {es
              ? "Últimas 50 solicitudes cargadas"
              : "Latest 50 requests loaded"}
          </span>
        </div>

        {shown.length ? (
          <div className="staff-promotions-grid">
            {shown.map((item) => {
              const state = knownStates[item.state];
              return (
                <details className="staff-promotions-card" key={item.id}>
                  <summary>
                    <span className="staff-promotions-card-top">
                      <span className="staff-promotions-service">
                        <Icon name="megaphone" />
                        {serviceLabel(item.service, es)}
                      </span>
                      <span
                        className={
                          "staff-promotions-state staff-promotions-state--" +
                          (state?.tone || "other")
                        }
                      >
                        {stateLabel(item.state, es)}
                      </span>
                    </span>
                    <span className="staff-promotions-card-title">
                      {item.venueName ||
                        (es ? "Local sin nombre" : "Unnamed venue")}
                    </span>
                    <span className="staff-promotions-card-preview">
                      {item.message?.trim() ||
                        (es ? "Sin mensaje adjunto" : "No message supplied")}
                    </span>
                    <span className="staff-promotions-card-footer">
                      <time dateTime={item.createdAt}>
                        {requestDate(item.createdAt, es)}
                      </time>
                      <span className="staff-promotions-details-toggle">
                        {es ? "Ver detalles" : "View details"}
                        <Icon name="chevron" />
                      </span>
                    </span>
                  </summary>
                  <div className="staff-promotions-card-details">
                    <div>
                      <h3>{es ? "Mensaje del negocio" : "Business message"}</h3>
                      <p>
                        {item.message?.trim() ||
                          (es
                            ? "Sin mensaje adjunto."
                            : "No message supplied.")}
                      </p>
                    </div>
                    <div>
                      <h3>{es ? "Notas internas" : "Internal notes"}</h3>
                      <p>
                        {item.operatorNotes?.trim() ||
                          (es
                            ? "Todavía no hay notas."
                            : "No notes recorded yet.")}
                      </p>
                    </div>
                    <p className="staff-promotions-readonly">
                      <Icon name="lock" />
                      {es
                        ? "Vista de consulta. La gestión y actualización de estados se hace en Administración."
                        : "Read-only view. Manage requests and update statuses in Administration."}
                    </p>
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <div className="staff-promotions-empty">
            <Icon name="inbox" />
            <h2>
              {counts.all === 0
                ? es
                  ? "Sin solicitudes todavía"
                  : "No requests yet"
                : es
                  ? "Nada coincide"
                  : "No matching requests"}
            </h2>
            <p>
              {counts.all === 0
                ? es
                  ? "Las nuevas solicitudes aparecerán aquí."
                  : "New promotion requests will appear here."
                : es
                  ? "Prueba otro estado o cambia la búsqueda."
                  : "Try another status or a different search."}
            </p>
            {counts.all > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFilter("all");
                  setSearch("");
                }}
              >
                {es ? "Limpiar filtros" : "Clear filters"}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
