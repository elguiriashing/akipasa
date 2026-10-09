"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icons";

type Section = "reservations" | "calendar" | "rooms" | "rates";
const sections: { id: Section; icon: IconName; en: string; es: string }[] = [
  { id: "reservations", icon: "inbox", en: "Reservations", es: "Reservas" },
  { id: "calendar", icon: "calendar", en: "Calendar", es: "Calendario" },
  { id: "rooms", icon: "home", en: "Rooms & units", es: "Habitaciones" },
  { id: "rates", icon: "venue", en: "Rates & rules", es: "Tarifas" },
];

/**
 * This is an actual, keyboard-accessible property management navigation surface,
 * not a booking form. Until room-night persistence is validated it never claims
 * inventory or accepts a reservation.
 */
export function AccommodationBookingWorkspace({
  locale,
  venueId,
}: {
  locale: "es" | "en";
  venueId: string;
}) {
  const es = locale === "es";
  const [active, setActive] = useState<Section>("reservations");
  const base = `/${locale}/business/venue/${venueId}`;
  const title = sections.find((section) => section.id === active)!;
  const copy: Record<Section, [string, string]> = {
    reservations: ["Booking requests and guest records will appear here after the stay engine is enabled.", "Las solicitudes y los datos de huéspedes aparecerán aquí cuando se active el motor de alojamientos."],
    calendar: ["Availability will be calculated from real room nights and maintenance blocks. No provisional slots are treated as stays.", "La disponibilidad se calculará por noches reales y bloqueos de mantenimiento. Los turnos provisionales no cuentan como estancias."],
    rooms: ["Physical rooms and apartments require unique inventory records before reservations can be accepted.", "Las habitaciones y apartamentos necesitan un inventario individual antes de poder aceptar reservas."],
    rates: ["Nightly prices, minimum stays and cancellation conditions will be configured here after inventory validation.", "Los precios por noche, estancias mínimas y condiciones de cancelación se configurarán aquí tras verificar el inventario."],
  };
  return (
    <section className="panel stack accommodation-booking-workspace" aria-label={es ? "Gestión de reservas AkiDuermo" : "AkiDuermo booking management"}>
      <div className="workspace-inline-heading">
        <div>
          <span className="eyebrow">AkiDuermo</span>
          <h2>{es ? "Gestión de alojamientos" : "Accommodation management"}</h2>
          <p>{es ? "Un espacio específico para estancias por noche." : "A dedicated workspace for overnight stays."}</p>
        </div>
      </div>
      <nav className="accommodation-management-tabs" aria-label={es ? "Secciones del alojamiento" : "Accommodation sections"}>
        {sections.map((section) => (
          <button key={section.id} type="button"
            className={active === section.id ? "button" : "button secondary"}
            aria-current={active === section.id ? "page" : undefined}
            onClick={() => setActive(section.id)}>
            <Icon name={section.icon} />
            {es ? section.es : section.en}
          </button>
        ))}
      </nav>
      <div className="accommodation-section-content" role="region" aria-label={es ? title.es : title.en}>
        <h3>{es ? title.es : title.en}</h3>
        <p>{copy[active][es ? 1 : 0]}</p>
        <p className="notice" role="status">
          {es
            ? "Las reservas por noche siguen desactivadas hasta completar y verificar el inventario y el control de solapamientos."
            : "Overnight booking is disabled until inventory and overlap protection are completed and verified."}
        </p>
      </div>
      <Link className="button secondary" href={`${base}?section=profile`}>
        {es ? "Editar ficha y fotografías" : "Edit property details and photos"}
      </Link>
    </section>
  );
}
