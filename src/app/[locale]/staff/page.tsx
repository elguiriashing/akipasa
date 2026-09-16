import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon, type IconName } from "@/components/Icons";
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
  const actions: Array<{
    href: string;
    icon: IconName;
    title: string;
    detail: string;
    count?: number;
  }> = [
    {
      href: `/${locale}/staff/moderation`,
      icon: "shield",
      title: es ? "Cola de publicación" : "Publishing queue",
      detail: es
        ? "Locales, eventos y contenido"
        : "Venues, events and content",
      count: pending,
    },
    {
      href: `/${locale}/staff/support`,
      icon: "inbox",
      title: es ? "Soporte" : "Customer support",
      detail: es ? "Casos enviados por usuarios" : "User-submitted cases",
      count: reports || 0,
    },
    {
      href: `/${locale}/staff/creators`,
      icon: "users",
      title: es ? "Creadores" : "Creators",
      detail: es ? "Perfiles y verificaciones" : "Profiles and verification",
    },
    {
      href: `/${locale}/staff/catalogue`,
      icon: "venue",
      title: es ? "Catálogo" : "Catalogue",
      detail: es
        ? "Locales y eventos publicados"
        : "Published venues and events",
    },
    {
      href: `/${locale}/staff/promotions`,
      icon: "megaphone",
      title: es ? "Promociones" : "Promotions",
      detail: es ? "Campañas y solicitudes" : "Campaigns and requests",
    },
    {
      href: `/${locale}/staff/audit`,
      icon: "audit",
      title: es ? "Auditoría" : "Audit history",
      detail: es ? "Registro de decisiones" : "Decision log",
    },
  ];
  return (
    <div className="operations-overview">
      <section className="operations-hero">
        <span>{es ? "Prioridad de hoy" : "Today’s priority"}</span>
        <h2>
          {pending
            ? es
              ? `${pending} elementos esperan revisión`
              : `${pending} items await review`
            : es
              ? "Todo está al día"
              : "Everything is up to date"}
        </h2>
        <p>
          {es
            ? "Entra directamente en la tarea que necesita atención."
            : "Go straight to the work that needs attention."}
        </p>
        <Link href={`/${locale}/staff/moderation`}>
          {es ? "Revisar ahora" : "Review now"}
          <Icon name="arrow-right" />
        </Link>
      </section>
      <section
        className="operations-pulse"
        aria-label={es ? "Estado operativo" : "Operational status"}
      >
        <div>
          <strong>{pending}</strong>
          <span>{es ? "por revisar" : "to review"}</span>
        </div>
        <div>
          <strong>{reports || 0}</strong>
          <span>{es ? "casos" : "cases"}</span>
        </div>
        <div>
          <strong>{venues || 0}</strong>
          <span>{es ? "locales" : "venues"}</span>
        </div>
      </section>
      <section className="operations-tools">
        <header>
          <span>{es ? "Herramientas" : "Tools"}</span>
          <h2>{es ? "Elige una tarea" : "Choose a task"}</h2>
        </header>
        <nav>
          {actions.map((action) => (
            <Link href={action.href} key={action.href}>
              <span>
                <Icon name={action.icon} />
              </span>
              <span>
                <strong>{action.title}</strong>
                <small>{action.detail}</small>
              </span>
              {action.count !== undefined && <b>{action.count}</b>}
              <Icon name="chevron" />
            </Link>
          ))}
        </nav>
      </section>
      <section className="operations-recent">
        <header>
          <span>{es ? "Registro" : "Log"}</span>
          <h2>{es ? "Actividad reciente" : "Recent activity"}</h2>
        </header>
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
          {!recent?.length && (
            <p className="muted">
              {es
                ? "Aún no hay actividad reciente."
                : "No recent activity yet."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
