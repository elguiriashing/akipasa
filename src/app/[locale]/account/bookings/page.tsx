import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { Icon } from "@/components/Icons";
import { MyBookings, type MyBooking } from "@/components/MyBookings";
import { BookingLiveRefresh } from "@/components/BookingLiveRefresh";
import { AccountPageHeader } from "../AccountPageHeader";
import { AccountCollectionState } from "../AccountCollectionState";
import { AccountStayBookings } from "../AccountStayBookings";
import { cancelMyBooking, cancelMyStay } from "./actions";
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
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/account/bookings`,
  );
  const { data: stays, error: stayError } = await supabase
    .from("accommodation_reservations")
    .select(
      "id,check_in,check_out,status,guests,quoted_total_cents,quote_snapshot",
    )
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
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
      <AccountPageHeader
        eyebrow={es ? "Tus planes" : "Your plans"}
        title={es ? "Mis reservas" : "My bookings"}
        description={
          es
            ? "Próximas, en curso e historial. Todo en un sitio."
            : "Upcoming, active and past. Everything in one place."
        }
        actions={
          <Link className="button secondary" href={`/${locale}`}>
            <Icon name="discover" size={17} />
            {es ? "Buscar un plan" : "Find a plan"}
          </Link>
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
      <section
        className="account-booking-section"
        aria-labelledby="account-plans-heading"
      >
        <header className="account-collection-section-heading">
          <span className="account-collection-icon" aria-hidden="true">
            <Icon name="calendar" size={23} />
          </span>
          <div>
            <span>AkiPasa</span>
            <h2 id="account-plans-heading">
              {es ? "Eventos y locales" : "Events and venues"}
            </h2>
          </div>
        </header>
        {error || !result ? (
          <AccountCollectionState
            locale={locale}
            icon="calendar"
            title={
              es
                ? "No se han podido cargar las reservas"
                : "Bookings could not be loaded"
            }
            description={
              es
                ? "Vuelve a intentarlo para consultar tus planes."
                : "Try again to see your plans."
            }
            failed
          />
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
      </section>
      <AccountStayBookings
        locale={locale}
        stays={stays || []}
        failed={Boolean(stayError)}
        cancel={cancelMyStay}
      />
    </>
  );
}
