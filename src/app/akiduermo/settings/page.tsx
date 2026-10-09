import Link from "next/link";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { stayLocale } from "@/lib/akiduermo-i18n";
import { StayAppShell } from "@/components/StayAppShell";
import { changeStayAccountEmail, resetStayPassword } from "./actions";
import styles from "../member.module.css";

export const metadata = {
  title: "Settings · AkiDuermo",
  robots: { index: false, follow: false },
};
export default async function StaySettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const locale = stayLocale((await headers()).get("x-akipasa-locale"));
  const { user } = await requireUser(locale, "/settings");
  const query = await searchParams;
  const es = locale === "es";
  return (
    <StayAppShell locale={locale}>
      <div className={styles.eyebrow}>AkiDuermo</div>
      <h1>{es ? "Ajustes" : "Settings"}</h1>
      <p className={styles.lead}>
        {es
          ? "Idioma y tema arriba; acceso y seguridad aquí."
          : "Language and theme above; access and security here."}
      </p>
      {(query.email || query.password) && (
        <p role="status" className={styles.panel}>
          {query.email === "pending"
            ? es
              ? "Revisa el correo nuevo para confirmar el cambio."
              : "Check the new inbox to confirm the change."
            : query.email === "confirmed"
              ? es
                ? "Correo actualizado."
                : "Email updated."
              : es
                ? "Te hemos enviado el enlace de recuperación."
                : "We sent your recovery link."}
        </p>
      )}
      {query.error && (
        <p role="alert" className={styles.panel}>
          {es
            ? "No se pudo completar el cambio. Comprueba los datos e inténtalo de nuevo."
            : "Could not complete that change. Check the details and try again."}
        </p>
      )}
      <section className={styles.panel}>
        <h2>{es ? "Correo de acceso" : "Sign-in email"}</h2>
        <p>
          {es
            ? "La misma dirección sirve para AkiPasa y AkiDuermo."
            : "The same address works for AkiPasa and AkiDuermo."}
        </p>
        <form action={changeStayAccountEmail} className="stack">
          <input type="hidden" name="locale" value={locale} />
          <label htmlFor="stay-email">
            {es ? "Nuevo correo" : "New email"}
          </label>
          <input
            id="stay-email"
            name="email"
            type="email"
            maxLength={254}
            required
            autoComplete="email"
            placeholder={user.email || ""}
          />
          <button className="button secondary">
            {es ? "Cambiar correo" : "Change email"}
          </button>
        </form>
      </section>
      <section className={styles.panel}>
        <h2>{es ? "Contraseña" : "Password"}</h2>
        <form action={resetStayPassword}>
          <input type="hidden" name="locale" value={locale} />
          <button className="button secondary">
            {es ? "Enviar enlace de recuperación" : "Send password reset link"}
          </button>
        </form>
      </section>
      <section className={styles.panel}>
        <h2>{es ? "Privacidad y datos" : "Privacy and data"}</h2>
        <p>
          {es
            ? "Los datos pertenecen a tu cuenta compartida. La exportación y eliminación se gestionan en AkiPasa."
            : "Your data belongs to the shared account. Export and deletion are managed in AkiPasa."}
        </p>
        <Link href={`https://akipasa.com/${locale}/account/privacy`}>
          {es ? "Gestionar datos de la cuenta ↗" : "Manage account data ↗"}
        </Link>
      </section>
    </StayAppShell>
  );
}
