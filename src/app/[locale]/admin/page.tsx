import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConsoleMetric } from "@/components/ConsoleChrome";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
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
    { count: users },
    { count: venues },
    { count: pendingPrivacy },
    { count: promotions },
    { data: recent },
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
      .from("moderation_actions")
      .select("id,action,target_type,reason,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  const es = locale === "es";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Estado" : "State of play"}
        title={es ? "Resumen operativo" : "Operations overview"}
        description={
          es
            ? "Señales, alertas y accesos directos. Los controles detallados viven en su propia sección."
            : "Signals, alerts and next actions. Detailed controls live in their own section."
        }
      />
      <section className="metrics-grid">
        <ConsoleMetric
          label={es ? "Usuarios" : "Users"}
          value={users || 0}
          detail={es ? "Perfiles registrados" : "Registered profiles"}
        />
        <ConsoleMetric
          label={es ? "Locales" : "Venues"}
          value={venues || 0}
          detail={es ? "Catálogo total" : "Total catalogue"}
        />
        <ConsoleMetric
          label={es ? "Privacidad" : "Privacy"}
          value={pendingPrivacy || 0}
          detail={es ? "Solicitudes abiertas" : "Open requests"}
        />
        <ConsoleMetric
          label={es ? "Comercial" : "Commercial"}
          value={promotions || 0}
          detail={es ? "Solicitudes activas" : "Active requests"}
        />
      </section>
      <section className="dashboard-grid">
        <article className="panel console-card">
          <span className="status-pill">{pendingPrivacy || 0}</span>
          <h2>{es ? "Prioridad de privacidad" : "Privacy priority"}</h2>
          <p>
            {es
              ? "Revisa las solicitudes pendientes y registra cada operación."
              : "Review pending requests and record every operation."}
          </p>
          <Link className="button" href={`/${locale}/admin/privacy`}>
            {es ? "Abrir solicitudes" : "Open requests"}
          </Link>
        </article>
        <article className="panel console-card">
          <h2>{es ? "Gestión de usuarios" : "User management"}</h2>
          <p>
            {es
              ? "Busca primero; ningún usuario se selecciona automáticamente."
              : "Search first; no user is selected automatically."}
          </p>
          <Link className="button secondary" href={`/${locale}/admin/users`}>
            {es ? "Buscar usuario" : "Search users"}
          </Link>
        </article>
      </section>
      <section className="panel">
        <h2>{es ? "Cambios recientes" : "Recent changes"}</h2>
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
        </div>
      </section>
    </>
  );
}
