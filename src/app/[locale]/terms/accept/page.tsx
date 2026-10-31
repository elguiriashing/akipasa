import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { config, isLocale } from "@/lib/config";
import { safeAuthDestination } from "@/lib/auth-security";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { acceptTerms } from "./actions";
import { headers } from "next/headers";
import { safeStayDestination } from "@/lib/akiduermo-routing";
import { safeConduzcoDestination } from "@/lib/akiconduzco-routing";

export default async function TermsAcceptancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const product = (await headers()).get("x-akipasa-product");
  const stayHost = product === "akiduermo";
  const conduzcoHost = product === "akiconduzco";
  const next = stayHost
    ? safeStayDestination(query.next)
    : conduzcoHost
      ? safeConduzcoDestination(query.next)
      : safeAuthDestination(locale, query.next);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    redirect(
      `/${locale}/auth?next=${encodeURIComponent(`/${locale}/terms/accept?next=${encodeURIComponent(next)}`)}`,
    );
  const es = locale === "es";

  return (
    <main className="shell pasa-terms-accept-page">
      <section className="hero pasa-terms-accept-hero">
        <div className="eyebrow">
          {es ? "Antes de continuar" : "Before you continue"}
        </div>
        <h1>
          {es
            ? "Confirma las condiciones actuales"
            : "Accept the current terms"}
        </h1>
        <p className="lede">
          {es
            ? "Necesitamos registrar qué versión aceptaste para mantener tu cuenta y tus datos de forma responsable."
            : "We need to record which version you accepted so we can manage your account and data responsibly."}
        </p>
        <p className="pasa-terms-accept-version">
          {es ? "Versión" : "Version"}: {config.currentTermsVersion}
        </p>
      </section>
      <nav
        className="pasa-terms-accept-documents"
        aria-label={es ? "Documentos de tu cuenta" : "Account documents"}
      >
        <Link href={`/${locale}/terms`}>
          <span>{es ? "01 · Condiciones" : "01 · Terms"}</span>
          <strong>{es ? "Leer condiciones" : "Read the terms"} ↗</strong>
        </Link>
        <Link href={`/${locale}/privacy`}>
          <span>{es ? "02 · Privacidad" : "02 · Privacy"}</span>
          <strong>{es ? "Revisar privacidad" : "Review privacy"} ↗</strong>
        </Link>
      </nav>
      <section className="panel auth-panel pasa-terms-accept-panel">
        <h2>{es ? "Confirma tu aceptación" : "Confirm your acceptance"}</h2>
        {query.error && (
          <p className="notice" role="alert">
            {es
              ? "No pudimos guardar tu aceptación. Revisa la casilla e inténtalo de nuevo."
              : "We could not save your acceptance. Check the box and try again."}
          </p>
        )}
        <form action={acceptTerms} className="stack">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="next" value={next} />
          <label className="consent-row pasa-terms-accept-consent">
            <input
              name="acceptTerms"
              type="checkbox"
              value="accepted"
              required
            />
            <span>
              {es ? "Acepto las " : "I accept the "}
              <Link href={`/${locale}/terms`}>
                {es ? "condiciones" : "terms"}
              </Link>
              {es ? " y he leído la " : " and have read the "}
              <Link href={`/${locale}/privacy`}>
                {es ? "política de privacidad" : "privacy policy"}
              </Link>
              .
            </span>
          </label>
          <button className="button pasa-terms-accept-submit" type="submit">
            {es ? "Aceptar y continuar" : "Accept and continue"}
          </button>
        </form>
      </section>
    </main>
  );
}
