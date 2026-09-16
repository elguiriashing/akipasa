/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { requestEventBooking } from "./actions";

export default async function EventBookingPage({
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
    `/${locale}/events/${slug}/book`,
  );
  const { data: event } = await supabase
    .from("events")
    .select(
      "id,title_es,title_en,venue_id,venues(name,venue_booking_settings(mode,requires_deposit,deposit_cents,instructions_es,instructions_en),venue_availability_slots(id,starts_at,ends_at,capacity,active))",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!event) notFound();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,public_email,phone")
    .eq("id", user.id)
    .maybeSingle();
  const venue: any = event.venues;
  const settings = venue?.venue_booking_settings;
  const slots = (venue?.venue_availability_slots || []).filter(
    (slot: any) => slot.active && new Date(slot.starts_at) > new Date(),
  );
  return (
    <main className="shell narrow-page">
      <section className="hero">
        <div className="eyebrow">{es ? "Reserva" : "Booking"}</div>
        <h1>
          {locale === "en" ? event.title_en || event.title_es : event.title_es}
        </h1>
        <p>{venue?.name}</p>
      </section>
      {query.requested && (
        <p className="notice">
          {es
            ? "Solicitud enviada. El local te confirmara directamente."
            : "Request sent. The venue will confirm with you directly."}
        </p>
      )}
      {query.error && (
        <p className="notice">
          {es
            ? "No se pudo reservar ese horario. Prueba otro."
            : "That slot could not be booked. Try another one."}
        </p>
      )}
      {settings?.mode === "request" && slots.length ? (
        <section className="panel booking-card">
          <h2>
            {es
              ? "Elige fecha y envia tu solicitud"
              : "Choose a time and send your request"}
          </h2>
          <p>
            {es
              ? settings.instructions_es ||
                "El local revisara y confirmara tu solicitud."
              : settings.instructions_en ||
                settings.instructions_es ||
                "The venue will review and confirm your request."}
          </p>
          {settings.requires_deposit && (
            <p className="status-pill">
              {es ? "Depósito al confirmar" : "Deposit on confirmation"}: €
              {((settings.deposit_cents || 0) / 100).toFixed(2)}
            </p>
          )}
          <form action={requestEventBooking} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="eventId" value={event.id} />
            <label>
              {es ? "Horario" : "Time"}
              <select name="slotId" required>
                {slots.map((slot: any) => (
                  <option key={slot.id} value={slot.id}>
                    {new Date(slot.starts_at).toLocaleString(locale, {
                      timeZone: "Europe/Madrid",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    · {slot.capacity} {es ? "plazas" : "places"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {es ? "Personas" : "Party size"}
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
              {es ? "Telefono" : "Phone"}
              <input name="contactPhone" defaultValue={profile?.phone || ""} />
            </label>
            <label>
              {es ? "Notas opcionales" : "Optional notes"}
              <textarea name="notes" />
            </label>
            <button className="button" type="submit">
              {es ? "Solicitar reserva" : "Request booking"}
            </button>
          </form>
        </section>
      ) : (
        <section className="panel empty-state">
          <h2>{es ? "Reservas no disponibles" : "Bookings unavailable"}</h2>
          <p>
            {es
              ? "Este evento usa un proveedor externo o aun no tiene horarios abiertos."
              : "This event uses an external provider or has no open slots yet."}
          </p>
        </section>
      )}
      <Link className="back-link" href={`/${locale}/events/${slug}`}>
        {es ? "Volver al evento" : "Back to event"}
      </Link>
    </main>
  );
}
