import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountWorkspacePortals } from "@/components/AccountWorkspacePortals";
import { ConsoleMetric } from "@/components/ConsoleChrome";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { roleLabel } from "@/lib/roles";

export default async function AccountOverview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase, user } = await requireUser(locale);
  const es = locale === "es";
  const [
    { data: profile },
    { count: savedCount },
    { count: followedCount },
    { data: xp },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name,app_role,preferred_locale")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("saved_event_refs")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("followed_venue_refs")
      .select("*", { count: "exact", head: true }),
    supabase.from("xp_ledger").select("delta").eq("profile_id", user.id),
  ]);
  const totalXp = xp?.reduce((sum, entry) => sum + entry.delta, 0) || 0;
  const role = profile?.app_role || "consumer";

  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Resumen" : "Overview"}
        title={es ? "Tu próxima acción" : "Your next action"}
        description={
          es
            ? "Un vistazo rápido a lo importante. Abre una sección para ver sus herramientas."
            : "A quick view of what matters. Open a section to see its tools."
        }
      />
      <section
        className="metrics-grid"
        aria-label={es ? "Resumen de cuenta" : "Account summary"}
      >
        <ConsoleMetric
          label={es ? "Guardados" : "Saved"}
          value={savedCount || 0}
          detail={es ? "Eventos para después" : "Events for later"}
        />
        <ConsoleMetric
          label={es ? "Siguiendo" : "Following"}
          value={followedCount || 0}
          detail={es ? "Locales conectados" : "Connected venues"}
        />
        <ConsoleMetric
          label="XP"
          value={totalXp}
          detail={es ? "Progreso total" : "Total progress"}
        />
      </section>
      <section className="dashboard-grid">
        <article className="panel console-card">
          <span className="status-pill">{roleLabel(role, locale)}</span>
          <h2>{profile?.display_name || user.email}</h2>
          <p>{user.email}</p>
          <Link
            className="button secondary"
            href={`/${locale}/account/profile`}
          >
            {es ? "Revisar perfil" : "Review profile"}
          </Link>
        </article>
        <article className="panel console-card">
          <span className="status-pill">{totalXp} XP</span>
          <h2>{es ? "Sigue explorando" : "Keep exploring"}</h2>
          <p>
            {es
              ? "Descubre un plan o revisa tus recompensas sin salir de tu cuenta."
              : "Discover a plan or check your rewards without cluttering this overview."}
          </p>
          <div className="inline-actions">
            <Link className="button" href={`/${locale}`}>
              {es ? "Descubrir" : "Discover"}
            </Link>
            <Link
              className="button secondary"
              href={`/${locale}/account/rewards`}
            >
              {es ? "Ver premios" : "View rewards"}
            </Link>
          </div>
        </article>
      </section>
      <section className="panel console-card">
        <span className="status-pill">
          {es ? "Gestiona un local" : "Run a business"}
        </span>
        <h2>{es ? "AkiPasa para negocios" : "AkiPasa for businesses"}</h2>
        <p>
          {es
            ? "Solicita una cuenta de negocio, sigue la revision y prepara tu local para publicarlo."
            : "Apply for a business account, follow review, and prepare your venue for publishing."}
        </p>
        <Link className="button" href={`/${locale}/business/apply`}>
          {es ? "Solicitar acceso de negocio" : "Apply for business access"}
        </Link>
      </section>
      <AccountWorkspacePortals locale={locale} role={role} />
    </>
  );
}
