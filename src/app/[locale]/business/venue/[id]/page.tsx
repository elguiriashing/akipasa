/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { VenueDashboard } from "@/components/VenueDashboard";
import { getVenueDashboardSection } from "@/lib/venue-dashboard";
import { notFound } from "next/navigation";
import { VenueQrCode } from "@/components/VenueQrCode";
import { requireBusinessAccess } from "@/lib/entitlements";
import { SpainAddressAutocomplete } from "@/components/SpainAddressAutocomplete";
import { config, isLocale } from "@/lib/config";
import {
  addOccurrence,
  addTeamMember,
  assignReward,
  createBookingSlot,
  createBusinessReward,
  createCheckInCredential,
  createStampCard,
  deleteEvent,
  deleteVenue,
  duplicateEvent,
  redeemRewardClaim,
  removeVenueImage,
  saveBookingSettings,
  saveOffer,
  setRecurrence,
  updateEvent,
  updateBookingRequest,
  updateOccurrence,
  updateVenue,
  updateVenueImageMetadata,
  unclaimVenue,
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
    { data: programs },
    { data: credentials },
    { data: rewards },
    { data: passportOptions },
    { data: bookingSettings },
    { data: bookingSlots },
    { data: bookingRequests },
    { data: audience },
  ] = await Promise.all([
    supabase
      .from("venues")
      .select(
        "id,name,slug,description_es,description_en,address,accessibility,contact_phone,whatsapp_phone,website_url,status,verified",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("events")
      .select(
        "id,slug,title_es,title_en,description_es,description_en,price_cents,booking_url,minimum_age,accessibility_notes_es,accessibility_notes_en,status,event_occurrences!event_occurrences_event_id_fkey(id,starts_at,ends_at,status,booking_url)",
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
      .select(
        "id,title_es,title_en,reward_es,reward_en,stamps_required,active,loyalty_program_rewards(reward_id)",
      )
      .eq("venue_id", id)
      .order("stamps_required"),
    supabase
      .from("venue_checkin_credentials")
      .select("id,token,label,active")
      .eq("venue_id", id)
      .eq("active", true),
    supabase
      .from("business_rewards")
      .select(
        "id,title_es,title_en,description_es,description_en,claim_window_days,active",
      )
      .eq("venue_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("passports")
      .select("id,title_es,title_en,passport_steps!inner(venue_id)")
      .eq("passport_steps.venue_id", id)
      .eq("status", "published"),
    supabase
      .from("venue_booking_settings")
      .select(
        "mode,requires_deposit,deposit_cents,instructions_es,instructions_en,active",
      )
      .eq("venue_id", id)
      .maybeSingle(),
    supabase
      .from("venue_availability_slots")
      .select("id,starts_at,ends_at,capacity,active")
      .eq("venue_id", id)
      .order("starts_at"),
    supabase
      .from("booking_requests")
      .select(
        "id,party_size,contact_name,contact_email,contact_phone,notes,status,created_at,venue_availability_slots(starts_at,ends_at)",
      )
      .eq("venue_id", id)
      .order("created_at", { ascending: false }),
    supabase.rpc("venue_event_audience_summary", { p_venue: id }),
  ]);
  if (!venue) notFound();
  const isOwner = members?.some(
    (member) => member.profile_id === user.id && member.role === "owner",
  );
  const primaryCredential = credentials?.[0];
  const checkInPath = primaryCredential
    ? `/${locale}/check-in/${primaryCredential.token}`
    : null;
  const checkInUrl = checkInPath
    ? new URL(checkInPath, config.siteUrl).toString()
    : null;
  return (
    <VenueDashboard
      key={`${query.section || "overview"}:${query.updated || ""}:${query.error || ""}`}
      locale={locale}
      name={venue.name}
      status={venue.status}
      verified={venue.verified}
      publicHref={
        venue.status === "published" && venue.slug
          ? `/${locale}/venues/${venue.slug}`
          : undefined
      }
      initialSection={getVenueDashboardSection(query)}
      feedback={query.error ? "error" : query.updated ? "success" : undefined}
      counts={{
        photos: media?.length || 0,
        events: events?.length || 0,
        programs: programs?.filter((program) => program.active).length || 0,
        credentials: credentials?.length || 0,
        requests:
          bookingRequests?.filter((request) => request.status === "requested")
            .length || 0,
        members: members?.length || 0,
      }}
      sections={{
        profile: (
          <>
            <section className="panel">
              <h2>{es ? "Datos del local" : "Venue details"}</h2>
              <form action={updateVenue} className="stack">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="venueId" value={id} />
                <div className="venue-form-columns">
                  <div className="stack">
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
                    <details>
                      <summary>
                        {es ? "Traducción al inglés" : "English translation"}
                      </summary>
                      <label>
                        {es ? "Descripción en inglés" : "English description"}
                        <textarea
                          name="descriptionEn"
                          defaultValue={venue.description_en || ""}
                        />
                      </label>
                    </details>
                  </div>
                  <div className="stack">
                    <SpainAddressAutocomplete
                      locale={locale}
                      mode="address"
                      defaultValue={venue.address}
                    />
                    <div className="two-col">
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
                    </div>
                    <label>
                      {es ? "Sitio web HTTPS" : "HTTPS website"}
                      <input
                        name="websiteUrl"
                        type="url"
                        placeholder="https://"
                        defaultValue={venue.website_url || ""}
                      />
                    </label>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        name="accessible"
                        defaultChecked={Boolean(
                          (venue.accessibility as { step_free?: boolean })
                            ?.step_free,
                        )}
                      />{" "}
                      {es ? "Acceso sin escalones" : "Step-free access"}
                    </label>
                  </div>
                </div>
                <button className="button" type="submit">
                  {es
                    ? "Guardar y enviar a revisión"
                    : "Save and submit for review"}
                </button>
              </form>
            </section>
            <details className="panel">
              <summary>
                <strong>{es ? "Fotos del local" : "Venue photos"}</strong>
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
                  {es
                    ? "Texto alternativo en español"
                    : "Spanish alternative text"}
                  <input name="altEs" required minLength={3} maxLength={300} />
                </label>
                <label>
                  {es
                    ? "Texto alternativo en inglés"
                    : "English alternative text"}
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
                <details className="panel" key={item.id}>
                  <summary>{item.alt_es}</summary>
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
                </details>
              ))}
            </details>
          </>
        ),
        events: (
          <>
            <div>
              <Link
                className="button event-create-action"
                href={`/${locale}/business?view=events`}
              >
                {es ? "Crear evento" : "Create event"}
                <Icon name="arrow-right" />
              </Link>
              {events?.length ? (
                events.map((event) => (
                  <details
                    id={`event-${event.id}`}
                    className="panel"
                    name="venue-event"
                    data-event-card
                    key={event.id}
                  >
                    <summary>
                      <span className="event-heading">
                        <strong>
                          {locale === "en"
                            ? event.title_en || event.title_es
                            : event.title_es}
                        </strong>
                        <small>
                          {event.status} ·{" "}
                          {event.event_occurrences?.length || 0}{" "}
                          {event.event_occurrences?.length === 1
                            ? es
                              ? "fecha"
                              : "date"
                            : es
                              ? "fechas"
                              : "dates"}
                        </small>
                      </span>
                    </summary>
                    <div className="event-editor">
                      <details>
                        <summary>{es ? "Editar" : "Edit"}</summary>
                        <form action={updateEvent} className="stack">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="venueId" value={id} />
                          <input
                            type="hidden"
                            name="eventId"
                            value={event.id}
                          />
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
                            <input
                              name="titleEn"
                              defaultValue={event.title_en || ""}
                            />
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
                            {es
                              ? "Descripción en inglés"
                              : "English description"}
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
                            {es
                              ? "Edad mínima (opcional)"
                              : "Minimum age (optional)"}
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
                                <input
                                  type="hidden"
                                  name="locale"
                                  value={locale}
                                />
                                <input
                                  type="hidden"
                                  name="venueId"
                                  value={id}
                                />
                                <input
                                  type="hidden"
                                  name="eventId"
                                  value={event.id}
                                />
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
                                <button
                                  className="button secondary"
                                  type="submit"
                                >
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
                          <input
                            type="hidden"
                            name="eventId"
                            value={event.id}
                          />
                          <div className="two-col">
                            <label>
                              {es ? "Primera fecha" : "First start"}
                              <input
                                name="startsAt"
                                type="datetime-local"
                                required
                              />
                            </label>
                            <label>
                              {es ? "Primera fecha de fin" : "First end"}
                              <input
                                name="endsAt"
                                type="datetime-local"
                                required
                              />
                            </label>
                          </div>
                          <div className="two-col">
                            <label>
                              {es ? "Frecuencia" : "Frequency"}
                              <select name="frequency" defaultValue="weekly">
                                <option value="daily">
                                  {es ? "Diaria" : "Daily"}
                                </option>
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
                        <summary>
                          {es ? "Añadir fecha" : "Add occurrence"}
                        </summary>
                        <form action={addOccurrence} className="stack">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="venueId" value={id} />
                          <input
                            type="hidden"
                            name="eventId"
                            value={event.id}
                          />
                          <div className="two-col">
                            <label>
                              {es ? "Inicio" : "Starts"}
                              <input
                                name="startsAt"
                                type="datetime-local"
                                required
                              />
                            </label>
                            <label>
                              {es ? "Fin" : "Ends"}
                              <input
                                name="endsAt"
                                type="datetime-local"
                                required
                              />
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
                          <input
                            type="hidden"
                            name="eventId"
                            value={event.id}
                          />
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
                            {es
                              ? "Crear borrador duplicado"
                              : "Create duplicate draft"}
                          </button>
                        </form>
                      </details>
                      <details className="danger-zone">
                        <summary>
                          {es ? "Eliminar evento" : "Delete event"}
                        </summary>
                        <form action={deleteEvent} className="stack">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="venueId" value={id} />
                          <input
                            type="hidden"
                            name="eventId"
                            value={event.id}
                          />
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
                            <input
                              name="confirmation"
                              required
                              pattern="DELETE"
                            />
                          </label>
                          <button className="button danger" type="submit">
                            {es ? "Eliminar evento" : "Delete event"}
                          </button>
                        </form>
                      </details>
                    </div>
                  </details>
                ))
              ) : (
                <p className="notice">
                  {es
                    ? "Crea tu primer evento desde el panel principal."
                    : "Create your first event from the main dashboard."}
                </p>
              )}
            </div>
            <details className="panel">
              <summary>
                {es ? "Audiencia de eventos" : "Event audience"}
              </summary>
              <p>
                {es
                  ? "Los desgloses demograficos solo aparecen con al menos 5 asistentes."
                  : "Demographic breakdowns only appear with at least 5 attendees."}
              </p>
              <div className="managed-list">
                {(audience || []).map((row: any) => {
                  const event = (events || []).find(
                    (item: any) => item.id === row.event_id,
                  );
                  return (
                    <div className="managed-row" key={row.event_id}>
                      <div>
                        <strong>
                          {event
                            ? locale === "en"
                              ? event.title_en || event.title_es
                              : event.title_es
                            : row.event_id}
                        </strong>
                        <span>
                          {row.going_count} {es ? "personas van" : "going"}
                        </span>
                      </div>
                      <span className="status-pill">
                        {Object.keys(row.age_bands || {}).length
                          ? es
                            ? "Desglose disponible"
                            : "Breakdown available"
                          : es
                            ? "Privacidad protegida"
                            : "Privacy protected"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </details>
          </>
        ),
        rewards: (
          <>
            <section className="panel loyalty-workbench">
              <h2>{es ? "Sellos y recompensas" : "Stamps and rewards"}</h2>
              <p>
                {es
                  ? "Un solo check-in suma en todas las tarjetas activas y en los pasaportes que el cliente haya iniciado."
                  : "One check-in credits every active stamp card and each passport the customer has started."}
              </p>
              <div className="reward-card-list">
                {(programs || []).map((program: any) => (
                  <article className="stamp-card" key={program.id}>
                    <span className="status-pill">
                      {program.stamps_required} {es ? "sellos" : "stamps"}
                    </span>
                    <h3>
                      {locale === "en"
                        ? program.title_en || program.title_es
                        : program.title_es}
                    </h3>
                    <p>
                      {locale === "en"
                        ? program.reward_en || program.reward_es
                        : program.reward_es}
                    </p>
                  </article>
                ))}
              </div>
              <details>
                <summary>
                  {es ? "Crear tarjeta de sellos" : "Create stamp card"}
                </summary>
                <form action={createStampCard} className="stack">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={id} />
                  <div className="two-col">
                    <label>
                      {es ? "Titulo" : "Title"}
                      <input name="titleEs" required minLength={3} />
                    </label>
                    <label>
                      {es ? "Titulo ingles" : "English title"}
                      <input name="titleEn" />
                    </label>
                  </div>
                  <div className="two-col">
                    <label>
                      {es ? "Premio resumido" : "Reward summary"}
                      <input name="rewardEs" required minLength={3} />
                    </label>
                    <label>
                      {es ? "Premio ingles" : "English reward"}
                      <input name="rewardEn" />
                    </label>
                  </div>
                  <label>
                    {es ? "Check-ins necesarios" : "Check-ins required"}
                    <input
                      name="stampsRequired"
                      type="number"
                      min="2"
                      max="50"
                      defaultValue="5"
                      required
                    />
                  </label>
                  <button className="button" type="submit">
                    {es ? "Crear tarjeta" : "Create card"}
                  </button>
                </form>
              </details>
              <details>
                <summary>{es ? "Crear recompensa" : "Create reward"}</summary>
                <form action={createBusinessReward} className="stack">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={id} />
                  <div className="two-col">
                    <label>
                      {es ? "Nombre" : "Name"}
                      <input name="titleEs" required />
                    </label>
                    <label>
                      {es ? "Nombre ingles" : "English name"}
                      <input name="titleEn" />
                    </label>
                  </div>
                  <label>
                    {es ? "Descripcion y condiciones" : "Description and terms"}
                    <textarea name="descriptionEs" required />
                  </label>
                  <label>
                    {es ? "Descripcion inglesa" : "English description"}
                    <textarea name="descriptionEn" />
                  </label>
                  <label>
                    {es ? "Dias para canjear" : "Days to redeem"}
                    <input
                      name="claimWindowDays"
                      type="number"
                      min="1"
                      max="365"
                      defaultValue="30"
                      required
                    />
                  </label>
                  <button className="button" type="submit">
                    {es ? "Crear recompensa" : "Create reward"}
                  </button>
                </form>
              </details>
              {!!rewards?.length && (
                <details>
                  <summary>
                    {es ? "Asignar recompensa" : "Assign reward"}
                  </summary>
                  <form action={assignReward} className="stack">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="venueId" value={id} />
                    <label>
                      {es ? "Recompensa" : "Reward"}
                      <select name="rewardId" required>
                        {rewards.map((reward: any) => (
                          <option value={reward.id} key={reward.id}>
                            {locale === "en"
                              ? reward.title_en || reward.title_es
                              : reward.title_es}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {es ? "Tipo" : "Type"}
                      <select name="targetType">
                        <option value="stamp">
                          {es ? "Tarjeta de sellos" : "Stamp card"}
                        </option>
                        <option value="passport">
                          {es ? "Pasaporte" : "Passport"}
                        </option>
                      </select>
                    </label>
                    <label>
                      {es ? "Tarjeta o pasaporte" : "Card or passport"}
                      <select name="targetId" required>
                        {(programs || []).map((program: any) => (
                          <option value={program.id} key={program.id}>
                            {es ? "Sellos" : "Stamps"}: {program.title_es}
                          </option>
                        ))}
                        {(passportOptions || []).map((passport: any) => (
                          <option value={passport.id} key={passport.id}>
                            {es ? "Pasaporte" : "Passport"}:{" "}
                            {locale === "en"
                              ? passport.title_en || passport.title_es
                              : passport.title_es}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {es ? "Nivel" : "Tier"}
                      <select name="accessTier">
                        <option value="free">
                          {es ? "Todos" : "Everyone"}
                        </option>
                        <option value="premium">Premium</option>
                      </select>
                    </label>
                    <button className="button secondary" type="submit">
                      {es ? "Asignar" : "Assign"}
                    </button>
                  </form>
                </details>
              )}
            </section>
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
          </>
        ),
        checkin: (
          <div className="venue-tool-columns">
            <section className="panel">
              <h2>{es ? "Material de check-in" : "Check-in material"}</h2>
              <p>
                {es
                  ? "QR supervisado con geovalla. NFC puede apuntar a la misma URL."
                  : "Supervised geofenced QR. An NFC tag can point to the same URL."}
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
              {checkInPath && (
                <a className="button secondary" href={checkInPath}>
                  {es ? "Probar destino del QR" : "Test QR destination"}
                </a>
              )}
              <p className="muted">
                {es
                  ? "Descarga o imprime este código y colócalo donde el personal pueda supervisar los check-ins."
                  : "Download or print this code and place it where staff can supervise check-ins."}
              </p>
              <details open={!primaryCredential}>
                <summary>{es ? "Crear QR / NFC" : "Create QR / NFC"}</summary>
                <form action={createCheckInCredential} className="inline-form">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={id} />
                  <input
                    name="label"
                    aria-label={es ? "Ubicación del QR" : "QR location"}
                    placeholder={es ? "Barra principal" : "Main counter"}
                    required
                  />
                  <button className="button secondary" type="submit">
                    {es ? "Nuevo QR / NFC" : "New QR / NFC"}
                  </button>
                </form>
              </details>
            </section>
            <section className="panel">
              <h2>{es ? "Canjear recompensa" : "Redeem a reward"}</h2>
              <form
                action={redeemRewardClaim}
                className="stack redemption-form"
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="venueId" value={id} />
                <label>
                  {es
                    ? "Codigo de recompensa del cliente"
                    : "Customer reward code"}
                  <input
                    name="claimCode"
                    autoComplete="off"
                    required
                    placeholder="00000000-0000-0000-0000-000000000000"
                  />
                </label>
                <button className="button" type="submit">
                  {es ? "Validar y canjear" : "Validate and redeem"}
                </button>
              </form>
            </section>
          </div>
        ),
        bookings: (
          <>
            <section className="panel booking-workbench">
              <h2>{es ? "Reservas" : "Bookings"}</h2>
              <p>
                {es
                  ? "Gestiona solicitudes y horarios disponibles."
                  : "Manage requests and available times."}
              </p>
              <details open={!bookingSettings}>
                <summary>
                  {es ? "Configuración de reservas" : "Booking settings"}
                </summary>
                <form action={saveBookingSettings} className="stack">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={id} />
                  <label>
                    {es ? "Modo" : "Mode"}
                    <select
                      name="mode"
                      defaultValue={bookingSettings?.mode || "external"}
                    >
                      <option value="external">
                        {es ? "Enlace externo" : "External link"}
                      </option>
                      <option value="request">
                        {es ? "Solicitudes AkiPasa" : "AkiPasa requests"}
                      </option>
                      <option value="disabled">
                        {es ? "Desactivado" : "Disabled"}
                      </option>
                    </select>
                  </label>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      name="requiresDeposit"
                      defaultChecked={
                        bookingSettings?.requires_deposit || false
                      }
                    />{" "}
                    {es ? "Requiere deposito" : "Requires deposit"}
                  </label>
                  <label>
                    {es ? "Deposito en centimos" : "Deposit in cents"}
                    <input
                      name="depositCents"
                      type="number"
                      min="0"
                      defaultValue={bookingSettings?.deposit_cents || ""}
                    />
                  </label>
                  <label>
                    {es ? "Instrucciones" : "Instructions"}
                    <textarea
                      name="instructionsEs"
                      defaultValue={bookingSettings?.instructions_es || ""}
                    />
                  </label>
                  <label>
                    {es ? "Instrucciones inglesas" : "English instructions"}
                    <textarea
                      name="instructionsEn"
                      defaultValue={bookingSettings?.instructions_en || ""}
                    />
                  </label>
                  <button className="button secondary" type="submit">
                    {es ? "Guardar reservas" : "Save booking settings"}
                  </button>
                </form>
              </details>
              <details>
                <summary>
                  {es ? "Anadir disponibilidad" : "Add availability"}
                </summary>
                <form action={createBookingSlot} className="stack">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={id} />
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
                  <label>
                    {es ? "Capacidad" : "Capacity"}
                    <input
                      name="capacity"
                      type="number"
                      min="1"
                      defaultValue="1"
                      required
                    />
                  </label>
                  <button className="button" type="submit">
                    {es ? "Crear horario" : "Create slot"}
                  </button>
                </form>
              </details>
              {!!bookingSlots?.length && (
                <p className="muted">
                  {bookingSlots.length}{" "}
                  {es ? "horarios configurados" : "slots configured"}
                </p>
              )}
              {!!bookingRequests?.length && (
                <div className="managed-list">
                  {bookingRequests.map((request: any) => (
                    <form
                      action={updateBookingRequest}
                      className="managed-row"
                      key={request.id}
                    >
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="venueId" value={id} />
                      <input
                        type="hidden"
                        name="requestId"
                        value={request.id}
                      />
                      <div>
                        <strong>
                          {request.contact_name} · {request.party_size}
                        </strong>
                        <span>
                          {request.contact_email} · {request.status}
                        </span>
                      </div>
                      <select
                        name="status"
                        defaultValue={
                          request.status === "requested"
                            ? "confirmed"
                            : request.status
                        }
                      >
                        <option value="confirmed">
                          {es ? "Confirmar" : "Confirm"}
                        </option>
                        <option value="declined">
                          {es ? "Rechazar" : "Decline"}
                        </option>
                        <option value="completed">
                          {es ? "Completada" : "Completed"}
                        </option>
                      </select>
                      <button className="button secondary" type="submit">
                        {es ? "Actualizar" : "Update"}
                      </button>
                    </form>
                  ))}
                </div>
              )}
            </section>
          </>
        ),
        team: (
          <>
            <section className="panel">
              <h2>{es ? "Miembros del equipo" : "Team members"}</h2>
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
              <details>
                <summary>{es ? "Añadir miembro" : "Add team member"}</summary>
                <form action={addTeamMember} className="stack">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={id} />
                  <label>
                    {es ? "ID del perfil" : "Profile ID"}
                    <input
                      name="profileId"
                      required
                      pattern="[0-9a-fA-F-]{36}"
                    />
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
            </section>
            {isOwner && (
              <details className="panel danger-zone">
                <summary>
                  {es
                    ? "Acceso y eliminación del local"
                    : "Venue access and removal"}
                </summary>
                <div className="stack">
                  <div>
                    <p className="eyebrow">
                      {es ? "Acceso al local" : "Venue access"}
                    </p>
                    <h2>{es ? "Desvincular local" : "Unlink venue"}</h2>
                    <p>
                      {es
                        ? "Quita este local de tu cuenta sin borrar su ficha, eventos ni historial. Si eres la última persona propietaria, el local seguirá publicado como no reclamado."
                        : "Remove this venue from your account without deleting its listing, events or history. If you are the last owner, it stays published as unclaimed."}
                    </p>
                  </div>
                  <form action={unclaimVenue} className="stack">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="venueId" value={id} />
                    <label>
                      {es ? "Motivo de desvinculación" : "Reason for unlinking"}
                      <textarea
                        name="reason"
                        required
                        minLength={10}
                        maxLength={2000}
                      />
                    </label>
                    <label>
                      {es
                        ? "Escribe UNCLAIM para confirmar"
                        : "Type UNCLAIM to confirm"}
                      <input name="confirmation" required pattern="UNCLAIM" />
                    </label>
                    <button className="button secondary" type="submit">
                      {es
                        ? "Desvincular sin borrar"
                        : "Unlink without deleting"}
                    </button>
                  </form>
                </div>
                <details className="danger-zone">
                  <summary>
                    {es
                      ? "Eliminar local definitivamente"
                      : "Delete venue permanently"}
                  </summary>
                  <div className="stack">
                    <p>
                      {es
                        ? "Usa esta opción solo si el local y todo su contenido deben desaparecer."
                        : "Use this only when the venue and all of its content must disappear."}
                    </p>
                    <form action={deleteVenue} className="stack">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="venueId" value={id} />
                      <label>
                        {es ? "Motivo de eliminación" : "Deletion reason"}
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
                  </div>
                </details>
              </details>
            )}
          </>
        ),
      }}
    />
  );
}
