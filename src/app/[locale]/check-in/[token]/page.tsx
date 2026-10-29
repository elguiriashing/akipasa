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
  const { data: credential } = await supabase
    .from("venue_checkin_credentials")
    .select("id,venues(id,name)")
    .eq("token", token)
    .eq("active", true)
    .maybeSingle();
  if (!credential) notFound();
  const es = locale === "es";
  const venue = credential.venues as unknown as {
    id: string;
    name: string;
  } | null;
  if (!venue) notFound();
  return (
    <main className="shell pasa-checkin-visit">
      <section className="hero">
        <div className="eyebrow">Check-in</div>
        <h1>{venue.name}</h1>
        <p className="lede">
          {es
            ? "Comprueba el nombre del local y confirma tu ubicación. La visita se verificará al enviar el check-in."
            : "Check the venue name and share your location. Your visit is verified when you submit the check-in."}
        </p>
      </section>
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
