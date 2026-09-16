import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { SpainAddressAutocomplete } from "@/components/SpainAddressAutocomplete";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import {
  operatorDeleteCatalogueItem,
  operatorUpdateEvent,
  operatorUpdateVenue,
} from "../../actions";

const statuses = ["draft", "pending", "published", "rejected", "archived"];

export default async function StaffVenueRecord({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const query = await searchParams;
  const { supabase } = await requireUser(
    locale,
    `/${locale}/staff/catalogue/venues/${id}`,
  );
  const [{ data: venue }, { data: events }] = await Promise.all([
    supabase
      .from("venues")
      .select(
        "id,name,slug,description_es,description_en,address,status,verified",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("events")
      .select(
        "id,slug,title_es,title_en,description_es,description_en,price_cents,booking_url,status",
      )
      .eq("venue_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!venue) notFound();
  const es = locale === "es";

  const venueStatusClass =
    venue.status === "published"
      ? "badge-success"
      : venue.status === "pending"
        ? "badge-warning"
        : venue.status === "rejected" || venue.status === "archived"
          ? "badge-danger"
          : "badge-neutral";

  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Registro de catálogo" : "Catalogue record"}
        title={venue.name}
        description={`${venue.slug}`}
        actions={
          <>
            <span className={`status-pill ${venueStatusClass}`}>
              {venue.status}
            </span>
            <Link
              className="button secondary"
              href={`/${locale}/staff/catalogue?kind=venues`}
            >
              {es ? "← Volver a locales" : "← Back to venues"}
            </Link>
          </>
        }
      />
      {(query.updated || query.error) && (
        <p
          className={`notice ${query.updated ? "notice-success" : "notice-error"}`}
        >
          {query.updated
            ? es
              ? "✓ Cambio guardado y auditado con éxito."
              : "✓ Change saved and audited successfully."
            : es
              ? "✕ No se pudo guardar. Revisa los datos, el motivo y los permisos."
              : "✕ Could not save. Check the data, reason, and permissions."}
        </p>
      )}

      {/* Main Venue Edit Card */}
      <section className="panel catalogue-edit-card">
        <div className="catalogue-section-header">
          <h2>{es ? "Información del local" : "Venue details"}</h2>
          <p className="catalogue-section-sub">
            {es
              ? "Edita los detalles principales y el estado de publicación del local."
              : "Edit primary details and publishing status of the venue."}
          </p>
        </div>

        <form action={operatorUpdateVenue} className="stack focused-form">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="venueId" value={venue.id} />

          <div className="form-grid-two">
            <label>
              {es ? "Nombre del local" : "Venue name"}
              <input name="name" defaultValue={venue.name} required />
            </label>

            <SpainAddressAutocomplete
              locale={locale}
              mode="address"
              defaultValue={venue.address}
            />
          </div>

          <div className="form-grid-two">
            <label>
              {es ? "Descripción en español" : "Spanish description"}
              <textarea
                name="descriptionEs"
                defaultValue={venue.description_es}
                minLength={20}
                required
                rows={4}
              />
            </label>

            <label>
              {es ? "Descripción en inglés" : "English description"}
              <textarea
                name="descriptionEn"
                defaultValue={venue.description_en || ""}
                rows={4}
              />
            </label>
          </div>

          <div className="form-grid-two form-card-box">
            <label>
              {es ? "Estado de publicación" : "Publishing status"}
              <select name="status" defaultValue={venue.status}>
                {statuses.map((status) => (
                  <option value={status} key={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <div className="switch-control-group">
              <span className="switch-group-label">
                {es ? "Verificación de negocio" : "Business verification"}
              </span>
              <label className="switch-row">
                <input
                  name="verified"
                  type="checkbox"
                  defaultChecked={venue.verified}
                />
                <span>
                  {es
                    ? "Local verificado oficialmente"
                    : "Officially verified venue"}
                </span>
              </label>
            </div>
          </div>

          <label>
            {es
              ? "Motivo del cambio (auditoría obligatoria)"
              : "Change reason (audit log)"}
            <textarea
              name="reason"
              required
              minLength={10}
              maxLength={2000}
              placeholder={
                es
                  ? "Describe brevemente la razón de este cambio..."
                  : "Briefly describe the reason for this change..."
              }
              rows={2}
            />
          </label>

          <div className="form-actions-right">
            <button className="button primary" type="submit">
              {es ? "Guardar cambios del local" : "Save venue details"}
            </button>
          </div>
        </form>
      </section>

      {/* Events List Section */}
      <section className="queue-section">
        <div className="catalogue-section-header">
          <h2>{es ? "Eventos asociados" : "Associated events"}</h2>
          <p className="catalogue-section-sub">
            {es
              ? "Administra las actividades y eventos programados en este local."
              : "Manage activities and scheduled events for this venue."}
          </p>
        </div>

        {events && events.length > 0 ? (
          <div className="events-edit-list">
            {events.map((event) => {
              const eventStatusClass =
                event.status === "published"
                  ? "badge-success"
                  : event.status === "pending"
                    ? "badge-warning"
                    : event.status === "rejected" || event.status === "archived"
                      ? "badge-danger"
                      : "badge-neutral";

              const title =
                locale === "en"
                  ? event.title_en || event.title_es
                  : event.title_es;

              const priceLabel =
                event.price_cents > 0
                  ? `${(event.price_cents / 100).toFixed(2)} €`
                  : es
                    ? "Gratis"
                    : "Free";

              return (
                <details
                  className="panel catalogue-disclosure-card"
                  key={event.id}
                >
                  <summary className="catalogue-disclosure-summary">
                    <div className="disclosure-summary-main">
                      <strong>{title}</strong>
                      <span className="disclosure-sub">{priceLabel}</span>
                    </div>
                    <span className={`status-pill ${eventStatusClass}`}>
                      {event.status}
                    </span>
                  </summary>

                  <div className="disclosure-body">
                    <form
                      action={operatorUpdateEvent}
                      className="stack focused-form"
                    >
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="venueId" value={venue.id} />
                      <input type="hidden" name="eventId" value={event.id} />

                      <div className="form-grid-two">
                        <label>
                          {es ? "Título en español" : "Spanish title"}
                          <input
                            name="titleEs"
                            defaultValue={event.title_es}
                            required
                          />
                        </label>
                        <label>
                          {es ? "Título en inglés" : "English title"}
                          <input
                            name="titleEn"
                            defaultValue={event.title_en || ""}
                          />
                        </label>
                      </div>

                      <div className="form-grid-two">
                        <label>
                          {es
                            ? "Descripción en español"
                            : "Spanish description"}
                          <textarea
                            name="descriptionEs"
                            defaultValue={event.description_es}
                            required
                            minLength={20}
                            rows={3}
                          />
                        </label>
                        <label>
                          {es ? "Descripción en inglés" : "English description"}
                          <textarea
                            name="descriptionEn"
                            defaultValue={event.description_en || ""}
                            rows={3}
                          />
                        </label>
                      </div>

                      <div className="form-grid-three">
                        <label>
                          {es ? "Precio en céntimos" : "Price in cents"}
                          <input
                            name="priceCents"
                            type="number"
                            min={0}
                            max={1000000}
                            defaultValue={event.price_cents}
                            required
                          />
                        </label>
                        <label>
                          {es
                            ? "Enlace de reserva (HTTPS)"
                            : "HTTPS booking URL"}
                          <input
                            name="bookingUrl"
                            type="url"
                            defaultValue={event.booking_url || ""}
                            placeholder="https://"
                          />
                        </label>
                        <label>
                          {es ? "Estado" : "Status"}
                          <select name="status" defaultValue={event.status}>
                            {statuses.map((status) => (
                              <option value={status} key={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label>
                        {es ? "Motivo del cambio" : "Change reason"}
                        <textarea
                          name="reason"
                          required
                          minLength={10}
                          maxLength={2000}
                          rows={2}
                        />
                      </label>

                      <div className="form-actions-right">
                        <button className="button secondary" type="submit">
                          {es ? "Guardar evento" : "Save event"}
                        </button>
                      </div>
                    </form>

                    <div className="disclosure-danger-divider" />

                    <form
                      action={operatorDeleteCatalogueItem}
                      className="stack danger-box"
                    >
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="venueId" value={venue.id} />
                      <input type="hidden" name="targetType" value="event" />
                      <input type="hidden" name="targetId" value={event.id} />

                      <div className="form-grid-two">
                        <label>
                          {es ? "Motivo de eliminación" : "Deletion reason"}
                          <textarea
                            name="reason"
                            required
                            minLength={10}
                            rows={1}
                          />
                        </label>
                        <label>
                          {es
                            ? "Escribe DELETE para confirmar"
                            : "Type DELETE to confirm"}
                          <input
                            name="confirmation"
                            required
                            pattern="DELETE"
                            placeholder="DELETE"
                          />
                        </label>
                      </div>

                      <button className="button danger small-btn" type="submit">
                        {es
                          ? "Eliminar evento permanentemente"
                          : "Delete event permanently"}
                      </button>
                    </form>
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <div className="panel catalogue-empty-card">
            <p className="catalogue-empty-copy">
              {es
                ? "Este local no tiene eventos ni actividades registradas todavía."
                : "This venue has no registered events or activities yet."}
            </p>
          </div>
        )}
      </section>

      {/* Danger Zone Section */}
      <section className="panel catalogue-danger-card">
        <div className="catalogue-section-header">
          <h2>
            {es
              ? "Zona de peligro: Eliminar local"
              : "Danger zone: Delete venue"}
          </h2>
          <p className="catalogue-section-sub">
            {es
              ? "Esta acción eliminará de forma irreversible el local y todos sus eventos. El cambio quedará registrado en la auditoría."
              : "This action irreversibly deletes the venue and all its events. The change will be logged in the audit trail."}
          </p>
        </div>

        <form action={operatorDeleteCatalogueItem} className="stack">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="venueId" value={venue.id} />
          <input type="hidden" name="targetType" value="venue" />
          <input type="hidden" name="targetId" value={venue.id} />

          <div className="form-grid-two">
            <label>
              {es ? "Motivo de eliminación" : "Deletion reason"}
              <textarea
                name="reason"
                required
                minLength={10}
                placeholder={es ? "Explica el motivo..." : "Explain reason..."}
                rows={2}
              />
            </label>
            <label>
              {es
                ? "Confirmación (Escribe DELETE)"
                : "Confirmation (Type DELETE)"}
              <input
                name="confirmation"
                required
                pattern="DELETE"
                placeholder="DELETE"
              />
            </label>
          </div>

          <div className="form-actions-right">
            <button className="button danger" type="submit">
              {es
                ? "Eliminar local permanentemente"
                : "Permanently delete venue"}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
