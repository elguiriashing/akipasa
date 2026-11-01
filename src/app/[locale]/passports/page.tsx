import { prestigeEnabled } from "@/lib/passport-prestige";
import { passportDeadlineLabel } from "@/lib/passport-deadline";
import { passportStatusLabel } from "@/lib/passport-status";
import { myPassportCollection } from "@/lib/passport-repository";
import type { CSSProperties } from "react";
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { optionalUser } from "@/lib/auth";
import { CheckInSuccess } from "@/components/CheckInSuccess";
import checkInStyles from "@/components/CheckInSuccess.module.css";
import { AchievementCelebration } from "@/components/AchievementCelebration";
import { BadgeProgress } from "@/components/BadgeProgress";
import { WeeklyQuestPanel } from "@/components/WeeklyQuestPanel";
import { currentMadridQuestWeek } from "@/lib/aki-weekly-quests";
import {
  ConsoleMetric,
  ConsoleSectionHeader,
} from "@/components/ConsoleChrome";
import { PassportBook } from "@/components/PassportBook";
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

function ReadUnavailable({
  locale,
  view,
  label,
}: {
  locale: "es" | "en";
  view: string;
  label: string;
}) {
  const es = locale === "es";
  return (
    <p className="notice" role="alert">
      {label}{" "}
      <Link href={`/${locale}/passports?view=${view}`}>
        {es ? "Reintentar" : "Retry"}
      </Link>
    </p>
  );
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
  const view = [
    "cover",
    "index",
    "progress",
    "passports",
    "stamps",
    "badges",
  ].includes(query.view || "")
    ? query.view!
    : "progress";
  const { supabase, user } = await optionalUser();
  const weeklyQuestNow = new Date();
  const weeklyQuestWindow = currentMadridQuestWeek(weeklyQuestNow);
  const passportResult = user
    ? await myPassportCollection()
        .then((data) => ({ data, error: false }))
        .catch(() => ({ data: undefined, error: true }))
    : { data: undefined, error: false };
  const [
    passportsResult,
    programsResult,
    ledgerResult,
    xpResult,
    progressResult,
    enrollmentsResult,
    claimsResult,
    weeklyVisitsResult,
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
      : Promise.resolve({ data: [], error: null }),
    user
      ? supabase.from("xp_ledger").select("delta").eq("profile_id", user.id)
      : Promise.resolve({ data: [], error: null }),
    user
      ? supabase
          .from("passport_progress")
          .select("step_id,enrollment_id")
          .eq("profile_id", user.id)
      : Promise.resolve({ data: [], error: null }),
    user
      ? supabase
          .from("passport_enrollments")
          .select("id,passport_id,started_at,expires_at,completed_at,state")
          .eq("profile_id", user.id)
          .in("state", ["active", "completed", "redeemed"])
      : Promise.resolve({ data: [], error: null }),
    user
      ? supabase
          .from("reward_claims")
          .select(
            "id,claim_code,status,expires_at,business_rewards(title_es,title_en,venues(name))",
          )
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    user
      ? supabase
          .from("check_ins")
          .select("venue_id,state,credential_id,created_at")
          .eq("profile_id", user.id)
          .eq("state", "accepted")
          .not("credential_id", "is", null)
          .gte("created_at", weeklyQuestWindow.start.toISOString())
          .lt("created_at", weeklyQuestWindow.end.toISOString())
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const { data: passports } = passportsResult;
  const { data: programs } = programsResult;
  const { data: ledger } = ledgerResult;
  const { data: xp } = xpResult;
  const { data: progress } = progressResult;
  const { data: enrollments } = enrollmentsResult;
  const { data: claims } = claimsResult;
  const { data: weeklyVisits } = weeklyVisitsResult;
  const passportsUnavailable = Boolean(passportsResult.error);
  const programsUnavailable = Boolean(programsResult.error);
  const ledgerUnavailable = Boolean(user && ledgerResult.error);
  const xpUnavailable = Boolean(user && xpResult.error);
  const progressUnavailable = Boolean(user && progressResult.error);
  const enrollmentsUnavailable = Boolean(user && enrollmentsResult.error);
  const claimsUnavailable = Boolean(user && claimsResult.error);
  const weeklyVisitsUnavailable = Boolean(user && weeklyVisitsResult.error);
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
  const totalXp = xpUnavailable
    ? null
    : xp?.reduce((sum, entry) => sum + entry.delta, 0) || 0;
  const totalStamps = ledgerUnavailable
    ? null
    : [...balances.values()].reduce((sum, balance) => sum + balance, 0);
  const completedSteps = new Set(
    (progress || []).map((entry: any) => entry.step_id),
  );
  return (
    <PassportBook
      key={
        query.view ||
        (query.checkin || query.reward || query.passport ? "progress" : "cover")
      }
      locale={locale}
      initialView={
        query.view
          ? view
          : query.checkin || query.reward || query.passport
            ? "progress"
            : "cover"
      }
      signedIn={Boolean(user)}
      collection={passportResult.data}
      collectionError={passportResult.error}
      initialCity={query.city}
      totalXp={totalXp}
      totalStamps={totalStamps}
      notices={
        <>
          {user && prestigeEnabled() && (
            <Link href={`/${locale}/passports/prestige`}>
              {es ? "Prestigio AkiPasa" : "AkiPasa Prestige"}
            </Link>
          )}

          {query.reward && (
            <p className="notice">
              {query.reward === "ready"
                ? es
                  ? "Recompensa lista. Tu código aparece en Progreso."
                  : "Reward ready. Your code appears in Progress."
                : es
                  ? "La recompensa no está disponible o ya existe una solicitud."
                  : "The reward is unavailable, or a claim already exists."}
            </p>
          )}
          {query.passport && (
            <p className="notice">
              {query.passport === "started"
                ? es
                  ? "Pasaporte iniciado. Consulta la fecha límite de tu ruta en Progreso."
                  : "Passport started. Check your route’s deadline in Progress."
                : es
                  ? "No se pudo iniciar este pasaporte."
                  : "This passport could not be started."}
            </p>
          )}
        </>
      }
      progress={
        <>
          {query.checkin && query.checkin !== "accepted" && (
            <p className="notice">
              {query.checkin === "cooldown"
                ? es
                  ? "Ya hiciste check-in aquí en las últimas seis horas."
                  : "You already checked in here within six hours."
                : es
                  ? "No se pudo aceptar el check-in."
                  : "The check-in could not be accepted."}
            </p>
          )}
          {user && query.checkin === "accepted" && (
            <div className={checkInStyles.receipt}>
              <CheckInSuccess
                locale={locale}
                checkInId={query.visit}
                profileId={user.id}
              />
              <AchievementCelebration locale={locale} checkInId={query.visit} />
              {process.env.AKIPASA_COMMUNITY_STORIES_SCHEMA_READY === "true" &&
                process.env.AKIPASA_COMMUNITY_STORIES_ENABLED === "true" && (
                  <Link
                    className="button secondary"
                    href={`/${locale}/community#city-stories`}
                  >
                    {es
                      ? "Compartir una foto de mi visita (opcional)"
                      : "Share a photo from my visit (optional)"}
                  </Link>
                )}
            </div>
          )}
          {
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
                value={passportsUnavailable ? "—" : passports?.length || 0}
                detail={es ? "Rutas activas" : "Active routes"}
              />
              <ConsoleMetric
                label={es ? "Fidelidad" : "Loyalty"}
                value={totalStamps}
                detail={es ? "Acumulados" : "Collected"}
              />
              <ConsoleMetric
                label={es ? "Pasos" : "Steps"}
                value={progressUnavailable ? "—" : completedSteps.size}
                detail={es ? "Completados" : "Completed"}
              />
            </section>
          }

          <WeeklyQuestPanel
            locale={locale}
            signedIn={Boolean(user)}
            unavailable={weeklyVisitsUnavailable}
            visits={weeklyVisits || []}
            now={weeklyQuestNow}
          />

          {
            <section className="console-section">
              <ConsoleSectionHeader
                label={es ? "Progreso" : "Progress"}
                title={
                  es ? "Tu viaje como explorador" : "Your explorer journey"
                }
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
                  <h2>
                    {es ? "Progreso del explorador" : "Explorer progress"}
                  </h2>
                  {!user && (
                    <p>
                      {es
                        ? "Inicia sesión para guardar tu progreso."
                        : "Sign in to save your progress."}
                    </p>
                  )}
                </div>
                <p className="metric">{totalXp === null ? "—" : totalXp}</p>
              </section>
              {xpUnavailable && (
                <ReadUnavailable
                  locale={locale}
                  view="progress"
                  label={
                    es
                      ? "Tu total de XP no está disponible ahora."
                      : "Your XP total is unavailable right now."
                  }
                />
              )}
              {progressUnavailable && (
                <ReadUnavailable
                  locale={locale}
                  view="progress"
                  label={
                    es
                      ? "El progreso de tus pasos no está disponible ahora."
                      : "Your step progress is unavailable right now."
                  }
                />
              )}
              {claimsUnavailable && (
                <ReadUnavailable
                  locale={locale}
                  view="progress"
                  label={
                    es
                      ? "Tus recompensas no están disponibles ahora."
                      : "Your rewards are unavailable right now."
                  }
                />
              )}
              {!!claims?.length && (
                <section className="panel">
                  <h2>{es ? "Recompensas listas" : "Rewards ready"}</h2>
                  <p>
                    {es
                      ? "Enséñale el código al personal. Caduca en la fecha indicada y solo puede canjearse una vez."
                      : "Show the code to venue staff. It expires on the date shown and can only be redeemed once."}
                  </p>
                  <div className="reward-card-list">
                    {claims.map((claim: any) => (
                      <article className="stamp-card" key={claim.id}>
                        <span className="status-pill">
                          {passportStatusLabel("claim", claim.status, locale)}
                        </span>
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
                          {passportDeadlineLabel(claim.expires_at, locale)}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </section>
          }
        </>
      }
      routes={
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
            {passportsUnavailable ? (
              <ReadUnavailable
                locale={locale}
                view="passports"
                label={
                  es
                    ? "Los pasaportes no están disponibles ahora."
                    : "Passports are unavailable right now."
                }
              />
            ) : passports?.length ? (
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
                          {es ? "días" : "days"}
                        </span>
                        {!enrollmentsUnavailable && enrollment && (
                          <span className="status-pill">
                            {passportStatusLabel(
                              "enrollment",
                              enrollment.state,
                              locale,
                            )}
                          </span>
                        )}
                      </div>
                      {!enrollmentsUnavailable &&
                        enrollment?.state === "active" && (
                          <p>
                            {es ? "Completa antes del" : "Complete by"}{" "}
                            <strong>
                              {passportDeadlineLabel(
                                enrollment.expires_at,
                                locale,
                              )}
                            </strong>
                          </p>
                        )}
                      {enrollmentsUnavailable ? (
                        <ReadUnavailable
                          locale={locale}
                          view="passports"
                          label={
                            es
                              ? "Tus pasaportes iniciados no están disponibles ahora."
                              : "Your started passports are unavailable right now."
                          }
                        />
                      ) : progressUnavailable ? (
                        <ReadUnavailable
                          locale={locale}
                          view="passports"
                          label={
                            es
                              ? "El progreso de esta ruta no está disponible ahora."
                              : "This route’s progress is unavailable right now."
                          }
                        />
                      ) : (
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
                      )}
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
                            ? "Inicia sesión para empezar"
                            : "Sign in to start"}
                        </Link>
                      ) : enrollmentsUnavailable ? null : !enrollment ? (
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
      }
      stamps={
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
            {programsUnavailable ? (
              <ReadUnavailable
                locale={locale}
                view="stamps"
                label={
                  es
                    ? "Las tarjetas de sellos no están disponibles ahora."
                    : "Stamp cards are unavailable right now."
                }
              />
            ) : programs?.length ? (
              <div className="reward-card-list">
                {programs.map((program) => {
                  const balance = ledgerUnavailable
                    ? null
                    : balances.get(program.id) || 0;
                  const percent =
                    balance === null
                      ? 0
                      : (balance / program.stamps_required) * 100;
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
                          {balance === null ? "—" : balance} /{" "}
                          {program.stamps_required}
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
                      {ledgerUnavailable && (
                        <ReadUnavailable
                          locale={locale}
                          view="stamps"
                          label={
                            es
                              ? "Tu saldo de sellos no está disponible ahora."
                              : "Your stamp balance is unavailable right now."
                          }
                        />
                      )}
                      {user &&
                        balance !== null &&
                        balance >= program.stamps_required && (
                          <div className="reward-choice-grid">
                            {(
                              (program as any).loyalty_program_rewards || []
                            ).map((item: any) => {
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
                            })}
                          </div>
                        )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="empty-state">
                {es
                  ? "Los negocios participantes aparecerán aquí."
                  : "Participating businesses will appear here."}
              </p>
            )}
          </div>
        </section>
      }
      badges={
        user ? (
          <section className="console-section">
            <ConsoleSectionHeader
              label={es ? "Colección" : "Collection"}
              title={es ? "Insignias del explorador" : "Explorer badges"}
              description={
                es
                  ? "Hitos que celebran tu actividad local."
                  : "Milestones that celebrate your local activity."
              }
              icon="BD"
            />
            {totalXp === null ? (
              <ReadUnavailable
                locale={locale}
                view="badges"
                label={
                  es
                    ? "Tus insignias no están disponibles ahora."
                    : "Your badges are unavailable right now."
                }
              />
            ) : (
              <BadgeProgress locale={locale} totalXp={totalXp} />
            )}
          </section>
        ) : (
          <p className="notice">
            <Link
              href={`/${locale}/auth?mode=signin&next=${encodeURIComponent(`/${locale}/passports?view=badges`)}`}
            >
              {es
                ? "Inicia sesión para ver tus insignias"
                : "Sign in to see your badges"}
            </Link>
          </p>
        )
      }
    />
  );
}
import { publicPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = publicPageMetadata("/passports");
