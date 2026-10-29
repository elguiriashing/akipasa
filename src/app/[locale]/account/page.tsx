import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountWorkspacePortals } from "@/components/AccountWorkspacePortals";
import { Icon, type IconName } from "@/components/Icons";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";

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
    { data: profile, error: profileError },
    { count: savedCount, error: savedError },
    { count: followedCount, error: followedError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "display_name,app_role,preferred_locale,membership_tier,username,bio,avatar_url",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("saved_event_refs")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id),
    supabase
      .from("followed_venue_refs")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id),
  ]);
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
      href: `/${locale}/account/bookings`,
      icon: "calendar",
      label: es ? "Mis reservas" : "My bookings",
      detail: es
        ? "Próximas, activas e historial"
        : "Upcoming, active and past",
    },
    {
      href: `/${locale}/account/saved`,
      icon: "saved",
      label: es ? "Planes guardados" : "Saved plans",
      detail: es ? "Vuelve a tus favoritos" : "Back to your favourites",
    },
    {
      href: `/${locale}/akipals`,
      icon: "gift",
      label: "AkiPals",
      detail: es
        ? "Tu mascota, vestuario y aventuras"
        : "Your mascot, wardrobe and adventures",
    },
    {
      href: `/${locale}/passports`,
      icon: "passport",
      label: "Passport",
      detail: es
        ? "Sellos, logros y recompensas"
        : "Stamps, achievements and rewards",
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
        ? "Correo, contraseña y sesión"
        : "Email, password and session",
    },
  ];

  return (
    <div className="account-overview">
      <header className="account-welcome">
        <div className="account-avatar" aria-hidden="true">
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              width={96}
              height={96}
              unoptimized
              className="pasa-profile-avatar-image"
            />
          ) : (
            firstName.slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="account-welcome-copy">
          <span>{es ? "Tu mundo AkiPasa" : "Your AkiPasa world"}</span>
          <h1>{displayName}</h1>
          {profile?.username ? (
            <p className="pasa-profile-handle">@{profile.username}</p>
          ) : null}
          {profile?.bio ? (
            <p className="pasa-profile-bio">{profile.bio}</p>
          ) : null}
          <p>
            {profileError
              ? es
                ? "Plan no disponible"
                : "Plan unavailable"
              : premium
                ? "Premium"
                : es
                  ? "Cuenta gratuita"
                  : "Free account"}
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

      <div className="account-overview-main">
        <section className="account-next-step">
          <div>
            <span>{es ? "Siguiente plan" : "Find your next plan"}</span>
            <h2>
              {es
                ? "¿Qué te apetece hacer hoy?"
                : "What do you feel like doing?"}
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
            <strong>{savedError ? "—" : (savedCount ?? 0)}</strong>
            <span>{es ? "guardados" : "saved"}</span>
          </Link>
          <Link href={`/${locale}/account/following`}>
            <strong>{followedError ? "—" : (followedCount ?? 0)}</strong>
            <span>{es ? "siguiendo" : "following"}</span>
          </Link>
          <Link href={`/${locale}/account/subscription`}>
            <strong>
              {profileError
                ? "—"
                : premium
                  ? "Premium"
                  : es
                    ? "Gratis"
                    : "Free"}
            </strong>
            <span>{es ? "tu plan" : "your plan"}</span>
          </Link>
        </section>
        {(profileError || savedError || followedError) && (
          <p className="notice" role="status">
            {es
              ? "Algunos datos de tu cuenta no están disponibles. Abre la sección para volver a intentarlo."
              : "Some account details are unavailable. Open the section to try again."}
          </p>
        )}

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

      <aside
        className="account-overview-aside"
        aria-label={es ? "Opciones de cuenta" : "Account options"}
      >
        <section className="account-membership-strip">
          <div>
            <span>{premium ? "Premium" : es ? "Membresía" : "Membership"}</span>
            <h2>
              {profileError
                ? es
                  ? "Revisa tu membresía"
                  : "Check your membership"
                : premium
                  ? es
                    ? "Tus ventajas están activas"
                    : "Your benefits are active"
                  : es
                    ? "Más ventajas, cuando quieras"
                    : "More benefits, when you want them"}
            </h2>
            <p>
              {profileError
                ? es
                  ? "No pudimos consultar tu plan. Vuelve a intentarlo desde Membresía."
                  : "We couldn’t load your plan. Try again from Membership."
                : premium
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
            {profileError
              ? es
                ? "Abrir Membresía"
                : "Open Membership"
              : premium
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
      </aside>
    </div>
  );
}
