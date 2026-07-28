import { notFound } from "next/navigation";
import {
  WorkspaceEmpty,
  WorkspacePageHeader,
} from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { updateDeletionRequest } from "../actions";

export default async function PrivacyRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const { supabase } = await requireUser(locale, `/${locale}/admin/privacy`);
  const { data } = await supabase
    .from("account_deletion_requests")
    .select(
      "id,profile_id,state,requested_at,profiles!account_deletion_requests_profile_id_fkey(display_name)",
    )
    .in("state", ["requested", "processing"])
    .order("requested_at");
  const es = locale === "es";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Derechos de datos" : "Data rights"}
        title={es ? "Solicitudes de privacidad" : "Privacy requests"}
        description={
          es
            ? "Cada solicitud se abre y procesa de forma individual."
            : "Open and process one request at a time."
        }
      />
      {(query.updated || query.error) && (
        <p className="notice">
          {query.updated
            ? es
              ? "Solicitud actualizada."
              : "Request updated."
            : es
              ? "No se pudo actualizar."
              : "Update failed."}
        </p>
      )}
      {data?.length ? (
        <div className="settings-list">
          {data.map((item) => {
            const profile = item.profiles as unknown as {
              display_name?: string | null;
            } | null;
            return (
              <details className="panel settings-row" key={item.id}>
                <summary>
                  {profile?.display_name || item.profile_id.slice(0, 8)}
                  <span className="status-pill">{item.state}</span>
                </summary>
                <form action={updateDeletionRequest} className="stack">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="requestId" value={item.id} />
                  <label>
                    {es ? "Estado" : "State"}
                    <select name="state" defaultValue="processing">
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </label>
                  <label>
                    {es ? "Motivo y registro" : "Reason and record"}
                    <textarea name="reason" required minLength={10} />
                  </label>
                  <label className="consent-row">
                    <input name="confirmedDeleted" type="checkbox" />
                    <span>
                      {es
                        ? "La identidad y los datos eliminables ya se borraron."
                        : "Identity and erasable data have been deleted."}
                    </span>
                  </label>
                  <button className="button" type="submit">
                    {es ? "Actualizar solicitud" : "Update request"}
                  </button>
                </form>
              </details>
            );
          })}
        </div>
      ) : (
        <WorkspaceEmpty
          title={es ? "Sin solicitudes abiertas" : "No open requests"}
          description={
            es
              ? "Las nuevas solicitudes aparecerán aquí."
              : "New privacy requests will appear here."
          }
        />
      )}
    </>
  );
}
