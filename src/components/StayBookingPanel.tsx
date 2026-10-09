"use client";
import React, { useState } from "react";
import type { StayQuote, StayRoomQuote } from "../lib/accommodation-booking";

export function StayBookingPanel({
  venueId,
  locale,
}: {
  venueId: string;
  locale: "en" | "es";
}) {
  const es = locale === "es";
  const text = (en: string, spanish: string) => (es ? spanish : en);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState<StayRoomQuote[] | null>(null);
  const [quote, setQuote] = useState<StayQuote | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reservation, setReservation] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const money = (cents: number) =>
    new Intl.NumberFormat(es ? "es-ES" : "en-GB", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  async function api(body: object) {
    const response = await fetch("/api/stays/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error === "sign_in" ? "sign_in" : "unavailable");
    return data.result;
  }
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (error) {
      setError(
        error instanceof Error && error.message === "sign_in"
          ? "sign_in"
          : "unavailable",
      );
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    setQuote(null);
    setRooms(null);
  }
  return (
    <section
      className="stack stay-booking-panel"
      aria-label={text("Reserve a stay", "Reserva una estancia")}
    >
      <h2>{text("Reserve a stay", "Reserva una estancia")}</h2>
      {error && (
        <p role="alert">
          {error === "sign_in" ? (
            <a
              href={`https://akipasa.com/${locale}/login?redirectTo=${encodeURIComponent(`https://akiduermo.akipasa.com${typeof window === "undefined" ? "/" : window.location.pathname}`)}`}
            >
              {text(
                "Sign in to request a stay",
                "Inicia sesión para solicitar una estancia",
              )}
            </a>
          ) : (
            text(
              "Availability or prices changed. Check your dates again.",
              "La disponibilidad o los precios han cambiado. Consulta las fechas de nuevo.",
            )
          )}
        </p>
      )}
      {reservation ? (
        <div className="stack" role="status">
          <strong>
            {cancelled
              ? text("Request cancelled", "Solicitud cancelada")
              : text(
                  "Request received, awaiting property confirmation",
                  "Solicitud recibida, pendiente de confirmación del alojamiento",
                )}
          </strong>
          <p>
            {text("Reference", "Referencia")}: {reservation}
          </p>
          {!cancelled && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api({ action: "cancel", reservation });
                  setCancelled(true);
                })
              }
            >
              {text("Cancel request", "Cancelar solicitud")}
            </button>
          )}
        </div>
      ) : (
        <>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              reset();
              void run(async () => {
                const params = new URLSearchParams({
                  venue: venueId,
                  checkIn,
                  checkOut,
                  guests: String(guests),
                });
                const response = await fetch(`/api/stays/bookings?${params}`);
                if (!response.ok) throw new Error("unavailable");
                setRooms((await response.json()).rooms);
              });
            }}
          >
            <div className="booking-manager-form">
              <label>
                {text("Check in", "Entrada")}
                <input
                  required
                  type="date"
                  value={checkIn}
                  disabled={busy}
                  onChange={(e) => {
                    setCheckIn(e.target.value);
                    reset();
                  }}
                />
              </label>
              <label>
                {text("Check out", "Salida")}
                <input
                  required
                  type="date"
                  min={checkIn}
                  value={checkOut}
                  disabled={busy}
                  onChange={(e) => {
                    setCheckOut(e.target.value);
                    reset();
                  }}
                />
              </label>
              <label>
                {text("Guests", "Huéspedes")}
                <input
                  required
                  type="number"
                  min={1}
                  max={30}
                  value={guests}
                  disabled={busy}
                  onChange={(e) => {
                    setGuests(Number(e.target.value));
                    reset();
                  }}
                />
              </label>
            </div>
            <button
              className="button"
              disabled={busy || !checkIn || checkOut <= checkIn}
            >
              {busy
                ? text("Checking…", "Consultando…")
                : text("Check availability", "Consultar disponibilidad")}
            </button>
          </form>
          {rooms?.length === 0 && (
            <p role="status">
              {text(
                "No rooms available for these dates and guests.",
                "No hay habitaciones para estas fechas y huéspedes.",
              )}
            </p>
          )}
          {rooms && !quote && (
            <div className="booking-list">
              {rooms.map((room) => (
                <article key={room.room_type_id} className="booking-list-card">
                  <strong>{room.room_name}</strong>
                  <p>
                    {room.nights} {text("nights", "noches")} ·{" "}
                    {money(room.total_cents)}
                  </p>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        setQuote(
                          await api({
                            action: "quote",
                            roomType: room.room_type_id,
                            checkIn,
                            checkOut,
                            guests,
                          }),
                        );
                        setKey(crypto.randomUUID());
                      })
                    }
                  >
                    {text("Select room", "Seleccionar habitación")}
                  </button>
                </article>
              ))}
            </div>
          )}
          {quote && (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                void run(async () => {
                  const id = await api({
                    action: "request",
                    quote: quote.id,
                    key,
                    name: form.get("name"),
                    email: form.get("email"),
                    locale,
                  });
                  setReservation(id);
                });
              }}
            >
              <strong>
                {quote.snapshot.room_name} · {money(quote.snapshot.total_cents)}
              </strong>
              <p>
                {text(
                  "Taxes included. Pay at the property. No online payment is collected.",
                  "Impuestos incluidos. Pago en el alojamiento. No se cobra ningún pago en línea.",
                )}
              </p>
              <p>{quote.snapshot.policy}</p>
              <label>
                {text("Name", "Nombre")}
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                />
              </label>
              <label>
                {text("Email", "Correo electrónico")}
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                />
              </label>
              <label>
                <input type="checkbox" required />{" "}
                {text(
                  "I accept the property's terms",
                  "Acepto las condiciones del alojamiento",
                )}
              </label>
              <button className="button" disabled={busy}>
                {text("Request stay", "Solicitar estancia")}
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
