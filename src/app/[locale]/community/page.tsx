import { notFound } from "next/navigation";
import { CommunityLanding } from "@/components/community/CommunityLanding";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { AuthSubmitButton } from "@/components/AuthFormControls";
import styles from "./community-workflows.module.css";
import {
  WorkspaceShell,
  WorkspacePageHeader,
  type WorkspaceItem,
} from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { loadFeatureFlagsState } from "@/lib/feature-flags";
import { SpainAddressAutocomplete } from "@/components/SpainAddressAutocomplete";
import { ContributionDraftForm } from "@/components/community/ContributionDraftForm";
import { submitCommunityEvent, submitReport } from "./actions";
import { communityCreatorItems } from "@/components/community/CreatorDirectoryPage";
import {
  communityWorkflowPath,
  parseCommunityReportTarget,
  type CommunityView,
} from "@/lib/community-navigation";

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const view = ["suggest", "report", "suggestions", "reports"].includes(
    query.view || "",
  )
    ? query.view!
    : query.target
      ? "report"
      : "home";
  if (view === "home") return <CommunityLanding locale={locale} />;
  const { supabase, user } = await requireUser(
    locale,
    communityWorkflowPath(locale, view as CommunityView, {
      target: query.target,
      targetQuery: query.target_q,
    }),
  );
  const { flags, unavailable: flagsUnavailable } =
    await loadFeatureFlagsState(supabase);
  const es = locale === "es";
  const reportSearch = (query.target_q || "").trim().slice(0, 80);
  const reportPattern = reportSearch.replace(/[\\%_]/g, "\\$&");
  const reportLiteral = `"%${reportPattern
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')}%"`;
  let eventsRequest = supabase
    .from("events")
    .select("id,title_es,title_en")
    .eq("status", "published")
    .order("title_es")
    .limit(50);
  let venuesRequest = supabase
    .from("venues")
    .select("id,name")
    .eq("status", "published")
    .order("name")
    .limit(50);
  if (reportSearch) {
    eventsRequest = eventsRequest.or(
      `title_es.ilike.${reportLiteral},title_en.ilike.${reportLiteral}`,
    );
    venuesRequest = venuesRequest.ilike("name", `%${reportPattern}%`);
  }
  const requestedTarget = typeof query.target === "string" ? query.target : "";
  const parsedRequestedTarget = parseCommunityReportTarget(requestedTarget);
  const requestedType = parsedRequestedTarget?.targetType;
  const requestedId = parsedRequestedTarget?.targetId;
  const validRequestedTarget = Boolean(parsedRequestedTarget);
  const [
    eventsResult,
    venuesResult,
    submissionsResult,
    reportsResult,
    categoriesResult,
    requestedEventResult,
    requestedVenueResult,
  ] = await Promise.all([
    eventsRequest,
    venuesRequest,
    supabase
      .from("event_submissions")
      .select("id,title,state,created_at")
      .eq("submitter_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reports")
      .select("id,target_type,reason,state,created_at")
      .eq("reporter_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("id,slug,name_es,name_en")
      .order("name_es"),
    validRequestedTarget && requestedType === "event"
      ? supabase
          .from("events")
          .select("id,title_es,title_en")
          .eq("status", "published")
          .eq("id", requestedId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    validRequestedTarget && requestedType === "venue"
      ? supabase
          .from("venues")
          .select("id,name")
          .eq("status", "published")
          .eq("id", requestedId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const events = [...(eventsResult.data || [])];
  const venues = [...(venuesResult.data || [])];
  if (
    requestedEventResult.data &&
    !events.some((event) => event.id === requestedEventResult.data?.id)
  )
    events.unshift(requestedEventResult.data);
  if (
    requestedVenueResult.data &&
    !venues.some((venue) => venue.id === requestedVenueResult.data?.id)
  )
    venues.unshift(requestedVenueResult.data);
  const submissions = submissionsResult.data;
  const reports = reportsResult.data;
  const categories = categoriesResult.data;
  const reportTargetsUnavailable = Boolean(
    eventsResult.error ||
      venuesResult.error ||
      requestedEventResult.error ||
      requestedVenueResult.error,
  );
  const submissionsUnavailable = Boolean(submissionsResult.error);
  const reportsUnavailable = Boolean(reportsResult.error);
  const categoriesUnavailable = Boolean(categoriesResult.error);
  const hasReportableItems = Boolean(events.length || venues.length);
  const base = `/${locale}/community`;
  const items: WorkspaceItem[] = communityCreatorItems(locale, {
    suggestions: submissions?.length || 0,
    reports: reports?.length || 0,
  });

  return (
    <WorkspaceShell
      title={es ? "Comunidad" : "Community"}
      eyebrow={es ? "Aporta cuando haga falta" : "Contribute when needed"}
      description={
        es
          ? "Comparte lo que falta o avísanos cuando algo no cuadre. Nuestro equipo revisa cada aporte."
          : "Share what is missing or flag something that looks wrong. Our team reviews every contribution."
      }
      homeHref={base}
      items={items}
      hidePageHeading
    >
      <div className={styles.workflow}>
        {query.created && (
          <p className={styles.notice} role="status">
            {es
              ? "Consulta abajo el estado actual de tu envío."
              : "Check your submission’s current status below."}
          </p>
        )}
        {query.error && (
          <p className={styles.notice} role="alert">
            {query.error === "rate-limit"
              ? es
                ? "Has alcanzado el límite temporal de envíos. Inténtalo más tarde."
                : "You have reached the temporary submission limit. Try again later."
              : es
                ? "No se pudo enviar. Revisa los datos o si ya mandaste el mismo aviso."
                : "Could not submit. Check the details or whether you already sent the same report."}
          </p>
        )}

        {(view === "suggest" || view === "report") && (
          <section className={styles.section}>
            <WorkspacePageHeader
              level={1}
              eyebrow={es ? "Contribuir" : "Contribute"}
              title={
                view === "suggest"
                  ? es
                    ? "Sugerir un evento"
                    : "Suggest an event"
                  : es
                    ? "Informar de un problema"
                    : "Report a problem"
              }
              description={
                es
                  ? "Completa solo los datos necesarios para este flujo."
                  : "Complete only the details needed for this workflow."
              }
            />
            <div className={styles.content}>
              {view === "suggest" && (
                <section className={styles.formCard}>
                  <header className={styles.cardHeader}>
                    <span className={styles.icon} aria-hidden="true">
                      <Icon name="calendar" />
                    </span>
                    <div>
                      <h2>{es ? "Datos del evento" : "Event details"}</h2>
                      <p>
                        {es
                          ? "Envía los datos básicos para que el equipo los revise. La publicación depende de su aprobación."
                          : "Send the essentials for the team to review. Publication depends on approval."}
                      </p>
                    </div>
                  </header>
                  {flagsUnavailable ? (
                    <CommunityUnavailable
                      locale={locale}
                      href={`/${locale}/community?view=suggest`}
                      label={
                        es
                          ? "La disponibilidad de sugerencias no se puede confirmar ahora."
                          : "Suggestion availability cannot be confirmed right now."
                      }
                    />
                  ) : categoriesUnavailable ? (
                    <CommunityUnavailable
                      locale={locale}
                      href={`/${locale}/community?view=suggest`}
                      label={
                        es
                          ? "Las categorías no están disponibles ahora."
                          : "Categories are unavailable right now."
                      }
                    />
                  ) : flags.community_submissions ? (
                    <ContributionDraftForm
                      action={submitCommunityEvent}
                      className={styles.form}
                      draftKey={`akipasa:community:${locale}:suggest`}
                      recover={
                        query.error === "submission" ||
                        query.error === "rate-limit"
                      }
                      locale={locale}
                    >
                      <input type="hidden" name="locale" value={locale} />
                      <div className="two-col">
                        <label>
                          {es ? "Nombre del local" : "Venue name"}
                          <input name="venueName" required minLength={2} />
                        </label>
                        <SpainAddressAutocomplete
                          locale={locale}
                          mode="address"
                          name="venueAddress"
                          label={es ? "Dirección" : "Address"}
                        />
                      </div>
                      <label>
                        {es ? "Categoría" : "Category"}
                        <select name="categoryId" required defaultValue="">
                          <option value="" disabled>
                            {es
                              ? "Selecciona una categoría"
                              : "Choose a category"}
                          </option>
                          {(categories || []).map((category) => (
                            <option key={category.id} value={category.id}>
                              {es
                                ? category.name_es
                                : category.name_en || category.name_es}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {es ? "Título del evento" : "Event title"}
                        <input name="title" required minLength={3} />
                      </label>
                      <label>
                        {es ? "Descripción" : "Description"}
                        <textarea name="description" required minLength={20} />
                      </label>
                      <div className="two-col">
                        <label>
                          {es ? "Inicio" : "Starts"}
                          <input
                            name="startsAt"
                            type="datetime-local"
                            required
                          />
                        </label>
                        <label>
                          {es ? "Fin" : "Ends"}
                          <input name="endsAt" type="datetime-local" required />
                        </label>
                      </div>
                      <label>
                        {es
                          ? "Fuente HTTPS (opcional)"
                          : "HTTPS source (optional)"}
                        <input
                          name="sourceUrl"
                          type="url"
                          placeholder="https://"
                        />
                      </label>
                      <AuthSubmitButton
                        className={styles.submit}
                        idle={es ? "Enviar a revisión" : "Submit for review"}
                        pending={
                          es ? "Enviando a revisión…" : "Submitting for review…"
                        }
                      />
                    </ContributionDraftForm>
                  ) : (
                    <p className={styles.notice} role="status">
                      {es
                        ? "Las sugerencias están pausadas temporalmente."
                        : "Event suggestions are temporarily paused."}
                    </p>
                  )}
                </section>
              )}

              {view === "report" && (
                <section className={styles.formCard}>
                  <header className={styles.cardHeader}>
                    <span className={styles.icon} aria-hidden="true">
                      <Icon name="megaphone" />
                    </span>
                    <div>
                      <h2>{es ? "Detalles del aviso" : "Report details"}</h2>
                      <p>
                        {es
                          ? "Señala información incorrecta, duplicada o sospechosa."
                          : "Flag incorrect, duplicate or suspicious information."}
                      </p>
                    </div>
                  </header>
                  <form className={styles.form} action={`/${locale}/community`}>
                    <input type="hidden" name="view" value="report" />
                    {validRequestedTarget && (
                      <input
                        type="hidden"
                        name="target"
                        value={requestedTarget}
                      />
                    )}
                    <label>
                      {es ? "Buscar evento o local" : "Search events or venues"}
                      <input
                        type="search"
                        name="target_q"
                        defaultValue={reportSearch}
                        maxLength={80}
                      />
                    </label>
                    <button className={styles.secondary} type="submit">
                      {es ? "Buscar" : "Search"}
                    </button>
                  </form>
                  {reportTargetsUnavailable ? (
                    <CommunityUnavailable
                      locale={locale}
                      href={communityWorkflowPath(locale, "report", {
                        target: requestedTarget,
                        targetQuery: reportSearch,
                      })}
                      label={
                        es
                          ? "Los elementos publicados no están disponibles ahora."
                          : "Published report targets are unavailable right now."
                      }
                    />
                  ) : (
                    <ContributionDraftForm
                      action={submitReport}
                      className={styles.form}
                      draftKey={`akipasa:community:${locale}:report`}
                      recover={
                        query.error === "report" || query.error === "rate-limit"
                      }
                      locale={locale}
                    >
                      <input type="hidden" name="locale" value={locale} />
                      {reportSearch && (
                        <input
                          type="hidden"
                          name="target_q"
                          value={reportSearch}
                        />
                      )}
                      <label>
                        {es ? "Elemento" : "Item"}
                        <select
                          name="target"
                          required
                          defaultValue={requestedTarget}
                          disabled={!hasReportableItems}
                        >
                          <option value="" disabled>
                            {es
                              ? "Selecciona un evento o local"
                              : "Select an event or venue"}
                          </option>
                          <optgroup label={es ? "Eventos" : "Events"}>
                            {events.map((event) => (
                              <option
                                key={event.id}
                                value={`event:${event.id}`}
                              >
                                {locale === "es"
                                  ? event.title_es
                                  : event.title_en || event.title_es}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label={es ? "Locales" : "Venues"}>
                            {venues.map((venue) => (
                              <option
                                key={venue.id}
                                value={`venue:${venue.id}`}
                              >
                                {venue.name}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </label>
                      {!hasReportableItems && (
                        <p className={styles.empty}>
                          {es
                            ? "No hay elementos publicados disponibles para informar."
                            : "There are no published items available to report."}
                        </p>
                      )}
                      <label>
                        {es ? "Motivo" : "Reason"}
                        <select name="reason" required>
                          <option value="cancelled">
                            {es ? "Cancelado" : "Cancelled"}
                          </option>
                          <option value="duplicate">
                            {es ? "Duplicado" : "Duplicate"}
                          </option>
                          <option value="incorrect">
                            {es ? "Datos incorrectos" : "Incorrect details"}
                          </option>
                          <option value="scam">{es ? "Estafa" : "Scam"}</option>
                          <option value="other">{es ? "Otro" : "Other"}</option>
                        </select>
                      </label>
                      <label>
                        {es ? "Detalles" : "Details"}
                        <textarea name="details" required minLength={10} />
                      </label>
                      {hasReportableItems ? (
                        <AuthSubmitButton
                          className={styles.submit}
                          idle={es ? "Enviar aviso" : "Submit report"}
                          pending={
                            es ? "Enviando aviso…" : "Submitting report…"
                          }
                        />
                      ) : (
                        <button
                          className={styles.submit}
                          type="submit"
                          disabled
                        >
                          {es ? "Enviar aviso" : "Submit report"}
                        </button>
                      )}
                    </ContributionDraftForm>
                  )}
                </section>
              )}
            </div>
          </section>
        )}

        {view === "suggestions" && (
          <section className={styles.section}>
            <WorkspacePageHeader
              level={1}
              eyebrow={es ? "Sugerencias" : "Suggestions"}
              title={es ? "Tus eventos propuestos" : "Your proposed events"}
              description={
                es
                  ? "Consulta el estado de cada aporte enviado."
                  : "Track the status of every contribution you have sent."
              }
            />
            {submissionsUnavailable ? (
              <CommunityUnavailable
                locale={locale}
                href={`/${locale}/community?view=suggestions`}
                label={
                  es
                    ? "Tus sugerencias no están disponibles ahora."
                    : "Your suggestions are unavailable right now."
                }
              />
            ) : (
              <ContributionList
                locale={locale}
                empty={
                  es
                    ? "Aún no has enviado sugerencias."
                    : "No suggestions submitted yet."
                }
                items={(submissions || []).map((item) => ({
                  id: item.id,
                  title: item.title,
                  detail: new Date(item.created_at).toLocaleDateString(locale),
                  state: item.state,
                }))}
              />
            )}
          </section>
        )}

        {view === "reports" && (
          <section className={styles.section}>
            <WorkspacePageHeader
              level={1}
              eyebrow={es ? "Avisos" : "Reports"}
              title={es ? "Problemas comunicados" : "Reported problems"}
              description={
                es
                  ? "Historial y estado de tus avisos a moderación."
                  : "History and status of your reports to moderation."
              }
            />
            {reportsUnavailable ? (
              <CommunityUnavailable
                locale={locale}
                href={`/${locale}/community?view=reports`}
                label={
                  es
                    ? "Tus avisos no están disponibles ahora."
                    : "Your reports are unavailable right now."
                }
              />
            ) : (
              <ContributionList
                locale={locale}
                empty={
                  es
                    ? "Aún no has enviado avisos."
                    : "No reports submitted yet."
                }
                items={(reports || []).map((item) => ({
                  id: item.id,
                  title: `${displayLabel("target", item.target_type, locale)} · ${displayLabel("reason", item.reason, locale)}`,
                  detail: new Date(item.created_at).toLocaleDateString(locale),
                  state: item.state,
                }))}
              />
            )}
          </section>
        )}
      </div>
    </WorkspaceShell>
  );
}

function CommunityUnavailable({
  locale,
  href,
  label,
}: {
  locale: "es" | "en";
  href: string;
  label: string;
}) {
  return (
    <p className={styles.notice} role="alert">
      {label}{" "}
      <Link href={href}>{locale === "es" ? "Reintentar" : "Retry"}</Link>
    </p>
  );
}

function ContributionList({
  locale,
  empty,
  items,
}: {
  locale: "es" | "en";
  empty: string;
  items: Array<{ id: string; title: string; detail: string; state: string }>;
}) {
  return (
    <section className={styles.history}>
      {items.length ? (
        items.map((item) => (
          <article className={styles.historyRow} key={item.id}>
            <span className={styles.historyMark} aria-hidden="true">
              {item.title.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </div>
            <span className={styles.status} data-state={item.state}>
              {displayLabel("state", item.state, locale)}
            </span>
          </article>
        ))
      ) : (
        <p className={styles.empty}>{empty}</p>
      )}
    </section>
  );
}

const displayLabels = {
  state: {
    pending: ["Pending", "Pendiente"],
    approved: ["Approved", "Aprobado"],
    rejected: ["Rejected", "Rechazado"],
    open: ["Open", "Abierto"],
    resolved: ["Resolved", "Resuelto"],
    dismissed: ["Dismissed", "Descartado"],
  },
  target: { event: ["Event", "Evento"], venue: ["Venue", "Local"] },
  reason: {
    cancelled: ["Cancelled", "Cancelado"],
    duplicate: ["Duplicate", "Duplicado"],
    incorrect: ["Incorrect details", "Datos incorrectos"],
    scam: ["Scam", "Estafa"],
    other: ["Other", "Otro"],
  },
} as const;
function displayLabel(
  group: keyof typeof displayLabels,
  value: string,
  locale: "en" | "es",
) {
  const labels: Record<string, readonly [string, string]> =
    displayLabels[group];
  return labels[value]?.[locale === "es" ? 1 : 0] || value;
}
