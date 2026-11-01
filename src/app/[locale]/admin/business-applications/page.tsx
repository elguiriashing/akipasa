import { AdminReadFailure } from "../AdminReadState";
import { AdminSearchList } from "../AdminSearchList";
import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
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
  const { data: applications, error } = await supabase
    .from("business_applications")
    .select(
      "id,applicant_id,business_name,contact_name,locality,website_url,message,state,payment_state,review_reason,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  const es = locale === "es";
  const stateLabels: Record<string, string> = {
    submitted: es ? "Pendiente de revisión" : "Waiting for review",
    under_review: es ? "En revisión" : "Under review",
    awaiting_payment: es ? "Pendiente de pago" : "Awaiting payment",
    active: es ? "Negocio activo" : "Business active",
    rejected: es ? "Rechazada" : "Rejected",
  };
  const paymentLabels: Record<string, string> = {
    not_started: es ? "No se requiere todavía" : "Not required yet",
    pending: es ? "Pendiente" : "Pending",
    paid: es ? "Pagado" : "Paid",
    trial: es ? "Periodo de prueba" : "Trial",
    waived: es ? "Sin cargo" : "No charge",
    failed: es ? "Necesita atención" : "Needs attention",
    cancelled: es ? "Cancelado" : "Cancelled",
  };

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
      {error ? (
        <AdminReadFailure
          locale={locale}
          href={`/${locale}/admin/business-applications`}
        />
      ) : (
        <AdminSearchList
          locale={locale}
          label={es ? "Solicitudes de negocio" : "Business applications"}
          className="admin-list-grid"
          statusLabels={stateLabels}
          items={(applications || []).map((application) => ({
            id: application.id,
            status: application.state,
            search: [
              application.business_name,
              application.contact_name,
              application.locality,
              application.payment_state,
              application.state,
              application.message,
              application.review_reason,
            ]
              .filter(Boolean)
              .join(" "),
            content: (
              <article className="panel catalogue-card">
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
                    {Object.hasOwn(stateLabels, application.state)
                      ? stateLabels[application.state]
                      : application.state.replaceAll("_", " ")}
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
                    <dd>
                      {Object.hasOwn(paymentLabels, application.payment_state)
                        ? paymentLabels[application.payment_state]
                        : application.payment_state.replaceAll("_", " ")}
                    </dd>
                  </div>
                  <div>
                    <dt>{es ? "Recibida" : "Received"}</dt>
                    <dd>
                      {new Date(application.created_at).toLocaleString(locale)}
                    </dd>
                  </div>
                </dl>
                {application.review_reason && (
                  <p>{application.review_reason}</p>
                )}
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
                        <option value="under_review">
                          {stateLabels.under_review}
                        </option>
                        <option value="awaiting_payment">
                          {stateLabels.awaiting_payment}
                        </option>
                        <option value="rejected">{stateLabels.rejected}</option>
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
            ),
          }))}
        />
      )}
    </>
  );
}
