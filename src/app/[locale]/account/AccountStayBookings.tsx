import React from "react";
import Link from "next/link";
import { Icon } from "../../../components/Icons";
import { AccountCollectionState } from "./AccountCollectionState";

export type AccountStayBooking = {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  guests: number;
  quoted_total_cents: number;
  quote_snapshot: { room_name?: string } | null;
};

export function AccountStayBookings({
  locale,
  stays,
  failed = false,
  cancel,
}: {
  locale: "es" | "en";
  stays: AccountStayBooking[];
  failed?: boolean;
  cancel: (form: FormData) => Promise<void>;
}) {
  const es = locale === "es";
  const exploreHref = `https://akiduermo.akipasa.com/?lang=${locale}`;
  const statuses: Record<string, string> = {
    requested: es ? "Pendiente de aprobación" : "Pending approval",
    confirmed: es ? "Confirmada" : "Confirmed",
    checked_in: es ? "En curso" : "Checked in",
    completed: es ? "Completada" : "Completed",
    checked_out: es ? "Finalizada" : "Checked out",
    cancelled: es ? "Cancelada" : "Cancelled",
    declined: es ? "Rechazada" : "Declined",
    no_show: es ? "No presentado" : "No show",
  };
  const dateFormatter = new Intl.DateTimeFormat(es ? "es-ES" : "en-GB", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const date = (value: string) => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(parsed.getTime())
      ? dateFormatter.format(parsed)
      : value;
  };
  const money = new Intl.NumberFormat(es ? "es-ES" : "en-GB", {
    style: "currency",
    currency: "EUR",
  });

  return (
    <section
      className="account-booking-section"
      aria-labelledby="account-stays-heading"
    >
      <header className="account-collection-section-heading">
        <span className="account-collection-icon is-stay" aria-hidden="true">
          <Icon name="bed" size={23} />
        </span>
        <div>
          <span>AkiDuermo</span>
          <h2 id="account-stays-heading">{es ? "Alojamientos" : "Stays"}</h2>
        </div>
        <Link className="account-section-link" href={exploreHref}>
          {es ? "Explorar" : "Explore"}
          <Icon name="arrow-right" size={16} />
        </Link>
      </header>
      {failed ? (
        <AccountCollectionState
          locale={locale}
          icon="bed"
          title={
            es
              ? "No se han podido cargar las estancias"
              : "Stays could not be loaded"
          }
          description={
            es
              ? "Vuelve a intentarlo para consultar tus reservas."
              : "Try again to see your stay bookings."
          }
          failed
        />
      ) : !stays.length ? (
        <AccountCollectionState
          locale={locale}
          icon="bed"
          title={
            es
              ? "Tu próxima escapada te espera"
              : "Your next getaway is waiting"
          }
          description={
            es
              ? "Las estancias que reserves en AkiDuermo aparecerán aquí."
              : "Stays you book with AkiDuermo will appear here."
          }
          actionHref={exploreHref}
          actionLabel={es ? "Buscar alojamiento" : "Find a stay"}
        />
      ) : (
        <>
          <div className="account-collection-meta">
            <span>
              <strong>{stays.length.toLocaleString(locale)}</strong>{" "}
              {es ? "reservas de alojamiento" : "stay bookings"}
            </span>
            {stays.length >= 100 && (
              <small>
                {es ? "Últimas 100 reservas" : "Latest 100 bookings"}
              </small>
            )}
          </div>
          <div className="account-stay-grid">
            {stays.map((stay) => (
              <article className="account-stay-card" key={stay.id}>
                <div className="account-stay-card-heading">
                  <h3>{stay.quote_snapshot?.room_name || "AkiDuermo"}</h3>
                  <span
                    className="account-stay-status"
                    data-status={stay.status}
                  >
                    {statuses[stay.status] || stay.status}
                  </span>
                </div>
                <dl className="account-stay-dates">
                  <div>
                    <dt>{es ? "Entrada" : "Check-in"}</dt>
                    <dd>
                      <time dateTime={stay.check_in}>
                        {date(stay.check_in)}
                      </time>
                    </dd>
                  </div>
                  <div>
                    <dt>{es ? "Salida" : "Check-out"}</dt>
                    <dd>
                      <time dateTime={stay.check_out}>
                        {date(stay.check_out)}
                      </time>
                    </dd>
                  </div>
                </dl>
                <div className="account-stay-summary">
                  <span>
                    <Icon name="users" size={17} />
                    {stay.guests} {es ? "huéspedes" : "guests"}
                  </span>
                  <span>
                    {es ? "Total" : "Total"}{" "}
                    <strong>
                      {money.format(stay.quoted_total_cents / 100)}
                    </strong>
                  </span>
                </div>
                <details className="account-stay-options">
                  <summary>
                    {es ? "Detalles y opciones" : "Details and options"}
                  </summary>
                  <dl>
                    <div>
                      <dt>{es ? "Referencia" : "Reference"}</dt>
                      <dd>{stay.id}</dd>
                    </div>
                  </dl>
                  {["requested", "confirmed"].includes(stay.status) && (
                    <details className="account-stay-cancel">
                      <summary>
                        {es ? "Cancelar estancia" : "Cancel stay"}
                      </summary>
                      <p>
                        {es
                          ? "¿Quieres cancelar esta estancia? Consulta las condiciones y cualquier depósito con el alojamiento."
                          : "Cancel this stay? Contact the property about its conditions and any deposit."}
                      </p>
                      <form action={cancel}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="bookingId" value={stay.id} />
                        <button type="submit" className="button secondary">
                          {es ? "Sí, cancelar estancia" : "Yes, cancel stay"}
                        </button>
                      </form>
                    </details>
                  )}
                </details>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
