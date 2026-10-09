"use client";

import { useState } from "react";

type Mode = "external" | "request" | "disabled";
type Settings = {
  mode?: string | null;
  external_url?: string | null;
  booking_template?: string | null;
  requires_deposit?: boolean | null;
  deposit_cents?: number | null;
  instructions_es?: string | null;
  instructions_en?: string | null;
} | null;

const templates = [
  ["dining", "🍽️", "Tables & dining", "Mesas y restaurantes"],
  ["experience", "🚙", "Tours & experiences", "Tours y experiencias"],
  ["resource", "🎾", "Facilities & rentals", "Instalaciones y alquiler"],
  ["appointment", "✂️", "Appointments", "Citas y servicios"],
  ["ticket", "🎟️", "Events & tickets", "Eventos y entradas"],
  ["class", "🧘", "Classes & activities", "Clases y actividades"],
  ["stay", "🛏️", "Overnight stays", "Alojamientos"],
] as const;

export function BookingManager({
  locale,
  venueId,
  settings,
  slots,
  requests,
  save,
  createSlot,
  updateRequest,
}: {
  locale: "es" | "en";
  venueId: string;
  settings: Settings;
  slots: Array<{
    id: string;
    starts_at: string;
    ends_at: string;
    capacity: number;
    active: boolean;
  }>;
  requests: Array<{
    id: string;
    contact_name: string;
    contact_email: string;
    party_size: number;
    status: string;
    created_at: string;
  }>;
  save: (formData: FormData) => Promise<void>;
  createSlot: (formData: FormData) => Promise<void>;
  updateRequest: (formData: FormData) => Promise<void>;
}) {
  const es = locale === "es";
  const [mode, setMode] = useState<Mode>(
    settings?.mode === "request" || settings?.mode === "disabled"
      ? (settings.mode as Mode)
      : "external",
  );
  const [section, setSection] = useState<"setup" | "calendar" | "inbox">(
    "setup",
  );
  const [template, setTemplate] = useState(
    settings?.booking_template || "experience",
  );
  const pending = requests.filter((r) => r.status === "requested").length;
  return (
    <section
      className="panel booking-workbench booking-hub"
      aria-label={es ? "Gestor de reservas" : "Booking manager"}
    >
      <div className="workspace-inline-heading">
        <div>
          <span className="eyebrow">AkiBusiness</span>
          <h2>{es ? "Gestor de reservas" : "Booking manager"}</h2>
          <p>
            {es
              ? "Controla cómo se reserva tu local."
              : "Choose how customers book with you."}
          </p>
        </div>
      </div>
      <div className="booking-status-strip">
        <article>
          <small>{es ? "Modo" : "Mode"}</small>
          <strong>
            {mode === "external"
              ? es
                ? "Externo"
                : "External"
              : mode === "request"
                ? "AkiPasa"
                : es
                  ? "Desactivado"
                  : "Disabled"}
          </strong>
        </article>
        <article>
          <small>{es ? "Horarios" : "Slots"}</small>
          <strong>{slots.length}</strong>
        </article>
        <article>
          <small>{es ? "Pendientes" : "Pending"}</small>
          <strong>{pending}</strong>
        </article>
      </div>
      <nav
        className="booking-manager-tabs"
        aria-label={es ? "Secciones de reservas" : "Booking sections"}
      >
        {(
          [
            ["setup", es ? "Configuración" : "Setup"],
            ["calendar", es ? "Disponibilidad" : "Availability"],
            ["inbox", es ? "Solicitudes" : "Requests"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={section === key ? "button" : "button secondary"}
            aria-current={section === key ? "page" : undefined}
            onClick={() => setSection(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      {section === "setup" && (
        <form
          action={save}
          className="stack compact-action-form booking-manager-form"
        >
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="venueId" value={venueId} />
          <input type="hidden" name="template" value={template} />
          <div className="booking-mode-grid">
            {(
              [
                [
                  "external",
                  "🔗",
                  es ? "Enlace externo" : "External link",
                  es
                    ? "Usa tu proveedor de reservas."
                    : "Use your existing provider.",
                ],
                [
                  "request",
                  "📅",
                  es ? "Reservas AkiPasa" : "Via AkiPasa",
                  es ? "Gestiona reservas aquí." : "Manage bookings here.",
                ],
                [
                  "disabled",
                  "🚫",
                  es ? "Sin reservas" : "Bookings off",
                  es
                    ? "Oculta el botón al público."
                    : "Hide the public booking button.",
                ],
              ] as const
            ).map(([value, icon, title, description]) => (
              <label className="booking-mode-card" key={value}>
                <input
                  type="radio"
                  name="mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => setMode(value)}
                />
                <span aria-hidden="true">{icon}</span>
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
              </label>
            ))}
          </div>
          {mode === "external" && (
            <label>
              {es ? "Enlace de reservas" : "Booking URL"}
              <input
                name="externalUrl"
                type="url"
                required
                maxLength={2048}
                placeholder="https://booking.example.com"
                defaultValue={settings?.external_url || ""}
              />
            </label>
          )}
          {mode === "request" && (
            <>
              <h3>{es ? "Tipo de reserva" : "Booking template"}</h3>
              <p>
                {es
                  ? "Elige el tipo más parecido a tu negocio. Los horarios y plazas se gestionan en Disponibilidad."
                  : "Choose the closest fit for your business. Manage slots and capacity in Availability."}
              </p>
              <div className="booking-template-grid">
                {templates.map(([key, icon, en, spanish]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={template === key}
                    onClick={() => setTemplate(key)}
                    className={
                      template === key
                        ? "booking-template-card selected"
                        : "booking-template-card"
                    }
                  >
                    <span aria-hidden="true">{icon}</span>
                    <strong>{es ? spanish : en}</strong>
                  </button>
                ))}
              </div>
              <label className="toggle-card">
                <input
                  name="requiresDeposit"
                  type="checkbox"
                  defaultChecked={settings?.requires_deposit || false}
                />
                <span>{es ? "Solicitar depósito" : "Require deposit"}</span>
              </label>
              <label>
                {es ? "Depósito (€)" : "Deposit (€)"}
                <input
                  name="depositEuros"
                  type="number"
                  min="0"
                  max="10000"
                  step="0.01"
                  defaultValue={
                    settings?.deposit_cents
                      ? (settings.deposit_cents / 100).toFixed(2)
                      : ""
                  }
                />
              </label>
              <label>
                {es ? "Instrucciones de reserva" : "Booking instructions"}
                <textarea
                  name="instructions"
                  rows={3}
                  defaultValue={
                    (es
                      ? settings?.instructions_es
                      : settings?.instructions_en) || ""
                  }
                />
              </label>
            </>
          )}
          <button className="button" type="submit">
            {es ? "Guardar configuración" : "Save booking setup"}
          </button>
        </form>
      )}
      {section === "calendar" && (
        <div className="stack booking-manager-form">
          {mode !== "request" ? (
            <p>
              {es
                ? "Activa reservas AkiPasa para gestionar disponibilidad."
                : "Enable AkiPasa bookings to manage availability."}
            </p>
          ) : (
            <>
              <h3>
                {es ? "Calendario y disponibilidad" : "Calendar & availability"}
              </h3>
              {slots.length ? (
                <div className="managed-list">
                  {slots.map((slot) => (
                    <div className="managed-row" key={slot.id}>
                      <span>
                        {new Date(slot.starts_at).toLocaleString(locale, {
                          timeZone: "Europe/Madrid",
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      <strong>
                        {slot.capacity} {es ? "plazas" : "places"}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p>
                  {es
                    ? "Aún no hay horarios creados."
                    : "No booking slots yet."}
                </p>
              )}
              <details className="workspace-action-card">
                <summary>
                  {es ? "Crear horario" : "Create availability"}
                </summary>
                <form action={createSlot} className="stack compact-action-form">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={venueId} />
                  <div className="form-grid-three">
                    <label>
                      {es ? "Inicio" : "Starts"}
                      <input name="startsAt" type="datetime-local" required />
                    </label>
                    <label>
                      {es ? "Final" : "Ends"}
                      <input name="endsAt" type="datetime-local" required />
                    </label>
                    <label>
                      {es ? "Capacidad" : "Capacity"}
                      <input
                        name="capacity"
                        type="number"
                        min="1"
                        defaultValue="1"
                        required
                      />
                    </label>
                  </div>
                  <button className="button" type="submit">
                    {es ? "Añadir horario" : "Add slot"}
                  </button>
                </form>
              </details>
            </>
          )}
        </div>
      )}
      {section === "inbox" && (
        <div className="booking-inbox">
          <h3>{es ? "Solicitudes de reserva" : "Booking requests"}</h3>
          {!requests.length && (
            <p>
              {es ? "Todavía no hay reservas." : "No booking requests yet."}
            </p>
          )}
          <div className="managed-list">
            {requests.map((request) => (
              <form
                action={updateRequest}
                className="managed-row booking-request-row"
                key={request.id}
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="venueId" value={venueId} />
                <input type="hidden" name="requestId" value={request.id} />
                <div>
                  <strong>
                    {request.contact_name} · {request.party_size}{" "}
                    {es ? "personas" : "guests"}
                  </strong>
                  <span>{request.contact_email}</span>
                </div>
                <span className="status-pill">{request.status}</span>
                <select
                  name="status"
                  aria-label={es ? "Estado" : "Status"}
                  defaultValue={
                    request.status === "requested"
                      ? "confirmed"
                      : request.status
                  }
                >
                  <option value="confirmed">
                    {es ? "Confirmar" : "Confirm"}
                  </option>
                  <option value="declined">
                    {es ? "Rechazar" : "Decline"}
                  </option>
                  <option value="completed">
                    {es ? "Completada" : "Completed"}
                  </option>
                </select>
                <button className="button secondary" type="submit">
                  {es ? "Guardar" : "Save"}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
