import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { requestAccountDeletion } from "../actions";
import { PersonalisationSettings } from "@/components/PersonalisationSettings";

export default async function AccountPrivacyPage({
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
  const { data: deletion } = await supabase
    .from("account_deletion_requests")
    .select("state,requested_at")
    .eq("profile_id", user.id)
    .in("state", ["requested", "processing"])
    .maybeSingle();
  const { data: personalisation } = await supabase
    .from("personalisation_settings")
    .select("personalisation_enabled")
    .eq("profile_id", user.id)
    .maybeSingle();
  const es = locale === "es";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Privacidad" : "Privacy"}
        title={es ? "Datos y cuenta" : "Data and account"}
        description={
          es
            ? "Exporta tus datos o inicia una solicitud de eliminación."
            : "Export your data or start an account deletion request."
        }
      />
      {(query.updated || query.error) && (
        <p className="notice">
          {query.updated
            ? es
              ? "Solicitud registrada."
              : "Request recorded."
            : es
              ? "No se pudo completar."
              : "Request failed."}
        </p>
      )}
      <section className="dashboard-grid">
        <PersonalisationSettings
          locale={locale}
          initialEnabled={Boolean(personalisation?.personalisation_enabled)}
        />
        <article className="panel console-card">
          <h2>{es ? "Exportación" : "Export"}</h2>
          <p>
            {es
              ? "Descarga una copia estructurada de tus datos de AkiPasa."
              : "Download a structured copy of your AkiPasa data."}
          </p>
          <a className="button secondary" href={`/${locale}/account/export`}>
            {es ? "Descargar mis datos" : "Download my data"}
          </a>
        </article>
        <article className="panel console-card danger-panel">
          <h2>{es ? "Eliminar cuenta" : "Delete account"}</h2>
          {deletion ? (
            <p>
              {es
                ? `Solicitud en estado: ${deletion.state}`
                : `Request status: ${deletion.state}`}
            </p>
          ) : (
            <details className="sensitive-action">
              <summary>{es ? "Iniciar eliminación" : "Start deletion"}</summary>
              <form action={requestAccountDeletion} className="stack">
                <input type="hidden" name="locale" value={locale} />
                <label>
                  {es
                    ? "Escribe BORRAR para confirmar"
                    : "Type DELETE to confirm"}
                  <input name="confirmation" required />
                </label>
                <button className="button" type="submit">
                  {es ? "Solicitar eliminación" : "Request deletion"}
                </button>
              </form>
            </details>
          )}
        </article>
      </section>
    </>
  );
}
