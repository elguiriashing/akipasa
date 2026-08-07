import { notFound } from "next/navigation";
import {
  WorkspaceEmpty,
  WorkspacePageHeader,
} from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { createFeatureSlot, updatePromotion } from "../actions";

export default async function AdminPromotionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const { supabase } = await requireUser(locale, `/${locale}/admin/promotions`);
  const [{ data: requests }, { data: slots }, { data: events }] =
    await Promise.all([
      supabase
        .from("promotion_requests")
        .select(
          "id,service,message,state,operator_notes,created_at,venues(name)",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("feature_slots")
        .select("id,event_id,label_en,label_es,starts_at,ends_at")
        .order("starts_at", { ascending: false })
        .limit(50),
      supabase
        .from("events")
        .select("id,title_en,title_es")
        .eq("status", "published")
        .order("title_en"),
    ]);
  const es = locale === "es";
  const eventNames = new Map(
    (events || []).map((event) => [
      event.id,
      (es ? event.title_es : event.title_en) || event.title_en,
    ]),
  );

  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Ingresos" : "Revenue operations"}
        title={es ? "Promociones" : "Promotions"}
        description={
          es
            ? "Gestiona solicitudes comerciales y destacados programados solo cuando los necesites."
            : "Manage commercial requests and scheduled features only when needed."
        }
      />
      {(query.updated || query.error) && (
        <p className={`notice ${query.updated ? "notice-success" : "notice-error"}`}>
          {query.updated
            ? es
              ? "✓ Cambio guardado."
              : "✓ Change saved."
            : es
              ? "✕ No se pudo guardar el cambio."
              : "✕ The change could not be saved."}
        </p>
      )}

      <div className="workspace-summary-grid">
        <article className="panel workspace-stat">
          <span>{es ? "Solicitudes abiertas" : "Open requests"}</span>
          <strong>
            {(requests || []).filter((item) => item.state === "new").length}
          </strong>
        </article>
        <article className="panel workspace-stat">
          <span>{es ? "Destacados programados" : "Scheduled features"}</span>
          <strong>{slots?.length || 0}</strong>
        </article>
      </div>

      <details className="panel workspace-disclosure">
        <summary>
          <span>
            <strong>
              {es ? "Programar un destacado" : "Schedule a feature"}
            </strong>
            <small>
              {es
                ? "Selecciona un evento y una ventana de publicación."
                : "Choose an event and publication window."}
            </small>
          </span>
        </summary>
        <form action={createFeatureSlot} className="stack focused-form">
          <input type="hidden" name="locale" value={locale} />
          <label>
            {es ? "Evento publicado" : "Published event"}
            <select name="eventId" required defaultValue="">
              <option value="" disabled>
                {es ? "Selecciona un evento" : "Select an event"}
              </option>
              {(events || []).map((event) => (
                <option value={event.id} key={event.id}>
                  {(es ? event.title_es : event.title_en) || event.title_en}
                </option>
              ))}
            </select>
          </label>

          <div className="form-grid-two">
            <label>
              {es ? "Inicio" : "Starts"}
              <input type="datetime-local" name="startsAt" required />
            </label>
            <label>
              {es ? "Fin" : "Ends"}
              <input type="datetime-local" name="endsAt" required />
            </label>
          </div>

          <div className="form-actions-right">
            <button className="button primary" type="submit">
              {es ? "Programar destacado" : "Schedule feature"}
            </button>
          </div>
        </form>
      </details>

      <section className="workspace-section">
        <h3>{es ? "Destacados recientes" : "Recent feature slots"}</h3>
        {slots?.length ? (
          <div className="settings-list">
            {slots.map((slot) => (
              <article className="panel settings-row" key={slot.id}>
                <strong>
                  {eventNames.get(slot.event_id) ||
                    (es ? "Evento no disponible" : "Unavailable event")}
                </strong>
                <span>
                  {new Intl.DateTimeFormat(es ? "es-ES" : "en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Europe/Madrid",
                  }).format(new Date(slot.starts_at))}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <WorkspaceEmpty
            title={es ? "Sin destacados" : "No feature slots"}
            description={
              es
                ? "Los destacados programados aparecerán aquí."
                : "Scheduled feature slots will appear here."
            }
          />
        )}
      </section>

      <section className="workspace-section">
        <h3>{es ? "Solicitudes comerciales" : "Commercial requests"}</h3>
        {requests?.length ? (
          <div className="settings-list">
            {requests.map((item) => {
              const venue = item.venues as unknown as {
                name?: string | null;
              } | null;
              return (
                <details className="panel settings-row" key={item.id}>
                  <summary>
                    {venue?.name || (es ? "Local" : "Venue")} / {item.service}
                    <span className="status-pill">{item.state}</span>
                  </summary>
                  <p>{item.message}</p>
                  <form action={updatePromotion} className="stack">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="requestId" value={item.id} />
                    <label>
                      {es ? "Estado" : "State"}
                      <select name="state" defaultValue={item.state}>
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                      </select>
                    </label>
                    <label>
                      {es ? "Notas internas" : "Internal notes"}
                      <textarea
                        name="notes"
                        defaultValue={item.operator_notes || ""}
                      />
                    </label>
                    <button className="button" type="submit">
                      {es ? "Actualizar" : "Update"}
                    </button>
                  </form>
                </details>
              );
            })}
          </div>
        ) : (
          <WorkspaceEmpty
            title={es ? "Sin solicitudes" : "No requests"}
            description={
              es
                ? "Las solicitudes de negocio aparecerán aquí."
                : "Business requests will appear here."
            }
          />
        )}
      </section>
    </>
  );
}
