import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/Icons";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";

export default async function AdminOverview({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  if (query.view) {
    const routes: Record<string, string> = {
      access: "users",
      privacy: "privacy",
      catalogue: "catalogue",
      commercial: "promotions",
      growth: "",
    };
    if (query.view in routes)
      redirect(`/${locale}/admin/${routes[query.view]}`);
  }
  const { supabase } = await requireUser(locale, `/${locale}/admin`);
  const [
    usersResponse,
    venuesResponse,
    privacyResponse,
    promotionsResponse,
    applicationsResponse,
    recentResponse,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("venues").select("*", { count: "exact", head: true }),
    supabase
      .from("account_deletion_requests")
      .select("*", { count: "exact", head: true })
      .in("state", ["requested", "processing"]),
    supabase
      .from("promotion_requests")
      .select("*", { count: "exact", head: true })
      .in("state", ["new", "contacted", "qualified"]),
    supabase
      .from("business_applications")
      .select("*", { count: "exact", head: true })
      .in("state", ["submitted", "under_review", "awaiting_payment"]),
    supabase
      .from("moderation_actions")
      .select("id,action,target_type,reason,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  const es = locale === "es";
  const availableCount = (result: { count: number | null; error: unknown }) =>
    result.error ? null : result.count;
  const users = availableCount(usersResponse);
  const venues = availableCount(venuesResponse);
  const pendingPrivacy = availableCount(privacyResponse);
  const promotions = availableCount(promotionsResponse);
  const businessApplications = availableCount(applicationsResponse);
  const recent = recentResponse.error ? null : recentResponse.data;
  const readFailed =
    [users, venues, pendingPrivacy, promotions, businessApplications].some(
      (count) => count === null,
    ) || Boolean(recentResponse.error);
  const unavailableLabel = es ? "No disponible" : "Unavailable";
  const attention =
    (pendingPrivacy ?? 0) + (promotions ?? 0) + (businessApplications ?? 0);
  const priorityPath =
    (pendingPrivacy ?? 0) > 0
      ? "privacy"
      : (businessApplications ?? 0) > 0
        ? "business-applications"
        : (promotions ?? 0) > 0
          ? "promotions"
          : pendingPrivacy === null
            ? "privacy"
            : businessApplications === null
              ? "business-applications"
              : promotions === null
                ? "promotions"
                : "users";
  const tools: Array<{
    href: string;
    icon: IconName;
    title: string;
    detail: string;
    count?: number | null;
  }> = [
    {
      href: `/${locale}/admin/business-applications`,
      icon: "business",
      title: es ? "Solicitudes de negocio" : "Business applications",
      detail: es ? "Revisión, pagos y pruebas" : "Review, payments and trials",
      count: businessApplications,
    },
    {
      href: `/${locale}/admin/promotions`,
      icon: "megaphone",
      title: es ? "Solicitudes comerciales" : "Commercial requests",
      detail: es ? "Promoción y seguimiento" : "Promotion and follow-up",
      count: promotions,
    },
    {
      href: `/${locale}/admin/privacy`,
      icon: "lock",
      title: es ? "Privacidad" : "Privacy",
      detail: es ? "Solicitudes y cumplimiento" : "Requests and compliance",
      count: pendingPrivacy,
    },
    {
      href: `/${locale}/admin/users`,
      icon: "users",
      title: es ? "Usuarios y roles" : "Users and roles",
      detail: es ? "Acceso y permisos" : "Access and permissions",
    },
    {
      href: `/${locale}/admin/catalogue`,
      icon: "venue",
      title: es ? "Catálogo" : "Catalogue",
      detail: es
        ? `${venues ?? "—"} locales registrados`
        : `${venues ?? "—"} registered venues`,
    },
    {
      href: `/${locale}/admin/ai-team`,
      icon: "activity",
      title: es ? "Equipo de IA" : "AI Team",
      detail: es ? "Agentes y automatización" : "Agents and automation",
    },
    {
      href: `/${locale}/admin/personalisation`,
      icon: "person",
      title: es ? "Personalización" : "Personalisation",
      detail: es
        ? "Experiencia y recomendaciones"
        : "Experience and recommendations",
    },
    {
      href: `/${locale}/admin/passports`,
      icon: "gift",
      title: es ? "Pasaportes" : "Passports",
      detail: es ? "Programas y recompensas" : "Programs and rewards",
    },
    {
      href: `/${locale}/admin/settings`,
      icon: "settings",
      title: es ? "Configuración" : "Platform settings",
      detail: es ? "Controles de plataforma" : "Platform controls",
    },
    {
      href: `/${locale}/admin/audit`,
      icon: "audit",
      title: es ? "Auditoría" : "Audit history",
      detail: es ? "Historial verificable" : "Verifiable history",
    },
  ];
  return (
    <div className="operations-overview admin-operations-overview">
      <section className="operations-hero">
        <span>{es ? "Estado de plataforma" : "Platform status"}</span>
        <h2>
          {readFailed
            ? attention > 0
              ? es
                ? `${attention} asuntos conocidos requieren atención; faltan datos`
                : `${attention} known items need attention; some data is unavailable`
              : es
                ? "Estado operativo no disponible"
                : "Operational status unavailable"
            : attention
              ? es
                ? `${attention} asuntos requieren atención`
                : `${attention} items need attention`
              : es
                ? "Operación estable"
                : "Operations are stable"}
        </h2>
        <p>
          {es
            ? `${users ?? "—"} usuarios · ${venues ?? "—"} locales`
            : `${users ?? "—"} users · ${venues ?? "—"} venues`}
        </p>
        <Link href={`/${locale}/admin/${priorityPath}`}>
          {attention > 0
            ? es
              ? "Atender prioridad"
              : "Open priority"
            : es
              ? "Revisar área de trabajo"
              : "Review work area"}
          <Icon name="arrow-right" />
        </Link>
      </section>
      {readFailed && (
        <div className="notice" role="alert">
          <p>
            {es
              ? "Algunos datos de administración no se pudieron cargar. Los recuentos no disponibles se muestran como —."
              : "Some administration data could not be loaded. Unavailable counts are shown as —."}
          </p>
          <Link className="button secondary" href={`/${locale}/admin`}>
            {es ? "Reintentar" : "Retry"}
          </Link>
        </div>
      )}
      <section
        className="operations-pulse"
        aria-label={es ? "Estado de administración" : "Administration status"}
      >
        <div>
          <strong
            aria-label={
              businessApplications === null ? unavailableLabel : undefined
            }
          >
            {businessApplications ?? "—"}
          </strong>
          <span>{es ? "negocios" : "businesses"}</span>
        </div>
        <div>
          <strong
            aria-label={promotions === null ? unavailableLabel : undefined}
          >
            {promotions ?? "—"}
          </strong>
          <span>{es ? "comercial" : "commercial"}</span>
        </div>
        <div>
          <strong
            aria-label={pendingPrivacy === null ? unavailableLabel : undefined}
          >
            {pendingPrivacy ?? "—"}
          </strong>
          <span>{es ? "privacidad" : "privacy"}</span>
        </div>
      </section>
      <section className="operations-tools">
        <header>
          <span>{es ? "Control" : "Control"}</span>
          <h2>{es ? "Áreas de trabajo" : "Work areas"}</h2>
        </header>
        <nav>
          {tools.map((tool) => (
            <Link href={tool.href} key={tool.href}>
              <span>
                <Icon name={tool.icon} />
              </span>
              <span>
                <strong>{tool.title}</strong>
                <small>{tool.detail}</small>
              </span>
              {tool.count !== undefined && (
                <b
                  aria-label={
                    tool.count === null ? unavailableLabel : undefined
                  }
                >
                  {tool.count ?? "—"}
                </b>
              )}
              <Icon name="chevron" />
            </Link>
          ))}
        </nav>
      </section>
      <section className="operations-recent">
        <header>
          <span>{es ? "Registro" : "Log"}</span>
          <h2>{es ? "Cambios recientes" : "Recent changes"}</h2>
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
                {new Date(item.created_at).toLocaleString(locale)}
              </time>
            </div>
          ))}
          {recentResponse.error ? (
            <p className="notice" role="alert">
              {es
                ? "No se pudieron cargar los cambios recientes."
                : "Could not load recent changes."}
            </p>
          ) : (
            !recent?.length && (
              <p className="muted">
                {es
                  ? "Aún no hay cambios recientes."
                  : "No recent changes yet."}
              </p>
            )
          )}
        </div>
      </section>
    </div>
  );
}
