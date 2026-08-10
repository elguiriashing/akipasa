import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";

export default async function PremiumPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase, user } = await requireUser(locale);
  const [{ data: premium }, { count: savedCount }] = await Promise.all([
    supabase.rpc("has_active_entitlement", {
      p_profile: user.id,
      p_plan: "premium",
    }),
    supabase
      .from("saved_event_refs")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id),
  ]);
  const es = locale === "es";

  return (
    <>
      <WorkspacePageHeader
        eyebrow="Premium"
        title={es ? "Tus ventajas, activadas" : "Your benefits, switched on"}
        description={
          premium
            ? es
              ? "Menos ruido, más valor en cada plan local."
              : "Less noise and more value in every local plan."
            : es
              ? "Desbloquea ventajas útiles para descubrir y organizar tus planes."
              : "Unlock useful benefits for discovering and organising plans."
        }
        actions={
          premium ? (
            <Link
              className="button button-strong"
              href={`/${locale}/account/premium/calendar`}
            >
              {es ? "Exportar guardados" : "Export saved events"}
            </Link>
          ) : (
            <Link
              className="button button-strong"
              href={`/${locale}/account/subscription?plan=premium`}
            >
              {es ? "Activar Premium" : "Get Premium"}
            </Link>
          )
        }
      />
      <section className="metrics-grid" aria-label="Premium benefits">
        <article className="panel console-card">
          <span className="status-pill">2x XP</span>
          <h2>{es ? "Avanza más rápido" : "Progress faster"}</h2>
          <p>
            {es
              ? "Recibe 20 XP, en vez de 10, en cada check-in aceptado. Los sellos no cambian."
              : "Receive 20 XP instead of 10 for every accepted check-in. Stamps stay unchanged."}
          </p>
        </article>
        <article className="panel console-card">
          <span className="status-pill">
            {es ? "Solo miembros" : "Members only"}
          </span>
          <h2>{es ? "Ofertas Premium" : "Premium offers"}</h2>
          <p>
            {es
              ? "Descubre ventajas reservadas para miembros en las páginas de locales."
              : "Discover member-only value on participating venue pages."}
          </p>
        </article>
        <article className="panel console-card">
          <span className="status-pill">{savedCount || 0}</span>
          <h2>{es ? "Tu calendario" : "Your calendar"}</h2>
          <p>
            {es
              ? "Exporta un evento o todos tus guardados a cualquier calendario compatible."
              : "Export one event or all saved events to any compatible calendar."}
          </p>
        </article>
      </section>
      <section className="panel console-card account-membership-card">
        <div>
          <span className="status-pill">
            {premium
              ? es
                ? "Premium activo"
                : "Premium active"
              : es
                ? "Plan gratuito"
                : "Free plan"}
          </span>
          <h2>
            {premium
              ? es
                ? "Tu cuenta ya tiene acceso"
                : "Your account has access"
              : es
                ? "Hazte Premium"
                : "Upgrade to Premium"}
          </h2>
          <p>
            {es
              ? "Stripe gestiona tu suscripción de forma segura. Puedes cambiarla o cancelarla cuando quieras."
              : "Stripe securely manages your subscription. Change or cancel it whenever you like."}
          </p>
        </div>
        <Link
          className="button secondary"
          href={`/${locale}/account/subscription`}
        >
          {premium
            ? es
              ? "Gestionar suscripción"
              : "Manage subscription"
            : es
              ? "Ver planes"
              : "View plans"}
        </Link>
      </section>
    </>
  );
}
