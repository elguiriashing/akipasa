import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountWorkspacePortals } from "@/components/AccountWorkspacePortals";
import { Icon, type IconName } from "@/components/Icons";
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
      .select("display_name,app_role,preferred_locale,membership_tier")
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
  const premium = profile?.membership_tier === "premium";
  const displayName = profile?.display_name || user.email || "AkiPasa";
  const firstName = displayName.split(/\s|@/)[0];
  const shortcuts: Array<{
    href: string;
    icon: IconName;
    label: string;
    detail: string;
  }> = [
    {
      href: `/${locale}/account/saved`,
      icon: "saved",
      label: es ? "Planes guardados" : "Saved plans",
      detail: es
        ? `${savedCount || 0} para cuando quieras`
        : `${savedCount || 0} ready when you are`,
    },
    {
      href: `/${locale}/account/rewards`,
      icon: "gift",
      label: es ? "Premios y progreso" : "Rewards and progress",
      detail: es ? `${totalXp} XP acumulados` : `${totalXp} XP collected`,
    },
    {
      href: `/${locale}/account/profile`,
      icon: "person",
      label: es ? "Tu perfil" : "Your profile",
      detail: es ? "Identidad y datos públicos" : "Identity and public details",
    },
    {
      href: `/${locale}/account/settings`,
      icon: "settings",
      label: es ? "Preferencias" : "Preferences",
      detail: es
        ? "Idioma, avisos y experiencia"
        : "Language, alerts and experience",
    },
  ];

  return (
    <div className="account-overview">
      <header className="account-welcome">
        <div className="account-avatar" aria-hidden="true">
          {firstName.slice(0, 1).toUpperCase()}
        </div>
        <div className="account-welcome-copy">
          <span>{es ? "Tu espacio" : "Your space"}</span>
          <h2>{es ? `Hola, ${firstName}` : `Hi, ${firstName}`}</h2>
          <p>
            {premium ? "Premium" : roleLabel(role, locale)} · {totalXp} XP
          </p>
        </div>
        <Link
          className="account-icon-link"
          href={`/${locale}/account/settings`}
          aria-label={es ? "Abrir ajustes" : "Open settings"}
        >
          <Icon name="settings" />
        </Link>
      </header>

      <section className="account-next-step">
        <div>
          <span>{es ? "Siguiente plan" : "Find your next plan"}</span>
          <h2>
            {es ? "¿Qué te apetece hacer hoy?" : "What do you feel like doing?"}
          </h2>
        </div>
        <Link className="account-discover-link" href={`/${locale}`}>
          <span>{es ? "Explorar cerca de ti" : "Explore near you"}</span>
          <Icon name="arrow-right" />
        </Link>
      </section>

      <section
        className="account-pulse"
        aria-label={es ? "Tu actividad" : "Your activity"}
      >
        <Link href={`/${locale}/account/saved`}>
          <strong>{savedCount || 0}</strong>
          <span>{es ? "guardados" : "saved"}</span>
        </Link>
        <Link href={`/${locale}/account/following`}>
          <strong>{followedCount || 0}</strong>
          <span>{es ? "siguiendo" : "following"}</span>
        </Link>
        <Link href={`/${locale}/account/rewards`}>
          <strong>{totalXp}</strong>
          <span>XP</span>
        </Link>
      </section>

      <section className="account-section">
        <header>
          <span>{es ? "Accesos rápidos" : "Quick access"}</span>
          <h2>{es ? "Todo lo tuyo" : "Everything that’s yours"}</h2>
        </header>
        <nav
          className="account-shortcuts"
          aria-label={es ? "Accesos rápidos" : "Quick access"}
        >
          {shortcuts.map((item) => (
            <Link href={item.href} key={item.href}>
              <span className="account-shortcut-icon">
                <Icon name={item.icon} />
              </span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
              <Icon name="chevron" />
            </Link>
          ))}
        </nav>
      </section>

      <section className="account-membership-strip">
        <div>
          <span>{premium ? "Premium" : es ? "Membresía" : "Membership"}</span>
          <h2>
            {premium
              ? es
                ? "Tus ventajas están activas"
                : "Your benefits are active"
              : es
                ? "Más ventajas, cuando quieras"
                : "More benefits, when you want them"}
          </h2>
          <p>
            {premium
              ? es
                ? "Ofertas exclusivas, 2x XP y calendarios."
                : "Member offers, 2x XP and calendars."
              : es
                ? "Compara los planes sin compromiso."
                : "Compare plans with no commitment."}
          </p>
        </div>
        <Link
          href={
            premium
              ? `/${locale}/account/premium`
              : `/${locale}/account/subscription`
          }
        >
          {premium
            ? es
              ? "Abrir Premium"
              : "Open Premium"
            : es
              ? "Ver opciones"
              : "See options"}
          <Icon name="arrow-right" />
        </Link>
      </section>

      <AccountWorkspacePortals locale={locale} role={role} />

      <Link
        className="account-business-link"
        href={`/${locale}/business/apply`}
      >
        <span className="account-shortcut-icon">
          <Icon name="business" />
        </span>
        <span>
          <strong>{es ? "¿Gestionas un negocio?" : "Run a business?"}</strong>
          <small>
            {es ? "Solicita acceso para tu local" : "Apply for venue access"}
          </small>
        </span>
        <Icon name="arrow-right" />
      </Link>
    </div>
  );
}
