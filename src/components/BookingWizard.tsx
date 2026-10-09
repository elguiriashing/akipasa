"use client";

import React, { useMemo, useState } from "react";
import { Icon } from "@/components/Icons";

type Slot = {
  id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  offering_id?: string | null;
};
type Props = {
  locale: "en" | "es";
  slug: string;
  venueId: string;
  venueName: string;
  slots: Slot[];
  offerings: Record<string, string>;
  profile: { name: string; email: string; phone: string };
  submit: (data: FormData) => Promise<void>;
};

export function BookingWizard({
  locale,
  slug,
  venueId,
  venueName,
  slots,
  offerings,
  profile,
  submit,
}: Props) {
  const es = locale === "es";
  const [slotId, setSlotId] = useState(slots[0]?.id || "");
  const [guests, setGuests] = useState(1);
  const [step, setStep] = useState(0);
  const [contactName, setContactName] = useState(profile.name);
  const [contactEmail, setContactEmail] = useState(profile.email);
  const [contactPhone, setContactPhone] = useState(profile.phone);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const current = slots.find((s) => s.id === slotId) || slots[0];
  const maxGuests = Math.max(1, Math.min(current?.capacity || 1, 100));
  const selectedGuests = Math.min(guests, maxGuests);
  const dates = useMemo(() => {
    const result = new Map<string, Slot[]>();
    for (const slot of slots) {
      const day = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(slot.starts_at));
      result.set(day, [...(result.get(day) || []), slot]);
    }
    return [...result.entries()];
  }, [slots]);
  const [selectedDay, setSelectedDay] = useState(() => {
    const slot = slots[0];
    return slot
      ? new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Madrid",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(slot.starts_at))
      : "";
  });
  const daySlots = dates.find(([date]) => date === selectedDay)?.[1] || slots;
  const dateText = (value: string) =>
    new Date(value).toLocaleDateString(es ? "es-ES" : "en-GB", {
      timeZone: "Europe/Madrid",
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  const timeText = (value: string) =>
    new Date(value).toLocaleTimeString(es ? "es-ES" : "en-GB", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
    });
  const canContinue =
    step === 0
      ? !!current
      : step === 1
        ? selectedGuests >= 1
        : !!contactName.trim() &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);
  const tabs = es
    ? ["Fecha y hora", "Personas", "Tus datos"]
    : ["Date & time", "Guests", "Your details"];

  if (!slots.length)
    return (
      <section className="panel booking-wizard">
        <h2>{es ? "No hay horarios disponibles" : "No available dates"}</h2>
        <p>
          {es
            ? "Este local todavía no tiene plazas abiertas."
            : "This venue hasn't opened any bookable slots yet."}
        </p>
      </section>
    );

  return (
    <section
      className="panel booking-wizard"
      aria-label={es ? "Reserva online" : "Online booking"}
    >
      <div className="booking-wizard-header">
        <span className="eyebrow">
          AkiPasa · {es ? "Reservas" : "Bookings"}
        </span>
        <h2>{venueName}</h2>
        <div className="booking-wizard-steps">
          {tabs.map((tab, index) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                if (index < step) setStep(index);
              }}
              className={step === index ? "active" : ""}
              aria-current={step === index ? "step" : undefined}
              disabled={index > step}
            >
              <span>{index + 1}</span>
              {tab}
            </button>
          ))}
        </div>
      </div>
      {step === 0 && (
        <div className="booking-wizard-body">
          <h3>
            <Icon name="calendar" size={19} />{" "}
            {es ? "Elige el día" : "Choose a date"}
          </h3>
          <div className="booking-date-grid">
            {dates.map(([day, value]) => (
              <button
                type="button"
                className={day === selectedDay ? "active" : ""}
                key={day}
                onClick={() => {
                  setSelectedDay(day);
                  setSlotId(value[0].id);
                  setGuests(1);
                }}
                aria-pressed={day === selectedDay}
              >
                <strong>{dateText(value[0].starts_at)}</strong>
                <small>
                  {value.length} {es ? "horarios" : "times"}
                </small>
              </button>
            ))}
          </div>
          <h3>
            <Icon name="calendar" size={19} />{" "}
            {es ? "Hora disponible" : "Available time"}
          </h3>
          <div className="booking-time-grid">
            {daySlots.map((slot) => (
              <button
                type="button"
                key={slot.id}
                aria-pressed={slot.id === slotId}
                className={slot.id === slotId ? "active" : ""}
                onClick={() => {
                  setSlotId(slot.id);
                  setGuests(1);
                }}
              >
                <strong>{timeText(slot.starts_at)}</strong>
                <small>
                  {slot.offering_id
                    ? offerings[slot.offering_id] ||
                      (es ? "Actividad" : "Activity")
                    : es
                      ? "Reserva general"
                      : "General booking"}
                </small>
              </button>
            ))}
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="booking-wizard-body">
          <h3>
            <Icon name="users" size={20} />{" "}
            {es ? "¿Cuántas personas?" : "How many guests?"}
          </h3>
          <p>
            {es
              ? "Selecciona el número de plazas que necesitas."
              : "Choose how many places you'd like to request."}
          </p>
          <div className="booking-guest-counter">
            <button
              type="button"
              aria-label={es ? "Quitar persona" : "Remove guest"}
              disabled={selectedGuests <= 1}
              onClick={() => setGuests((n) => Math.max(1, n - 1))}
            >
              −
            </button>
            <strong aria-live="polite">{selectedGuests}</strong>
            <button
              type="button"
              aria-label={es ? "Añadir persona" : "Add guest"}
              disabled={selectedGuests >= maxGuests}
              onClick={() => setGuests((n) => Math.min(maxGuests, n + 1))}
            >
              +
            </button>
          </div>
          <p className="booking-wizard-hint">
            {es ? "Máximo para este horario" : "Maximum for this time"}:{" "}
            {maxGuests}.{" "}
            {es
              ? "La disponibilidad final se comprueba al enviar."
              : "Final availability is checked when you submit."}
          </p>
        </div>
      )}
      {step === 2 && (
        <div className="booking-wizard-body">
          <h3>
            <Icon name="person" size={20} />{" "}
            {es ? "Detalles de contacto" : "Contact details"}
          </h3>
          <form
            id="customer-booking-form"
            action={async (formData) => {
              setBusy(true);
              try {
                await submit(formData);
              } finally {
                setBusy(false);
              }
            }}
            className="booking-contact-form"
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="venueId" value={venueId} />
            <input type="hidden" name="slotId" value={slotId} />
            <input type="hidden" name="partySize" value={selectedGuests} />
            <label>
              {es ? "Nombre" : "Name"}
              <input
                name="contactName"
                autoComplete="name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                minLength={2}
                maxLength={120}
                required
              />
            </label>
            <label>
              Email
              <input
                name="contactEmail"
                type="email"
                autoComplete="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
              />
            </label>
            <label>
              {es ? "Teléfono (opcional)" : "Phone (optional)"}
              <input
                name="contactPhone"
                type="tel"
                autoComplete="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </label>
            <details>
              <summary>
                {es ? "Añadir una nota (opcional)" : "Add a note (optional)"}
              </summary>
              <textarea
                name="notes"
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </details>
          </form>
        </div>
      )}
      <div className="booking-wizard-footer">
        <div className="booking-wizard-summary">
          <strong>
            {dateText(current.starts_at)} · {timeText(current.starts_at)}
          </strong>
          <span>
            {selectedGuests} {es ? "personas" : "guests"}
          </span>
        </div>
        <div className="booking-wizard-navigation">
          {step > 0 && (
            <button
              className="button secondary"
              type="button"
              disabled={busy}
              onClick={() => setStep((n) => n - 1)}
            >
              {es ? "Atrás" : "Back"}
            </button>
          )}
          {step < 2 ? (
            <button
              type="button"
              className="button"
              disabled={!canContinue}
              onClick={() => setStep((n) => n + 1)}
            >
              {es ? "Continuar" : "Continue"}{" "}
              <Icon name="arrow-right" size={16} />
            </button>
          ) : (
            <button
              type="submit"
              form="customer-booking-form"
              className="button"
              disabled={!canContinue || busy}
            >
              {busy
                ? es
                  ? "Enviando..."
                  : "Submitting..."
                : es
                  ? "Solicitar reserva"
                  : "Request booking"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
