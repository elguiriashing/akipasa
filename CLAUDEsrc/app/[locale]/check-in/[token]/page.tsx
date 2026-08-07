import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { loadFeatureFlags } from "@/lib/feature-flags";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { completeCheckIn } from "./actions";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!isLocale(locale) || !/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const supabase = await createSupabaseServerClient();
  const flags = await loadFeatureFlags(supabase);
  const { data: program } = await supabase
    .from("loyalty_programs")
    .select(
      "id,title_es,title_en,reward_es,reward_en,stamps_required,venues(name)",
    )
    .eq("check_in_token", token)
    .eq("active", true)
    .maybeSingle();
  if (!program) notFound();
  const es = locale === "es";
  const venue = program.venues as unknown as { name: string } | null;
  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">Check-in</div>
        <h1>
          {locale === "en"
            ? program.title_en || program.title_es
            : program.title_es}
        </h1>
        <p className="lede">
          {venue?.name} · {program.stamps_required}{" "}
          {es ? "sellos para" : "stamps for"}{" "}
          {locale === "en"
            ? program.reward_en || program.reward_es
            : program.reward_es}
        </p>
      </section>
      <section className="panel auth-panel">
        <p>
          {es
            ? "Confirma tu visita. AkiPasa no guarda tu ubicación precisa."
            : "Confirm your visit. AkiPasa does not store your precise location."}
        </p>
        {flags.loyalty_check_ins ? (
          <form action={completeCheckIn} className="actions">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="idempotencyKey" value={randomUUID()} />
            <button className="button" type="submit">
              {es ? "Confirmar check-in" : "Confirm check-in"}
            </button>
          </form>
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
