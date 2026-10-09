"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "./Icons";

type Section = "reservations" | "calendar" | "rooms" | "rates";
const sections: { id: Section; icon: IconName; en: string; es: string }[] = [
  { id: "reservations", icon: "inbox", en: "Reservations", es: "Reservas" },
  { id: "calendar", icon: "calendar", en: "Calendar", es: "Calendario" },
  { id: "rooms", icon: "home", en: "Rooms & units", es: "Habitaciones" },
  { id: "rates", icon: "venue", en: "Rates & rules", es: "Tarifas" },
];

export type AccommodationRoomType = {
  id: string;
  name: string;
  max_guests: number;
  active: boolean;
};
export type AccommodationUnit = {
  id: string;
  name: string;
  room_type_id: string;
  active: boolean;
};
export type AccommodationRate = {
  id: string;
  room_type_id: string;
  start_date: string;
  end_date_exclusive: string;
  nightly_price_cents: number;
  minimum_nights: number;
};
export type AccommodationReservation = {
  id: string;
  unit_id: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: string;
  contact_name: string;
  contact_email: string;
  quoted_total_cents: number;
};
export type AccommodationBlock = {
  id: string;
  unit_id: string;
  start_date: string;
  end_date_exclusive: string;
  reason: string;
};
type AccommodationActions = {
  createRoomType: (formData: FormData) => Promise<void>;
  updateRoomType: (formData: FormData) => Promise<void>;
  createUnit: (formData: FormData) => Promise<void>;
  updateUnit: (formData: FormData) => Promise<void>;
  createRate: (formData: FormData) => Promise<void>;
  deleteRate: (formData: FormData) => Promise<void>;
  createBlock: (formData: FormData) => Promise<void>;
  deleteBlock: (formData: FormData) => Promise<void>;
};

/**
 * This is an actual, keyboard-accessible property management navigation surface,
 * not a booking form. Until room-night persistence is validated it never claims
 * inventory or accepts a reservation.
 */
