import Link from "next/link";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { conduzcoLocale } from "@/lib/akiconduzco-i18n";
import { formatRentalPrice } from "@/lib/akiconduzco";
import { ConduzcoHeader } from "@/components/AkiConduzco";
import styles from "@/components/AkiConduzco.module.css";

export const metadata = {
  title: "Your rental requests · AkiConduzco",
  robots: { index: false, follow: false },
};

export default async function RenterAccountPage() {
  const requestHeaders = await headers();
  const locale = conduzcoLocale(requestHeaders.get("x-akipasa-locale"));
  const es = locale === "es";
  const { supabase } = await requireUser(locale, "/account");
  const { data: bookings, error } = await supabase
    .from("car_rental_bookings")
    .select(
      "id,start_date,end_date,quoted_total_cents,currency,status,created_at,vehicle:car_rental_vehicles(name,category,company:car_rental_companies(name,city))",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  type RentalBookingRow = {
    id: string;
    start_date: string;
    end_date: string;
    quoted_total_cents: number;
    status: string;
    vehicle:
      | {
          name: string;
          company:
            | { name: string; city: string }
            | Array<{ name: string; city: string }>
            | null;
        }
      | Array<{
          name: string;
          company:
            | { name: string; city: string }
            | Array<{ name: string; city: string }>
            | null;
        }>
      | null;
  };
  const bookingRows = (bookings || []) as unknown as RentalBookingRow[];
  const statusLabel: Record<string, string> = es
    ? {
        requested: "Esperando confirmación",
        confirmed: "Confirmada por la empresa",
        declined: "Rechazada",
        cancelled: "Cancelada",
        completed: "Completada",
      }
    : {
        requested: "Awaiting company confirmation",
        confirmed: "Confirmed by company",
        declined: "Declined",
        cancelled: "Cancelled",
        completed: "Completed",
      };
  return (
    <div className={styles.app}>
      <ConduzcoHeader locale={locale} />
      <main className={styles.main}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.eyebrow}>
              {es ? "TU VIAJE" : "YOUR TRIP"}
            </span>
            <h2>{es ? "Solicitudes de alquiler" : "Your rental requests"}</h2>
          </div>
          <Link href={`/?lang=${locale}`}>
            {es ? "Buscar coches →" : "Find a car →"}
          </Link>
        </div>
        {error ? (
          <p className={styles.error} role="alert">
            {es
              ? "No se pudo cargar el historial."
              : "Rental request history is unavailable."}
          </p>
        ) : !bookingRows.length ? (
          <div className={styles.empty}>
            {es
              ? "Aún no tienes solicitudes de alquiler."
              : "You haven’t sent a rental request yet."}
          </div>
        ) : (
          <div className={styles.grid}>
            {bookingRows.map((booking) => {
              const vehicle = Array.isArray(booking.vehicle)
                ? booking.vehicle[0]
                : booking.vehicle;
              const company = Array.isArray(vehicle?.company)
                ? vehicle.company[0]
                : vehicle?.company;
              return (
                <article key={booking.id} className={styles.detailPanel}>
                  <span className={styles.eyebrow}>
                    {company?.name ||
                      (es ? "Empresa de alquiler" : "Rental company")}
                  </span>
                  <h3>{vehicle?.name || (es ? "Vehículo" : "Vehicle")}</h3>
                  <p>
                    {booking.start_date} → {booking.end_date}
                  </p>
                  <p>
                    {formatRentalPrice(booking.quoted_total_cents, locale)} ·{" "}
                    {statusLabel[booking.status] ||
                      (es ? "Estado desconocido" : "Status unavailable")}
                  </p>
                  <small>
                    {es
                      ? "Las solicitudes deben ser confirmadas directamente por la empresa. No hay pago en línea."
                      : "The company must confirm requests directly. No online payment is taken."}
                  </small>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
