import Link from "next/link";
import { notFound } from "next/navigation";
import { VenueQrCode } from "@/components/VenueQrCode";
import { requireBusinessAccess } from "@/lib/entitlements";
import { SpainAddressAutocomplete } from "@/components/SpainAddressAutocomplete";
import { config, isLocale } from "@/lib/config";
import {
  addOccurrence,
  addTeamMember,
  deleteEvent,
  deleteVenue,
  duplicateEvent,
  removeVenueImage,
  saveOffer,
  setRecurrence,
  updateEvent,
  updateOccurrence,
  updateVenue,
  updateVenueImageMetadata,
  uploadVenueImage,
} from "./actions";

function toMadridLocalInput(value: string) {
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

export default async function VenueWorkspace({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const query = await searchParams;
  const es = locale === "es";
  const { supabase, user } = await requireBusinessAccess(
    locale,
    `/${locale}/business/venue/${id}`,
  );
  const [
    { data: venue },
    { data: events },
    { data: offers },
    { data: members },
    { data: media },
    { data: program },
  ] = await Promise.all([
    supabase
      .from("venues")
      .select(
        "id,name,description_es,description_en,address,accessibility,contact_phone,whatsapp_phone,website_url,status,verified",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("events")
      .select(
        "id,slug,title_es,title_en,description_es,description_en,price_cents,booking_url,minimum_age,accessibility_notes_es,accessibility_notes_en,status,event_occurrences(id,starts_at,ends_at,status,booking_url)",
      )
      .eq("venue_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("offers")
      .select("id,title_es,title_en,starts_at,ends_at,status,audience")
      .eq("venue_id", id)
      .order("starts_at", { ascending: false }),
    supabase
      .from("venue_members")
      .select("profile_id,role,profiles(display_name)")
      .eq("venue_id", id),
    supabase
      .from("venue_media")
      .select("id,storage_path,alt_es,alt_en,mime_type,size_bytes,sort_order")
      .eq("venue_id", id)
      .order("sort_order"),
    supabase
      .from("loyalty_programs")
      .select("id,check_in_token,title_es,stamps_required")
      .eq("venue_id", id)
      .maybeSingle(),
  ]);
  if (!venue) notFound();
  const isOwner = members?.some(
    (member) => member.profile_id === user.id && member.role === "owner",
  );
  const checkInPath = program
    ? `/${locale}/check-in/${program.check_in_token}`
    : null;
  const checkInUrl = checkInPath
    ? new URL(checkInPath, config.siteUrl).toString()
    : null;
  return (
    <main className="shell dashboard">
      <section className="hero">
        <div className="eyebrow">
          {es ? "Espacio de negocio" : "Business workspace"}
        </div>
        <h1>{venue.name}</h1>
        <p className="lede">
          {venue.status} ·{" "}
          {venue.verified
            ? es
              ? "Verificado"
              : "Verified"
            : es
              ? "Pendiente de verificación"
              : "Awaiting verification"}
        </p>
        <Link className="back-link" href={`/${locale}/business`}>
          ← {es ? "Volver al panel" : "Back to dashboard"}
        </Link>
      </section>
      {(query.updated || query.error) && (
        <p className="notice">
          {query.updated
            ? es
              ? "Cambios guardados."
              : "Changes saved."
            : es
              ? "No se pudo guardar. Revisa los datos y permisos."
              : "Could not save. Check the data and permissions."}
        </p>
      )}
      <section className="dashboard-grid">
        <details className="panel" open>
          <summary>
            <strong>{es ? "Editar local" : "Edit venue"}</strong>
          </summary>
          <form action={updateVenue} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="venueId" value={id} />
            <label>
              {es ? "Nombre" : "Name"}
              <input name="name" defaultValue={venue.name} required />
            </label>
            <label>
              {es ? "Descripción" : "Spanish description"}
              <textarea
                name="descriptionEs"
                defaultValue={venue.description_es}
                required
                minLength={20}
              />
            </label>
            <label>
              {es ? "Descripción en inglés" : "English description"}
              <textarea
                name="descriptionEn"
                defaultValue={venue.description_en || ""}
              />
            </label>
            <SpainAddressAutocomplete
              locale={locale}
              mode="address"
              defaultValue={venue.address}
            />
            <label>
              {es ? "Teléfono público" : "Public phone"}
              <input
                name="contactPhone"
                type="tel"
                inputMode="tel"
                placeholder="+34600111222"
                pattern="\+[1-9][0-9]{7,14}"
                defaultValue={venue.contact_phone || ""}
              />
            </label>
            <label>
              WhatsApp
              <input
                name="whatsappPhone"
                type="tel"
                inputMode="tel"
                placeholder="+34600111222"
                pattern="\+[1-9][0-9]{7,14}"
                defaultValue={venue.whatsapp_phone || ""}
              />
            </label>
            <label>
              {es ? "Sitio web HTTPS" : "HTTPS website"}
              <input
                name="websiteUrl"
                type="url"
                placeholder="https://"
                defaultValue={venue.website_url || ""}
              />
            </label>
            <label>
              <input
                type="checkbox"
                name="accessible"
                defaultChecked={Boolean(
                  (venue.accessibility as { step_free?: boolean })?.step_free,
                )}
              />{" "}
              {es ? "Acceso sin escalones" : "Step-free access"}
            </label>
            <button className="button" type="submit">
              {es
                ? "Guardar y enviar a revisión"
                : "Save and submit for review"}
            </button>
          </form>
        </details>
        <details className="panel">
          <summary>
            <strong>{es ? "Añadir oferta" : "Add offer"}</strong>
          </summary>
          <form action={saveOffer} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="venueId" value={id} />
            <label>
              {es ? "Título" : "Spanish title"}
              <input name="titleEs" required />
            </label>
            <label>
              {es ? "Título en inglés" : "English title"}
              <input name="titleEn" />
            </label>
            <label>
              {es ? "Condiciones" : "Spanish terms"}
              <textarea name="termsEs" required minLength={10} />
            </label>
            <label>
              {es ? "Condiciones en inglés" : "English terms"}
              <textarea name="termsEn" />
            </label>
            <label>
              {es ? "Quién puede verla" : "Who can see it"}
              <select name="audience" defaultValue="public">
                <option value="public">
                  {es ? "Todo el mundo" : "Everyone"}
                </option>
                <option value="premium">
                  {es ? "Solo miembros Premium" : "Premium members only"}
                </option>
              </select>
            </label>
            <div className="two-col">
              <label>
                {es ? "Inicio" : "Starts"}
                <input type="datetime-local" name="startsAt" required />
              </label>
              <label>
                {es ? "Fin" : "Ends"}
                <input type="datetime-local" name="endsAt" required />
              </label>
            </div>
            <button className="button" type="submit">
              {es ? "Crear oferta" : "Create offer"}
            </button>
          </form>
          {offers?.map((offer) => (
            <div className="managed-row" key={offer.id}>
              <strong>
                {locale === "en"
                  ? offer.title_en || offer.title_es
                  : offer.title_es}
              </strong>
              <span>
                {offer.status} ·{" "}
                {offer.audience === "premium"
                  ? "Premium"
                  : es
                    ? "Pública"
                    : "Public"}
              </span>
            </div>
          ))}
        </details>
        <details className="panel">
          <summary>
            <strong>{es ? "Imágenes autorizadas" : "Authorised images"}</strong>
          </summary>
          <form
            action={uploadVenueImage}
            className="stack"
            encType="multipart/form-data"
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="venueId" value={id} />
            <label>
              {es
                ? "Imagen JPEG, PNG o WebP (máx. 10 MB)"
                : "JPEG, PNG or WebP image (max 10 MB)"}
              <input
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                required
              />
            </label>
            <label>
              {es ? "Texto alternativo en español" : "Spanish alternative text"}
              <input name="altEs" required minLength={3} maxLength={300} />
            </label>
            <label>
              {es ? "Texto alternativo en inglés" : "English alternative text"}
              <input name="altEn" maxLength={300} />
            </label>
            <label>
              {es ? "Orden de aparición" : "Display order"}
              <input
                name="sortOrder"
                type="number"
                min={0}
                max={10000}
                defaultValue={media?.length || 0}
                required
              />
            </label>
            <button className="button" type="submit">
              {es ? "Subir imagen" : "Upload image"}
            </button>
          </form>
          {media?.map((item) => (
            <div className="panel stack" key={item.id}>
              <form action={updateVenueImageMetadata} className="stack">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="venueId" value={id} />
                <input type="hidden" name="mediaId" value={item.id} />
                <label>
                  {es
                    ? "Texto alternativo en español"
                    : "Spanish alternative text"}
                  <input
                    name="altEs"
                    defaultValue={item.alt_es}
                    required
                    minLength={3}
                    maxLength={300}
                  />
                </label>
                <label>
                  {es
                    ? "Texto alternativo en inglés"
                    : "English alternative text"}
                  <input
                    name="altEn"
                    defaultValue={item.alt_en || ""}
                    maxLength={300}
                  />
                </label>
                <label>
                  {es ? "Orden de aparición" : "Display order"}
                  <input
                    name="sortOrder"
                    type="number"
                    min={0}
                    max={10000}
                    defaultValue={item.sort_order}
                    required
                  />
                </label>
                <span>{Math.round(item.size_bytes / 1024)} KB</span>
                <button className="button secondary" type="submit">
                  {es ? "Guardar imagen" : "Save image"}
                </button>
              </form>
              <form action={removeVenueImage}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="venueId" value={id} />
                <input type="hidden" name="mediaId" value={item.id} />
                <button className="text-button" type="submit">
                  {es ? "Eliminar" : "Remove"}
                </button>
              </form>
            </div>
          ))}
        </details>
        <details className="panel">
          <summary>
            <strong>{es ? "Equipo y permisos" : "Team and permissions"}</strong>
          </summary>
          {members?.map((member) => (
            <div className="managed-row" key={member.profile_id}>
              <strong>
                {(
                  member.profiles as unknown as {
                    display_name: string | null;
                  } | null
                )?.display_name || member.profile_id.slice(0, 8)}
              </strong>
              <span>{member.role}</span>
            </div>
          ))}
          <form action={addTeamMember} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="venueId" value={id} />
            <label>
              {es ? "ID del perfil" : "Profile ID"}
              <input name="profileId" required pattern="[0-9a-fA-F-]{36}" />
            </label>
            <label>
              {es ? "Permiso" : "Permission"}
              <select name="role">
                <option value="editor">Editor</option>
                <option value="manager">Manager</option>
              </select>
            </label>
            <button className="button" type="submit">
              {es ? "Añadir al equipo" : "Add team member"}
            </button>
          </form>
        </details>
        {isOwner && (
          <section className="panel console-card danger-zone">
            <h2>{es ? "Eliminar local" : "Delete venue"}</h2>
            <p>
              {es
                ? "Esto elimina tambien todos sus eventos, ofertas y programas. No se puede deshacer."
                : "This also deletes every event, offer and programme. It cannot be undone."}
            </p>
            <form action={deleteVenue} className="stack">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="venueId" value={id} />
              <label>
                {es ? "Motivo de eliminacion" : "Deletion reason"}
                <textarea
                  name="reason"
                  required
                  minLength={10}
                  maxLength={2000}
                />
              </label>
              <label>
                {es
                  ? "Escribe DELETE para confirmar"
                  : "Type DELETE to confirm"}
                <input name="confirmation" required pattern="DELETE" />
              </label>
              <button className="button danger" type="submit">
                {es
                  ? "Eliminar local definitivamente"
                  : "Delete venue permanently"}
              </button>
            </form>
          </section>
        )}
        {program && (
          <section className="panel">
            <h2>{es ? "Material de check-in" : "Check-in material"}</h2>
            <p>
              {program.title_es} · {program.stamps_required}{" "}
              {es ? "sellos" : "stamps"}
            </p>
            {checkInUrl && (
              <VenueQrCode
                value={checkInUrl}
                loadingLabel={es ? "Generando QR" : "Generating QR"}
                errorLabel={
                  es
                    ? "No se pudo generar el código QR."
                    : "The QR code could not be generated."
                }
                alt={
                  es
                    ? `Código QR de check-in para ${venue.name}`
                    : `Check-in QR code for ${venue.name}`
                }
              />
            )}
            <a className="button" href={checkInPath || undefined}>
              {es ? "Probar destino del QR" : "Test QR destination"}
            </a>
            <p className="muted">
              {es
                ? "Descarga o imprime este código y colócalo donde el personal pueda supervisar los check-ins."
                : "Download or print this code and place it where staff can supervise check-ins."}
            </p>
          </section>
        )}
      </section>
      <section className="queue-section">
        <h2>{es ? "Eventos" : "Events"}</h2>
        {events?.length ? (
          events.map((event) => (
            <article className="panel queue-card" key={event.id}>
              <h3>
                {locale === "en"
                  ? event.title_en || event.title_es
                  : event.title_es}
              </h3>
              <p>
                {event.status} · /{event.slug}
              </p>
              <details>
                <summary>{es ? "Editar" : "Edit"}</summary>
                <form action={updateEvent} className="stack">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={id} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <label>
                    {es ? "Título" : "Spanish title"}
                    <input
                      name="titleEs"
                      defaultValue={event.title_es}
                      required
                    />
                  </label>
                  <label>
                    {es ? "Título en inglés" : "English title"}
                    <input name="titleEn" defaultValue={event.title_en || ""} />
                  </label>
                  <label>
                    {es ? "Descripción" : "Spanish description"}
                    <textarea
                      name="descriptionEs"
                      defaultValue={event.description_es}
                      required
                    />
                  </label>
                  <label>
                    {es ? "Descripción en inglés" : "English description"}
                    <textarea
                      name="descriptionEn"
                      defaultValue={event.description_en || ""}
                    />
                  </label>
                  <label>
                    {es ? "Precio en céntimos" : "Price in cents"}
                    <input
                      name="priceCents"
                      type="number"
                      min="0"
                      defaultValue={event.price_cents}
                    />
                  </label>
                  <label>
                    {es ? "Enlace de reserva" : "Booking link"}
                    <input
                      name="bookingUrl"
                      type="url"
                      defaultValue={event.booking_url || ""}
                    />
                  </label>
                  <label>
                    {es ? "Edad mínima (opcional)" : "Minimum age (optional)"}
                    <input
                      name="minimumAge"
                      type="number"
                      min="0"
                      max="99"
                      defaultValue={event.minimum_age ?? ""}
                    />
                  </label>
                  <label>
                    {es
                      ? "Información de accesibilidad"
                      : "Spanish accessibility information"}
                    <textarea
                      name="accessibilityNotesEs"
                      maxLength={1000}
                      defaultValue={event.accessibility_notes_es || ""}
                    />
                  </label>
                  <label>
                    {es
                      ? "Accesibilidad en inglés"
                      : "English accessibility information"}
                    <textarea
                      name="accessibilityNotesEn"
                      maxLength={1000}
                      defaultValue={event.accessibility_notes_en || ""}
                    />
                  </label>
                  <button className="button" type="submit">
                    {es ? "Guardar evento" : "Save event"}
                  </button>
                </form>
              </details>
              {event.event_occurrences?.length ? (
                <details>
                  <summary>
                    {es ? "Gestionar fechas" : "Manage occurrences"}
                  </summary>
                  <div className="stack">
                    {event.event_occurrences.map((occurrence) => (
                      <form
                        action={updateOccurrence}
                        className="panel stack"
                        key={occurrence.id}
                      >
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="venueId" value={id} />
                        <input type="hidden" name="eventId" value={event.id} />
                        <input
                          type="hidden"
                          name="occurrenceId"
                          value={occurrence.id}
                        />
                        <div className="two-col">
                          <label>
                            {es ? "Inicio" : "Starts"}
                            <input
                              name="startsAt"
                              type="datetime-local"
                              defaultValue={toMadridLocalInput(
                                occurrence.starts_at,
                              )}
                              required
                            />
                          </label>
                          <label>
                            {es ? "Fin" : "Ends"}
                            <input
                              name="endsAt"
                              type="datetime-local"
                              defaultValue={toMadridLocalInput(
                                occurrence.ends_at,
                              )}
                              required
                            />
                          </label>
                        </div>
                        <label>
                          {es ? "Estado" : "Status"}
                          <select
                            name="status"
                            defaultValue={occurrence.status}
                          >
                            <option value="scheduled">
                              {es ? "Programado" : "Scheduled"}
                            </option>
                            <option value="postponed">
                              {es ? "Aplazado" : "Postponed"}
                            </option>
                            <option value="sold_out">
                              {es ? "Agotado" : "Sold out"}
                            </option>
                            <option value="cancelled">
                              {es ? "Cancelado" : "Cancelled"}
                            </option>
                          </select>
                        </label>
                        <label>
                          {es
                            ? "Enlace de reserva para esta fecha"
                            : "Booking link for this occurrence"}
                          <input
                            name="bookingUrl"
                            type="url"
                            placeholder="https://"
                            defaultValue={occurrence.booking_url || ""}
                          />
                        </label>
                        <button className="button secondary" type="submit">
                          {es ? "Guardar fecha" : "Save occurrence"}
                        </button>
                      </form>
                    ))}
                  </div>
                </details>
              ) : null}
              <details>
                <summary>
                  {es ? "Configurar repetición" : "Set recurrence"}
                </summary>
                <form action={setRecurrence} className="stack">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={id} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <div className="two-col">
                    <label>
                      {es ? "Primera fecha" : "First start"}
                      <input name="startsAt" type="datetime-local" required />
                    </label>
                    <label>
                      {es ? "Primera fecha de fin" : "First end"}
                      <input name="endsAt" type="datetime-local" required />
                    </label>
                  </div>
                  <div className="two-col">
                    <label>
                      {es ? "Frecuencia" : "Frequency"}
                      <select name="frequency" defaultValue="weekly">
                        <option value="daily">{es ? "Diaria" : "Daily"}</option>
                        <option value="weekly">
                          {es ? "Semanal" : "Weekly"}
                        </option>
                      </select>
                    </label>
                    <label>
                      {es ? "Cada" : "Every"}
                      <input
                        name="interval"
                        type="number"
                        min="1"
                        max="12"
                        defaultValue="1"
                        required
                      />
                    </label>
                  </div>
                  <label>
                    {es ? "Número de fechas" : "Number of occurrences"}
                    <input
                      name="occurrences"
                      type="number"
                      min="2"
                      max="52"
                      defaultValue="4"
                      required
                    />
                  </label>
                  <p className="fine-print">
                    {es
                      ? "Las fechas ya existentes no se duplicarán."
                      : "Existing dates will not be duplicated."}
                  </p>
                  <button className="button" type="submit">
                    {es ? "Crear repetición" : "Create recurrence"}
                  </button>
                </form>
              </details>
              <details>
                <summary>{es ? "Añadir fecha" : "Add occurrence"}</summary>
                <form action={addOccurrence} className="stack">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={id} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <div className="two-col">
                    <label>
                      {es ? "Inicio" : "Starts"}
                      <input name="startsAt" type="datetime-local" required />
                    </label>
                    <label>
                      {es ? "Fin" : "Ends"}
                      <input name="endsAt" type="datetime-local" required />
                    </label>
                  </div>
                  <button className="button" type="submit">
                    {es ? "Añadir fecha" : "Add occurrence"}
                  </button>
                </form>
              </details>
              <details>
                <summary>{es ? "Duplicar" : "Duplicate"}</summary>
                <form action={duplicateEvent} className="stack">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={id} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <label>
                    Slug
                    <input
                      name="slug"
                      required
                      pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                      defaultValue={`${event.slug}-copia`}
                    />
                  </label>
                  <button className="button secondary" type="submit">
                    {es ? "Crear borrador duplicado" : "Create duplicate draft"}
                  </button>
                </form>
              </details>
              <details className="danger-zone">
                <summary>{es ? "Eliminar evento" : "Delete event"}</summary>
                <form action={deleteEvent} className="stack">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={id} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <label>
                    {es ? "Motivo de eliminacion" : "Deletion reason"}
                    <textarea
                      name="reason"
                      required
                      minLength={10}
                      maxLength={2000}
                    />
                  </label>
                  <label>
                    {es
                      ? "Escribe DELETE para confirmar"
                      : "Type DELETE to confirm"}
                    <input name="confirmation" required pattern="DELETE" />
                  </label>
                  <button className="button danger" type="submit">
                    {es ? "Eliminar evento" : "Delete event"}
                  </button>
                </form>
              </details>
            </article>
          ))
        ) : (
          <p className="notice">
            {es
              ? "Crea tu primer evento desde el panel principal."
              : "Create your first event from the main dashboard."}
          </p>
        )}
      </section>
    </main>
  );
}
