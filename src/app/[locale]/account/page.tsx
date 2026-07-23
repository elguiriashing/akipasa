import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { requireUser } from "@/lib/auth";
import { signOut } from "../auth/actions";
import { canModerate, isAdministrator, roleLabel } from "@/lib/roles";
import { BadgeProgress } from "@/components/BadgeProgress";
import { requestAccountDeletion } from "./actions";

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const { supabase, user } = await requireUser(locale);
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,app_role,preferred_locale")
    .eq("id", user.id)
    .maybeSingle();
  const es = locale === "es";
  const role = profile?.app_role || "consumer";
  const [
    { data: saved },
    { data: followed },
    { data: recent },
    { data: xp },
    { data: deletionRequest },
  ] = await Promise.all([
    supabase
      .from("saved_event_refs")
      .select("event_key,title,href,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("followed_venue_refs")
      .select("venue_key,name,href,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("recent_event_view_refs")
      .select("event_key,title,href,viewed_at")
      .order("viewed_at", { ascending: false })
      .limit(10),
    supabase.from("xp_ledger").select("delta").eq("profile_id", user.id),
    supabase
      .from("account_deletion_requests")
      .select("state,requested_at")
      .eq("profile_id", user.id)
      .in("state", ["requested", "processing"])
      .maybeSingle(),
  ]);
  const totalXp = xp?.reduce((sum, entry) => sum + entry.delta, 0) || 0;
  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">{es ? "Tu cuenta" : "Your account"}</div>
        <h1>{profile?.display_name || user.email}</h1>
        <p className="lede">
          {es
            ? "Guarda planes y gestiona tu actividad local."
            : "Save plans and manage your local activity."}
        </p>
      </section>
      {(query.updated || query.error) && (
        <p className="notice">
          {query.updated
            ? es
              ? "Solicitud registrada."
              : "Request recorded."
            : es
              ? "No se pudo completar la solicitud."
              : "The request could not be completed."}
        </p>
      )}
      <section className="panel">
        <dl>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>{es ? "Rol" : "Role"}</dt>
            <dd>{roleLabel(role, locale)}</dd>
          </div>
        </dl>
        <div className="actions">
          <Link className="button" href={`/${locale}/passports`}>
            {es ? "Pasaportes" : "Passports"}
          </Link>
          <Link className="button secondary" href={`/${locale}`}>
            {es ? "Descubrir planes" : "Discover events"}
          </Link>
          {(role === "organiser" || isAdministrator(role)) && (
            <Link className="button" href={`/${locale}/business`}>
              {es ? "Panel de negocio" : "Business dashboard"}
            </Link>
          )}
          {canModerate(role) && (
            <Link className="button" href={`/${locale}/moderation`}>
              {es ? "Moderación" : "Moderation"}
            </Link>
          )}
          {isAdministrator(role) && (
            <Link className="button" href={`/${locale}/admin`}>
              Admin
            </Link>
          )}
          <form action={signOut}>
            <input type="hidden" name="locale" value={locale} />
            <button className="button secondary" type="submit">
              {es ? "Salir" : "Sign out"}
            </button>
          </form>
        </div>
      </section>
      <BadgeProgress locale={locale} totalXp={totalXp} />
      <section className="dashboard-grid">
        <article className="panel">
          <h2>{es ? "Favoritos" : "Favorites"}</h2>
          <p>
            {saved?.length || 0} {es ? "eventos guardados" : "saved events"}
          </p>
          {saved?.map((item) => (
            <p key={item.event_key}>
              <Link href={item.href}>{item.title} →</Link>
            </p>
          ))}
        </article>
        <article className="panel">
          <h2>{es ? "Siguiendo" : "Following"}</h2>
          <p>
            {followed?.length || 0} {es ? "locales" : "venues"}
          </p>
          {followed?.map((item) => (
            <p key={item.venue_key}>
              <Link href={item.href}>{item.name} →</Link>
            </p>
          ))}
        </article>
        <article className="panel">
          <h2>{es ? "Vistos recientemente" : "Recently viewed"}</h2>
          <p>
            {recent?.length || 0} {es ? "eventos" : "events"}
          </p>
          {recent?.map((item) => (
            <p key={item.event_key}>
              <Link href={item.href}>{item.title} →</Link>
            </p>
          ))}
        </article>
        {canModerate(role) && (
          <article className="panel">
            <h2>{es ? "Soporte" : "Support"}</h2>
            <p>
              {es
                ? "La bandeja interna y el chat llegarán en una fase posterior."
                : "The internal inbox and chat will follow in a later phase."}
            </p>
          </article>
        )}
        <article className="panel">
          <h2>{es ? "Privacidad y datos" : "Privacy and data"}</h2>
          <div className="actions">
            <a className="button secondary" href={`/${locale}/account/export`}>
              {es ? "Descargar mis datos" : "Download my data"}
            </a>
          </div>
          {deletionRequest ? (
            <p>
              {es
                ? "Tu solicitud de eliminación está en proceso."
                : "Your deletion request is being processed."}
            </p>
          ) : (
            <details>
              <summary>
                <strong>
                  {es
                    ? "Solicitar eliminación de cuenta"
                    : "Request account deletion"}
                </strong>
              </summary>
              <p>
                {es
                  ? "Esto inicia una revisión segura para borrar la cuenta y los datos asociados que debamos eliminar."
                  : "This starts a secure review to erase the account and associated data we are required to delete."}
              </p>
              <form action={requestAccountDeletion} className="stack">
                <input type="hidden" name="locale" value={locale} />
                <label>
                  {es
                    ? "Escribe BORRAR para confirmar"
                    : "Type DELETE to confirm"}
                  <input
                    name="confirmation"
                    required
                    pattern={es ? "BORRAR" : "DELETE"}
                  />
                </label>
                <button className="button danger" type="submit">
                  {es ? "Solicitar eliminación" : "Request deletion"}
                </button>
              </form>
            </details>
          )}
        </article>
      </section>
    </main>
  );
}
