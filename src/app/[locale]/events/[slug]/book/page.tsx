import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingWizard } from "@/components/BookingWizard";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { requestEventBooking } from "./actions";
import { occurrenceHref, requestedOccurrenceId } from "@/lib/event-occurrence";

type BookingSettings = {
  mode: string;
  active: boolean;
  requires_deposit: boolean;
  deposit_cents: number | null;
  instructions_es: string | null;
  instructions_en: string | null;
};
type Venue = {
  name: string;
  venue_booking_settings: BookingSettings | BookingSettings[] | null;
};
type Event = {
  id: string;
  title_es: string;
  title_en: string | null;
  venue_id: string | null;
  event_occurrences: { id: string }[] | null;
  venues: Venue | Venue[] | null;
};
type AvailableSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  remaining: number;
  offering_id: string | null;
  offering_name: string | null;
  resource_name: string | null;
};
const related = <T,>(value: T | T[] | null | undefined): T | undefined =>
  Array.isArray(value) ? value[0] : value || undefined;

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
  const requestedOccurrence = requestedOccurrenceId(query.occurrence);
  const bookingPath = requestedOccurrence
    ? occurrenceHref(`/${locale}/events/${slug}/book`, requestedOccurrence)
    : `/${locale}/events/${slug}/book`;
  const es = locale === "es";
  const { supabase, user } = await requireUser(locale, bookingPath);
  const { data, error: eventError } = await supabase
    .from("events")
    .select(
      "id,title_es,title_en,venue_id,event_occurrences(id),venues(name,venue_booking_settings(mode,active,requires_deposit,deposit_cents,instructions_es,instructions_en))",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  const event = data as unknown as Event | null;
  if (!eventError && !event) notFound();
  const selectedOccurrence = event?.event_occurrences?.some(
    (occurrence) => occurrence.id === requestedOccurrence,
  )
    ? requestedOccurrence
    : undefined;
  const detailPath = selectedOccurrence
    ? occurrenceHref(`/${locale}/events/${slug}`, selectedOccurrence)
    : `/${locale}/events/${slug}`;
  const retryPath = selectedOccurrence
    ? occurrenceHref(`/${locale}/events/${slug}/book`, selectedOccurrence)
    : eventError
      ? bookingPath
      : `/${locale}/events/${slug}/book`;
  const venue = related(event?.venues);
  const settings = related(venue?.venue_booking_settings);
  const canRequest =
    !eventError &&
    Boolean(event?.venue_id) &&
    settings?.active === true &&
    settings.mode === "request";
  // The canonical aggregate accounts for pending/confirmed requests and resource
  // and offering limits. Raw slot capacity is never available inventory.
  const availability = canRequest
    ? await supabase.rpc("booking_available_slots", {
        p_venue: event!.venue_id,
      })
    : null;
  const unavailable = Boolean(
    eventError ||
      (canRequest &&
        (availability?.error || !Array.isArray(availability?.data))),
  );
  const slots =
    !unavailable && Array.isArray(availability?.data)
      ? (availability.data as AvailableSlot[])
      : [];
  const offerings = Object.fromEntries(
    slots
      .filter((slot) => slot.offering_id)
      .map((slot) => [slot.offering_id!, slot.offering_name || ""]),
  );
  // Contact defaults are only convenience; a failed profile read cannot invent
  // availability or prevent the caller from entering their own contact details.
  const profile =
    canRequest && !unavailable
      ? await supabase
          .from("profiles")
          .select("display_name,public_email,phone")
          .eq("id", user.id)
          .maybeSingle()
      : null;
  const instructions = es
    ? settings?.instructions_es
    : settings?.instructions_en || settings?.instructions_es;

  return (
    <main className="shell narrow-page">
      <section className="hero">
        <div className="eyebrow">AkiPasa · {es ? "Reservas" : "Bookings"}</div>
        <h1>
          {event
            ? es
              ? event.title_es
              : event.title_en || event.title_es
            : es
              ? "Reserva de evento"
              : "Event booking"}
        </h1>
        <p>
          {venue?.name ||
            (es
              ? "Elige cuándo quieres venir."
              : "Choose when you want to visit.")}
        </p>
      </section>
      {query.requested && (
        <p className="notice" role="status">
          {es
            ? "Consulta tu solicitud en Mis reservas. La reserva solo se confirma cuando el local la acepta."
            : "Check your request in My bookings. A booking is confirmed only when the venue accepts it."}{" "}
          <Link href={`/${locale}/account/bookings`}>
            {es ? "Ver mis reservas" : "View my bookings"}
          </Link>
        </p>
      )}
      {query.error && !unavailable && (
        <p className="notice" role="alert">
          {es
            ? "No se ha podido completar la solicitud. Comprueba la disponibilidad y vuelve a intentarlo."
            : "The request could not be completed. Check availability and try again."}
        </p>
      )}
      {unavailable ? (
        <section className="panel booking-card" role="alert">
          <h2>
            {es ? "Disponibilidad no disponible" : "Availability unavailable"}
          </h2>
          <p>
            {es
              ? "No se ha podido cargar la información de reserva. No podemos confirmar si quedan plazas."
              : "Booking information could not be loaded. We cannot confirm whether places remain."}
          </p>
          <Link className="button secondary" href={retryPath}>
            {es ? "Reintentar" : "Retry"}
          </Link>
        </section>
      ) : canRequest && event?.venue_id ? (
        <>
          {instructions && <p className="notice">{instructions}</p>}
          {settings?.requires_deposit && (
            <p className="notice">
              {es ? "Depósito al confirmar" : "Deposit on confirmation"}: €
              {((settings.deposit_cents || 0) / 100).toFixed(2)}.{" "}
              {es
                ? "No se cobra al enviar esta solicitud."
                : "No payment is taken when sending this request."}
            </p>
          )}
          <BookingWizard
            locale={locale}
            slug={slug}
            venueId={event.venue_id}
            venueName={
              venue?.name || (es ? "Reserva del evento" : "Event booking")
            }
            event={{ id: event.id, occurrence: selectedOccurrence }}
            slots={slots}
            offerings={offerings}
            profile={{
              name: profile?.data?.display_name || "",
              email: profile?.data?.public_email || user.email || "",
              phone: profile?.data?.phone || "",
            }}
            submit={requestEventBooking}
          />
        </>
      ) : (
        <section className="panel empty-state">
          <h2>{es ? "Reservas no disponibles" : "Bookings unavailable"}</h2>
          <p>
            {es
              ? "Este evento no admite solicitudes aquí. Consulta las opciones de reserva en su ficha."
              : "This event does not accept requests here. Check its detail page for booking options."}
          </p>
        </section>
      )}
      <Link className="back-link" href={detailPath}>
        {es ? "Volver al evento" : "Back to event"}
      </Link>
    </main>
  );
}
