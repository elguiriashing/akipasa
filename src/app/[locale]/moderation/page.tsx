import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { expireEvents, moderateItem, resolveReport } from "./actions";

type QueueItem = {
  id: string;
  title?: string;
  title_es?: string;
  venue_name?: string;
  evidence?: string;
  state?: string;
  status?: string;
  created_at: string;
};

function DecisionForm({
  locale,
  item,
  targetType,
  approve,
}: {
  locale: "es" | "en";
  item: QueueItem;
  targetType: "submission" | "event" | "venue_claim";
  approve: "approved" | "published";
}) {
  const es = locale === "es";
  return (
    <form action={moderateItem} className="moderation-form">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={item.id} />
      <input
        name="reason"
        required
        minLength={3}
        placeholder={es ? "Motivo de la decisión" : "Decision reason"}
      />
      <button className="button" name="decision" value={approve}>
        {es ? "Aprobar" : "Approve"}
      </button>
      <button className="button danger" name="decision" value="rejected">
        {es ? "Rechazar" : "Reject"}
      </button>
    </form>
  );
}

export default async function ModerationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  const query = await searchParams;
  const { supabase, user } = await requireUser(locale, `/${locale}/moderation`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .single();
  if (!profile || !["moderator", "administrator"].includes(profile.app_role))
    return (
      <main className="shell dashboard">
        <section className="hero">
          <div className="eyebrow">{es ? "Moderación" : "Moderation"}</div>
          <h1>{es ? "Acceso restringido" : "Restricted access"}</h1>
          <p className="lede">
            {es
              ? "Esta cola requiere el rol de moderador."
              : "This queue requires a moderator role."}
          </p>
        </section>
      </main>
    );
  const [
    { data: submissions },
    { data: events },
    { data: claims },
    { data: reports },
    { data: actions },
  ] = await Promise.all([
    supabase
      .from("event_submissions")
      .select("id,title,venue_name,state,created_at")
      .eq("state", "pending")
      .order("created_at"),
    supabase
      .from("events")
      .select("id,title_es,status,created_at")
      .eq("status", "pending")
      .order("created_at"),
    supabase
      .from("venue_claims")
      .select("id,evidence,status,created_at")
      .eq("status", "pending")
      .order("created_at"),
    supabase
      .from("reports")
      .select("id,target_type,target_id,reason,details,state,created_at")
      .eq("state", "open")
      .order("created_at"),
    supabase
      .from("moderation_actions")
      .select("id,action,target_type,target_id,reason,created_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  return (
    <main className="shell dashboard">
      <section className="hero">
        <div className="eyebrow">{es ? "Operaciones" : "Operations"}</div>
        <h1>{es ? "Cola de moderación" : "Moderation queue"}</h1>
        <p className="lede">
          {es
            ? "Cada decisión requiere un motivo y queda registrada."
            : "Every decision requires a reason and is recorded."}
        </p>
      </section>
      {(query.updated || query.error) && (
        <p className="notice">
          {query.updated
            ? es
              ? "Acción registrada."
              : "Action recorded."
            : es
              ? "No se pudo completar la acción."
              : "The action could not be completed."}
        </p>
      )}
      <form action={expireEvents}>
        <input type="hidden" name="locale" value={locale} />
        <button className="button secondary" type="submit">
          {es ? "Expirar eventos finalizados" : "Expire finished events"}
        </button>
      </form>
      <section className="queue-section">
        <h2>
          {es ? "Sugerencias" : "Suggestions"} ({submissions?.length || 0})
        </h2>
        {submissions?.map((item) => (
          <article className="panel queue-card" key={item.id}>
            <h3>{item.title}</h3>
            <p>{item.venue_name}</p>
            <DecisionForm
              locale={locale}
              item={item}
              targetType="submission"
              approve="approved"
            />
          </article>
        ))}
      </section>
      <section className="queue-section">
        <h2>
          {es ? "Eventos de nuevos editores" : "New publisher events"} (
          {events?.length || 0})
        </h2>
        {events?.map((item) => (
          <article className="panel queue-card" key={item.id}>
            <h3>{item.title_es}</h3>
            <DecisionForm
              locale={locale}
              item={item}
              targetType="event"
              approve="published"
            />
          </article>
        ))}
      </section>
      <section className="queue-section">
        <h2>
          {es ? "Reclamaciones de locales" : "Venue claims"} (
          {claims?.length || 0})
        </h2>
        {claims?.map((item) => (
          <article className="panel queue-card" key={item.id}>
            <p>{item.evidence}</p>
            <DecisionForm
              locale={locale}
              item={item}
              targetType="venue_claim"
              approve="approved"
            />
          </article>
        ))}
      </section>
      <section className="queue-section">
        <h2>
          {es ? "Avisos abiertos" : "Open reports"} ({reports?.length || 0})
        </h2>
        {reports?.map((item) => (
          <article className="panel queue-card" key={item.id}>
            <h3>
              {item.target_type} · {item.reason}
            </h3>
            <p>{item.details}</p>
            <form action={resolveReport} className="moderation-form">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="reportId" value={item.id} />
              <input
                name="resolution"
                required
                minLength={3}
                placeholder={es ? "Resolución" : "Resolution"}
              />
              <button className="button" name="decision" value="resolved">
                {es ? "Resolver" : "Resolve"}
              </button>
              <button
                className="button secondary"
                name="decision"
                value="dismissed"
              >
                {es ? "Descartar" : "Dismiss"}
              </button>
            </form>
          </article>
        ))}
      </section>
      <section className="queue-section">
        <h2>{es ? "Historial de auditoría" : "Audit history"}</h2>
        {actions?.map((item) => (
          <div className="managed-row" key={item.id}>
            <strong>
              {item.action} · {item.target_type}
            </strong>
            <span>{item.reason}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
