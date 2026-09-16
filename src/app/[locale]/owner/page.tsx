import Link from "next/link";
import { notFound } from "next/navigation";
import { OwnerAppearanceForm } from "@/components/owner/OwnerAppearanceForm";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { config, isLocale } from "@/lib/config";
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
    : { data: [] };
  const backgroundImages: OwnerBackgroundImage[] = backgroundFiles.flatMap(
    (file, index) => {
      const url = signedBackgrounds.data?.[index]?.signedUrl;
      return url
        ? [{ path: backgroundPaths[index], name: file.name, url }]
        : [];
    },
  );

  const agentRows = agents.data || [];
  const workingAgents = agentRows.filter(
    (agent) => agent.status === "working",
  ).length;
  const failedAgents = agentRows.filter(
    (agent) => agent.status === "failed",
  ).length;
  const moderationTotal =
    (pendingVenues.count || 0) +
    (pendingEvents.count || 0) +
    (pendingCommunity.count || 0);

  return (
    <main className="owner-console-page">
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
          <h2>Welcome Back Alex</h2>
        </div>
        <div className="owner-hero-orbit" aria-hidden="true">
          <i />
          <i />
          <strong>A</strong>
        </div>
      </section>

      <section
        className="owner-metric-grid"
        aria-label={es ? "Estado operativo" : "Operational status"}
      >
        <article>
          <span>AI</span>
          <strong>{workingAgents}</strong>
          <small>{es ? "agentes trabajando" : "agents working"}</small>
        </article>
        <article>
          <span>QUEUE</span>
          <strong>{pendingTasks.count || 0}</strong>
          <small>{es ? "tareas activas" : "active tasks"}</small>
        </article>
        <article>
          <span>TRUST</span>
          <strong>{moderationTotal}</strong>
          <small>
            {es ? "pendientes de moderaci\u00f3n" : "pending moderation"}
          </small>
        </article>
        <article className={failedAgents ? "owner-metric-alert" : ""}>
          <span>HEALTH</span>
          <strong>{failedAgents}</strong>
          <small>{es ? "agentes con error" : "agents in error"}</small>
        </article>
        <article>
          <span>APPROVAL</span>
          <strong>{pendingApprovals.count || 0}</strong>
          <small>{es ? "aprobaciones esperando" : "approvals waiting"}</small>
        </article>
      </section>

      <div className="owner-console-grid">
        <section className="panel owner-launchpad">
          <div className="owner-section-heading">
            <span>01</span>
            <div>
              <h2>Launchpad</h2>
              <p>
                {es
                  ? "Saltos directos a las superficies que mas importan."
                  : "Direct jumps to the surfaces that matter most."}
              </p>
            </div>
          </div>
          <div className="owner-launch-grid">
            <Link href={`/${locale}/admin/ai-team`}>
              <strong>AI</strong>
              <span>
                {es ? "Equipo IA" : "AI Team"}
                <small>{agentRows.length} agents</small>
              </span>
            </Link>
            <Link href={`/${locale}/staff/moderation`}>
              <strong>MD</strong>
              <span>
                {es ? "Moderaci\u00f3n" : "Moderation"}
                <small>{moderationTotal} pending</small>
              </span>
            </Link>
            <Link href={`/${locale}/admin/personalisation`}>
              <strong>AN</strong>
              <span>
                Analytics
                <small>
                  {es ? "Senales y perfiles" : "Signals and profiles"}
                </small>
              </span>
            </Link>
            <Link href={`/${locale}/admin/catalogue`}>
              <strong>CT</strong>
              <span>
                {es ? "Catalogo" : "Catalogue"}
                <small>{es ? "Locales y eventos" : "Venues and events"}</small>
              </span>
            </Link>
            <Link href={`/${locale}/admin/audit`}>
              <strong>AU</strong>
              <span>
                {es ? "Auditoria" : "Audit"}
                <small>{es ? "Historial sensible" : "Sensitive history"}</small>
              </span>
            </Link>
            <a href={config.crmUrl} target="_blank" rel="noreferrer">
              <strong>HQ</strong>
              <span>
                AkiHQ<small>CRM + operations -&gt;</small>
              </span>
            </a>
          </div>
        </section>

        <section className="panel owner-appearance-card">
          <div className="owner-section-heading">
            <span>02</span>
            <div>
              <h2>{es ? "Personaliza AkiPasa" : "Pimp AkiPasa"}</h2>
              <p>
                {es
                  ? "Tu fondo y acento viajan contigo por todo el sitio."
                  : "Your background and accent follow you site-wide."}
              </p>
            </div>
          </div>
          <OwnerAppearanceForm
            locale={locale}
            preferences={preferences}
            images={backgroundImages}
          />
        </section>

        <section className="panel owner-agent-radar">
          <div className="owner-section-heading">
            <span>03</span>
            <div>
              <h2>{es ? "Radar de agentes" : "Agent radar"}</h2>
              <p>
                {es
                  ? "Estado rapido sin abrir la consola completa."
                  : "Quick status without opening the full console."}
              </p>
            </div>
          </div>
          <div>
            {agentRows.map((agent) => (
              <article key={agent.id}>
                <i className={`owner-agent-dot status-${agent.status}`} />
                <span>
                  <strong>{agent.display_name}</strong>
                  <small>{agent.agent_key}</small>
                </span>
                <em>{agent.status}</em>
              </article>
            ))}
          </div>
        </section>

        <section className="panel owner-activity-stream">
          <div className="owner-section-heading">
            <span>04</span>
            <div>
              <h2>{es ? "Pulso reciente" : "Recent pulse"}</h2>
              <p>
                {es
                  ? "Los ultimos latidos del equipo de IA."
                  : "The latest AI-team heartbeats."}
              </p>
            </div>
          </div>
          <div>
            {(recentActivity.data || []).map((item) => (
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
            ))}
          </div>
        </section>
      </div>

      <section className="owner-shortcut-note">
        <span>DEV</span>
        <p>
          <strong>{es ? "Toolbox global" : "Global toolbox"}</strong>
          {es
            ? "Pulsa Ctrl/Cmd + Shift + O en cualquier pagina. Prueba cuadricula, enfoque, copiar URL y celebracion."
            : "Press Ctrl/Cmd + Shift + O on any page. Try grid, focus, copy URL, and celebration."}
        </p>
      </section>
    </main>
  );
}
