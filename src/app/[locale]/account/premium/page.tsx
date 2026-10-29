import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icons";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { AccountPageHeader } from "../AccountPageHeader";

export default async function PremiumPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/account/premium`,
  );
  const [
    { data: premium, error: premiumError },
    { count: savedCount, error: savedError },
  ] = await Promise.all([
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
      <AccountPageHeader
        eyebrow="Premium"
        title={
          premium
            ? es
              ? "Tus ventajas Premium"
              : "Your Premium benefits"
            : es
              ? "Descubre Premium"
              : "Discover Premium"
        }
        description={
          premium
            ? es
              ? "Más ventajas para tus planes de cada día."
              : "More benefits for your everyday plans."
            : es
              ? "Ofertas, doble XP y tus planes en el calendario."
              : "Member offers, double XP and plans in your calendar."
        }
        actions={
          premium ? (
            <Link
              className="button button-strong"
              href={`/${locale}/account/premium/calendar`}
            >
              {es ? "Exportar guardados" : "Export saved events"}
            </Link>
          ) : premiumError ? undefined : (
            <Link
              className="button button-strong"
              href={`/${locale}/account/subscription?plan=premium`}
            >
              {es ? "Activar Premium" : "Get Premium"}
            </Link>
          )
        }
      />
      {premiumError && (
        <p className="notice error" role="alert">
          {es
            ? "No pudimos comprobar tu plan. Vuelve a intentarlo desde Membresía."
            : "We couldn’t check your plan. Try again from Membership."}
        </p>
      )}
      <section
        className="account-premium-benefits"
        aria-label={es ? "Ventajas Premium" : "Premium benefits"}
      >
        <article className="account-premium-benefit">
          <span className="account-benefit-icon" aria-hidden="true">
            <Icon name="star" />
          </span>
          <h2>{es ? "Doble XP" : "Double XP"}</h2>
          <p>
            {es
              ? "20 XP por check-in aceptado, en lugar de 10. Los sellos mantienen su valor."
              : "20 XP per accepted check-in instead of 10. Stamps keep their usual value."}
          </p>
          <Link className="button secondary" href={`/${locale}/passports`}>
            {es ? "Abrir Passport" : "Open Passport"}
          </Link>
        </article>
        <article className="account-premium-benefit">
          <span className="account-benefit-icon" aria-hidden="true">
            <Icon name="gift" />
          </span>
          <h2>{es ? "Ofertas Premium" : "Premium offers"}</h2>
          <p>
            {es
              ? "Encuentra ofertas para miembros en los locales participantes."
              : "Find member offers at participating venues."}
          </p>
          <Link className="button secondary" href={`/${locale}`}>
            {es ? "Explorar locales" : "Explore venues"}
          </Link>
        </article>
        <article className="account-premium-benefit">
          <span className="account-benefit-icon" aria-hidden="true">
            <Icon name="calendar" />
          </span>
          <h2>{es ? "Tu calendario" : "Your calendar"}</h2>
          <p>
            {es
              ? "Añade tus eventos guardados a un calendario compatible."
              : "Add your saved events to a compatible calendar."}
          </p>
          <Link className="button secondary" href={`/${locale}/account/saved`}>
            {es ? "Ver guardados" : "View saved events"}
            {!savedError && savedCount !== null ? ` (${savedCount})` : ""}
          </Link>
        </article>
      </section>
      <section className="panel console-card account-membership-card">
        <div>
          <span className="status-pill">
            {premiumError
              ? es
                ? "Plan no disponible"
                : "Plan unavailable"
              : premium
                ? es
                  ? "Premium activo"
                  : "Premium active"
                : es
                  ? "Plan gratuito"
                  : "Free plan"}
          </span>
          <h2>
            {premiumError
              ? es
                ? "Revisa tu membresía"
                : "Check your membership"
              : premium
                ? es
                  ? "Tu cuenta ya tiene acceso"
                  : "Your account has access"
                : es
                  ? "Hazte Premium"
                  : "Upgrade to Premium"}
          </h2>
          <p>
            {es
              ? "Consulta tu plan, facturación y opciones de renovación."
              : "Check your plan, billing and renewal options."}
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
