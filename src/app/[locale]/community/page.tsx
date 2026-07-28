import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ConsoleIcon,
  ConsoleMetric,
  ConsoleSectionHeader,
} from "@/components/ConsoleChrome";
import {
  WorkspaceShell,
  type WorkspaceItem,
} from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { loadFeatureFlags } from "@/lib/feature-flags";
import { submitCommunityEvent, submitReport } from "./actions";

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
  const view = ["home", "suggest", "report", "suggestions", "reports"].includes(
    query.view || "",
  )
    ? query.view!
    : "home";
  const { supabase, user } = await requireUser(locale, `/${locale}/community`);
  const flags = await loadFeatureFlags(supabase);
  const es = locale === "es";
  const [
    { data: events },
    { data: venues },
    { data: submissions },
    { data: reports },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id,title_es,title_en")
      .eq("status", "published")
      .order("title_es"),
    supabase
      .from("venues")
      .select("id,name")
      .eq("status", "published")
      .order("name"),
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
  ]);
  const pendingSuggestions =
    submissions?.filter((item) => item.state === "pending").length || 0;
  const openReports =
    reports?.filter((item) => item.state === "open").length || 0;
  const hasReportableItems = Boolean(events?.length || venues?.length);
  const requestedTarget = typeof query.target === "string" ? query.target : "";
  const base = `/${locale}/community`;
  const items: WorkspaceItem[] = [
    { href: base, label: es ? "Inicio" : "Overview", icon: "home" },
    {
      href: `${base}?view=suggest`,
      label: es ? "Sugerir evento" : "Suggest an event",
      icon: "calendar",
    },
    {
      href: `${base}?view=report`,
      label: es ? "Enviar aviso" : "Report a problem",
      icon: "megaphone",
    },
    {
      href: `${base}?view=suggestions`,
      label: es ? "Mis sugerencias" : "My suggestions",
      icon: "inbox",
      count: submissions?.length ? submissions.length : undefined,
    },
    {
      href: `${base}?view=reports`,
      label: es ? "Mis avisos" : "My reports",
      icon: "activity",
      count: reports?.length ? reports.length : undefined,
    },
  ];

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
    >
      {query.created && (
        <p className="notice">
          {es
            ? "Enviado correctamente para revision."
            : "Submitted successfully for review."}
        </p>
      )}
      {query.error && (
        <p className="notice">
          {query.error === "rate-limit"
            ? es
              ? "Has alcanzado el limite temporal de envios. Intentalo mas tarde."
              : "You have reached the temporary submission limit. Try again later."
            : es
              ? "No se pudo enviar. Revisa los datos o si ya mandaste el mismo aviso."
              : "Could not submit. Check the details or whether you already sent the same report."}
        </p>
      )}

      {view === "home" && (
        <section
          className="metrics-grid"
          aria-label={es ? "Resumen" : "Summary"}
        >
          <ConsoleMetric
            label={es ? "Aportes" : "Contributions"}
            value={(submissions?.length || 0) + (reports?.length || 0)}
            detail={es ? "Total enviados" : "Total submitted"}
          />
          <ConsoleMetric
            label={es ? "En revision" : "In review"}
            value={pendingSuggestions}
            detail={es ? "Sugerencias pendientes" : "Pending suggestions"}
          />
          <ConsoleMetric
            label={es ? "Avisos abiertos" : "Open reports"}
            value={openReports}
            detail={es ? "Esperando respuesta" : "Awaiting response"}
          />
          <ConsoleMetric
            label={es ? "Catalogo" : "Catalogue"}
            value={(events?.length || 0) + (venues?.length || 0)}
            detail={es ? "Elementos reportables" : "Reportable items"}
          />
        </section>
      )}

      {view === "home" && (
        <section className="console-section">
          <ConsoleSectionHeader
            label={es ? "Comunidad" : "Community"}
            title={es ? "Que quieres hacer?" : "What do you need?"}
            description={
              es
                ? "Elige una accion. Cada flujo tiene su propio espacio."
                : "Choose an action. Each workflow has its own space."
            }
            icon="CO"
          />
          <div className="workspace-launcher">
            <Link
              className="workspace-launch-card"
              href={`/${locale}/community?view=suggest`}
            >
              <ConsoleIcon label="+E" />
              <strong>{es ? "Sugerir un evento" : "Suggest an event"}</strong>
              <span aria-hidden="true">&rarr;</span>
            </Link>
            <Link
              className="workspace-launch-card"
              href={`/${locale}/community?view=report`}
            >
              <ConsoleIcon label="!" />
              <strong>
                {es ? "Informar de un problema" : "Report a problem"}
              </strong>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </section>
      )}

      {(view === "suggest" || view === "report") && (
        <section className="console-section">
          <ConsoleSectionHeader
            label={es ? "Contribuir" : "Contribute"}
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
            icon="CO"
          />
          <div className="community-workspace focused-workspace">
            {view === "suggest" && (
              <section className="panel console-card contribution-card">
                <div className="card-title-row">
                  <ConsoleIcon label="+E">
                    <svg viewBox="0 0 24 24">
                      <path d="M6 5h12v14H6zM9 9h6M9 13h6" />
                    </svg>
                  </ConsoleIcon>
                  <div>
                    <h3>{es ? "Sugerir un evento" : "Suggest an event"}</h3>
                    <p>
                      {es
                        ? "Envia los datos basicos. Se publicara tras la revision."
                        : "Send the essentials. It will go live after review."}
                    </p>
                  </div>
                </div>
                {flags.community_submissions ? (
                  <form action={submitCommunityEvent} className="stack">
                    <input type="hidden" name="locale" value={locale} />
                    <div className="two-col">
                      <label>
                        {es ? "Nombre del local" : "Venue name"}
                        <input name="venueName" required minLength={2} />
                      </label>
                      <label>
                        {es ? "Direccion" : "Address"}
                        <input name="venueAddress" required minLength={5} />
                      </label>
                    </div>
                    <label>
                      {es ? "Titulo del evento" : "Event title"}
                      <input name="title" required minLength={3} />
                    </label>
                    <label>
                      {es ? "Descripcion" : "Description"}
                      <textarea name="description" required minLength={20} />
                    </label>
                    <div className="two-col">
                      <label>
                        {es ? "Inicio" : "Starts"}
                        <input name="startsAt" type="datetime-local" required />
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
                    <button className="button" type="submit">
                      {es ? "Enviar a revision" : "Submit for review"}
                    </button>
                  </form>
                ) : (
                  <p className="notice">
                    {es
                      ? "Las sugerencias estan pausadas temporalmente."
                      : "Event suggestions are temporarily paused."}
                  </p>
                )}
              </section>
            )}

            {view === "report" && (
              <section className="panel console-card contribution-card report-card">
                <div className="card-title-row">
                  <ConsoleIcon label="!">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 4 21 20H3L12 4Z" />
                      <path d="M12 9v5M12 17h.01" />
                    </svg>
                  </ConsoleIcon>
                  <div>
                    <h3>
                      {es ? "Informar de un problema" : "Report a problem"}
                    </h3>
                    <p>
                      {es
                        ? "Senala informacion incorrecta, duplicada o sospechosa."
                        : "Flag incorrect, duplicate or suspicious information."}
                    </p>
                  </div>
                </div>
                <form action={submitReport} className="stack">
                  <input type="hidden" name="locale" value={locale} />
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
                        {events?.map((event) => (
                          <option key={event.id} value={`event:${event.id}`}>
                            {locale === "es"
                              ? event.title_es
                              : event.title_en || event.title_es}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label={es ? "Locales" : "Venues"}>
                        {venues?.map((venue) => (
                          <option key={venue.id} value={`venue:${venue.id}`}>
                            {venue.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </label>
                  {!hasReportableItems && (
                    <p className="empty-state">
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
                      <option value="scam">Scam</option>
                      <option value="other">{es ? "Otro" : "Other"}</option>
                    </select>
                  </label>
                  <label>
                    {es ? "Detalles" : "Details"}
                    <textarea name="details" required minLength={10} />
                  </label>
                  <button
                    className="button"
                    type="submit"
                    disabled={!hasReportableItems}
                  >
                    {es ? "Enviar aviso" : "Submit report"}
                  </button>
                </form>
              </section>
            )}
          </div>
        </section>
      )}

      {view === "suggestions" && (
        <section className="console-section">
          <ConsoleSectionHeader
            label={es ? "Sugerencias" : "Suggestions"}
            title={es ? "Tus eventos propuestos" : "Your proposed events"}
            description={
              es
                ? "Consulta el estado de cada aporte enviado."
                : "Track the status of every contribution you have sent."
            }
            icon="EV"
          />
          <ContributionList
            empty={
              es
                ? "Aun no has enviado sugerencias."
                : "No suggestions submitted yet."
            }
            items={(submissions || []).map((item) => ({
              id: item.id,
              title: item.title,
              detail: new Date(item.created_at).toLocaleDateString(locale),
              state: item.state,
            }))}
          />
        </section>
      )}

      {view === "reports" && (
        <section className="console-section">
          <ConsoleSectionHeader
            label={es ? "Avisos" : "Reports"}
            title={es ? "Problemas comunicados" : "Reported problems"}
            description={
              es
                ? "Historial y estado de tus avisos a moderacion."
                : "History and status of your reports to moderation."
            }
            icon="RP"
          />
          <ContributionList
            empty={
              es ? "Aun no has enviado avisos." : "No reports submitted yet."
            }
            items={(reports || []).map((item) => ({
              id: item.id,
              title: `${item.target_type} / ${item.reason}`,
              detail: new Date(item.created_at).toLocaleDateString(locale),
              state: item.state,
            }))}
          />
        </section>
      )}
    </WorkspaceShell>
  );
}

function ContributionList({
  empty,
  items,
}: {
  empty: string;
  items: Array<{ id: string; title: string; detail: string; state: string }>;
}) {
  return (
    <section className="panel contribution-list">
      {items.length ? (
        items.map((item) => (
          <article className="contribution-row" key={item.id}>
            <span className="contribution-mark" aria-hidden="true">
              {item.title.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </div>
            <span className="status-pill">{item.state}</span>
          </article>
        ))
      ) : (
        <p className="empty-state">{empty}</p>
      )}
    </section>
  );
}
