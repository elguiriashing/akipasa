import Link from "next/link";
import { notFound } from "next/navigation";
import { requireIdentity } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { requestRestrictedDeletion } from "../actions";
import { signOut } from "../../auth/actions";
import { PersonalisationSettings } from "@/components/PersonalisationSettings";

export default async function RestrictedPrivacy({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireIdentity(locale, `/${locale}/onboarding/privacy`);
  const query = await searchParams;
  const es = locale === "es";
  return (
    <main className="account-completion">
      <section className="account-completion-card stack">
        <h1>
          {es
            ? "Privacidad y control de cuenta"
            : "Privacy and account controls"}
        </h1>
        <p>
          {es
            ? "Estas opciones siguen disponibles mientras tu cuenta está restringida."
            : "These controls remain available while your account is restricted."}
        </p>
        <PersonalisationSettings locale={locale} initialEnabled={false} />
        <Link href={`/${locale}/account/export`}>
          {es ? "Exportar mis datos" : "Export my data"}
        </Link>
        <Link href={`/${locale}/privacy`}>
          {es
            ? "Política de privacidad y contacto"
            : "Privacy policy and contact"}
        </Link>
        {process.env.AKIPASA_PRESTIGE_SCHEMA_READY === "true" && (
          <Link href={`/${locale}/privacy/prestige`}>
            {es
              ? "Privacidad de premios y envíos"
              : "Award and shipping privacy"}
          </Link>
        )}
        {query.error && (
          <p role="alert">
            {es
              ? "No se pudo registrar la solicitud. Revisa la confirmación o inténtalo de nuevo."
              : "Could not register the request. Check the confirmation or try again."}
          </p>
        )}
        {query.requested ? (
          <p role="status">
            {es
              ? "Solicitud de eliminación registrada."
              : "Deletion request registered."}
          </p>
        ) : (
          <form className="stack" action={requestRestrictedDeletion}>
            <input type="hidden" name="locale" value={locale} />
            <label>
              {es
                ? "Escribe DELETE para solicitar la eliminación"
                : "Type DELETE to request deletion"}
              <input name="confirmation" autoComplete="off" required />
            </label>
            <button className="button secondary" type="submit">
              {es ? "Solicitar eliminación" : "Request deletion"}
            </button>
          </form>
        )}
        <form action={signOut}>
          <input name="locale" type="hidden" value={locale} />
          <button className="button secondary" type="submit">
            {es ? "Cerrar sesión" : "Sign out"}
          </button>
        </form>
      </section>
    </main>
  );
}
