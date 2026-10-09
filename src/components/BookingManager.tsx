"use client";

import React, { useState } from "react";
import { Icon, type IconName } from "./Icons";

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

const templates: ReadonlyArray<readonly [string, IconName, string, string]> = [
  ["dining", "venue", "Tables & dining", "Mesas y restaurantes"],
  ["experience", "discover", "Tours & experiences", "Tours y experiencias"],
  ["resource", "calendar", "Facilities & rentals", "Instalaciones y alquiler"],
  ["appointment", "calendar", "Appointments", "Citas y servicios"],
  ["ticket", "membership", "Events & tickets", "Eventos y entradas"],
  ["class", "users", "Classes & activities", "Clases y actividades"],
  ["stay", "home", "Overnight stays", "Alojamientos"],
];

export function BookingManager({
  locale,
  venueId,
  settings,
  slots,
  resources,
  offerings,
  requests,
  save,
  createSlot,
  createRecurringSlots,
  createResource,
  createOffering,
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
    resource_id?: string | null;
    offering_id?: string | null;
  }>;
  resources: Array<{
    id: string;
    name: string;
    kind: string;
    capacity: number;
    active: boolean;
  }>;
  offerings: Array<{
    id: string;
    name: string;
    kind: string;
    duration_minutes: number;
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
  createRecurringSlots: (formData: FormData) => Promise<void>;
  createResource: (formData: FormData) => Promise<void>;
  createOffering: (formData: FormData) => Promise<void>;
  updateRequest: (formData: FormData) => Promise<void>;
}) {
  const es = locale === "es";
  const [mode, setMode] = useState<Mode>(
    settings?.mode === "request" || settings?.mode === "disabled"
      ? (settings.mode as Mode)
      : "external",
  );
  const [section, setSection] = useState<
    "setup" | "offerings" | "resources" | "calendar" | "inbox"
  >("setup");
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
            ["offerings", es ? "Servicios" : "Offerings"],
            ["resources", es ? "Recursos" : "Resources"],
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
                  "globe",
                  es ? "Enlace externo" : "External link",
                  es
                    ? "Usa tu proveedor de reservas."
                    : "Use your existing provider.",
                ],
                [
                  "request",
                  "calendar",
                  es ? "Reservas AkiPasa" : "Via AkiPasa",
                  es ? "Gestiona reservas aquí." : "Manage bookings here.",
                ],
                [
                  "disabled",
                  "close",
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
                <span aria-hidden="true">
                  <Icon name={icon as IconName} />
                </span>
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
                    <span aria-hidden="true">
                      <Icon name={icon} />
                    </span>
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
      {section === "offerings" && (
        <div className="stack booking-manager-form">
          <h3>{es ? "Servicios reservables" : "Bookable offerings"}</h3>
          <p>
            {es
              ? "Crea actividades, citas, clases o experiencias independientes. Cada servicio tendrá su propio cupo y horarios."
              : "Create separate services, appointments, classes or experiences. Each offering has its own capacity and slots."}
          </p>
          {offerings.length > 0 && (
            <div className="managed-list">
              {offerings.map((offering) => (
                <div className="managed-row" key={offering.id}>
                  <span>
                    <strong>{offering.name}</strong> · {offering.kind}
                  </span>
                  <span>
                    {offering.duration_minutes} min · {offering.capacity}{" "}
                    {es ? "plazas" : "places"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <form action={createOffering} className="stack compact-action-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="venueId" value={venueId} />
            <div className="form-grid-three">
              <label>
                {es ? "Nombre del servicio" : "Offering name"}
                <input
                  type="text"
                  name="name"
                  maxLength={120}
                  required
                  placeholder={es ? "Ej. Ruta en buggy" : "E.g. Buggy tour"}
                />
              </label>
              <label>
                {es ? "Tipo" : "Type"}
                <select name="kind" defaultValue={template}>
                  {templates.map(([key, , en, spanish]) => (
                    <option key={key} value={key}>
                      {es ? spanish : en}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {es ? "Duración (min)" : "Duration (min)"}
                <input
                  name="duration"
                  type="number"
                  min="15"
                  max="1440"
                  defaultValue={60}
                  required
                />
              </label>
              <label>
                {es ? "Capacidad máxima" : "Maximum capacity"}
                <input
                  name="capacity"
                  type="number"
                  min="1"
                  max="10000"
                  defaultValue={1}
                  required
                />
              </label>
            </div>
            <button className="button" type="submit">
              {es ? "Crear servicio" : "Create offering"}
            </button>
          </form>
        </div>
      )}
      {section === "resources" && (
        <div className="stack booking-manager-form">
          <h3>{es ? "Recursos reservables" : "Bookable resources"}</h3>
          <p>
            {es
              ? "Crea mesas, personal, vehículos, pistas o equipos con aforo propio. Los horarios asignados al mismo recurso no pueden solaparse."
              : "Create tables, staff, vehicles, courts, or equipment with individual capacities. Slots for the same resource cannot overlap."}
          </p>
          {resources.length > 0 && (
            <div className="managed-list">
              {resources.map((resource) => (
                <div className="managed-row" key={resource.id}>
                  <span>
                    <strong>{resource.name}</strong> · {resource.kind}
                  </span>
                  <span>
                    {resource.capacity} {es ? "plazas" : "places"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <form action={createResource} className="stack compact-action-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="venueId" value={venueId} />
            <div className="form-grid-three">
              <label>
                {es ? "Nombre del recurso" : "Resource name"}
                <input
                  name="name"
                  type="text"
                  maxLength={100}
                  placeholder={
                    es ? "Ej. Mesa 1, Buggy 2" : "E.g. Table 1, Buggy 2"
                  }
                  required
                />
              </label>
              <label>
                {es ? "Tipo" : "Type"}
                <select name="kind" defaultValue="other">
                  {(
                    [
                      "table",
                      "staff",
                      "vehicle",
                      "equipment",
                      "court",
                      "room",
                      "other",
                    ] as const
                  ).map((kind) => (
                    <option value={kind} key={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {es ? "Capacidad" : "Capacity"}
                <input
                  name="capacity"
                  type="number"
                  min="1"
                  max="10000"
                  defaultValue="1"
                  required
                />
              </label>
            </div>
            <button className="button" type="submit">
              {es ? "Añadir recurso" : "Add resource"}
            </button>
          </form>
        </div>
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
                        {slot.resource_id
                          ? resources.find((r) => r.id === slot.resource_id)
                              ?.name + " · "
                          : ""}
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
                  <label>
                    {es ? "Servicio opcional" : "Optional offering"}
                    <select name="offeringId" defaultValue="">
                      <option value="">
                        {es ? "Reserva general" : "General booking"}
                      </option>
                      {offerings
                        .filter((o) => o.active)
                        .map((offering) => (
                          <option key={offering.id} value={offering.id}>
                            {offering.name} · {offering.capacity}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    {es ? "Recurso opcional" : "Optional resource"}
                    <select name="resourceId" defaultValue="">
                      <option value="">
                        {es ? "Aforo general" : "General capacity"}
                      </option>
                      {resources
                        .filter((r) => r.active)
                        .map((resource) => (
                          <option key={resource.id} value={resource.id}>
                            {resource.name} · {resource.capacity}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button className="button" type="submit">
                    {es ? "Añadir horario" : "Add slot"}
                  </button>
                </form>
              </details>
              <details className="workspace-action-card">
                <summary>
                  {es
                    ? "Programar horarios recurrentes"
                    : "Schedule recurring availability"}
                </summary>
                <form
                  action={createRecurringSlots}
                  className="stack compact-action-form"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={venueId} />
                  <div className="form-grid-three">
                    <label>
                      {es ? "Desde" : "From"}
                      <input type="date" name="startDate" required />
                    </label>
                    <label>
                      {es ? "Hasta (máx. 90 días)" : "Until (max 90 days)"}
                      <input type="date" name="endDate" required />
                    </label>
                    <label>
                      {es ? "Hora de inicio" : "Start time"}
                      <input type="time" name="startTime" required />
                    </label>
                    <label>
                      {es ? "Duración en minutos" : "Duration in minutes"}
                      <input
                        type="number"
                        name="duration"
                        min="15"
                        max="1440"
                        defaultValue="60"
                        required
                      />
                    </label>
                    <label>
                      {es ? "Plazas por horario" : "Places per slot"}
                      <input
                        type="number"
                        name="capacity"
                        min="1"
                        max="10000"
                        defaultValue="1"
                        required
                      />
                    </label>
                  </div>
                  <label>
                    {es ? "Servicio opcional" : "Optional offering"}
                    <select name="offeringId" defaultValue="">
                      <option value="">
                        {es ? "Reserva general" : "General booking"}
                      </option>
                      {offerings
                        .filter((o) => o.active)
                        .map((offering) => (
                          <option key={offering.id} value={offering.id}>
                            {offering.name} · {offering.capacity}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    {es ? "Recurso opcional" : "Optional resource"}
                    <select name="resourceId" defaultValue="">
                      <option value="">
                        {es ? "Aforo general" : "General capacity"}
                      </option>
                      {resources
                        .filter((r) => r.active)
                        .map((resource) => (
                          <option key={resource.id} value={resource.id}>
                            {resource.name} · {resource.capacity}
                          </option>
                        ))}
                    </select>
                  </label>
                  <fieldset>
                    <legend>
                      {es ? "Días de la semana" : "Days of the week"}
                    </legend>
                    <div className="booking-weekday-options">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                        (day, i) => (
                          <label key={day}>
                            <input
                              type="checkbox"
                              name="weekdays"
                              value={i + 1}
                              defaultChecked={i < 5}
                            />
                            {day}
                          </label>
                        ),
                      )}
                    </div>
                  </fieldset>
                  <p>
                    {es
                      ? "Los horarios existentes no se duplicarán. Los horarios nuevos conservarán la capacidad elegida."
                      : "Existing dates won't be duplicated. New slots use your selected capacity."}
                  </p>
                  <button type="submit" className="button">
                    {es ? "Crear programación" : "Create schedule"}
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
