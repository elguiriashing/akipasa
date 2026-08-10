import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { signOut } from "../../auth/actions";

export default async function AccountSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireUser(locale);
  const es = locale === "es";

  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Preferencias" : "Preferences"}
        title={es ? "Ajustes" : "Settings"}
        description={
          es
            ? "Controles de sesión para este dispositivo."
            : "Session controls for this device."
        }
      />
      <section>
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
