import "./owner.css";
import { suiteHref } from "@/lib/suite-navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OwnerAppearanceForm } from "@/components/owner/OwnerAppearanceForm";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { isLocale } from "@/lib/config";
import {
  defaultOwnerPreferences,
  requireOwnerConsole,
  type OwnerBackgroundImage,
  type OwnerPreferences,
} from "@/lib/owner-console";

const ownerBackgroundBucket = "owner-backgrounds";

export default async function OwnerConsolePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const { supabase, user } = await requireOwnerConsole(locale);
  const es = locale === "es";
  const [
    preferencesResult,
    agents,
    pendingApprovals,
    pendingTasks,
    pendingVenues,
    pendingEvents,
    pendingCommunity,
    recentActivity,
    backgroundList,
  ] = await Promise.all([
    supabase
      .from("owner_console_preferences")
      .select("background,accent,motion,glass,background_image_path")
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("ai_agents")
      .select("id,agent_key,display_name,status,last_active_at,last_error")
      .order("display_name"),
    supabase
      .from("ai_approvals")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("ai_tasks")
      .select("*", { count: "exact", head: true })
      .in("status", ["queued", "in_progress", "waiting"]),
    supabase
      .from("venues")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("event_submissions")
      .select("*", { count: "exact", head: true })
      .eq("state", "pending"),
    supabase
      .from("ai_activity_log")
      .select(
        "id,event_type,level,message,created_at,agent:ai_agents(display_name)",
      )
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.storage.from(ownerBackgroundBucket).list(user.id, {
      limit: 24,
      sortBy: { column: "created_at", order: "desc" },
    }),
  ]);

  const storedPreferences = preferencesResult.data;
  const preferences: OwnerPreferences = storedPreferences
    ? {
        background: storedPreferences.background,
        accent: storedPreferences.accent,
        motion: storedPreferences.motion,
        glass: storedPreferences.glass,
        backgroundImagePath: storedPreferences.background_image_path,
      }
    : defaultOwnerPreferences;

  const backgroundFiles = (backgroundList.data || []).filter(
    (file) => file.name && !file.name.endsWith(".emptyFolderPlaceholder"),
  );
  const backgroundPaths = backgroundFiles.map(
    (file) => `${user.id}/${file.name}`,
  );
  const signedBackgrounds = backgroundPaths.length
    ? await supabase.storage
        .from(ownerBackgroundBucket)
        .createSignedUrls(backgroundPaths, 21600)
    : { data: [], error: null };
  const backgroundImages: OwnerBackgroundImage[] = backgroundFiles.flatMap(
    (file, index) => {
      const url = signedBackgrounds.data?.[index]?.signedUrl;
      return url
        ? [{ path: backgroundPaths[index], name: file.name, url }]
        : [];
    },
  );

  const preferencesUnavailable = Boolean(preferencesResult.error);
  const backgroundsUnavailable =
    Boolean(backgroundList.error) ||
    Boolean(signedBackgrounds.error) ||
    backgroundPaths.some(
      (_, index) => !signedBackgrounds.data?.[index]?.signedUrl,
    );
  const agentsUnavailable = Boolean(agents.error) || agents.data === null;
  const activityUnavailable =
    Boolean(recentActivity.error) || recentActivity.data === null;
  const agentRows = agents.data || [];
  const workingAgents = agentsUnavailable
    ? null
    : agentRows.filter((agent) => agent.status === "working").length;
  const failedAgents = agentsUnavailable
    ? null
    : agentRows.filter((agent) => agent.status === "failed").length;
  const pendingTaskCount = pendingTasks.error ? null : pendingTasks.count;
  const pendingApprovalCount = pendingApprovals.error
    ? null
    : pendingApprovals.count;
  const moderationTotal =
    pendingVenues.error ||
    pendingEvents.error ||
    pendingCommunity.error ||
    pendingVenues.count === null ||
    pendingEvents.count === null ||
    pendingCommunity.count === null
      ? null
      : pendingVenues.count + pendingEvents.count + pendingCommunity.count;
  const metricsUnavailable =
    agentsUnavailable ||
    pendingTaskCount === null ||
    pendingApprovalCount === null ||
    moderationTotal === null;
  const unavailable = es ? "No disponible" : "Unavailable";
  function readUnavailable(label: string, section: string) {
    return (
      <div className="notice" role="alert">
        <p>
          {es
            ? `No se pudo cargar: ${label}. Vuelve a intentarlo.`
            : `Could not load ${label}. Please try again.`}
        </p>
        <Link className="button secondary" href={`/${locale}/owner#${section}`}>
          {es ? "Reintentar" : "Retry"}
        </Link>
      </div>
    );
  }

  return (
    <main className="owner-console-page owner-console-v3">
      <WorkspacePageHeader
        eyebrow="OWNER / DEV"
        title={es ? "Consola de Alex" : "Alex owner console"}
        description={
          es
            ? "Tu cabina privada para operar, observar y personalizar AkiPasa."
            : "Your private cockpit for operating, observing, and personalising AkiPasa."
        }
        actions={
          <span className="owner-verified-pill">
            OK {es ? "UUID verificado" : "UUID verified"}
          </span>
        }
      />

      {(query.updated || query.error) && (
        <p
          className={`notice ${query.error ? "notice-error" : "notice-success"}`}
          role="status"
        >
          {query.error
            ? es
              ? "No se pudo guardar el cambio."
              : "The change could not be saved."
            : es
              ? "Experiencia actualizada."
              : "Owner experience updated."}
        </p>
      )}

      <section className="owner-hero panel">
        <div>
          <span className="owner-command-kicker">
            AkiPasa / {es ? "Centro de control" : "Control room"}
          </span>
          <h2>{es ? "Tu centro de operaciones" : "Your operations cockpit"}</h2>
          <p>
            {es
              ? "Accede a moderación, aprobaciones y personalización desde tu panel privado."
              : "Review moderation, approvals and personalisation from your private workspace."}
          </p>
          <nav
            className="owner-command-actions"
            aria-label={es ? "Accesos de la consola" : "Console shortcuts"}
          >
            <a href="#owner-launchpad">{es ? "Herramientas" : "Open tools"}</a>
            <a href="#owner-activity">
              {es ? "Actividad reciente" : "Recent activity"}
            </a>
          </nav>
        </div>
        <div className="owner-hero-orbit" aria-hidden="true">
          <i />
          <i />
          <strong>A</strong>
        </div>
      </section>

      {metricsUnavailable &&
        readUnavailable(
          es ? "estado operativo" : "operational status",
          "owner-status",
        )}
      <section
        id="owner-status"
        className="owner-metric-grid"
        aria-label={es ? "Estado operativo" : "Operational status"}
      >
        <article>
          <span>{es ? "IA" : "AI"}</span>
          <strong aria-label={workingAgents === null ? unavailable : undefined}>
            {workingAgents ?? "—"}
          </strong>
          <small>{es ? "agentes trabajando" : "agents working"}</small>
        </article>
        <article>
          <span>{es ? "COLA" : "QUEUE"}</span>
          <strong
            aria-label={pendingTaskCount === null ? unavailable : undefined}
          >
            {pendingTaskCount ?? "—"}
          </strong>
          <small>{es ? "tareas activas" : "active tasks"}</small>
        </article>
        <article>
          <span>{es ? "CONFIANZA" : "TRUST"}</span>
          <strong
            aria-label={moderationTotal === null ? unavailable : undefined}
          >
            {moderationTotal ?? "—"}
          </strong>
          <small>
            {es ? "pendientes de moderación" : "pending moderation"}
          </small>
        </article>
        <article className={failedAgents ? "owner-metric-alert" : ""}>
          <span>{es ? "ESTADO" : "HEALTH"}</span>
          <strong aria-label={failedAgents === null ? unavailable : undefined}>
            {failedAgents ?? "—"}
          </strong>
          <small>{es ? "agentes con error" : "agents in error"}</small>
        </article>
        <article>
          <span>{es ? "APROBACIÓN" : "APPROVAL"}</span>
          <strong
            aria-label={pendingApprovalCount === null ? unavailable : undefined}
          >
            {pendingApprovalCount ?? "—"}
          </strong>
          <small>{es ? "aprobaciones esperando" : "approvals waiting"}</small>
        </article>
      </section>

      <div className="owner-console-grid">
        <section className="panel owner-launchpad" id="owner-launchpad">
          <div className="owner-section-heading">
            <span>01</span>
            <div>
              <h2>{es ? "Tus herramientas" : "Your tools"}</h2>
              <p>
                {es
                  ? "Saltos directos a las superficies que más importan."
                  : "Direct jumps to the surfaces that matter most."}
              </p>
            </div>
          </div>
          <div className="owner-launch-grid">
            <Link href={`/${locale}/admin/ai-team`}>
              <strong>AI</strong>
              <span>
                {es ? "Equipo IA" : "AI Team"}
                <small>
                  {agentsUnavailable
                    ? unavailable
                    : `${agentRows.length} ${es ? "agentes" : "agents"}`}
                </small>
              </span>
            </Link>
            <Link href={`/${locale}/staff/moderation`}>
              <strong>MD</strong>
              <span>
                {es ? "Moderación" : "Moderation"}
                <small>
                  {moderationTotal === null
                    ? unavailable
                    : `${moderationTotal} ${es ? "pendientes" : "pending"}`}
                </small>
              </span>
            </Link>
            <Link href={`/${locale}/admin/personalisation`}>
              <strong>AN</strong>
              <span>
                {es ? "Analítica" : "Analytics"}
                <small>
                  {es ? "Señales y perfiles" : "Signals and profiles"}
                </small>
              </span>
            </Link>
            <Link href={`/${locale}/admin/catalogue`}>
              <strong>CT</strong>
              <span>
                {es ? "Catálogo" : "Catalogue"}
                <small>{es ? "Locales y eventos" : "Venues and events"}</small>
              </span>
            </Link>
            <Link href={`/${locale}/admin/audit`}>
              <strong>AU</strong>
              <span>
                {es ? "Auditoría" : "Audit"}
                <small>{es ? "Historial sensible" : "Sensitive history"}</small>
              </span>
            </Link>
            <a
              href={suiteHref("business", locale)}
              target="_blank"
              rel="noreferrer"
            >
              <strong>AB</strong>
              <span>
                AkiBusiness
                <small>
                  {es ? "CRM + operaciones ↗" : "CRM + operations ↗"}
                </small>
              </span>
            </a>
          </div>
        </section>

        <section className="panel owner-appearance-card" id="owner-appearance">
          <div className="owner-section-heading">
            <span>02</span>
            <div>
              <h2>{es ? "Tu apariencia" : "Your appearance"}</h2>
              <p>
                {es
                  ? "Tu fondo y acento viajan contigo por todo el sitio."
                  : "Your background and accent follow you site-wide."}
              </p>
            </div>
          </div>
          {preferencesUnavailable || backgroundsUnavailable ? (
            readUnavailable(
              es
                ? "apariencia y fondos privados"
                : "appearance and private backgrounds",
              "owner-appearance",
            )
          ) : (
            <OwnerAppearanceForm
              locale={locale}
              preferences={preferences}
              images={backgroundImages}
            />
          )}
        </section>

        <section className="panel owner-agent-radar" id="owner-agents">
          <div className="owner-section-heading">
            <span>03</span>
            <div>
              <h2>{es ? "Radar de agentes" : "Agent radar"}</h2>
              <p>
                {es
                  ? "Estado rápido sin abrir la consola completa."
                  : "Quick status without opening the full console."}
              </p>
            </div>
          </div>
          <div>
            {agentsUnavailable ? (
              readUnavailable(es ? "agentes" : "agents", "owner-agents")
            ) : agentRows.length === 0 ? (
              <p>
                {es
                  ? "Todavía no hay agentes configurados."
                  : "No agents are configured yet."}
              </p>
            ) : (
              agentRows.map((agent) => (
                <article key={agent.id}>
                  <i className={`owner-agent-dot status-${agent.status}`} />
                  <span>
                    <strong>{agent.display_name}</strong>
                    <small>{agent.agent_key}</small>
                  </span>
                  <em>{agent.status}</em>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="panel owner-activity-stream" id="owner-activity">
          <div className="owner-section-heading">
            <span>04</span>
            <div>
              <h2>{es ? "Pulso reciente" : "Recent pulse"}</h2>
              <p>
                {es
                  ? "Los últimos latidos del equipo de IA."
                  : "The latest AI-team heartbeats."}
              </p>
            </div>
          </div>
          <div>
            {activityUnavailable ? (
              readUnavailable(
                es ? "actividad reciente" : "recent activity",
                "owner-activity",
              )
            ) : recentActivity.data?.length === 0 ? (
              <p>
                {es
                  ? "Todavía no hay actividad reciente."
                  : "No recent activity yet."}
              </p>
            ) : (
              (recentActivity.data || []).map((item) => (
                <article key={item.id}>
                  <time>
                    {new Date(item.created_at).toLocaleString(locale, {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "Europe/Madrid",
                    })}
                  </time>
                  <span>
                    <strong>{item.message}</strong>
                    <small>{item.event_type}</small>
                  </span>
                  <i className={`level-${item.level}`} />
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="owner-shortcut-note">
        <span>DEV</span>
        <p>
          <strong>{es ? "Toolbox global" : "Global toolbox"}</strong>
          {es
            ? "Pulsa Ctrl/Cmd + Shift + O en cualquier página. Prueba cuadrícula, enfoque, copiar URL y celebración."
            : "Press Ctrl/Cmd + Shift + O on any page. Try grid, focus, copy URL, and celebration."}
        </p>
      </section>
    </main>
  );
}
