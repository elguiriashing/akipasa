"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icons";

export type MyBooking = {
  id: string;
  party_size: number;
  status: string;
  created_at: string;
  venue: { name: string; slug: string; address?: string } | null;
  offeringName?: string | null;
  slot: { starts_at: string; ends_at: string } | null;
};

type Filter = "upcoming" | "active" | "past";

export function MyBookings({
  locale,
  bookings,
  currentTab,
  counts,
  pageNumber = 0,
  cancel,
}: {
  locale: "es" | "en";
  bookings: MyBooking[];
  currentTab?: Filter;
  counts?: Record<Filter, number>;
  pageNumber?: number;
  cancel?: (form: FormData) => Promise<void>;
}) {
  const es = locale === "es";
  const [filter, setFilter] = useState<Filter>(currentTab || "upcoming");
  const now = Date.now();
  const sections = useMemo(() => {
    const result: Record<Filter, MyBooking[]> = {
      upcoming: [],
      active: [],
      past: [],
    };
    for (const booking of bookings) {
      const starts = booking.slot
        ? new Date(booking.slot.starts_at).getTime()
        : NaN;
      const ends = booking.slot
        ? new Date(booking.slot.ends_at).getTime()
        : NaN;
      if (
        ["declined", "cancelled", "completed"].includes(booking.status) ||
        (Number.isFinite(ends) && ends <= now)
      ) {
        result.past.push(booking);
      } else if (Number.isFinite(starts) && starts <= now && ends > now) {
        result.active.push(booking);
      } else if (Number.isFinite(starts)) {
        result.upcoming.push(booking);
      } else {
        result.past.push(booking);
      }
    }
    result.upcoming.sort(
      (a, b) =>
        new Date(a.slot!.starts_at).getTime() -
        new Date(b.slot!.starts_at).getTime(),
    );
    result.past.sort(
      (a, b) =>
        new Date(b.slot?.starts_at || b.created_at).getTime() -
        new Date(a.slot?.starts_at || a.created_at).getTime(),
    );
    return result;
  }, [bookings, now]);
  const labels: Record<Filter, string> = {
    upcoming: es ? "Próximas" : "Upcoming",
    active: es ? "En curso" : "Active",
    past: es ? "Historial" : "Past",
  };
  const visibleFilter = currentTab || filter;
  const visibleBookings = currentTab ? bookings : sections[filter];
  const statuses: Record<string, string> = {
    requested: es ? "Pendiente de aprobación" : "Pending approval",
    confirmed: es ? "Confirmada" : "Confirmed",
    declined: es ? "Rechazada" : "Declined",
    completed: es ? "Completada" : "Completed",
    cancelled: es ? "Cancelada" : "Cancelled",
  };
  return (
    <div className="my-bookings-app">
      <div
        className="my-bookings-tabs"
        role="group"
        aria-label={es ? "Filtrar reservas" : "Filter bookings"}
      >
        {(["upcoming", "active", "past"] as const).map((key) =>
          currentTab ? (
            <Link
              key={key}
              href={`/${locale}/account/bookings?tab=${key}`}
              aria-current={visibleFilter === key ? "page" : undefined}
              className={visibleFilter === key ? "selected" : ""}
            >
              {labels[key]} <span>{counts?.[key] || 0}</span>
            </Link>
          ) : (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              className={filter === key ? "selected" : ""}
              onClick={() => setFilter(key)}
            >
              {labels[key]} <span>{sections[key].length}</span>
            </button>
          ),
        )}
      </div>
      {visibleBookings.length === 0 ? (
        <div className="panel my-bookings-empty">
          <Icon name="calendar" size={34} />
          <h2>{es ? "Nada por aquí todavía" : "Nothing here yet"}</h2>
          <p>
            {es
              ? "Tus reservas aparecerán aquí cuando hagas una solicitud."
              : "Your bookings will appear here once you request a reservation."}
          </p>
          <Link href={`/${locale}`} className="button">
            {es ? "Explorar locales" : "Explore venues"}{" "}
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      ) : (
        <div className="my-bookings-list">
          {visibleBookings.map((booking) => {
            const start = booking.slot?.starts_at;
            const venue = booking.venue;
            const date = start
              ? new Date(start).toLocaleDateString(es ? "es-ES" : "en-GB", {
                  timeZone: "Europe/Madrid",
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "";
            const time = start
              ? new Date(start).toLocaleTimeString(es ? "es-ES" : "en-GB", {
                  timeZone: "Europe/Madrid",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";
            return (
              <article key={booking.id} className="panel my-booking-card">
                <div className="my-booking-calendar">
                  <Icon name="calendar" size={25} />
                  <span>{date}</span>
                </div>
                <div className="my-booking-info">
                  <span className="eyebrow">
                    {es ? "Reserva AkiPasa" : "AkiPasa booking"}
                  </span>
                  <h3>{venue?.name || (es ? "Local" : "Venue")}</h3>
                  {booking.offeringName && <span>{booking.offeringName}</span>}
                  {venue?.address && <small>{venue.address}</small>}
                  <div className="my-booking-meta">
                    <span>
                      <Icon name="calendar" size={15} />{" "}
                      {time || (es ? "Hora pendiente" : "Time unavailable")}
                    </span>
                    <span>
                      <Icon name="users" size={15} /> {booking.party_size}{" "}
                      {es ? "personas" : "guests"}
                    </span>
                  </div>
                </div>
                <div className="my-booking-actions">
                  <span
                    className={`my-booking-status status-${booking.status}`}
                  >
                    {statuses[booking.status] || booking.status}
                  </span>
                  {cancel &&
                    visibleFilter === "upcoming" &&
                    ["requested", "confirmed"].includes(booking.status) && (
                      <details className="booking-cancel">
                        <summary>
                          {es ? "Cancelar reserva" : "Cancel booking"}
                        </summary>
                        <p>
                          {es
                            ? "Se liberarán tus plazas. Consulta con el local cualquier depósito."
                            : "Your places will be released. Contact the venue about any deposit."}
                        </p>
                        <form action={cancel}>
                          <input type="hidden" name="locale" value={locale} />
                          <input
                            type="hidden"
                            name="bookingId"
                            value={booking.id}
                          />
                          <button className="button secondary" type="submit">
                            {es ? "Sí, cancelar" : "Yes, cancel"}
                          </button>
                        </form>
                      </details>
                    )}
                  {venue?.slug && (
                    <Link
                      className="button secondary"
                      href={`/${locale}/venues/${encodeURIComponent(venue.slug)}`}
                    >
                      {es ? "Ver local" : "View venue"}{" "}
                      <Icon name="arrow-right" size={15} />
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {currentTab && (
        <nav
          className="booking-history-pager"
          aria-label={es ? "Páginas de reservas" : "Booking pages"}
        >
          {pageNumber > 0 && (
            <Link
              className="button secondary"
              href={`/${locale}/account/bookings?tab=${currentTab}&page=${pageNumber - 1}`}
            >
              {es ? "Anterior" : "Previous"}
            </Link>
          )}
          {(counts?.[currentTab] || 0) > (pageNumber + 1) * 20 && (
            <Link
              className="button secondary"
              href={`/${locale}/account/bookings?tab=${currentTab}&page=${pageNumber + 1}`}
            >
              {es ? "Siguiente" : "Next"}
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
