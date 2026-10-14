import Link from "next/link";
import "./staff-overview.css";
import { notFound } from "next/navigation";
import { Icon, type IconName } from "@/components/Icons";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { canModerate } from "@/lib/roles";
import { summarizeStaffModerationCounts } from "@/lib/staff-moderation-summary";

export default async function StaffOverview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase, user } = await requireUser(locale, `/${locale}/staff`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !canModerate(profile.app_role)) notFound();
  const [
    { count: venues, error: venuesError },
    { count: events, error: eventsError },
    { count: offers, error: offersError },
    { count: submissions, error: submissionsError },
    { data: claimsCount, error: claimsError },
    { count: rentals, error: rentalsError },
    { count: reports, error: reportsError },
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
      .from("offers")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("event_submissions")
      .select("*", { count: "exact", head: true })
      .eq("state", "pending"),
    supabase.rpc("staff_pending_venue_claim_count"),
    supabase
      .from("car_rental_companies")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_review"),
    supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("state", "open"),
  ]);
  const es = locale === "es";
  const summary = summarizeStaffModerationCounts({
    venues: venuesError ? null : venues,
    events: eventsError ? null : events,
    offers: offersError ? null : offers,
    community: submissionsError ? null : submissions,
    claims: claimsError || claimsCount == null ? null : Number(claimsCount),
    rentals: rentalsError ? null : rentals,
  });
  const pending = summary.pending;
  const displayCount = (value: number | null) =>
    value === null ? "—" : value.toLocaleString(locale);
  const actions: Array<{
    href: string;
    icon: IconName;
    title: string;
    detail: string;
    count?: number | null;
  }> = [
    {
      href:
        (summary.claims ?? 0) > 0 && pending === summary.claims
          ? `/${locale}/staff/moderation?queue=claims`
          : `/${locale}/staff/moderation`,
      icon: "shield",
      title: es ? "Cola de publicación" : "Publishing queue",
      detail: es
        ? "Locales, eventos, contenido y reclamaciones"
        : "Venues, events, content and claims",
      count: pending,
    },
    {
      href: `/${locale}/staff/moderation?queue=claims`,
      icon: "venue",
      title: es ? "Reclamaciones" : "Business claims",
      detail: es
        ? "Solicitudes de titularidad pendientes"
        : "Pending ownership requests",
      count: summary.claims,
    },
    {
      href: `/${locale}/staff/support`,
      icon: "inbox",
      title: es ? "Soporte" : "Customer support",
      detail: es ? "Casos enviados por usuarios" : "User-submitted cases",
      count: reportsError ? null : reports,
    },
    {
      href: `/${locale}/staff/moderation?queue=rentals`,
      icon: "venue",
      title: "AkiConduzco",
      detail: es
        ? "Empresas de alquiler por revisar"
        : "Rental companies awaiting review",
      count: summary.rentals,
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
  ];
  const primaryActions = actions.slice(0, 4);
  const secondaryActions = actions.slice(4);
  const reportsCount = reportsError ? null : reports;
  const focusHref =
    (summary.rentals ?? 0) > 0
      ? `/${locale}/staff/moderation?queue=rentals`
      : (summary.claims ?? 0) > 0
        ? `/${locale}/staff/moderation?queue=claims`
        : `/${locale}/staff/moderation`;
  const metrics = [
    {
      label: es ? "Por revisar" : "Awaiting review",
      count: pending,
      icon: "shield" as IconName,
      href: `/${locale}/staff/moderation`,
    },
    {
      label: es ? "Reclamaciones" : "Ownership claims",
      count: summary.claims,
      icon: "venue" as IconName,
      href: `/${locale}/staff/moderation?queue=claims`,
    },
    {
      label: "AkiConduzco",
      count: summary.rentals,
      icon: "venue" as IconName,
      href: `/${locale}/staff/moderation?queue=rentals`,
    },
    {
      label: es ? "Casos abiertos" : "Open support cases",
      count: reportsCount,
      icon: "inbox" as IconName,
      href: `/${locale}/staff/support`,
    },
    {
      label: es ? "Locales pendientes" : "Pending venues",
      count: summary.venues,
      icon: "venue" as IconName,
      href: `/${locale}/staff/moderation?queue=venues`,
    },
  ];

  return (
    <div className="operations-overview staff-dashboard">
      <section className="operations-hero staff-dashboard-hero">
        <div className="staff-dashboard-hero-copy">
          <span className="staff-dashboard-eyebrow">
            {es ? "Centro de operaciones" : "Operations desk"}
          </span>
          <h2>
            {pending === null
              ? es
                ? "Revisa las colas de trabajo"
                : "Check the work queues"
              : pending > 0
                ? es
                  ? `${displayCount(pending)} asuntos por resolver`
                  : `${displayCount(pending)} items need attention`
                : es
                  ? "Todo está al día"
                  : "All caught up"}
          </h2>
          <p>
            {pending === null
              ? es
                ? "Algunos contadores no están disponibles. Abre las colas para comprobar el trabajo pendiente."
                : "Some counts are unavailable. Open the queues to check outstanding work."
              : es
                ? "Reclamaciones, moderación y soporte en un solo lugar."
                : "Claims, moderation and support in one place."}
          </p>
        </div>
        <div className="staff-dashboard-hero-actions">
          <Link href={focusHref} className="staff-dashboard-hero-primary">
            {es ? "Empezar a revisar" : "Start reviewing"}
            <Icon name="arrow-right" />
          </Link>
          <Link
            href={`/${locale}/staff/support`}
            className="staff-dashboard-hero-secondary"
          >
            <Icon name="inbox" />
            {es ? "Abrir soporte" : "Open support"}
          </Link>
        </div>
      </section>

      <section
        className="staff-dashboard-metrics"
        aria-label={es ? "Resumen de tareas" : "Task summary"}
      >
        {metrics.map((metric) => (
          <Link
            href={metric.href}
            key={metric.label}
            className="staff-dashboard-metric"
          >
            <span className="staff-dashboard-metric-icon">
              <Icon name={metric.icon} />
            </span>
            <strong>{displayCount(metric.count)}</strong>
            <span className="staff-dashboard-metric-label">{metric.label}</span>
            <Icon name="chevron" />
          </Link>
        ))}
      </section>

      <section
        className="staff-dashboard-section"
        aria-labelledby="staff-priorities-title"
      >
        <header className="staff-dashboard-heading">
          <div>
            <span>{es ? "Acceso rápido" : "Quick access"}</span>
            <h2 id="staff-priorities-title">
              {es ? "Tareas principales" : "Priority tasks"}
            </h2>
            <p>
              {es
                ? "Ve directamente a la cola que necesitas gestionar."
                : "Jump straight into the work you need to handle."}
            </p>
          </div>
        </header>
        <nav
          className="staff-dashboard-task-grid"
          aria-label={es ? "Tareas principales" : "Priority tasks"}
        >
          {primaryActions.map((action) => (
            <Link
              href={action.href}
              key={action.href}
              className="staff-dashboard-task staff-dashboard-task-primary"
            >
              <span className="staff-dashboard-task-icon">
                <Icon name={action.icon} />
              </span>
              <span className="staff-dashboard-task-body">
                <strong>{action.title}</strong>
                <small>{action.detail}</small>
              </span>
              {action.count !== undefined && (
                <b className="staff-dashboard-task-count">
                  {displayCount(action.count)}
                </b>
              )}
              <Icon name="arrow-right" />
            </Link>
          ))}
        </nav>
      </section>

      <section
        className="staff-dashboard-section"
        aria-labelledby="staff-tools-title"
      >
        <header className="staff-dashboard-heading">
          <div>
            <span>{es ? "Herramientas" : "Tools"}</span>
            <h2 id="staff-tools-title">
              {es ? "Más herramientas" : "More tools"}
            </h2>
          </div>
        </header>
        <nav
          className="staff-dashboard-task-grid staff-dashboard-task-grid-secondary"
          aria-label={es ? "Más herramientas" : "More tools"}
        >
          {secondaryActions.map((action) => (
            <Link
              href={action.href}
              key={action.href}
              className="staff-dashboard-task"
            >
              <span className="staff-dashboard-task-icon">
                <Icon name={action.icon} />
              </span>
              <span className="staff-dashboard-task-body">
                <strong>{action.title}</strong>
                <small>{action.detail}</small>
              </span>
              <Icon name="chevron" />
            </Link>
          ))}
        </nav>
      </section>
    </div>
  );
}
