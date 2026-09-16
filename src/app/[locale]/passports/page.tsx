import type { CSSProperties } from "react";
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { optionalUser } from "@/lib/auth";
import { AchievementCelebration } from "@/components/AchievementCelebration";
import { BadgeProgress } from "@/components/BadgeProgress";
import {
  ConsoleMetric,
  ConsoleSectionHeader,
} from "@/components/ConsoleChrome";
import {
  WorkspaceShell,
  type WorkspaceItem,
} from "@/components/WorkspaceShell";
import {
  claimPassportReward,
  claimStampReward,
  enrollPassport,
} from "./actions";

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
    { data: enrollments },
    { data: claims },
  ] = await Promise.all([
    supabase
      .from("passports")
      .select(
        "id,slug,title_es,title_en,description_es,description_en,reward_es,reward_en,starts_at,ends_at,access_tier,completion_window_days,passport_steps(id,label_es,label_en,venues(name)),passport_rewards(access_tier,business_rewards(id,title_es,title_en,description_es,description_en))",
      )
      .eq("status", "published")
      .lte("starts_at", new Date().toISOString())
      .gte("ends_at", new Date().toISOString()),
    supabase
      .from("loyalty_programs")
      .select(
        "id,title_es,title_en,reward_es,reward_en,stamps_required,venues(name),loyalty_program_rewards(business_rewards(id,title_es,title_en,description_es,description_en))",
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
          .select("step_id,enrollment_id")
          .eq("profile_id", user.id)
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from("passport_enrollments")
          .select("id,passport_id,started_at,expires_at,completed_at,state")
          .eq("profile_id", user.id)
          .in("state", ["active", "completed", "redeemed"])
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from("reward_claims")
          .select(
            "id,claim_code,status,expires_at,business_rewards(title_es,title_en,venues(name))",
          )
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const balances = new Map<string, number>();
  ledger?.forEach((entry) =>
    balances.set(
      entry.program_id,
      (balances.get(entry.program_id) || 0) + entry.delta,
    ),
  );
  const enrollmentByPassport = new Map(
    (enrollments || []).map((entry) => [entry.passport_id, entry]),
  );
  const totalXp = xp?.reduce((sum, entry) => sum + entry.delta, 0) || 0;
  const totalStamps = [...balances.values()].reduce(
    (sum, balance) => sum + balance,
    0,
  );
  const completedSteps = new Set(
    (progress || []).map((entry: any) => entry.step_id),
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
              ? "Check-in aceptado. Tu XP y tus sellos se han actualizado."
              : "Check-in accepted. Your XP and stamps have been updated."
            : query.checkin === "cooldown"
              ? es
                ? "Ya hiciste check-in aqui en las ultimas seis horas."
                : "You already checked in here within six hours."
              : es
                ? "No se pudo aceptar el check-in."
                : "The check-in could not be accepted."}
        </p>
      )}
      {user && query.checkin === "accepted" && (
        <AchievementCelebration locale={locale} checkInId={query.visit} />
      )}
      {query.reward && (
        <p className="notice">
          {query.reward === "ready"
            ? es
              ? "Recompensa lista. Tu codigo aparece en Progreso."
              : "Reward ready. Your code appears in Progress."
            : es
              ? "La recompensa no esta disponible o ya existe una solicitud."
              : "The reward is unavailable, or a claim already exists."}
        </p>
      )}
      {query.passport && (
        <p className="notice">
          {query.passport === "started"
            ? es
              ? "Pasaporte iniciado. Tienes 30 dias para completar la ruta."
              : "Passport started. You have 30 days to complete the route."
            : es
              ? "No se pudo iniciar este pasaporte."
              : "This passport could not be started."}
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
            value={completedSteps.size}
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
          {!!claims?.length && (
            <section className="panel">
              <h2>{es ? "Recompensas listas" : "Rewards ready"}</h2>
              <p>
                {es
                  ? "Ensenale el codigo al personal. Caduca en la fecha indicada y solo puede canjearse una vez."
                  : "Show the code to venue staff. It expires on the date shown and can only be redeemed once."}
              </p>
              <div className="reward-card-list">
                {claims.map((claim: any) => (
                  <article className="stamp-card" key={claim.id}>
                    <span className="status-pill">{claim.status}</span>
                    <h3>
                      {locale === "en"
                        ? claim.business_rewards?.title_en ||
                          claim.business_rewards?.title_es
                        : claim.business_rewards?.title_es}
                    </h3>
                    <p>{claim.business_rewards?.venues?.name}</p>
                    <code className="claim-code">{claim.claim_code}</code>
                    <p>
                      {es ? "Caduca" : "Expires"}{" "}
                      {new Date(claim.expires_at).toLocaleDateString(locale)}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}
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
                {passports.map((passport: any) => {
                  const enrollment: any = enrollmentByPassport.get(passport.id);
                  const completed = new Set(
                    (progress || [])
                      .filter(
                        (entry: any) => entry.enrollment_id === enrollment?.id,
                      )
                      .map((entry: any) => entry.step_id),
                  );
                  const rewards = (passport.passport_rewards || [])
                    .filter((item: any) => item.business_rewards)
                    .map((item: any) => item.business_rewards);
                  return (
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
                      <div className="inline-actions">
                        <span className="status-pill">
                          {passport.access_tier === "premium"
                            ? "Premium"
                            : es
                              ? "Gratis"
                              : "Free"}
                        </span>
                        <span className="status-pill">
                          {passport.completion_window_days}{" "}
                          {es ? "dias" : "days"}
                        </span>
                        {enrollment && (
                          <span className="status-pill">
                            {enrollment.state}
                          </span>
                        )}
                      </div>
                      {enrollment?.state === "active" && (
                        <p>
                          {es ? "Completa antes del" : "Complete by"}{" "}
                          <strong>
                            {new Date(enrollment.expires_at).toLocaleDateString(
                              locale,
                            )}
                          </strong>
                        </p>
                      )}
                      <div className="step-list">
                        {passport.passport_steps.map((step: any) => (
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
                      {!user ? (
                        <Link
                          className="button"
                          href={`/${locale}/auth?mode=signin&next=${encodeURIComponent(`/${locale}/passports?view=passports`)}`}
                        >
                          {es
                            ? "Inicia sesion para empezar"
                            : "Sign in to start"}
                        </Link>
                      ) : !enrollment ? (
                        <form action={enrollPassport}>
                          <input type="hidden" name="locale" value={locale} />
                          <input
                            type="hidden"
                            name="passportId"
                            value={passport.id}
                          />
                          <button className="button" type="submit">
                            {es ? "Empezar pasaporte" : "Start passport"}
                          </button>
                        </form>
                      ) : enrollment.state === "completed" ? (
                        <div className="reward-choice-grid">
                          <h4>
                            {es ? "Elige una recompensa" : "Choose one reward"}
                          </h4>
                          {rewards.map((reward: any) => (
                            <form action={claimPassportReward} key={reward.id}>
                              <input
                                type="hidden"
                                name="locale"
                                value={locale}
                              />
                              <input
                                type="hidden"
                                name="enrollmentId"
                                value={enrollment.id}
                              />
                              <input
                                type="hidden"
                                name="rewardId"
                                value={reward.id}
                              />
                              <button
                                className="button secondary"
                                type="submit"
                              >
                                {locale === "en"
                                  ? reward.title_en || reward.title_es
                                  : reward.title_es}
                              </button>
                            </form>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
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
                        <div className="reward-choice-grid">
                          {((program as any).loyalty_program_rewards || []).map(
                            (item: any) => {
                              const reward = item.business_rewards;
                              if (!reward) return null;
                              return (
                                <form action={claimStampReward} key={reward.id}>
                                  <input
                                    type="hidden"
                                    name="locale"
                                    value={locale}
                                  />
                                  <input
                                    type="hidden"
                                    name="programId"
                                    value={program.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="rewardId"
                                    value={reward.id}
                                  />
                                  <button className="button" type="submit">
                                    {locale === "en"
                                      ? reward.title_en || reward.title_es
                                      : reward.title_es}
                                  </button>
                                </form>
                              );
                            },
                          )}
                        </div>
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
import { publicPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = publicPageMetadata("/passports");
