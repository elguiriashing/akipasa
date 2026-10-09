import { BookingWizard } from "@/components/BookingWizard";
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
      "id,name,slug,venue_booking_settings(mode,active,external_url,instructions_es,instructions_en,requires_deposit,deposit_cents)",
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
  const { data: availability, error: availabilityError } = await supabase.rpc(
    "booking_available_slots",
    { p_venue: venue.id },
  );
  const visibleSlots = (availability || []) as Array<{
    id: string;
    starts_at: string;
    ends_at: string;
    capacity: number;
    remaining: number;
    offering_id: string | null;
    offering_name: string | null;
    resource_name: string | null;
  }>;
  const offeringNames = new Map(
    visibleSlots
      .filter((s) => s.offering_id)
      .map((s) => [s.offering_id!, s.offering_name || ""]),
  );
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
      {query.error && (
        <p className="notice">
          {es
            ? "No se ha podido completar la reserva. Prueba otro horario."
            : "Could not complete your booking. Please try another slot."}
        </p>
      )}
      {availabilityError && (
        <p className="notice" role="alert">
          {es
            ? "No se ha podido cargar la disponibilidad. Vuelve a intentarlo."
            : "Availability could not be loaded. Please try again."}
        </p>
      )}
      {(es
        ? settings.instructions_es
        : settings.instructions_en || settings.instructions_es) && (
        <p className="notice">
          {es
            ? settings.instructions_es
            : settings.instructions_en || settings.instructions_es}
        </p>
      )}
      {settings.requires_deposit && (
        <p className="notice">
          {es
            ? "Depósito acordado con el local"
            : "Deposit arranged with the venue"}
          : €{((settings.deposit_cents || 0) / 100).toFixed(2)}.{" "}
          {es
            ? "No se cobra al enviar esta solicitud."
            : "No payment is taken when sending this request."}
        </p>
      )}
      {!availabilityError && (
        <BookingWizard
          locale={locale}
          slug={slug}
          venueId={venue.id}
          venueName={venue.name}
          slots={visibleSlots}
          offerings={Object.fromEntries(offeringNames)}
          profile={{
            name: profile?.display_name || "",
            email: profile?.public_email || user.email || "",
            phone: profile?.phone || "",
          }}
          submit={requestVenueBooking}
        />
      )}
      <Link className="back-link" href={`/${locale}/venues/${slug}`}>
        {es ? "Volver al local" : "Back to venue"}
      </Link>
    </main>
  );
}
