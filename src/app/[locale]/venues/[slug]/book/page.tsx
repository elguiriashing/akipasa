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
      "id,name,slug,venue_booking_settings(mode,active,external_url,instructions_es,instructions_en,requires_deposit,deposit_cents),venue_availability_slots(id,starts_at,ends_at,capacity,active,offering_id)",
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
  const { data: offeringRows } = await supabase
    .from("booking_offerings")
    .select("id,name,active")
    .eq("venue_id", venue.id)
    .eq("active", true);
  const offeringNames = new Map(
    (offeringRows || []).map((offering) => [offering.id, offering.name]),
  );
  const visibleSlots = slots.filter(
    (slot) => !slot.offering_id || offeringNames.has(slot.offering_id),
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
      <Link className="back-link" href={`/${locale}/venues/${slug}`}>
        {es ? "Volver al local" : "Back to venue"}
      </Link>
    </main>
  );
}
