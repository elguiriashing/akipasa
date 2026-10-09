import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { MyBookings, type MyBooking } from "@/components/MyBookings";
import { BookingLiveRefresh } from "@/components/BookingLiveRefresh";
import { cancelMyBooking } from "./actions";
export default async function MyBookingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const tab =
    query.tab === "active" || query.tab === "past" ? query.tab : "upcoming";
  const page = Math.max(
    0,
    Math.min(10000, Number.parseInt(query.page || "0", 10) || 0),
  );
  const { supabase } = await requireUser(locale, `/${locale}/account/bookings`);
  const { data, error } = await supabase.rpc("my_booking_history", {
    p_tab: tab,
    p_page: page,
  });
  const result = data as {
    bookings: MyBooking[];
    counts: Record<"upcoming" | "active" | "past", number>;
  } | null;
  const es = locale === "es";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Tus planes" : "Your plans"}
        title={es ? "Mis reservas" : "My bookings"}
        description={
          es
            ? "Próximas, en curso e historial. Todo en un sitio."
            : "Upcoming, active and past. Everything in one place."
        }
      />
      <BookingLiveRefresh />
      {query.requested &&
        result?.bookings.some((b) => b.id === query.requested) && (
          <p className="notice" role="status">
            {es
              ? "Solicitud enviada. El local debe aprobarla. Podrás seguir su estado aquí."
              : "Request sent. The venue still needs to approve it. Track its status here."}
          </p>
        )}
      {query.cancelled && (
        <p className="notice" role="status">
          {es ? "Reserva cancelada." : "Booking cancelled."}
        </p>
      )}
      {query.error && (
        <p className="notice" role="alert">
          {es
            ? "No se puede cancelar esta reserva. Contacta con el local."
            : "This booking could not be cancelled. Please contact the venue."}
        </p>
      )}
      {error || !result ? (
        <p className="panel" role="alert">
          {es
            ? "No se han podido cargar las reservas. Vuelve a intentarlo."
            : "Bookings could not be loaded. Please try again."}
        </p>
      ) : (
        <MyBookings
          locale={locale}
          bookings={result.bookings}
          counts={result.counts}
          currentTab={tab}
          pageNumber={page}
          cancel={cancelMyBooking}
        />
      )}
    </>
  );
}
