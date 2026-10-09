import Link from "next/link";
import { Icon } from "@/components/Icons";

/** Purpose-built accommodation surface. Never reinterpret hourly slots as nights. */
export function AccommodationBookingWorkspace({
  locale,
  venueId,
}: {
  locale: "es" | "en";
  venueId: string;
}) {
  const es = locale === "es";
  const base = `/${locale}/business/venue/${venueId}`;
  const tools = [
    { icon: "inbox" as const, title: es ? "Reservas" : "Reservations", detail: es ? "Entradas, salidas y huéspedes" : "Arrivals, departures and guests" },
    { icon: "calendar" as const, title: es ? "Calendario" : "Calendar", detail: es ? "Noches disponibles y bloqueadas" : "Available and blocked nights" },
    { icon: "home" as const, title: es ? "Habitaciones" : "Rooms & units", detail: es ? "Tipos, unidades y ocupación" : "Room types, units and capacity" },
    { icon: "venue" as const, title: es ? "Tarifas" : "Nightly rates", detail: es ? "Precios, temporadas y estancia mínima" : "Prices, seasons and minimum stays" },
  ];
  return (
    <section className="panel stack accommodation-booking-workspace" aria-label={es ? "Gestión de reservas AkiDuermo" : "AkiDuermo booking management"}>
      <div className="workspace-inline-heading">
        <div>
          <span className="eyebrow">AkiDuermo</span>
          <h2>{es ? "Gestión de alojamientos" : "Accommodation management"}</h2>
          <p>{es ? "Un espacio específico para reservas por noche, no para turnos de restaurante." : "A workspace for overnight stays, not restaurant time slots."}</p>
        </div>
      </div>
      <div className="accommodation-tool-grid">
        {tools.map((tool) => (
          <article key={tool.title} className="accommodation-tool-tile">
            <Icon name={tool.icon} />
            <strong>{tool.title}</strong>
            <small>{tool.detail}</small>
            <span className="status-pill">{es ? "En preparación" : "Being prepared"}</span>
          </article>
        ))}
      </div>
      <p className="notice" role="status">
        {es
          ? "Las reservas de noches siguen desactivadas. Debemos instalar y verificar las habitaciones, tarifas y controles antisolapamiento antes de aceptar huéspedes. No se han creado reservas ficticias."
          : "Overnight bookings remain disabled. Room inventory, nightly rates and overlap protection must be installed and tested before accepting guests. No sample reservations have been created."}
      </p>
      <Link className="button secondary" href={`${base}?section=profile`}>
        {es ? "Editar ficha y fotografías" : "Edit property details and photos"}
      </Link>
    </section>
  );
}
