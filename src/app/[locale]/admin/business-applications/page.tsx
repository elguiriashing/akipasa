import { notFound } from "next/navigation";
import {
  WorkspaceEmpty,
  WorkspacePageHeader,
} from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { reviewBusinessApplication } from "./actions";

export default async function BusinessApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const { supabase } = await requireUser(
    locale,
    `/${locale}/admin/business-applications`,
  );
  const { data: applications } = await supabase
    .from("business_applications")
    .select(
      "id,applicant_id,business_name,contact_name,locality,website_url,message,state,payment_state,review_reason,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  const es = locale === "es";

  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Acceso comercial" : "Commercial access"}
        title={es ? "Solicitudes de negocio" : "Business applications"}
        description={
          es
            ? "Revisa cada solicitud y concede acceso de pago, prueba o exención con una decisión auditada."
            : "Review every application and grant paid, trial, or waived access through an audited decision."
        }
      />
      {(query.updated || query.error) && (
        <p
          className={`notice ${query.updated ? "notice-success" : "notice-error"}`}
        >
          {query.updated
            ? es
              ? "Solicitud actualizada y auditada."
              : "Application updated and audited."
            : es
              ? "No se pudo guardar la decisión."
              : "The decision could not be saved."}
        </p>
      )}
      {applications?.length ? (
        <div className="catalogue-grid business-application-admin-grid">
          {applications.map((application) => (
            <article className="panel catalogue-card" key={application.id}>
              <div className="catalogue-card-header">
                <div>
                  <h2 className="catalogue-card-title">
                    {application.business_name}
                  </h2>
                  <p className="catalogue-card-sub">
                    {application.contact_name} · {application.locality}
                  </p>
                </div>
                <span className="status-pill">
                  {application.state.replaceAll("_", " ")}
                </span>
              </div>
              <p>{application.message}</p>
              {application.website_url && (
                <a
                  href={application.website_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {application.website_url}
                </a>
              )}
              <dl className="compact-definition-list">
                <div>
                  <dt>{es ? "Pago" : "Payment"}</dt>
                  <dd>{application.payment_state.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt>{es ? "Recibida" : "Received"}</dt>
                  <dd>
                    {new Date(application.created_at).toLocaleString(locale)}
                  </dd>
                </div>
              </dl>
              {application.review_reason && <p>{application.review_reason}</p>}
              <details className="settings-disclosure full-width-disclosure">
                <summary className="button secondary small-btn">
                  {es ? "Revisar solicitud" : "Review application"}
                </summary>
                <form
                  action={reviewBusinessApplication}
                  className="stack focused-form"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input
                    type="hidden"
                    name="applicationId"
                    value={application.id}
                  />
                  <input
                    type="hidden"
                    name="applicantId"
                    value={application.applicant_id}
                  />
                  <label>
                    {es ? "Decisión" : "Decision"}
                    <select name="state" defaultValue="under_review">
                      <option value="under_review">under review</option>
                      <option value="awaiting_payment">awaiting payment</option>
                      <option value="rejected">rejected</option>
                    </select>
                  </label>
                  <label>
                    {es ? "Acceso sin cobro" : "No-charge access"}
                    <select name="grantKind" defaultValue="none">
                      <option value="none">{es ? "Ninguno" : "None"}</option>
                      <option value="trial_1_month">
                        {es ? "Prueba de 1 mes" : "1-month trial"}
                      </option>
                      <option value="trial_3_month">
                        {es ? "Prueba de 3 meses" : "3-month trial"}
                      </option>
                      <option value="waived">
                        {es ? "Exención indefinida" : "Indefinite waiver"}
                      </option>
                    </select>
                  </label>
                  <label>
                    {es ? "Motivo auditado" : "Audited reason"}
                    <textarea
                      name="reason"
                      required
                      minLength={10}
                      maxLength={2000}
                    />
                  </label>
                  <button className="button" type="submit">
                    {es ? "Guardar decisión" : "Save decision"}
                  </button>
                </form>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <WorkspaceEmpty
          title={es ? "No hay solicitudes" : "No applications"}
          description={
            es
              ? "Las nuevas solicitudes de negocio aparecerán aquí."
              : "New business applications will appear here."
          }
        />
      )}
    </>
  );
}
