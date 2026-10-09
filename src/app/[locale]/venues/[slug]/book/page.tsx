/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { requestVenueBooking } from "./actions";

export default async function VenueBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const es = locale === "es";
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/venues/${slug}/book`,
  );
  const { data: venue } = await supabase
    .from("venues")
    .select(
      "id,name,slug,venue_booking_settings(mode,active,external_url,instructions_es,instructions_en,requires_deposit,deposit_cents),venue_availability_slots(id,starts_at,ends_at,capacity,active)",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!venue) notFound();
  const settings: any = venue.venue_booking_settings;
  if (!settings?.active || settings.mode === "disabled") notFound();
  if (settings.mode === "external") {
    const url = settings.external_url;
    if (typeof url === "string" && /^https?:\/\/[^\s/]+/i.test(url))
      redirect(url);
    notFound();
  }
  if (settings.mode !== "request") notFound();
  const slots = ((venue.venue_availability_slots || []) as any[])
    .filter((s) => s.active && new Date(s.starts_at).getTime() > Date.now())
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,public_email,phone")
    .eq("id", user.id)
    .maybeSingle();
  return (
    <main className="shell narrow-page">
      <section className="hero">
        <div className="eyebrow">AkiPasa · {es ? "Reservas" : "Bookings"}</div>
        <h1>{venue.name}</h1>
        <p>
          {es
            ? "Elige cuándo quieres venir."
            : "Choose when you want to visit."}
        </p>
      </section>
      {query.requested && (
        <p className="notice">
          {es
            ? "Solicitud enviada. El local te confirmará directamente."
            : "Request sent. The venue will confirm your booking."}
        </p>
      )}
      {query.error && (
        <p className="notice">
          {es
            ? "No se ha podido completar la reserva. Prueba otro horario."
            : "Could not complete your booking. Please try another slot."}
        </p>
      )}
      <section className="panel booking-card">
        {slots.length ? (
          <>
            <h2>{es ? "Solicitar reserva" : "Request a booking"}</h2>
            <p>
              {es
                ? settings.instructions_es ||
                  "El local confirmará la disponibilidad."
                : settings.instructions_en ||
                  settings.instructions_es ||
                  "The venue will confirm availability."}
            </p>
            {settings.requires_deposit && (
              <p className="status-pill">
                {es ? "Depósito al confirmar" : "Deposit on confirmation"}: €
                {((settings.deposit_cents || 0) / 100).toFixed(2)}
              </p>
            )}
            <form action={requestVenueBooking} className="stack">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="venueId" value={venue.id} />
              <label>
                {es ? "Fecha y horario" : "Date and time"}
                <select name="slotId" required>
                  {slots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {new Date(slot.starts_at).toLocaleString(locale, {
                        timeZone: "Europe/Madrid",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      · {slot.capacity}{" "}
                      {es ? "plazas máximas" : "maximum places"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {es ? "Número de personas" : "Party size"}
                <input
                  name="partySize"
                  type="number"
                  min="1"
                  max="100"
                  defaultValue="1"
                  required
                />
              </label>
              <label>
                {es ? "Nombre de contacto" : "Contact name"}
                <input
                  name="contactName"
                  defaultValue={profile?.display_name || ""}
                  required
                />
              </label>
              <label>
                Email
                <input
                  name="contactEmail"
                  type="email"
                  defaultValue={profile?.public_email || user.email || ""}
                  required
                />
              </label>
              <label>
                {es ? "Teléfono" : "Phone"}
                <input
                  name="contactPhone"
                  defaultValue={profile?.phone || ""}
                />
              </label>
              <label>
                {es ? "Notas opcionales" : "Optional notes"}
                <textarea name="notes" />
              </label>
              <button className="button" type="submit">
                {es ? "Solicitar reserva" : "Request booking"}
              </button>
            </form>
          </>
        ) : (
          <div className="empty-state">
            <h2>{es ? "Sin horarios disponibles" : "No available times"}</h2>
            <p>
              {es
                ? "Este local todavía no ha abierto reservas."
                : "This venue has not opened bookings yet."}
            </p>
          </div>
        )}
      </section>
      <Link className="back-link" href={`/${locale}/venues/${slug}`}>
        {es ? "Volver al local" : "Back to venue"}
      </Link>
    </main>
  );
}
