import Link from "next/link";
import { notFound } from "next/navigation";
import { ConsoleMetric } from "@/components/ConsoleChrome";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";

export default async function StaffOverview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase } = await requireUser(locale, `/${locale}/staff`);
  const [
    { count: venues },
    { count: events },
    { count: submissions },
    { count: reports },
    { data: recent },
  ] = await Promise.all([
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
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("state", "open"),
    supabase
      .from("moderation_actions")
      .select("id,action,target_type,reason,created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);
  const es = locale === "es";
  const pending = (venues || 0) + (events || 0) + (submissions || 0);
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Hoy" : "Today"}
        title={es ? "Qué necesita atención" : "What needs attention"}
        description={
          es
            ? "Alertas y siguientes acciones, no todas las herramientas a la vez."
            : "Alerts and next actions, not every tool at once."
        }
      />
      <section className="metrics-grid">
        <ConsoleMetric
          label={es ? "Por revisar" : "Awaiting review"}
          value={pending}
          detail={es ? "Contenido entrante" : "Incoming content"}
        />
        <ConsoleMetric
          label={es ? "Casos abiertos" : "Open cases"}
          value={reports || 0}
          detail={es ? "Avisos de usuarios" : "User reports"}
        />
        <ConsoleMetric
          label={es ? "Locales pendientes" : "Pending venues"}
          value={venues || 0}
          detail={es ? "Alta de negocios" : "Business onboarding"}
        />
      </section>
      <section className="dashboard-grid">
        <article className="panel console-card">
          <span className="status-pill">{pending}</span>
          <h2>{es ? "Cola de publicación" : "Publishing queue"}</h2>
          <p>
            {es
              ? "Revisa locales, eventos, ofertas, comunidad y reclamaciones."
              : "Review venues, events, offers, community items and claims."}
          </p>
          <Link className="button" href={`/${locale}/staff/moderation`}>
            {es ? "Abrir moderación" : "Open moderation"}
          </Link>
        </article>
        <article className="panel console-card">
          <span className="status-pill">{reports || 0}</span>
          <h2>{es ? "Soporte" : "Customer support"}</h2>
          <p>
            {es
              ? "Los avisos y problemas enviados por usuarios."
              : "Reports and problems submitted by users."}
          </p>
          <Link className="button secondary" href={`/${locale}/staff/support`}>
            {es ? "Ver casos" : "View cases"}
          </Link>
        </article>
      </section>
      <section className="panel">
        <h2>{es ? "Actividad reciente" : "Recent activity"}</h2>
        <div className="managed-list">
          {(recent || []).map((item) => (
            <div className="managed-row" key={item.id}>
              <div>
                <strong>
                  {item.action} / {item.target_type}
                </strong>
                <span>{item.reason}</span>
              </div>
              <time dateTime={item.created_at}>
                {new Date(item.created_at).toLocaleDateString(locale)}
              </time>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
