import Link from "next/link";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { stayLocale } from "@/lib/akiduermo-i18n";
import { stayReservationStatusLabel } from "@/lib/stay-reservation-status";
import { queueSuitePortalWelcome } from "@/lib/suite-welcome";
import { StayAppShell } from "@/components/StayAppShell";
import { signOutStay } from "./actions";
import styles from "./account.module.css";

export const metadata = {
  title: "Account · AkiDuermo",
  robots: { index: false, follow: false },
};

export default async function StayAccountPage() {
  const locale = stayLocale((await headers()).get("x-akipasa-locale"));
  const { supabase, user } = await requireUser(locale, "/account");
  await queueSuitePortalWelcome("akiduermo", locale);
  const es = locale === "es";
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const activeStatuses = ["requested", "confirmed", "checked_in"];
  // Counts must come from the user's actual reservations; do not count saved
  // stays on the server, since favourites currently live on this device.
  const [recent, upcoming, pending, total] = await Promise.all([
    supabase
      .from("accommodation_reservations")
      .select(
        "id,check_in,check_out,status,guests,quoted_total_cents,quote_snapshot",
      )
      .eq("profile_id", user.id)
      .in("status", activeStatuses)
      .gte("check_out", today)
      .order("check_in", { ascending: true })
      .limit(3),
    supabase
      .from("accommodation_reservations")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .in("status", activeStatuses)
      .gte("check_out", today),
    supabase
      .from("accommodation_reservations")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .eq("status", "requested")
      .gte("check_out", today),
    supabase
      .from("accommodation_reservations")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id),
  ]);
  const hasError = Boolean(
    recent.error || upcoming.error || pending.error || total.error,
  );
  const money = (cents: number) =>
    new Intl.NumberFormat(es ? "es-ES" : "en-GB", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);

  return (
    <StayAppShell locale={locale}>
      <div className={styles.account}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>
              AKIDUERMO / {es ? "MI CUENTA" : "MY ACCOUNT"}
            </span>
            <h1>
              {es
                ? "Tu próxima escapada empieza aquí."
                : "Your next escape starts here."}
            </h1>
            <p>
              {es
                ? "Un lugar para tus próximas estancias, favoritos y datos de cuenta."
                : "Your upcoming stays, favourite places and account details in one place."}
            </p>
            <div className={styles.heroActions}>
              <Link
                href="/akiduermo/membership"
                className={styles.secondaryButton}
              >
                {es ? "Membresías" : "Membership"}
              </Link>
              <Link href={"/?lang=" + locale} className={styles.primaryButton}>
                {es ? "Explorar alojamientos" : "Explore stays"}{" "}
                <span aria-hidden="true">↗</span>
              </Link>
              <Link
                href={"/settings?lang=" + locale}
                className={styles.secondaryButton}
              >
                {es ? "Ajustes de cuenta" : "Account settings"}
              </Link>
            </div>
          </div>
          <div className={styles.identity}>
            <span className={styles.avatar} aria-hidden="true">
              {(user.email || "A").slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{es ? "Cuenta AkiSuite" : "AkiSuite account"}</strong>
              <small>{user.email}</small>
            </div>
          </div>
        </section>

        {hasError ? (
          <p role="alert" className={styles.error}>
            {es
              ? "No hemos podido actualizar tu resumen de reservas. Puedes seguir consultando tus reservas."
              : "We couldn't update your booking overview. You can still open your bookings."}
          </p>
        ) : (
          <section
            className={styles.stats}
            aria-label={es ? "Resumen de reservas" : "Bookings overview"}
          >
            <div>
              <strong>{upcoming.count ?? 0}</strong>
              <span>{es ? "Próximas o actuales" : "Upcoming or current"}</span>
            </div>
            <div>
              <strong>{pending.count ?? 0}</strong>
              <span>{es ? "Esperando respuesta" : "Awaiting reply"}</span>
            </div>
            <div>
              <strong>{total.count ?? 0}</strong>
              <span>{es ? "Reservas totales" : "Total bookings"}</span>
            </div>
          </section>
        )}

        <div className={styles.columns}>
          <div className={styles.primaryColumn}>
            <section className={styles.stays}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.eyebrow}>
                    {es ? "TUS ESTANCIAS" : "YOUR STAYS"}
                  </span>
                  <h2>{es ? "Próximas reservas" : "Upcoming stays"}</h2>
                </div>
                <Link href={"/bookings?lang=" + locale}>
                  {es ? "Ver todas →" : "View all →"}
                </Link>
              </div>
              {hasError ? (
                <div className={styles.empty}>
                  <Link href={"/bookings?lang=" + locale}>
                    {es ? "Abrir mis reservas →" : "Open my bookings →"}
                  </Link>
                </div>
              ) : !recent.data?.length ? (
                <div className={styles.empty}>
                  <strong>
                    {es
                      ? "Tu próxima aventura te espera"
                      : "Your next adventure awaits"}
                  </strong>
                  <p>
                    {es
                      ? "Todavía no tienes estancias próximas. Encuentra el lugar perfecto para desconectar."
                      : "No upcoming stays just yet. Find somewhere worth getting away for."}
                  </p>
                  <Link href={"/?lang=" + locale}>
                    {es ? "Buscar alojamiento →" : "Find a stay →"}
                  </Link>
                </div>
              ) : (
                <div className={styles.stayList}>
                  {recent.data.map((stay) => (
                    <article key={stay.id} className={styles.stayCard}>
                      <div className={styles.stayHead}>
                        <div>
                          <span className={styles.eyebrow}>AKIDUERMO</span>
                          <h3>
                            {stay.quote_snapshot?.room_name ||
                              (es ? "Tu alojamiento" : "Your stay")}
                          </h3>
                        </div>
                        <span
                          className={styles.status}
                          data-status={stay.status}
                        >
                          {stayReservationStatusLabel(stay.status, locale)}
                        </span>
                      </div>
                      <div className={styles.stayDetails}>
                        <span>
                          <small>CHECK-IN</small>
                          <strong>{stay.check_in}</strong>
                        </span>
                        <span aria-hidden="true">→</span>
                        <span>
                          <small>CHECK-OUT</small>
                          <strong>{stay.check_out}</strong>
                        </span>
                        <span className={styles.price}>
                          <small>
                            {es ? "TOTAL ESTIMADO" : "ESTIMATED TOTAL"}
                          </small>
                          <strong>{money(stay.quoted_total_cents)}</strong>
                        </span>
                      </div>
                      <span className={styles.guests}>
                        {stay.guests} {es ? "huéspedes" : "guests"}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <section className={styles.quickLinks}>
              <span className={styles.eyebrow}>
                {es ? "A UN TOQUE" : "ONE TAP AWAY"}
              </span>
              <div className={styles.linkGrid}>
                <Link href={"/bookings?lang=" + locale}>
                  <strong>{es ? "Mis reservas" : "My bookings"}</strong>
                  <span>
                    {es ? "Historial y solicitudes" : "History & requests"}
                  </span>
                  <b aria-hidden="true">↗</b>
                </Link>
                <Link href={"/saved?lang=" + locale}>
                  <strong>{es ? "Guardados" : "Saved stays"}</strong>
                  <span>
                    {es
                      ? "Favoritos en este dispositivo"
                      : "Favourites on this device"}
                  </span>
                  <b aria-hidden="true">↗</b>
                </Link>
              </div>
            </section>
          </div>
          <aside className={styles.sidebar}>
            <section className={styles.sideCard}>
              <span className={styles.eyebrow}>
                {es ? "TU PERFIL" : "YOUR PROFILE"}
              </span>
              <h2>{es ? "Datos de cuenta" : "Account details"}</h2>
              <small>{es ? "CORREO DE ACCESO" : "SIGN-IN EMAIL"}</small>
              <strong className={styles.email}>{user.email}</strong>
              <p>
                {es
                  ? "Tus datos de acceso son compartidos con AkiPasa. Tus reservas siguen separadas por producto."
                  : "Your sign-in details are shared with AkiPasa. Your bookings stay separate by product."}
              </p>
              <Link href={"/settings?lang=" + locale}>
                <span>
                  {es ? "Seguridad y ajustes" : "Security & settings"}
                </span>
                <span aria-hidden="true">↗</span>
              </Link>
              <Link href={"https://akipasa.com/" + locale + "/account"}>
                <span>
                  {es ? "Abrir mi perfil AkiPasa" : "Open my AkiPasa profile"}
                </span>
                <span aria-hidden="true">↗</span>
              </Link>
            </section>
            <section className={styles.sideCard}>
              <span className={styles.eyebrow}>
                {es ? "SESION" : "SESSION"}
              </span>
              <h2>{es ? "Acceso a AkiSuite" : "AkiSuite access"}</h2>
              <p>
                {es
                  ? "Al cambiar de web, es posible que debas iniciar sesión de nuevo."
                  : "You may need to sign in again when moving between AkiSuite websites."}
              </p>
              <form action={signOutStay}>
                <button type="submit" className={styles.logout}>
                  {es ? "Cerrar sesión" : "Sign out"}{" "}
                  <span aria-hidden="true">↗</span>
                </button>
              </form>
            </section>
          </aside>
        </div>
      </div>
    </StayAppShell>
  );
}
