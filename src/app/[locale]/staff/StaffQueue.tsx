import Link from "next/link";
import { stayHref } from "@/lib/akiduermo-routing";
import { moderateItem } from "../moderation/actions";

export type StaffQueueItem = {
  id: string;
  created_at: string;
  title?: string | null;
  title_es?: string | null;
  title_en?: string | null;
  name?: string | null;
  venue_name?: string | null;
  address?: string | null;
  venue_address?: string | null;
  evidence?: string | null;
  status?: string | null;
  state?: string | null;
  claimant_id?: string;
  claimant?: {
    display_name?: string | null;
    email?: string | null;
    phone?: string | null;
    created_at?: string | null;
  } | null;
  venues?: {
    name?: string | null;
    address?: string | null;
    slug?: string | null;
    discovery_vertical?: string | null;
    contact_phone?: string | null;
    website_url?: string | null;
    timezone?: string | null;
  } | null;
};

export function StaffQueue({
  locale,
  items,
  targetType,
  approve,
  claimPage = 1,
}: {
  locale: "es" | "en";
  items: StaffQueueItem[];
  targetType: "submission" | "venue" | "event" | "offer" | "venue_claim";
  approve: "approved" | "published";
  claimPage?: number;
}) {
  const es = locale === "es";
  if (!items.length)
    return (
      <p className="empty-state">
        {es ? "La cola está vacía." : "This queue is empty."}
      </p>
    );
  return (
    <div className="queue-list">
      {items.map((item) => (
        <article className="panel queue-card" key={item.id}>
          <div className="queue-card-header">
            <div>
              <h3>
                {targetType === "venue_claim"
                  ? item.venues?.name ||
                    (es ? "Local no disponible" : "Venue unavailable")
                  : locale === "en"
                    ? item.title_en || item.title_es || item.title || item.name
                    : item.title_es || item.title || item.name || item.title_en}
              </h3>
              {targetType !== "venue_claim" && (
                <p>
                  {item.venue_name ||
                    item.venues?.name ||
                    item.address ||
                    item.venue_address ||
                    item.evidence}
                </p>
              )}
            </div>
            <span className="status-pill">
              {item.status || item.state || "pending"}
            </span>
          </div>
          {targetType === "venue_claim" && (
            <ClaimDetails item={item} locale={locale} />
          )}
          <form action={moderateItem} className="moderation-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="targetType" value={targetType} />
            <input type="hidden" name="targetId" value={item.id} />
            {targetType === "venue_claim" && (
              <input type="hidden" name="claimPage" value={claimPage} />
            )}
            <input
              name="reason"
              required
              minLength={3}
              aria-label={es ? "Motivo de la decisión" : "Decision reason"}
              placeholder={es ? "Motivo de la decisión" : "Decision reason"}
            />
            <button className="button" name="decision" value={approve}>
              {es ? "Aprobar" : "Approve"}
            </button>
            <button className="button danger" name="decision" value="rejected">
              {es ? "Rechazar" : "Reject"}
            </button>
          </form>
        </article>
      ))}
    </div>
  );
}

function ClaimDetails({
  item,
  locale,
}: {
  item: StaffQueueItem;
  locale: "en" | "es";
}) {
  const es = locale === "es";
  const missing = es ? "No facilitado" : "Not provided";
  const date = (value?: string | null) => {
    if (!value || Number.isNaN(Date.parse(value))) return missing;
    let timeZone = item.venues?.timezone || "Europe/Madrid";
    try {
      new Intl.DateTimeFormat(locale, { timeZone });
    } catch {
      timeZone = "Europe/Madrid";
    }
    return (
      <time dateTime={value}>
        {new Intl.DateTimeFormat(es ? "es-ES" : "en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone,
        }).format(new Date(value))}{" "}
        ({timeZone})
      </time>
    );
  };
  const email = item.claimant?.email;
  const phone = item.claimant?.phone;
  return (
    <div className="claim-review-details">
      <dl className="claim-review-grid">
        <div>
          <dt>{es ? "Solicitante" : "Applicant"}</dt>
          <dd>{item.claimant?.display_name || missing}</dd>
        </div>
        <div>
          <dt>{es ? "Email de la cuenta" : "Account email"}</dt>
          <dd>
            {email ? (
              <a href={`mailto:${encodeURIComponent(email)}`}>{email}</a>
            ) : (
              missing
            )}
          </dd>
        </div>
        <div>
          <dt>{es ? "Teléfono del solicitante" : "Applicant phone"}</dt>
          <dd>
            {phone ? (
              <a href={`tel:${phone.replace(/[^+0-9]/g, "")}`}>{phone}</a>
            ) : (
              missing
            )}
          </dd>
        </div>
        <div>
          <dt>{es ? "Solicitud recibida" : "Submitted"}</dt>
          <dd>{date(item.created_at)}</dd>
        </div>
        <div>
          <dt>{es ? "Cuenta creada" : "Account created"}</dt>
          <dd>{date(item.claimant?.created_at)}</dd>
        </div>
        <div>
          <dt>{es ? "Dirección del local" : "Venue address"}</dt>
          <dd>{item.venues?.address || missing}</dd>
        </div>
        <div>
          <dt>{es ? "Teléfono del local" : "Venue phone"}</dt>
          <dd>{item.venues?.contact_phone || missing}</dd>
        </div>
        <div>
          <dt>{es ? "Web del local" : "Venue website"}</dt>
          <dd>
            {item.venues?.website_url?.startsWith("https://") ? (
              <a
                href={item.venues.website_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.venues.website_url}
              </a>
            ) : (
              missing
            )}
          </dd>
        </div>
      </dl>
      <div>
        <h4>{es ? "Pruebas de la solicitud" : "Claim evidence"}</h4>
        <p className="claim-evidence">{item.evidence || missing}</p>
      </div>
      <details>
        <summary>{es ? "Referencias" : "References"}</summary>
        <dl>
          <div>
            <dt>{es ? "ID de solicitud" : "Claim ID"}</dt>
            <dd>{item.id}</dd>
          </div>
          <div>
            <dt>{es ? "ID de solicitante" : "Applicant ID"}</dt>
            <dd>{item.claimant_id || missing}</dd>
          </div>
        </dl>
      </details>
      {item.venues?.slug && (
        <Link
          className="button secondary"
          href={
            item.venues.discovery_vertical === "accommodation"
              ? stayHref(item.venues.slug, locale)
              : `/${locale}/venues/${encodeURIComponent(item.venues.slug)}`
          }
        >
          {es ? "Ver local" : "View venue"}
        </Link>
      )}
    </div>
  );
}
