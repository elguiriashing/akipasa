import { reviewRentalCompany } from "../moderation/actions";

type ReviewCompany = {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string | null;
  website_url: string | null;
  created_at: string;
  submitted_by: string;
};

export function RentalReviewQueue({
  locale,
  companies,
}: {
  locale: "en" | "es";
  companies: ReviewCompany[];
}) {
  const es = locale === "es";
  if (!companies.length)
    return (
      <p className="empty-state">
        {es
          ? "No hay empresas de alquiler pendientes."
          : "No rental companies are waiting for review."}
      </p>
    );
  return (
    <div className="staff-queue">
      {companies.map((company) => (
        <article className="panel stack" key={company.id}>
          <span className="eyebrow">
            {es ? "Nueva empresa de alquiler" : "New rental company"}
          </span>
          <h3>{company.name}</h3>
          <p>
            {company.address} · {company.city}
          </p>
          {company.phone && (
            <p>
              {es ? "Teléfono" : "Phone"}: {company.phone}
            </p>
          )}
          {company.website_url && (
            <p>
              <a
                href={company.website_url}
                rel="nofollow noopener noreferrer"
                target="_blank"
              >
                {company.website_url}
              </a>
            </p>
          )}
          <small>
            {es ? "Cuenta remitente" : "Submitted by account"}:{" "}
            {company.submitted_by} ·{" "}
            {new Date(company.created_at).toLocaleString(
              es ? "es-ES" : "en-GB",
              { timeZone: "Europe/Madrid" },
            )}
          </small>
          <form action={reviewRentalCompany} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="companyId" value={company.id} />
            <label>
              {es
                ? "Nota interna u orientación para la empresa"
                : "Internal note or guidance for the company"}
              <textarea name="note" maxLength={1000} rows={3} />
            </label>
            <div className="form-actions-right">
              <button
                className="button secondary"
                name="status"
                value="rejected"
                type="submit"
              >
                {es ? "Rechazar" : "Reject"}
              </button>
              <button
                className="button primary"
                name="status"
                value="published"
                type="submit"
              >
                {es ? "Aprobar y publicar" : "Approve and publish"}
              </button>
            </div>
          </form>
        </article>
      ))}
    </div>
  );
}
