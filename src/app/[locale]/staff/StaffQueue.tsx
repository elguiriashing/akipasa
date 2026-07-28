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
  venues?: { name?: string | null } | null;
};

export function StaffQueue({
  locale,
  items,
  targetType,
  approve,
}: {
  locale: "es" | "en";
  items: StaffQueueItem[];
  targetType: "submission" | "venue" | "event" | "offer" | "venue_claim";
  approve: "approved" | "published";
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
                {locale === "en"
                  ? item.title_en || item.title_es || item.title || item.name
                  : item.title_es || item.title || item.name || item.title_en}
              </h3>
              <p>
                {item.venue_name ||
                  item.venues?.name ||
                  item.address ||
                  item.venue_address ||
                  item.evidence}
              </p>
            </div>
            <span className="status-pill">
              {item.status || item.state || "pending"}
            </span>
          </div>
          <form action={moderateItem} className="moderation-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="targetType" value={targetType} />
            <input type="hidden" name="targetId" value={item.id} />
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
