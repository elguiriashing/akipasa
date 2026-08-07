import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { canModerate, isAdministrator } from "@/lib/roles";
import { signOut } from "../../auth/actions";

export default async function AccountSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase, user } = await requireUser(locale);
  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.app_role || "consumer";
  const es = locale === "es";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Preferencias" : "Preferences"}
        title={es ? "Ajustes" : "Settings"}
        description={
          es
            ? "Accesos de trabajo y controles de sesión."
            : "Workspaces and session controls."
        }
      />
      <section className="dashboard-grid">
        <article className="panel console-card">
          <h2>{es ? "Espacios disponibles" : "Available workspaces"}</h2>
          <div className="stack">
            {(role === "organiser" || isAdministrator(role)) && (
              <Link className="button secondary" href={`/${locale}/business`}>
                {es ? "Negocio" : "Business"}
              </Link>
            )}
            {canModerate(role) && (
              <Link className="button secondary" href={`/${locale}/staff`}>
                {es ? "Operaciones de staff" : "Staff operations"}
              </Link>
            )}
            {isAdministrator(role) && (
              <Link className="button secondary" href={`/${locale}/admin`}>
                {es ? "Administración" : "Administration"}
              </Link>
            )}
          </div>
        </article>
        <article className="panel console-card">
          <h2>{es ? "Sesión" : "Session"}</h2>
          <p>
            {es
              ? "Cierra la sesión en este navegador."
              : "Sign out on this browser."}
          </p>
          <form action={signOut}>
            <input type="hidden" name="locale" value={locale} />
            <button className="button secondary" type="submit">
              {es ? "Cerrar sesión" : "Sign out"}
            </button>
          </form>
        </article>
      </section>
    </>
  );
}
