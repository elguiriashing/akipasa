import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BadgeProgress } from "@/components/BadgeProgress";
import { requestReward } from "./actions";

export default async function PassportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const es = locale === "es";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [
    { data: passports },
    { data: programs },
    { data: ledger },
    { data: xp },
    { data: progress },
  ] = await Promise.all([
    supabase
      .from("passports")
      .select(
        "id,slug,title_es,title_en,description_es,description_en,reward_es,reward_en,starts_at,ends_at,passport_steps(id,label_es,label_en,venues(name))",
      )
      .eq("status", "published")
      .lte("starts_at", new Date().toISOString())
      .gte("ends_at", new Date().toISOString()),
    supabase
      .from("loyalty_programs")
      .select(
        "id,title_es,title_en,reward_es,reward_en,stamps_required,venues(name)",
      )
      .eq("active", true),
    user
      ? supabase
          .from("loyalty_ledger")
          .select("program_id,delta")
          .eq("profile_id", user.id)
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from("xp_ledger").select("delta").eq("profile_id", user.id)
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from("passport_progress")
          .select("step_id")
          .eq("profile_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);
  const balances = new Map<string, number>();
  ledger?.forEach((entry) =>
    balances.set(
      entry.program_id,
      (balances.get(entry.program_id) || 0) + entry.delta,
    ),
  );
  const completed = new Set(progress?.map((entry) => entry.step_id));
  const totalXp = xp?.reduce((sum, entry) => sum + entry.delta, 0) || 0;
  return (
    <main className="shell dashboard">
      <section className="hero">
        <div className="eyebrow">
          {es ? "Explora y gana" : "Explore and earn"}
        </div>
        <h1>{es ? "Pasaportes y sellos" : "Passports and stamps"}</h1>
        <p className="lede">
          {es
            ? "Haz check-in en locales participantes. Los puntos no tienen valor en efectivo."
            : "Check in at participating venues. Points have no cash value."}
        </p>
      </section>
      {query.checkin && (
        <p className="notice">
          {query.checkin === "accepted"
            ? es
              ? "Check-in aceptado: +1 sello y +10 XP."
              : "Check-in accepted: +1 stamp and +10 XP."
            : query.checkin === "cooldown"
              ? es
                ? "Ya hiciste check-in aquí en las últimas seis horas."
                : "You already checked in here within six hours."
              : es
                ? "No se pudo aceptar el check-in."
                : "The check-in could not be accepted."}
        </p>
      )}
      {query.reward && (
        <p className="notice">
          {query.reward === "requested"
            ? es
              ? "Recompensa solicitada. Enséñala al personal del local."
              : "Reward requested. Show it to venue staff."
            : es
              ? "Aún no hay sellos suficientes o ya existe una solicitud."
              : "There are not enough stamps yet, or a request already exists."}
        </p>
      )}
      <section className="panel">
        <h2>XP</h2>
        <p className="metric">{totalXp}</p>
        {!user && (
          <p>
            {es
              ? "Inicia sesión para guardar tu progreso."
              : "Sign in to save your progress."}
          </p>
        )}
      </section>
      {user && <BadgeProgress locale={locale} totalXp={totalXp} />}
      <section className="dashboard-grid">
        <div className="panel">
          <h2>{es ? "Pasaportes activos" : "Active passports"}</h2>
          {passports?.length ? (
            passports.map((passport) => (
              <article key={passport.id}>
                <h3>
                  {locale === "en"
                    ? passport.title_en || passport.title_es
                    : passport.title_es}
                </h3>
                <p>
                  {locale === "en"
                    ? passport.description_en || passport.description_es
                    : passport.description_es}
                </p>
                {passport.passport_steps.map((step) => (
                  <p key={step.id}>
                    {completed.has(step.id) ? "✓" : "○"}{" "}
                    {locale === "en"
                      ? step.label_en || step.label_es
                      : step.label_es}{" "}
                    ·{" "}
                    {(step.venues as unknown as { name: string } | null)?.name}
                  </p>
                ))}
                <strong>
                  {es ? "Recompensa:" : "Reward:"}{" "}
                  {locale === "en"
                    ? passport.reward_en || passport.reward_es
                    : passport.reward_es}
                </strong>
              </article>
            ))
          ) : (
            <p>
              {es
                ? "No hay pasaportes activos en este momento."
                : "There are no active passports right now."}
            </p>
          )}
        </div>
        <div className="panel">
          <h2>{es ? "Tarjetas de sellos" : "Stamp cards"}</h2>
          {programs?.length ? (
            programs.map((program) => {
              const balance = balances.get(program.id) || 0;
              return (
                <article key={program.id}>
                  <h3>
                    {locale === "en"
                      ? program.title_en || program.title_es
                      : program.title_es}
                  </h3>
                  <p>
                    {
                      (program.venues as unknown as { name: string } | null)
                        ?.name
                    }
                  </p>
                  <p>
                    <strong>
                      {balance} / {program.stamps_required}
                    </strong>{" "}
                    {es ? "sellos" : "stamps"}
                  </p>
                  <p>
                    {locale === "en"
                      ? program.reward_en || program.reward_es
                      : program.reward_es}
                  </p>
                  {user && balance >= program.stamps_required && (
                    <form action={requestReward}>
                      <input type="hidden" name="locale" value={locale} />
                      <input
                        type="hidden"
                        name="programId"
                        value={program.id}
                      />
                      <button className="button" type="submit">
                        {es ? "Solicitar recompensa" : "Request reward"}
                      </button>
                    </form>
                  )}
                </article>
              );
            })
          ) : (
            <p>
              {es
                ? "Los negocios participantes aparecerán aquí."
                : "Participating businesses will appear here."}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
