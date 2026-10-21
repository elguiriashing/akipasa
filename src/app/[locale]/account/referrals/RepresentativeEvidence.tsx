import {
  type RepresentativeEvidence as Evidence,
  referralReviewLabel,
} from "@/lib/referrals";
export default function RepresentativeEvidence({
  data,
  locale,
  days,
}: {
  data: Evidence | null;
  locale: "en" | "es";
  days: 30 | 90 | 365;
}) {
  const es = locale === "es";
  const date = (value: string) =>
    new Date(value).toLocaleDateString(es ? "es-ES" : "en-GB", {
      timeZone: "Europe/Madrid",
    });
  return (
    <section
      className="referral-evidence"
      aria-labelledby="rep-evidence-heading"
    >
      <h2 id="rep-evidence-heading">
        {es ? "Tus suscripciones atribuidas" : "Your attributed subscriptions"}
      </h2>
      <p>
        {es
          ? "Solo evidencia de facturas verificadas de tus códigos. No indica si una suscripción sigue activa. Los importes propuestos no son saldos pagaderos. Los pagos en efectivo están desactivados."
          : "Verified invoice evidence from your codes only. This does not indicate whether a subscription remains active. Proposed amounts are not payable balances. Cash payouts are disabled."}
      </p>
      <form method="get" className="referral-period">
        <label>
          {es
            ? "Periodo de registro de evidencia"
            : "Evidence recording period"}
          <select name="period" defaultValue={days}>
            {[30, 90, 365].map((n) => (
              <option value={n} key={n}>
                {n} {es ? "días" : "days"}
              </option>
            ))}
          </select>
        </label>
        <button>{es ? "Aplicar periodo" : "Apply period"}</button>
      </form>
      {!data ? (
        <p role="status">
          {es
            ? "Esta vista aún no está disponible. No se muestran datos estimados."
            : "This view is not available yet. No estimated data is shown."}
        </p>
      ) : (
        <>
          <p>
            {es ? "Desde" : "Since"} {date(data.since)} ·{" "}
            {es
              ? "Hasta 50 suscripciones, 10 facturas por suscripción y 10 revisiones por factura."
              : "Up to 50 subscriptions, 10 invoices per subscription and 10 reviews per invoice."}
          </p>
          {data.subscriptions.length === 0 ? (
            <p>
              {es
                ? "No hay facturas atribuidas registradas en este periodo."
                : "No attributed invoices recorded in this period."}
            </p>
          ) : (
            data.subscriptions.map((subscription) => (
              <article
                key={subscription.reference}
                className="referral-subscription"
              >
                <h3>
                  {es ? "Suscripción" : "Subscription"}{" "}
                  {subscription.reference.slice(0, 12)}
                </h3>
                <p>
                  {subscription.invoice_count}{" "}
                  {es
                    ? "facturas verificadas en el periodo"
                    : "verified invoices in the period"}
                </p>
                {subscription.invoices_truncated && (
                  <p>
                    {es
                      ? "Se muestran las 10 facturas más recientes."
                      : "Showing the 10 most recent invoices."}
                  </p>
                )}
                <div className="referral-invoices">
                  {subscription.invoices.map((invoice) => (
                    <article key={invoice.reference}>
                      <h4>
                        {es ? "Factura" : "Invoice"}{" "}
                        {invoice.reference.slice(0, 12)}
                      </h4>
                      <dl>
                        <div>
                          <dt>{es ? "Código" : "Code"}</dt>
                          <dd>{invoice.code}</dd>
                        </div>
                        <div>
                          <dt>{es ? "Registro" : "Recorded"}</dt>
                          <dd>
                            <time dateTime={invoice.recorded_at}>
                              {date(invoice.recorded_at)}
                            </time>
                          </dd>
                        </div>
                        <div>
                          <dt>{es ? "Revisión actual" : "Current review"}</dt>
                          <dd>
                            {invoice.status === "pending"
                              ? es
                                ? "Pendiente"
                                : "Pending"
                              : referralReviewLabel(invoice.status, locale)}
                          </dd>
                        </div>
                        <div>
                          <dt>
                            {es
                              ? "Propuesta (unidades monetarias menores)"
                              : "Proposed (minor currency units)"}
                          </dt>
                          <dd>
                            {invoice.proposed_cents === null
                              ? es
                                ? "Sin regla registrada"
                                : "No recorded rule"
                              : `${invoice.proposed_cents.toLocaleString(es ? "es-ES" : "en-GB")} ${invoice.currency?.toUpperCase() ?? ""}`}
                          </dd>
                        </div>
                        <div>
                          <dt>
                            {es
                              ? "Versión de condiciones registrada"
                              : "Recorded terms version"}
                          </dt>
                          <dd>
                            {invoice.terms_version ??
                              (es ? "Sin registrar" : "Not recorded")}
                          </dd>
                        </div>
                      </dl>
                      {invoice.review_state === "approved" &&
                        invoice.status === "held" && (
                          <p>
                            {es
                              ? "La aprobación histórica está retenida por las comprobaciones actuales."
                              : "Historical approval is held by current checks."}
                          </p>
                        )}
                      {invoice.blockers.length > 0 && (
                        <ul>
                          {invoice.blockers.map((blocker) => (
                            <li key={blocker}>
                              {referralReviewLabel(blocker, locale)}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p>
                        {es
                          ? "No pagadero · pagos desactivados"
                          : "Not payable · payouts disabled"}
                      </p>
                      <details>
                        <summary>
                          {es ? "Historial de revisión" : "Review history"}
                        </summary>
                        {invoice.reviews.length === 0 ? (
                          <p>
                            {es
                              ? "Sin revisiones administrativas."
                              : "No administrative reviews."}
                          </p>
                        ) : (
                          <ol>
                            {invoice.reviews.map((review, i) => (
                              <li key={`${review.reviewed_at}-${i}`}>
                                {referralReviewLabel(review.state, locale)} ·{" "}
                                <time dateTime={review.reviewed_at}>
                                  {date(review.reviewed_at)}
                                </time>
                              </li>
                            ))}
                          </ol>
                        )}
                        {invoice.reviews_truncated && (
                          <p>
                            {es
                              ? "Se muestran las 10 revisiones más recientes."
                              : "Showing the 10 most recent reviews."}
                          </p>
                        )}
                      </details>
                    </article>
                  ))}
                </div>
              </article>
            ))
          )}
          {data.subscriptions_truncated && (
            <p>
              {es
                ? "Se muestran las 50 suscripciones con evidencia más reciente. Reduce el periodo para acotar la vista."
                : "Showing the 50 subscriptions with the most recent evidence. Narrow the period to focus the view."}
            </p>
          )}
        </>
      )}
    </section>
  );
}
