import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { optionalUser } from "@/lib/auth";
import { BadgeProgress } from "@/components/BadgeProgress";
import {
  ConsoleMetric,
  ConsoleSectionHeader,
} from "@/components/ConsoleChrome";
import {
  WorkspaceShell,
  type WorkspaceItem,
} from "@/components/WorkspaceShell";
import { requestReward } from "./actions";

function progressStyle(value: number): CSSProperties {
  return {
    "--progress": `${Math.min(100, Math.max(0, value))}%`,
  } as CSSProperties;
}

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
  const view = ["progress", "passports", "stamps", "badges"].includes(
    query.view || "",
  )
    ? query.view!
    : "progress";
  const { supabase, user } = await optionalUser();
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
  const totalStamps = [...balances.values()].reduce(
    (sum, balance) => sum + balance,
    0,
  );
  const base = `/${locale}/passports`;
  const items: WorkspaceItem[] = [
    { href: base, label: es ? "Progreso" : "Progress", icon: "activity" },
    {
      href: `${base}?view=passports`,
      label: es ? "Pasaportes" : "Passports",
      icon: "gift",
      count: passports?.length ? passports.length : undefined,
    },
    {
      href: `${base}?view=stamps`,
      label: es ? "Sellos" : "Stamps",
      icon: "saved",
      count: totalStamps || undefined,
    },
    ...(user
      ? [
          {
            href: `${base}?view=badges`,
            label: es ? "Insignias" : "Badges",
            icon: "shield" as const,
          },
        ]
      : []),
  ];

  return (
    <WorkspaceShell
      title={es ? "Pasaportes y sellos" : "Passports and stamps"}
      eyebrow={es ? "Explora y gana" : "Explore and earn"}
      description={
        es
          ? "Haz check-in en locales participantes. Los puntos no tienen valor en efectivo."
          : "Check in at participating venues. Points have no cash value."
      }
      homeHref={base}
      items={items}
      navigationTitle={es ? "Pasaportes" : "Passports"}
    >
      {query.checkin && (
        <p className="notice">
          {query.checkin === "accepted"
            ? es
              ? "Check-in aceptado: +1 sello y +10 XP."
              : "Check-in accepted: +1 stamp and +10 XP."
            : query.checkin === "cooldown"
              ? es
                ? "Ya hiciste check-in aqui en las ultimas seis horas."
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
              ? "Recompensa solicitada. Enseñala al personal del local."
              : "Reward requested. Show it to venue staff."
            : es
              ? "Aun no hay sellos suficientes o ya existe una solicitud."
              : "There are not enough stamps yet, or a request already exists."}
        </p>
      )}

      {view === "progress" && (
        <section
          className="metrics-grid"
          aria-label={es ? "Resumen" : "Summary"}
        >
          <ConsoleMetric
            label="XP"
            value={totalXp}
            detail={es ? "Progreso total" : "Total progress"}
          />
          <ConsoleMetric
            label={es ? "Pasaportes" : "Passports"}
            value={passports?.length || 0}
            detail={es ? "Rutas activas" : "Active routes"}
          />
          <ConsoleMetric
            label={es ? "Sellos" : "Stamps"}
            value={totalStamps}
            detail={es ? "Acumulados" : "Collected"}
          />
          <ConsoleMetric
            label={es ? "Pasos" : "Steps"}
            value={completed.size}
            detail={es ? "Completados" : "Completed"}
          />
        </section>
      )}

      {view === "progress" && (
        <section className="console-section">
          <ConsoleSectionHeader
            label={es ? "Progreso" : "Progress"}
            title={es ? "Tu viaje como explorador" : "Your explorer journey"}
            description={
              es
                ? "Una vista clara de tu nivel y de lo que has desbloqueado."
                : "A clear view of your level and everything you have unlocked."
            }
            icon="XP"
          />
          <section className="panel rewards-summary">
            <div>
              <span className="status-pill">XP</span>
              <h2>{es ? "Progreso del explorador" : "Explorer progress"}</h2>
              {!user && (
                <p>
                  {es
                    ? "Inicia sesion para guardar tu progreso."
                    : "Sign in to save your progress."}
                </p>
              )}
            </div>
            <p className="metric">{totalXp}</p>
          </section>
        </section>
      )}

      {view === "passports" && (
        <section className="console-section">
          <ConsoleSectionHeader
            label={es ? "Explora" : "Explore"}
            title={es ? "Pasaportes activos" : "Active passports"}
            description={
              es
                ? "Completa rutas locales paso a paso."
                : "Complete local routes one step at a time."
            }
            icon="PX"
          />
          <div className="panel passport-column">
            {passports?.length ? (
              <div className="reward-card-list">
                {passports.map((passport) => (
                  <article className="passport-card" key={passport.id}>
                    <div className="card-title-row">
                      <span className="console-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="M6 4h12v16H6z" />
                          <path d="M9 8h6M9 12h6M9 16h4" />
                        </svg>
                        <span>PX</span>
                      </span>
                      <h3>
                        {locale === "en"
                          ? passport.title_en || passport.title_es
                          : passport.title_es}
                      </h3>
                    </div>
                    <p>
                      {locale === "en"
                        ? passport.description_en || passport.description_es
                        : passport.description_es}
                    </p>
                    <div className="step-list">
                      {passport.passport_steps.map((step) => (
                        <div className="step-row" key={step.id}>
                          <span className="status-pill">
                            {completed.has(step.id)
                              ? es
                                ? "Hecho"
                                : "Done"
                              : es
                                ? "Pendiente"
                                : "Open"}
                          </span>
                          <p>
                            {locale === "en"
                              ? step.label_en || step.label_es
                              : step.label_es}
                            <span>
                              {
                                (
                                  step.venues as unknown as {
                                    name: string;
                                  } | null
                                )?.name
                              }
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                    <strong className="reward-strip">
                      {es ? "Recompensa:" : "Reward:"}{" "}
                      {locale === "en"
                        ? passport.reward_en || passport.reward_es
                        : passport.reward_es}
                    </strong>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">
                {es
                  ? "No hay pasaportes activos en este momento."
                  : "There are no active passports right now."}
              </p>
            )}
          </div>
        </section>
      )}

      {view === "stamps" && (
        <section className="console-section">
          <ConsoleSectionHeader
            label={es ? "Fidelidad" : "Loyalty"}
            title={es ? "Tarjetas de sellos" : "Stamp cards"}
            description={
              es
                ? "Vuelve a tus locales favoritos y gana recompensas."
                : "Return to favourite venues and earn rewards."
            }
            icon="ST"
          />
          <div className="panel passport-column">
            {programs?.length ? (
              <div className="reward-card-list">
                {programs.map((program) => {
                  const balance = balances.get(program.id) || 0;
                  const percent = (balance / program.stamps_required) * 100;
                  return (
                    <article className="stamp-card" key={program.id}>
                      <div className="card-title-row">
                        <span className="console-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24">
                            <path d="M7 4h10v16l-5-3-5 3V4Z" />
                            <path d="M10 9h4" />
                          </svg>
                          <span>ST</span>
                        </span>
                        <h3>
                          {locale === "en"
                            ? program.title_en || program.title_es
                            : program.title_es}
                        </h3>
                      </div>
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
                      <div
                        className="stamp-progress"
                        style={progressStyle(percent)}
                      />
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
                })}
              </div>
            ) : (
              <p className="empty-state">
                {es
                  ? "Los negocios participantes apareceran aqui."
                  : "Participating businesses will appear here."}
              </p>
            )}
          </div>
        </section>
      )}

      {user && view === "badges" && (
        <section className="console-section">
          <ConsoleSectionHeader
            label={es ? "Coleccion" : "Collection"}
            title={es ? "Insignias del explorador" : "Explorer badges"}
            description={
              es
                ? "Hitos que celebran tu actividad local."
                : "Milestones that celebrate your local activity."
            }
            icon="BD"
          />
          <BadgeProgress locale={locale} totalXp={totalXp} />
        </section>
      )}
    </WorkspaceShell>
  );
}