export function AccommodationBookingWorkspace({
  locale,
  venueId,
  initialTab,
  roomTypes = [],
  units = [],
  rates = [],
  reservations = [],
  blocks = [],
  actions,
}: {
  locale: "es" | "en";
  venueId: string;
  initialTab?: string;
  roomTypes?: AccommodationRoomType[];
  units?: AccommodationUnit[];
  rates?: AccommodationRate[];
  reservations?: AccommodationReservation[];
  blocks?: AccommodationBlock[];
  actions?: AccommodationActions;
}) {
  const es = locale === "es";
  const [active, setActive] = useState<Section>(
    sections.some((section) => section.id === initialTab)
      ? (initialTab as Section)
      : "reservations",
  );
  const base = `/${locale}/business/venue/${venueId}`;
  const title = sections.find((section) => section.id === active)!;
  const activeRoomTypes = roomTypes.filter((room) => room.active);
  const roomName = (id: string) =>
    roomTypes.find((room) => room.id === id)?.name || (es ? "Tipo" : "Type");
  const unitName = (id: string) =>
    units.find((unit) => unit.id === id)?.name || (es ? "Unidad" : "Unit");
  const money = (cents: number) =>
    new Intl.NumberFormat(es ? "es-ES" : "en-GB", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  const copy: Record<Section, [string, string]> = {
    reservations: [
      "Confirmed guest records will appear here after the stay engine is enabled.",
      "Los datos de huéspedes confirmados aparecerán aquí cuando se active el motor de alojamientos.",
    ],
    calendar: [
      "Availability will be calculated from real room nights and maintenance blocks. No provisional slots are treated as stays.",
      "La disponibilidad se calculará por noches reales y bloqueos de mantenimiento. Los turnos provisionales no cuentan como estancias.",
    ],
    rooms: [
      "Create room categories and each physical room or apartment before reservations can be accepted.",
      "Crea categorías y cada habitación o apartamento físico antes de aceptar reservas.",
    ],
    rates: [
      "Nightly prices and minimum stays are managed per room category.",
      "Los precios por noche y estancias mínimas se gestionan por categoría.",
    ],
  };
  return (
    <section
      className="panel stack accommodation-booking-workspace"
      aria-label={
        es ? "Gestión de reservas AkiDuermo" : "AkiDuermo booking management"
      }
    >
      <div className="workspace-inline-heading">
        <div>
          <span className="eyebrow">AkiDuermo</span>
          <h2>{es ? "Gestión de alojamientos" : "Accommodation management"}</h2>
          <p>
            {es
              ? "Un espacio específico para estancias por noche."
              : "A dedicated workspace for overnight stays."}
          </p>
        </div>
      </div>
      <nav
        className="accommodation-management-tabs"
        aria-label={es ? "Secciones del alojamiento" : "Accommodation sections"}
      >
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={active === section.id ? "button" : "button secondary"}
            aria-current={active === section.id ? "page" : undefined}
            onClick={() => setActive(section.id)}
          >
            <Icon name={section.icon} />
            {es ? section.es : section.en}
          </button>
        ))}
      </nav>
      <div
        className="accommodation-section-content"
        role="region"
        aria-label={es ? title.es : title.en}
      >
        <h3>{es ? title.es : title.en}</h3>
        <p>{copy[active][es ? 1 : 0]}</p>
        <p className="notice" role="status">
          {es
            ? "Las reservas por noche siguen desactivadas hasta completar y verificar el inventario y el control de solapamientos."
            : "Overnight booking is disabled until inventory and overlap protection are completed and verified."}
        </p>
        {active === "rooms" && (
          <div className="booking-manager-body">
            <section className="stack">
              <h4>{es ? "Tipos de habitación" : "Room types"}</h4>
              {actions && (
                <form
                  action={actions.createRoomType}
                  className="compact-action-form booking-manager-form"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={venueId} />
                  <label>
                    {es ? "Nombre" : "Name"}
                    <input
                      name="name"
                      required
                      maxLength={120}
                      placeholder={es ? "Doble vista mar" : "Double sea view"}
                    />
                  </label>
                  <label>
                    {es ? "Huéspedes máximos" : "Max guests"}
                    <input
                      name="maxGuests"
                      type="number"
                      min="1"
                      max="30"
                      defaultValue="2"
                      required
                    />
                  </label>
                  <button className="button" type="submit">
                    {es ? "Crear tipo" : "Create type"}
                  </button>
                </form>
              )}
              <div className="booking-list">
                {roomTypes.map((room) => (
                  <form
                    key={room.id}
                    action={actions?.updateRoomType}
                    className="booking-list-card booking-edit-card"
                  >
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="venueId" value={venueId} />
                    <input type="hidden" name="roomTypeId" value={room.id} />
                    <label>
                      {es ? "Nombre" : "Name"}
                      <input
                        name="name"
                        defaultValue={room.name}
                        required
                        maxLength={120}
                      />
                    </label>
                    <label>
                      {es ? "Huéspedes" : "Guests"}
                      <input
                        name="maxGuests"
                        type="number"
                        min="1"
                        max="30"
                        defaultValue={room.max_guests}
                        required
                      />
                    </label>
                    <label className="toggle-card">
                      <input
                        name="active"
                        type="checkbox"
                        defaultChecked={room.active}
                      />
                      <span>{es ? "Activo" : "Active"}</span>
                    </label>
                    <button
                      className="button secondary"
                      type="submit"
                      disabled={!actions}
                    >
                      {es ? "Guardar" : "Save"}
                    </button>
                  </form>
                ))}
                {!roomTypes.length && (
                  <p>{es ? "Aún no hay tipos." : "No room types yet."}</p>
                )}
              </div>
            </section>
            <section className="stack">
              <h4>{es ? "Unidades físicas" : "Physical units"}</h4>
              {actions && activeRoomTypes.length > 0 && (
                <form
                  action={actions.createUnit}
                  className="compact-action-form booking-manager-form"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={venueId} />
                  <label>
                    {es ? "Tipo" : "Type"}
                    <select name="roomTypeId">
                      {activeRoomTypes.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {es ? "Nombre de unidad" : "Unit name"}
                    <input
                      name="name"
                      required
                      maxLength={120}
                      placeholder="101"
                    />
                  </label>
                  <button className="button" type="submit">
                    {es ? "Crear unidad" : "Create unit"}
                  </button>
                </form>
              )}
              <div className="booking-list">
                {units.map((unit) => (
                  <form
                    key={unit.id}
                    action={actions?.updateUnit}
                    className="booking-list-card booking-edit-card"
                  >
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="venueId" value={venueId} />
                    <input type="hidden" name="unitId" value={unit.id} />
                    <label>
                      {es ? "Tipo" : "Type"}
                      <select
                        name="roomTypeId"
                        defaultValue={unit.room_type_id}
                      >
                        {roomTypes.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {es ? "Nombre" : "Name"}
                      <input
                        name="name"
                        defaultValue={unit.name}
                        required
                        maxLength={120}
                      />
                    </label>
                    <label className="toggle-card">
                      <input
                        name="active"
                        type="checkbox"
                        defaultChecked={unit.active}
                      />
                      <span>{es ? "Activo" : "Active"}</span>
                    </label>
                    <button
                      className="button secondary"
                      type="submit"
                      disabled={!actions}
                    >
                      {es ? "Guardar" : "Save"}
                    </button>
                  </form>
                ))}
                {!units.length && (
                  <p>{es ? "Aún no hay unidades." : "No units yet."}</p>
                )}
              </div>
            </section>
          </div>
        )}
        {active === "rates" && (
          <div className="stack">
            {actions && activeRoomTypes.length > 0 && (
              <form
                action={actions.createRate}
                className="compact-action-form booking-manager-form"
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="venueId" value={venueId} />
                <label>
                  {es ? "Tipo" : "Type"}
                  <select name="roomTypeId">
                    {activeRoomTypes.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {es ? "Desde" : "From"}
                  <input name="startDate" type="date" required />
                </label>
                <label>
                  {es ? "Hasta" : "Until"}
                  <input name="endDate" type="date" required />
                </label>
                <label>
                  {es ? "Precio/noche (€)" : "Nightly price (€)"}
                  <input
                    name="nightlyPriceEuros"
                    type="number"
                    min="0"
                    max="100000"
                    step="0.01"
                    required
                  />
                </label>
                <label>
                  {es ? "Noches mínimas" : "Minimum nights"}
                  <input
                    name="minimumNights"
                    type="number"
                    min="1"
                    max="365"
                    defaultValue="1"
                    required
                  />
                </label>
                <button className="button" type="submit">
                  {es ? "Añadir tarifa" : "Add rate"}
                </button>
              </form>
            )}
            <div className="booking-list">
              {rates.map((rate) => (
                <article key={rate.id} className="booking-list-card">
                  <strong>{roomName(rate.room_type_id)}</strong>
                  <span>
                    {rate.start_date} - {rate.end_date_exclusive}
                  </span>
                  <small>
                    {money(rate.nightly_price_cents)} · {rate.minimum_nights}{" "}
                    {es ? "noches mín." : "min nights"}
                  </small>
                  {actions && (
                    <form action={actions.deleteRate}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="venueId" value={venueId} />
                      <input type="hidden" name="rateId" value={rate.id} />
                      <button className="button secondary" type="submit">
                        {es ? "Eliminar" : "Delete"}
                      </button>
                    </form>
                  )}
                </article>
              ))}
              {!rates.length && (
                <p>{es ? "Aún no hay tarifas." : "No rates yet."}</p>
              )}
            </div>
          </div>
        )}
        {active === "calendar" && (
          <div className="stack">
            {actions && units.length > 0 && (
              <form
                action={actions.createBlock}
                className="compact-action-form booking-manager-form"
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="venueId" value={venueId} />
                <label>
                  {es ? "Unidad" : "Unit"}
                  <select name="unitId">
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {es ? "Desde" : "From"}
                  <input name="startDate" type="date" required />
                </label>
                <label>
                  {es ? "Hasta" : "Until"}
                  <input name="endDate" type="date" required />
                </label>
                <label>
                  {es ? "Motivo" : "Reason"}
                  <input
                    name="reason"
                    maxLength={120}
                    defaultValue="maintenance"
                    required
                  />
                </label>
                <button className="button" type="submit">
                  {es ? "Bloquear noches" : "Block nights"}
                </button>
              </form>
            )}
            <div className="booking-list">
              {blocks.map((block) => (
                <article key={block.id} className="booking-list-card">
                  <strong>{unitName(block.unit_id)}</strong>
                  <span>
                    {block.start_date} - {block.end_date_exclusive}
                  </span>
                  <small>{block.reason}</small>
                  {actions && (
                    <form action={actions.deleteBlock}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="venueId" value={venueId} />
                      <input type="hidden" name="blockId" value={block.id} />
                      <button className="button secondary" type="submit">
                        {es ? "Quitar bloqueo" : "Remove block"}
                      </button>
                    </form>
                  )}
                </article>
              ))}
              {!blocks.length && <p>{es ? "Sin bloqueos." : "No blocks."}</p>}
            </div>
          </div>
        )}
        {active === "reservations" && (
          <div className="booking-list">
            {reservations.map((reservation) => (
              <article key={reservation.id} className="booking-list-card">
                <strong>{reservation.contact_name}</strong>
                <span>
                  {reservation.check_in} - {reservation.check_out}
                </span>
                <small>
                  {unitName(reservation.unit_id)} · {reservation.guests}{" "}
                  {es ? "huéspedes" : "guests"} ·{" "}
                  {money(reservation.quoted_total_cents)}
                </small>
                <span className="badge">{reservation.status}</span>
              </article>
            ))}
            {!reservations.length && (
              <p>
                {es
                  ? "Aún no hay reservas de alojamiento."
                  : "No stay reservations yet."}
              </p>
            )}
          </div>
        )}
      </div>
      <Link className="button secondary" href={`${base}?section=profile`}>
        {es ? "Editar ficha y fotografías" : "Edit property details and photos"}
      </Link>
    </section>
  );
}
