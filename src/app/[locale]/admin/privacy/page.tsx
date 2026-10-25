import { AdminReadFailure } from "../AdminReadState";
import { AdminSearchList } from "../AdminSearchList";
import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { updateDeletionRequest } from "../actions";
import {
  saveDeletionReview,
  executeDeletion,
  confirmDeletionReply,
} from "./deletion-actions";

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
  const { data, error } = await supabase
    .from("account_deletion_requests")
    .select(
      "id,profile_id,state,requested_at,verified_at,due_at,profiles!account_deletion_requests_profile_id_fkey(display_name)",
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
      {error ? (
        <AdminReadFailure locale={locale} href={`/${locale}/admin/privacy`} />
      ) : (
        <AdminSearchList
          locale={locale}
          label={es ? "Solicitudes de privacidad" : "Privacy requests"}
          items={(data || []).map((item) => {
            const profile = item.profiles as unknown as {
              display_name?: string | null;
            } | null;
            return {
              id: item.id,
              status: item.state,
              search: [profile?.display_name, item.profile_id, item.state]
                .filter(Boolean)
                .join(" "),
              content: (
                <details className="panel settings-row">
                  <summary>
                    {profile?.display_name ||
                      item.profile_id?.slice(0, 8) ||
                      item.id}
                    <span className="status-pill">{item.state}</span>
                  </summary>
                  <p>
                    {es
                      ? "Plazo tras verificación"
                      : "Deadline after verification"}
                    :{" "}
                    {item.due_at ||
                      (es
                        ? "Identidad pendiente de verificar"
                        : "Identity verification pending")}
                    {item.due_at && new Date(item.due_at).getTime() < Date.now()
                      ? es
                        ? " — VENCIDA: resolver o comunicar el impedimento excepcional"
                        : " — OVERDUE: resolve or notify the exceptional blocker"
                      : ""}
                  </p>
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
                  {item.profile_id && (
                    <>
                      <p>
                        {es
                          ? "Revisión manual antes de borrar la identidad. No borres datos de otros usuarios ni negocios completos. Registra referencias internas sin copiar datos sensibles."
                          : "Manual review before identity deletion. Do not erase other users’ records or entire businesses. Record internal references without copying sensitive data."}
                      </p>
                      <p>
                        {es ? "Cuenta exacta" : "Exact account"}:{" "}
                        <code>{item.profile_id}</code>
                      </p>
                      <form action={saveDeletionReview} className="stack">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="requestId" value={item.id} />
                        <input
                          type="hidden"
                          name="targetProfile"
                          value={item.profile_id}
                        />
                        {[
                          [
                            "identityVerified",
                            "Identity and request verified",
                            "Identidad y solicitud verificadas",
                          ],
                          [
                            "sessionsReviewed",
                            "Sessions/revocation and remaining token lifetime reviewed",
                            "Sesiones, revocación y vigencia de tokens revisadas",
                          ],
                          [
                            "storageCleared",
                            "Personal storage erased or documented restricted retention resolved",
                            "Archivos personales borrados o retención restringida resuelta",
                          ],
                          [
                            "providersResolved",
                            "Provider data and ongoing billing resolved",
                            "Datos de proveedores y cobros pendientes resueltos",
                          ],
                          [
                            "businessContinuityResolved",
                            "Business ownership and other people's data protected",
                            "Titularidad del negocio y datos de otras personas protegidos",
                          ],
                          [
                            "retentionRecorded",
                            "Retained fields, legal basis, restrictions and expiry documented",
                            "Campos retenidos, base legal, restricciones y vencimiento documentados",
                          ],
                          [
                            "confirmationContactVerified",
                            "Confirmation contact verified for manual reply after deletion",
                            "Contacto de confirmación verificado para respuesta manual tras borrar",
                          ],
                        ].map(([name, en, spanish]) => (
                          <label key={name}>
                            <input type="checkbox" name={name} />
                            {es ? spanish : en}
                          </label>
                        ))}
                        <label>
                          {es ? "Retención legal" : "Legal hold"}
                          <select name="legalHold" defaultValue="hold">
                            <option value="hold">
                              {es
                                ? "Pendiente o bloqueada"
                                : "Pending or blocked"}
                            </option>
                            <option value="clear">
                              {es
                                ? "Revisada: sin bloqueo"
                                : "Reviewed: no blocking hold"}
                            </option>
                          </select>
                        </label>
                        <label>
                          {es
                            ? "Evidencia y registros retenidos"
                            : "Evidence and retained records"}
                          <textarea
                            name="evidence"
                            required
                            minLength={30}
                            maxLength={4000}
                          />
                        </label>
                        <button type="submit" className="button">
                          {es ? "Guardar revisión" : "Save review"}
                        </button>
                      </form>
                      <form action={executeDeletion} className="stack">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="requestId" value={item.id} />
                        <input
                          type="hidden"
                          name="targetProfile"
                          value={item.profile_id}
                        />
                        <label>
                          {es
                            ? "Confirma escribiendo el UUID exacto de la cuenta. Esta acción borra la identidad."
                            : "Type the exact account UUID to confirm. This action deletes the identity."}
                          <input
                            name="confirmation"
                            required
                            autoComplete="off"
                          />
                        </label>
                        <button type="submit" className="button">
                          {es
                            ? "Ejecutar eliminación revisada"
                            : "Execute reviewed identity deletion"}
                        </button>
                      </form>
                    </>
                  )}
                  {!item.profile_id && (
                    <form action={confirmDeletionReply} className="stack">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="requestId" value={item.id} />
                      <label>
                        {es
                          ? "Tras borrar los datos eliminables, he escrito y enviado personalmente la confirmación desde soporte."
                          : "After deleting erasable data, I personally wrote and sent the support confirmation."}
                        <input
                          type="checkbox"
                          name="manualConfirmation"
                          required
                        />
                      </label>
                      <label>
                        {es
                          ? "Referencia y fecha del envío manual"
                          : "Manual send reference and date"}
                        <textarea
                          name="evidence"
                          minLength={10}
                          maxLength={1000}
                          required
                        />
                      </label>
                      <button type="submit" className="button">
                        {es
                          ? "Registrar confirmación y cerrar"
                          : "Record confirmation and close"}
                      </button>
                    </form>
                  )}
                </details>
              ),
            };
          })}
        />
      )}
    </>
  );
}
