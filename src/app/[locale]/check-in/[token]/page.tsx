import styles from "../../events/[slug]/book/consumer-action.module.css";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { loadFeatureFlags } from "@/lib/feature-flags";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CheckInForm } from "./CheckInForm";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!isLocale(locale) || !/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const supabase = await createSupabaseServerClient();
  const flags = await loadFeatureFlags(supabase);
  const { data: credential, error: credentialError } = await supabase
    .from("venue_checkin_credentials")
    .select("id,venues(id,name)")
    .eq("token", token)
    .eq("active", true)
    .maybeSingle();
  const es = locale === "es";
  if (credentialError) {
    return (
      <main className={`shell pasa-checkin-visit ${styles.page}`}>
        <header className={styles.intro}>
          <div className={`eyebrow ${styles.kicker}`}>Check-in</div>
          <h1>
            {es ? "No se puede cargar el check-in" : "Check-in unavailable"}
          </h1>
          <p className="lede">
            {es
              ? "No podemos cargar el check-in en este momento. No se ha registrado ninguna visita. Inténtalo de nuevo."
              : "We cannot load check-in right now. No visit has been recorded. Please try again."}
          </p>
        </header>
        <a className="button" href={`/${locale}/check-in/${token}`}>
          {es ? "Reintentar" : "Retry"}
        </a>
      </main>
    );
  }
  if (!credential) notFound();
  const venue = credential.venues as unknown as {
    id: string;
    name: string;
  } | null;
  if (!venue) notFound();
  return (
    <main className={`shell pasa-checkin-visit ${styles.page}`}>
      <header className={styles.intro}>
        <div className={`eyebrow ${styles.kicker}`}>Check-in</div>
        <h1>{venue.name}</h1>
        <p className="lede">
          {es
            ? "Comprueba el nombre del local y confirma tu ubicación. La visita se verificará al enviar el check-in."
            : "Check the venue name and share your location. Your visit is verified when you submit the check-in."}
        </p>
      </header>
      <section className="panel auth-panel">
        <p>
          {es
            ? "Confirma tu visita. AkiPasa no guarda tu ubicación precisa."
            : "Confirm your visit. AkiPasa does not store your precise location."}
        </p>
        {flags.loyalty_check_ins ? (
          <CheckInForm
            locale={locale}
            token={token}
            idempotencyKey={randomUUID()}
          />
        ) : (
          <p className="notice">
            {es
              ? "Los check-ins están pausados temporalmente. No se ha registrado ninguna visita."
              : "Check-ins are temporarily paused. No visit has been recorded."}
          </p>
        )}
      </section>
    </main>
  );
}
