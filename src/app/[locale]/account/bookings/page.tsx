import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { MyBookings, type MyBooking } from "@/components/MyBookings";

export default async function MyBookingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase, user } = await requireUser(locale);
  const { data, error } = await supabase
    .from("booking_requests")
    .select("id,party_size,status,created_at,venues(name,slug),venue_availability_slots(starts_at,ends_at)")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const es = locale === "es";
  const bookings: MyBooking[] = (data || []).map((item) => ({
    id: item.id, party_size: item.party_size, status: item.status, created_at: item.created_at,
    venue: (item.venues as unknown as { name:string; slug:string } | null) || null,
    slot: (item.venue_availability_slots as unknown as { starts_at:string; ends_at:string } | null) || null,
  }));
  return <>
    <WorkspacePageHeader
      eyebrow={es ? "Tus planes" : "Your plans"}
      title={es ? "Mis reservas" : "My bookings"}
      description={es ? "Todo organizado: próximas, en curso e historial." : "Everything in one place: upcoming, active and past."}
    />
    {error ? <div className="panel" role="alert">{es ? "No hemos podido cargar tus reservas. Inténtalo más tarde." : "Couldn't load your bookings. Please try again later."}</div>
      : <MyBookings locale={locale} bookings={bookings}/>}
  </>;
}
