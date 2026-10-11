import Link from "next/link";
import { ClaimReview } from "./ClaimReview";
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
    submission?: {
      applicant_name?: string | null;
      relationship?: string | null;
      applicant_phone?: string | null;
      business_email?: string | null;
      business_website?: string | null;
      business_phone?: string | null;
    } | null;
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
  selectedClaimId,
}: {
  locale: "es" | "en";
  items: StaffQueueItem[];
  targetType: "submission" | "venue" | "event" | "offer" | "venue_claim";
  approve: "approved" | "published";
  claimPage?: number;
  selectedClaimId?: string;
}) {
  const es = locale === "es";
  if (!items.length)
    return (
      <p className="empty-state">
        {es ? "La cola está vacía." : "This queue is empty."}
      </p>
    );
  if (targetType === "venue_claim") {
    const selected =
      items.find((candidate) => candidate.id === selectedClaimId) || items[0];
    return (
      <div className="claim-modern-workspace">
        <div className="claim-modern-workspace-title">
          <div>
            <p className="claim-modern-eyebrow">
              {es ? "BANDEJA DE RECLAMACIONES" : "CLAIMS INBOX"}
            </p>
            <h2>
              {es ? "Solicitudes de titularidad" : "Venue ownership claims"}
            </h2>
            <p>
              {es
                ? "Revisa la solicitud y compara los datos enviados con la ficha existente."
                : "Review each request and compare submitted details with the existing venue record."}
            </p>
          </div>
          <span className="claim-modern-count-pill">
            {items.length} {es ? "en esta página" : "on this page"}
          </span>
        </div>
        {items.length > 1 && (
          <nav
            className="claim-modern-picker"
            aria-label={es ? "Seleccionar reclamación" : "Select claim"}
          >
            {items.map((candidate) => (
              <Link
                href={
                  "/" +
                  locale +
                  "/staff/moderation?queue=claims&page=" +
                  claimPage +
                  "&claim=" +
                  encodeURIComponent(candidate.id)
                }
                aria-current={candidate.id === selected.id ? "true" : undefined}
                className={candidate.id === selected.id ? "active" : undefined}
                key={candidate.id}
              >
                <span className="claim-modern-picker-dot" aria-hidden="true" />
                <span>
                  {candidate.venues?.name ||
                    (es ? "Local sin nombre" : "Unnamed venue")}
                </span>
                <small>{candidate.status || "pending"}</small>
              </Link>
            ))}
          </nav>
        )}
        <ClaimReview
          item={selected}
          locale={locale}
          approve={approve}
          claimPage={claimPage}
        />
      </div>
    );
  }
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
