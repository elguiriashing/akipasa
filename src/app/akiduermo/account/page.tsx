import Link from "next/link";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { stayLocale } from "@/lib/akiduermo-i18n";
import { StayAppShell } from "@/components/StayAppShell";
import { signOutStay } from "./actions";
import styles from "../member.module.css";

export const metadata = {
  title: "Account · AkiDuermo",
  robots: { index: false, follow: false },
};
export default async function StayAccountPage() {
  const locale = stayLocale((await headers()).get("x-akipasa-locale"));
  const { user } = await requireUser(locale, "/account");
  const es = locale === "es";
  return (
    <StayAppShell locale={locale}>
      <div className={styles.eyebrow}>AkiDuermo</div>
      <h1>{es ? "Tu espacio" : "Your space"}</h1>
      <p className={styles.lead}>
        {es
          ? "Tus estancias, favoritos y cuenta en un solo lugar."
          : "Your stays, favourites and account in one place."}
      </p>
      <div className={styles.cards}>
        <Link href={`/bookings?lang=${locale}`}>
          <strong>{es ? "Mis reservas" : "My bookings"}</strong>
          <span>
            {es
              ? "Próximas, actuales e historial"
              : "Upcoming, current and past stays"}
          </span>
        </Link>
        <Link href={`/saved?lang=${locale}`}>
          <strong>{es ? "Guardados" : "Saved stays"}</strong>
          <span>
            {es
              ? "Tus alojamientos favoritos en este dispositivo"
              : "Your favourites on this device"}
          </span>
        </Link>
        <Link href={`/settings?lang=${locale}`}>
          <strong>{es ? "Ajustes" : "Settings"}</strong>
          <span>
            {es ? "Idioma, tema y acceso" : "Language, theme and access"}
          </span>
        </Link>
      </div>
      <section className={styles.panel}>
        <h2>{es ? "Tu cuenta AkiPasa" : "Your AkiPasa account"}</h2>
        <p>{user.email}</p>
        <p>
          {es
            ? "La misma cuenta funciona en AkiPasa y AkiDuermo; las reservas se mantienen separadas por producto."
            : "One account works across AkiPasa and AkiDuermo; your stays have their own space here."}
        </p>
        <form action={signOutStay}>
          <button className="button secondary">
            {es ? "Cerrar sesión" : "Sign out"}
          </button>
        </form>
      </section>
    </StayAppShell>
  );
}
