import { AdminSearchList } from "../AdminSearchList";
import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { createFeatureSlot, updatePromotion } from "../actions";

function madridInputValue(value?: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(new Date(value))
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}


const promotionServiceNames: Record<string, { es: string; en: string }> = {
  featured_listing: { es: "Local destacado", en: "Featured listing" },
  featured_event: { es: "Evento destacado", en: "Featured event" },
  sponsored_event: { es: "Evento patrocinado", en: "Sponsored event" },
  sponsored_listing: { es: "Local patrocinado", en: "Sponsored listing" },
};

const promotionStateNames: Record<string, { es: string; en: string }> = {
  new: { es: "Nueva", en: "New" },
  contacted: { es: "Contactada", en: "Contacted" },
  qualified: { es: "Cualificada", en: "Qualified" },
  won: { es: "Ganada", en: "Won" },
  lost: { es: "Perdida", en: "Lost" },
};

function promotionName(value: string, es: boolean, names: Record<string, { es: string; en: string }>) {
  const named = names[value];
  return named ? (es ? named.es : named.en) : value.replaceAll("_", " ");
}

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
          "id,venue_id,event_id,service,message,state,operator_notes,created_at,venues(name),events(title_es,title_en),feature_slots(starts_at,ends_at)",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("feature_slots")
        .select("id,event_id,label_en,label_es,starts_at,ends_at")
        .order("starts_at", { ascending: false })
        .limit(50),
      supabase
        .from("events")
        .select("id,venue_id,title_en,title_es")
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
        <p
          className={`notice ${query.updated ? "notice-success" : "notice-error"}`}
        >
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
        <AdminSearchList
          locale={locale}
          label={es ? "Destacados recientes" : "Recent feature slots"}
          items={(slots || []).map((slot) => ({
            id: slot.id,
            search: [
              eventNames.get(slot.event_id),
              slot.label_es,
              slot.label_en,
              slot.starts_at,
            ]
              .filter(Boolean)
              .join(" "),
            content: (
              <article className="panel settings-row">
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
            ),
          }))}
        />
      </section>

      <section className="workspace-section">
        <h3>{es ? "Solicitudes comerciales" : "Commercial requests"}</h3>
        <AdminSearchList
          locale={locale}
          label={es ? "Solicitudes comerciales" : "Commercial requests"}
          items={(requests || []).map((item) => {
            const venue = item.venues as unknown as {
              name?: string | null;
            } | null;
            const selectedEvent = item.events as unknown as {
              title_es?: string | null;
              title_en?: string | null;
            } | null;
            const rawRequestSlot = item.feature_slots as unknown;
            const requestSlot = (
              Array.isArray(rawRequestSlot) ? rawRequestSlot[0] : rawRequestSlot
            ) as { starts_at: string; ends_at: string } | null | undefined;

            return {
              id: item.id,
              status: item.state,
              search: [
                venue?.name,
                item.service,
                item.message,
                item.state,
                item.operator_notes,
                selectedEvent?.title_es,
                selectedEvent?.title_en,
              ]
                .filter(Boolean)
                .join(" "),
              content: (
                <details className="panel settings-row admin-promotion-request">
                  <summary className="admin-promotion-request-summary">
                    <span className="admin-promotion-request-identity">
                      <strong>{venue?.name || (es ? "Local sin nombre" : "Unnamed venue")}</strong>
                      <small>
                        {((es ? selectedEvent?.title_es : selectedEvent?.title_en) ||
                          selectedEvent?.title_es)
                          ? ((es ? selectedEvent?.title_es : selectedEvent?.title_en) ||
                              selectedEvent?.title_es)
                          : promotionName(item.service, es, promotionServiceNames)}
                      </small>
                    </span>
                    <span className={`status-pill admin-promotion-request-status admin-promotion-request-status--${item.state}`}>
                      {promotionName(item.state, es, promotionStateNames)}
                    </span>
                    <span className="admin-promotion-request-preview">
                      {item.message || (es ? "Sin mensaje adjunto" : "No message supplied")}
                    </span>
                    <span className="admin-promotion-request-footer">
                      <time dateTime={item.created_at}>
                        {new Intl.DateTimeFormat(es ? "es-ES" : "en-GB", {
                          dateStyle: "medium",
                          timeZone: "Europe/Madrid",
                        }).format(new Date(item.created_at))}
                      </time>
                      <span className="admin-promotion-request-open">
                        {es ? "Ver y gestionar" : "View and manage"}
                        <span aria-hidden="true">⌄</span>
                      </span>
                    </span>
                  </summary>
                  <div className="admin-promotion-request-detail">
                    <section className="admin-promotion-request-message">
                      <h4>{es ? "Mensaje del negocio" : "Business message"}</h4>
                      <p>{item.message || (es ? "Sin mensaje adjunto." : "No message supplied.")}</p>
                    </section>
                    <form action={updatePromotion} className="stack admin-promotion-request-form">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="requestId" value={item.id} />
                      <input type="hidden" name="service" value={item.service} />
                      <h4>{es ? "Gestionar solicitud" : "Manage request"}</h4>
                      <div className="admin-promotion-form-grid">
                        <label>
                          {es ? "Estado" : "Status"}
                          <select name="state" defaultValue={item.state}>
                            <option value="new">{es ? "Nueva" : "New"}</option>
                            <option value="contacted">{es ? "Contactada" : "Contacted"}</option>
                            <option value="qualified">{es ? "Cualificada" : "Qualified"}</option>
                            <option value="won">{es ? "Ganada" : "Won"}</option>
                            <option value="lost">{es ? "Perdida" : "Lost"}</option>
                          </select>
                        </label>
                        {item.service === "featured_listing" ? (
                          <label>
                            {es ? "Evento destacado" : "Featured event"}
                            <select name="eventId" defaultValue={item.event_id || ""} required>
                              <option value="" disabled>
                                {es ? "Selecciona un evento" : "Select an event"}
                              </option>
                              {(events || [])
                                .filter((event) => event.venue_id === item.venue_id)
                                .map((event) => (
                                  <option value={event.id} key={event.id}>
                                    {(es ? event.title_es : event.title_en) || event.title_es}
                                  </option>
                                ))}
                            </select>
                          </label>
                        ) : (
                          <>
                            <input type="hidden" name="eventId" value={item.event_id || ""} />
                            <input type="hidden" name="startsAt" value="" />
                            <input type="hidden" name="endsAt" value="" />
                          </>
                        )}
                      </div>
                      {item.service === "featured_listing" && (
                        <div className="admin-promotion-form-grid">
                          <label>
                            {es ? "Inicio del destacado" : "Feature starts"}
                            <input
                              type="datetime-local"
                              name="startsAt"
                              defaultValue={madridInputValue(requestSlot?.starts_at)}
                            />
                          </label>
                          <label>
                            {es ? "Fin del destacado" : "Feature ends"}
                            <input
                              type="datetime-local"
                              name="endsAt"
                              defaultValue={madridInputValue(requestSlot?.ends_at)}
                            />
                          </label>
                        </div>
                      )}
                      <label className="admin-promotion-request-notes">
                        {es ? "Notas internas" : "Internal notes"}
                        <textarea name="notes" rows={3} defaultValue={item.operator_notes || ""} />
                      </label>
                      <div className="admin-promotion-request-actions">
                        <button className="button primary" type="submit">
                          {es ? "Guardar cambios" : "Save changes"}
                        </button>
                      </div>
                    </form>
                  </div>
                </details>
              ),
            };
          })}
        />
      </section>
    </>
  );
}
