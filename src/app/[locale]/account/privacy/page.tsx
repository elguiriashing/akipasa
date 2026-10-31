import { notFound } from "next/navigation";
import { Icon } from "@/components/Icons";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { requestAccountDeletion } from "../actions";
import { PersonalisationSettings } from "@/components/PersonalisationSettings";
import { AccountPageHeader } from "../AccountPageHeader";
import { AccountCollectionRefresh } from "../AccountCollectionRefresh";

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
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/account/privacy`,
  );
  const { data: deletion, error: deletionError } = await supabase
    .from("account_deletion_requests")
    .select("state,requested_at")
    .eq("profile_id", user.id)
    .in("state", ["requested", "processing"])
    .maybeSingle();
  const { data: personalisation, error: personalisationError } = await supabase
    .from("personalisation_settings")
    .select("personalisation_enabled,marketing_enabled")
    .eq("profile_id", user.id)
    .maybeSingle();
  const es = locale === "es";
  return (
    <div className="account-controls-page">
      <AccountPageHeader
        eyebrow={es ? "Privacidad" : "Privacy"}
        title={es ? "Datos y cuenta" : "Data and account"}
        description={
          es
            ? "Tus preferencias, tus datos y el control de tu cuenta."
            : "Your preferences, your data, and control of your account."
        }
      />
      {(query.updated || query.error) && (
        <p className="notice" role={query.error ? "alert" : "status"}>
          {query.updated
            ? es
              ? "Solicitud registrada."
              : "Request recorded."
            : es
              ? "No se pudo completar."
              : "Request failed."}
        </p>
      )}
      <section className="account-privacy-grid">
        <div className="account-privacy-personalisation">
          {personalisationError ? (
            <article className="account-control-card">
              <h2>{es ? "Personalización" : "Personalisation"}</h2>
              <p className="notice" role="alert">
                {es
                  ? "No se han podido cargar tus preferencias. Reintenta antes de cambiarlas."
                  : "Your preferences could not be loaded. Try again before changing them."}
              </p>
              <AccountCollectionRefresh locale={locale} />
            </article>
          ) : (
            <PersonalisationSettings
              locale={locale}
              initialEnabled={Boolean(personalisation?.personalisation_enabled)}
            />
          )}
        </div>
        <article className="account-control-card">
          <header className="account-control-heading">
            <span className="account-control-icon">
              <Icon name="audit" />
            </span>
            <div>
              <h2>{es ? "Tus datos" : "Your data"}</h2>
              <p>{es ? "Una copia para ti." : "A copy for you."}</p>
            </div>
          </header>
          <p className="account-control-help">
            {es
              ? "Descarga una copia estructurada de tus datos de AkiPasa."
              : "Download a structured copy of your AkiPasa data."}
          </p>
          <a
            className="button secondary account-card-action"
            href={`/${locale}/account/export`}
          >
            {es ? "Descargar mis datos" : "Download my data"}
          </a>
        </article>
        <article className="account-control-card account-control-danger">
          <header className="account-control-heading">
            <span className="account-control-icon">
              <Icon name="trash" />
            </span>
            <div>
              <h2>{es ? "Eliminar cuenta" : "Delete account"}</h2>
              <p>
                {es
                  ? "Requiere tu confirmación."
                  : "Your confirmation is required."}
              </p>
            </div>
          </header>
          {deletionError ? (
            <>
              <p className="notice" role="alert">
                {es
                  ? "No se ha podido consultar el estado de eliminación. Reintenta antes de enviar una solicitud."
                  : "Your deletion status could not be loaded. Try again before sending a request."}
              </p>
              <AccountCollectionRefresh locale={locale} />
            </>
          ) : deletion ? (
            <p className="notice" role="status">
              {deletion.state === "processing"
                ? es
                  ? "Tu solicitud está en proceso."
                  : "Your request is being processed."
                : es
                  ? "Tu solicitud de eliminación está registrada."
                  : "Your deletion request has been received."}
            </p>
          ) : (
            <details
              className="account-control-disclosure sensitive-action"
              open={query.error === "delete-confirmation"}
            >
              <summary>{es ? "Iniciar eliminación" : "Start deletion"}</summary>
              <form
                action={requestAccountDeletion}
                className="account-control-form account-disclosure-content"
              >
                <input type="hidden" name="locale" value={locale} />
                <label>
                  {es
                    ? "Escribe BORRAR para confirmar"
                    : "Type DELETE to confirm"}
                  <input name="confirmation" required autoComplete="off" />
                </label>
                <button className="button" type="submit">
                  {es ? "Solicitar eliminación" : "Request deletion"}
                </button>
              </form>
            </details>
          )}
        </article>
      </section>
    </div>
  );
}
