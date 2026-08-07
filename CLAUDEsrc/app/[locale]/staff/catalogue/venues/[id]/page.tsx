import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
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

  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Registro de catalogo" : "Catalogue record"}
        title={venue.name}
        description={`${venue.slug} / ${venue.status}`}
        actions={
          <Link
            className="button secondary"
            href={`/${locale}/staff/catalogue?kind=venues`}
          >
            {es ? "Volver a locales" : "Back to venues"}
          </Link>
        }
      />
      {(query.updated || query.error) && (
        <p className="notice">
          {query.updated
            ? es
              ? "Cambio guardado y auditado."
              : "Change saved and audited."
            : es
              ? "No se pudo guardar. Revisa los datos, el motivo y los permisos."
              : "Could not save. Check the data, reason, and permissions."}
        </p>
      )}
      <section className="panel console-card">
        <h2>{es ? "Editar local" : "Edit venue"}</h2>
        <form action={operatorUpdateVenue} className="stack focused-form">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="venueId" value={venue.id} />
          <label>
            {es ? "Nombre" : "Name"}
            <input name="name" defaultValue={venue.name} required />
          </label>
          <label>
            {es ? "Descripcion en espanol" : "Spanish description"}
            <textarea
              name="descriptionEs"
              defaultValue={venue.description_es}
              minLength={20}
              required
            />
          </label>
          <label>
            {es ? "Descripcion en ingles" : "English description"}
            <textarea
              name="descriptionEn"
              defaultValue={venue.description_en || ""}
            />
          </label>
          <label>
            {es ? "Direccion" : "Address"}
            <input name="address" defaultValue={venue.address} required />
          </label>
          <label>
            {es ? "Estado" : "Status"}
            <select name="status" defaultValue={venue.status}>
              {statuses.map((status) => (
                <option value={status} key={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="switch-row">
            <input
              name="verified"
              type="checkbox"
              defaultChecked={venue.verified}
            />
            <span>{es ? "Local verificado" : "Verified venue"}</span>
          </label>
          <label>
            {es ? "Motivo del cambio" : "Change reason"}
            <textarea name="reason" required minLength={10} maxLength={2000} />
          </label>
          <button className="button" type="submit">
            {es ? "Guardar local" : "Save venue"}
          </button>
        </form>
      </section>

      <section className="queue-section">
        <h2>{es ? "Eventos del local" : "Venue events"}</h2>
        {(events || []).map((event) => (
          <details className="panel console-card" key={event.id}>
            <summary>
              <strong>
                {locale === "en"
                  ? event.title_en || event.title_es
                  : event.title_es}
              </strong>
              <span className="status-pill">{event.status}</span>
            </summary>
            <form action={operatorUpdateEvent} className="stack focused-form">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="venueId" value={venue.id} />
              <input type="hidden" name="eventId" value={event.id} />
              <label>
                {es ? "Titulo en espanol" : "Spanish title"}
                <input name="titleEs" defaultValue={event.title_es} required />
              </label>
              <label>
                {es ? "Titulo en ingles" : "English title"}
                <input name="titleEn" defaultValue={event.title_en || ""} />
              </label>
              <label>
                {es ? "Descripcion en espanol" : "Spanish description"}
                <textarea
                  name="descriptionEs"
                  defaultValue={event.description_es}
                  required
                  minLength={20}
                />
              </label>
              <label>
                {es ? "Descripcion en ingles" : "English description"}
                <textarea
                  name="descriptionEn"
                  defaultValue={event.description_en || ""}
                />
              </label>
              <label>
                {es ? "Precio en centimos" : "Price in cents"}
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
                {es ? "Reserva HTTPS" : "HTTPS booking URL"}
                <input
                  name="bookingUrl"
                  type="url"
                  defaultValue={event.booking_url || ""}
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
              <label>
                {es ? "Motivo del cambio" : "Change reason"}
                <textarea
                  name="reason"
                  required
                  minLength={10}
                  maxLength={2000}
                />
              </label>
              <button className="button secondary" type="submit">
                {es ? "Guardar evento" : "Save event"}
              </button>
            </form>
            <form
              action={operatorDeleteCatalogueItem}
              className="stack danger-zone"
            >
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="venueId" value={venue.id} />
              <input type="hidden" name="targetType" value="event" />
              <input type="hidden" name="targetId" value={event.id} />
              <label>
                {es ? "Motivo de eliminacion" : "Deletion reason"}
                <textarea name="reason" required minLength={10} />
              </label>
              <label>
                {es ? "Escribe DELETE" : "Type DELETE"}
                <input name="confirmation" required pattern="DELETE" />
              </label>
              <button className="button danger" type="submit">
                {es ? "Eliminar evento" : "Delete event"}
              </button>
            </form>
          </details>
        ))}
      </section>

      <section className="panel console-card danger-zone">
        <h2>{es ? "Eliminar local" : "Delete venue"}</h2>
        <p>
          {es
            ? "Elimina el local y su catalogo relacionado. Esta accion queda auditada."
            : "Deletes the venue and its related catalogue. This action is audited."}
        </p>
        <form action={operatorDeleteCatalogueItem} className="stack">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="venueId" value={venue.id} />
          <input type="hidden" name="targetType" value="venue" />
          <input type="hidden" name="targetId" value={venue.id} />
          <label>
            {es ? "Motivo de eliminacion" : "Deletion reason"}
            <textarea name="reason" required minLength={10} />
          </label>
          <label>
            {es ? "Escribe DELETE" : "Type DELETE"}
            <input name="confirmation" required pattern="DELETE" />
          </label>
          <button className="button danger" type="submit">
            {es ? "Eliminar local" : "Delete venue"}
          </button>
        </form>
      </section>
    </>
  );
}
