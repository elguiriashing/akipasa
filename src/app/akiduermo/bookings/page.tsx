import Link from "next/link";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { stayLocale } from "@/lib/akiduermo-i18n";
import { StayAppShell } from "@/components/StayAppShell";
import { cancelStayRequest } from "./actions";
import styles from "../member.module.css";

export const metadata = {
  title: "My bookings · AkiDuermo",
  robots: { index: false, follow: false },
};
export default async function StayBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const locale = stayLocale((await headers()).get("x-akipasa-locale"));
  const es = locale === "es";
  const query = await searchParams;
  const tab =
    query.tab === "active" || query.tab === "past" ? query.tab : "upcoming";
  const page = Math.max(
    0,
    Math.min(1000, Number.parseInt(query.page || "0", 10) || 0),
  );
  const { supabase, user } = await requireUser(locale, "/bookings");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  let request = supabase
    .from("accommodation_reservations")
    .select(
      "id,check_in,check_out,status,guests,quoted_total_cents,quote_snapshot",
      { count: "exact" },
    )
    .eq("profile_id", user.id);
  if (tab === "past")
    request = request
      .or(
        `status.eq.cancelled,status.eq.checked_out,status.eq.no_show,check_out.lte.${today}`,
      )
      .order("check_out", { ascending: false });
  else if (tab === "active")
    request = request
      .in("status", ["requested", "confirmed", "checked_in"])
      .lte("check_in", today)
      .gt("check_out", today)
      .order("check_out");
  else
    request = request
      .in("status", ["requested", "confirmed", "checked_in"])
      .gt("check_in", today)
      .order("check_in");
  const { data, count, error } = await request.range(page * 20, page * 20 + 19);
  const money = (cents: number) =>
    new Intl.NumberFormat(es ? "es-ES" : "en-GB", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  const href = (nextTab: string, nextPage = 0) =>
    `/bookings?lang=${locale}&tab=${nextTab}&page=${nextPage}`;
  return (
    <StayAppShell locale={locale}>
      <div className={styles.eyebrow}>AkiDuermo</div>
      <h1>{es ? "Mis reservas" : "My bookings"}</h1>
      <p className={styles.lead}>
        {es
          ? "Sigue tus solicitudes y estancias sin salir de AkiDuermo."
          : "Track requests and stays without leaving AkiDuermo."}
      </p>
      <nav
        className={styles.tabs}
        aria-label={es ? "Estado de reservas" : "Booking status"}
      >
        {(["upcoming", "active", "past"] as const).map((value) => (
          <Link
            key={value}
            href={href(value)}
            aria-current={tab === value ? "page" : undefined}
          >
            {es
              ? {
                  upcoming: "Próximas",
                  active: "En curso",
                  past: "Anteriores",
                }[value]
              : { upcoming: "Upcoming", active: "Active", past: "Past" }[value]}
          </Link>
        ))}
      </nav>
      {query.cancelled && (
        <p role="status">{es ? "Reserva cancelada." : "Stay cancelled."}</p>
      )}
      {query.error && (
        <p role="alert">
          {es
            ? "No se pudo cancelar. Vuelve a intentarlo."
            : "Could not cancel. Please try again."}
        </p>
      )}
      {error ? (
        <p role="alert">
          {es
            ? "No se pudieron cargar tus estancias."
            : "Your stays could not be loaded."}
        </p>
      ) : !data?.length ? (
        <div className={styles.panel}>
          <p>{es ? "Todavía no hay estancias aquí." : "No stays here yet."}</p>
          <Link href={`/?lang=${locale}`}>
            {es ? "Explorar alojamientos" : "Explore stays"}
          </Link>
        </div>
      ) : (
        <div className={styles.bookingGrid}>
          {data.map((stay) => (
            <article key={stay.id} className={styles.booking}>
              <strong>{stay.quote_snapshot?.room_name || "AkiDuermo"}</strong>
              <span>
                {stay.check_in} → {stay.check_out} · {stay.guests}{" "}
                {es ? "huéspedes" : "guests"}
              </span>
              <span>
                {stay.status} · {money(stay.quoted_total_cents)}
              </span>
              <small>{stay.id}</small>
              {["requested", "confirmed"].includes(stay.status) &&
                stay.check_in > today && (
                  <form action={cancelStayRequest}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="bookingId" value={stay.id} />
                    <button className="button secondary">
                      {es ? "Cancelar solicitud" : "Cancel request"}
                    </button>
                  </form>
                )}
            </article>
          ))}
        </div>
      )}
      {!error && (count || 0) > 20 && (
        <nav className={styles.tabs} aria-label={es ? "Páginas" : "Pages"}>
          {page > 0 && (
            <Link href={href(tab, page - 1)}>
              {es ? "Anterior" : "Previous"}
            </Link>
          )}
          <span>
            {es ? "Página" : "Page"} {page + 1} / {Math.ceil((count || 0) / 20)}
          </span>
          {(page + 1) * 20 < (count || 0) && (
            <Link href={href(tab, page + 1)}>{es ? "Siguiente" : "Next"}</Link>
          )}
        </nav>
      )}
    </StayAppShell>
  );
}
