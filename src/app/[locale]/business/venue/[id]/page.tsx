import { bookingEmailConfigured } from "@/lib/booking-mail-delivery";
import {
  loadBookingInbox,
  parseBookingInbox,
} from "@/lib/business-booking-inbox";
import { BookingManager } from "@/components/BookingManager";
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { OwnerReadiness } from "@/components/OwnerReadiness";
import { Icon } from "@/components/Icons";
import { VenueDashboard } from "@/components/VenueDashboard";
import { VenueCatalogueEditor } from "@/components/VenueCatalogueEditor";
import { VenueMediaStudio } from "@/components/VenueMediaStudio";
import { BusinessEventEditPanel } from "@/components/BusinessEventEditPanel";
import { getVenueDashboardSection } from "@/lib/venue-dashboard";
import {
  parseCatalogueDocument,
  catalogueTextForDisplay,
  seedCatalogueTranslationMetadata,
} from "@/lib/venue-catalogue";
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
  createBookingResource,
  createBookingOffering,
  createRecurringBookingSlots,
  createBusinessReward,
  createCheckInCredential,
  createStampCard,
  deleteEvent,
  deleteVenue,
  duplicateEvent,
  publishEvent,
  redeemRewardClaim,
  saveBookingSettings,
  saveOffer,
  setRecurrence,
  updateBookingRequest,
  retryBookingEmails,
  updateOccurrence,
  updateVenue,
  unclaimVenue,
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
  const [{ data: canManage }, { data: platformStaff }] = await Promise.all([
    supabase.rpc("is_venue_member", { target_venue: id }),
    supabase.rpc("has_platform_role", {
      allowed_roles: ["moderator", "administrator"],
    }),
  ]);
  if (!canManage && !platformStaff) notFound();
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
    { data: bookingNotificationSettings },
    { count: pendingBookingCount },
    { data: bookingSlots },
    { data: bookingResources },
    { data: bookingOfferings },
    bookingInbox,
    { data: catalogue },
    { data: audience },
    { data: ownerResults, error: ownerResultsError },
  ] = await Promise.all([
    supabase
      .from("venues")
      .select(
        "id,name,slug,description_es,description_en,address,accessibility,contact_phone,whatsapp_phone,website_url,status,verified,discovery_vertical,accommodation_type",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("events")
      .select(
        "id,slug,title_es,title_en,description_es,description_en,price_cents,price_display_mode,catalogue_section_ids,booking_url,minimum_age,accessibility_notes_es,accessibility_notes_en,status,event_occurrences!event_occurrences_event_id_fkey(id,starts_at,ends_at,status,booking_url)",
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
        "mode,requires_deposit,deposit_cents,instructions_es,instructions_en,active,external_url,booking_template",
      )
      .eq("venue_id", id)
      .maybeSingle(),
    supabase
      .from("booking_notification_settings")
      .select("notification_email")
      .eq("venue_id", id)
      .maybeSingle(),
    supabase
      .from("booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("venue_id", id)
      .eq("status", "requested"),
    supabase
      .from("venue_availability_slots")
      .select("id,starts_at,ends_at,capacity,active,resource_id,offering_id")
      .eq("venue_id", id)
      .order("starts_at"),
    supabase
      .from("booking_resources")
      .select("id,name,kind,capacity,active")
      .eq("venue_id", id)
      .order("name"),
    supabase
      .from("booking_offerings")
      .select("id,name,kind,duration_minutes,capacity,active")
      .eq("venue_id", id)
      .order("name"),
    loadBookingInbox(supabase, id, parseBookingInbox(query)),
    supabase
      .from("venue_catalogues")
      .select("revision,draft_document,published_revision,published_at")
      .eq("venue_id", id)
      .maybeSingle(),
    supabase.rpc("venue_event_audience_summary", { p_venue: id }),
    supabase.rpc("venue_owner_results", { p_venue: id }),
  ]);
  if (!venue) notFound();

  const { data: mediaPlacements } = await supabase
    .from("venue_media_placements")
    .select("media_id,placement,target_key")
    .eq("venue_id", id)
    .in("placement", [
      "venue_profile",
      "venue_cover",
      "venue_menu",
      "venue_events",
      "venue_explore",
      "event_banner",
      "event_explore",
      "event_profile",
      "event_background",
      "event_map_vertical",
      "event_bin",
    ]);
  const mediaPaths = (media || []).map((item) => item.storage_path);
  const { data: signedMediaRows } = mediaPaths.length
    ? await supabase.storage
        .from("event-media")
        .createSignedUrls(mediaPaths, 3600)
    : { data: [] };
  const signedMediaMap = new Map(
    (signedMediaRows || []).flatMap((item) =>
      item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : [],
    ),
  );
  const venueMediaSlots = Object.fromEntries(
    (mediaPlacements || [])
      .filter(
        (item) => item.target_key === "" && item.placement.startsWith("venue_"),
      )
      .map((item) => [item.placement, item.media_id]),
  ) as Partial<
    Record<
      | "venue_profile"
      | "venue_cover"
      | "venue_menu"
      | "venue_events"
      | "venue_explore",
      string
    >
  >;
  const allMediaItems = (media || []).flatMap((item) => {
    const url = signedMediaMap.get(item.storage_path);
    return url
      ? [
          {
            id: item.id,
            url,
            alt:
              (es ? item.alt_es : item.alt_en || item.alt_es) ||
              (es ? "Imagen del local" : "Venue image"),
            sizeBytes: item.size_bytes,
            eventSpecific: item.storage_path.includes("/events/"),
          },
        ]
      : [];
  });
  const mediaStudioItems = allMediaItems.filter((item) => !item.eventSpecific);

  const eventIds = (events || []).map((event) => event.id);
  const eventMediaPlacements = (mediaPlacements || []).filter((item) =>
    eventIds.includes(item.target_key),
  );
  const eventPlacementMap = new Map<
    string,
    {
      bannerMediaId: string;
      exploreMediaId: string;
      profileMediaId: string;
      backgroundMediaId: string;
      mapMediaId: string;
      binMediaIds: string[];
    }
  >();
  for (const placement of eventMediaPlacements) {
    const current = eventPlacementMap.get(placement.target_key) || {
      bannerMediaId: "",
      exploreMediaId: "",
      profileMediaId: "",
      backgroundMediaId: "",
      mapMediaId: "",
      binMediaIds: [],
    };
    if (placement.placement === "event_banner") {
      current.bannerMediaId = placement.media_id;
    } else if (placement.placement === "event_explore") {
      current.exploreMediaId = placement.media_id;
    } else if (placement.placement === "event_profile") {
      current.profileMediaId = placement.media_id;
    } else if (placement.placement === "event_background") {
      current.backgroundMediaId = placement.media_id;
    } else if (placement.placement === "event_map_vertical") {
      current.mapMediaId = placement.media_id;
    } else if (placement.placement === "event_bin") {
      current.binMediaIds.push(placement.media_id);
    }
    eventPlacementMap.set(placement.target_key, current);
  }

  const catalogueDocument = seedCatalogueTranslationMetadata(
    parseCatalogueDocument(catalogue?.draft_document, locale),
    locale,
  );
  const catalogueItemCount = catalogueDocument.sections.reduce(
    (sum, section) => sum + section.items.length,
    0,
  );
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
          ? venue.discovery_vertical === "accommodation"
            ? `https://akiduermo.akipasa.com/stays/${encodeURIComponent(venue.slug)}?lang=${locale}`
            : `/${locale}/venues/${venue.slug}`
          : undefined
      }
      initialSection={getVenueDashboardSection(query)}
      feedback={query.error ? "error" : query.updated ? "success" : undefined}
      counts={{
        photos: media?.length || 0,
        events: events?.length || 0,
        catalogueItems: catalogueItemCount,
        programs: programs?.filter((program) => program.active).length || 0,
        credentials: credentials?.length || 0,
        requests: pendingBookingCount || 0,
        members: members?.length || 0,
      }}
      overview={
        <>
          {venue.discovery_vertical === "accommodation" && (
            <section
              className="panel stack"
              aria-label={
                es ? "Gestión de AkiDuermo" : "AkiDuermo property management"
              }
            >
              <span className="eyebrow">
                AkiDuermo · {es ? "Alojamiento" : "Accommodation"}
              </span>
              <h2>
                {es ? "Tu alojamiento en AkiDuermo" : "Your AkiDuermo property"}
              </h2>
              <p>
                {es
                  ? "Gestiona aquí la información del alojamiento, las fotos y los eventos. El calendario de habitaciones, las tarifas por noche y las reservas hoteleras todavía no están activos."
                  : "Manage your property details, photos and events here. Room-night inventory, nightly rates and accommodation bookings are not available yet."}
              </p>
              {venue.status === "published" && (
                <a
                  className="button secondary"
                  href={`https://akiduermo.akipasa.com/stays/${encodeURIComponent(venue.slug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {es ? "Ver ficha en AkiDuermo ↗" : "Preview on AkiDuermo ↗"}
                </a>
              )}
            </section>
          )}
          <OwnerReadiness
            locale={locale}
            venueId={id}
            profileComplete={Boolean(
              venue.description_es &&
                (venue.contact_phone ||
                  venue.website_url ||
                  venue.whatsapp_phone),
            )}
            photos={media?.length || 0}
            upcomingEvents={
              (events || []).filter(
                (event) =>
                  event.status === "published" &&
                  (event.event_occurrences || []).some(
                    (occurrence: { status: string; ends_at: string }) =>
                      occurrence.status === "scheduled" &&
                      new Date(occurrence.ends_at).getTime() > Date.now(),
                  ),
              ).length
            }
            loyaltyReady={Boolean(
              programs?.some(
                (program) =>
                  program.active && program.loyalty_program_rewards?.length,
              ),
            )}
            results={ownerResultsError ? null : ownerResults}
          />
        </>
      }
      sections={{
        profile: (
          <>
            <section className="panel profile-hub">
              <div className="profile-summary-grid">
                <article className="profile-summary-card">
                  <span className="summary-icon">
                    <Icon name="venue" />
                  </span>
                  <div>
                    <small>{es ? "Identidad" : "Identity"}</small>
                    <strong>{venue.name}</strong>
                    <span>
                      {(es
                        ? venue.description_es
                        : venue.description_en || venue.description_es
                      ).slice(0, 90)}
                    </span>
                  </div>
                </article>
                <article className="profile-summary-card">
                  <span className="summary-icon">
                    <Icon name="map" />
                  </span>
                  <div>
                    <small>{es ? "Ubicación" : "Location"}</small>
                    <strong>{venue.address}</strong>
                    <span>
                      {es
                        ? "Dirección pública del local"
                        : "Public venue address"}
                    </span>
                  </div>
                </article>
                <article className="profile-summary-card">
                  <span className="summary-icon">
                    <Icon name="person" />
                  </span>
                  <div>
                    <small>{es ? "Contacto" : "Contact"}</small>
                    <strong>
                      {venue.contact_phone ||
                        venue.whatsapp_phone ||
                        venue.website_url ||
                        (es ? "Sin añadir" : "Not added")}
                    </strong>
                    <span>
                      {venue.contact_phone ||
                      venue.whatsapp_phone ||
                      venue.website_url
                        ? es
                          ? "Los clientes pueden contactarte"
                          : "Customers can reach you"
                        : es
                          ? "Añade una forma de contacto"
                          : "Add a contact method"}
                    </span>
                  </div>
                </article>
              </div>

              <details className="workspace-action-card">
                <summary>
                  <span className="workspace-action-summary">
                    <span className="summary-icon">
                      <Icon name="settings" />
                    </span>
                    <span>
                      <strong>
                        {es ? "Editar información" : "Edit venue information"}
                      </strong>
                      <small>
                        {es
                          ? "Nombre, descripción, dirección y contacto"
                          : "Name, description, address and contact"}
                      </small>
                    </span>
                  </span>
                </summary>
                <form
                  action={updateVenue}
                  className="stack profile-editor-form"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={id} />
                  <div className="profile-editor-grid">
                    <section className="form-card">
                      <div className="form-card-heading">
                        <span className="summary-icon">
                          <Icon name="venue" />
                        </span>
                        <div>
                          <strong>
                            {es ? "Lo esencial" : "The essentials"}
                          </strong>
                          <small>
                            {es
                              ? "Lo primero que verá un cliente"
                              : "The first things a customer sees"}
                          </small>
                        </div>
                      </div>
                      <label>
                        {es ? "Nombre" : "Name"}
                        <input name="name" defaultValue={venue.name} required />
                      </label>
                      <label>
                        {es ? "Descripción" : "Description"}
                        <textarea
                          name="description"
                          defaultValue={
                            es
                              ? venue.description_es
                              : venue.description_en || venue.description_es
                          }
                          required
                          minLength={20}
                          rows={5}
                        />
                      </label>
                    </section>
                    <section className="form-card">
                      <div className="form-card-heading">
                        <span className="summary-icon">
                          <Icon name="map" />
                        </span>
                        <div>
                          <strong>
                            {es
                              ? "Dónde y cómo contactarte"
                              : "Location and contact"}
                          </strong>
                          <small>
                            {es
                              ? "Información práctica para llegar o llamar"
                              : "Practical information for visits and contact"}
                          </small>
                        </div>
                      </div>
                      <SpainAddressAutocomplete
                        locale={locale}
                        mode="address"
                        defaultValue={venue.address}
                      />
                      <div className="two-col">
                        <label>
                          {es ? "Teléfono" : "Phone"}
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
                        {es ? "Web o enlace principal" : "Website or main link"}
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
                        />
                        {es ? "Acceso sin escalones" : "Step-free access"}
                      </label>
                    </section>
                  </div>
                  <div className="form-save-bar">
                    <span>
                      {es
                        ? "Guardar enviará los cambios a revisión."
                        : "Saving sends the changes for review."}
                    </span>
                    <button className="button" type="submit">
                      {es ? "Guardar cambios" : "Save changes"}
                    </button>
                  </div>
                </form>
              </details>
            </section>

            <section className="panel profile-media-hub">
              <VenueMediaStudio
                locale={locale}
                venueId={id}
                media={mediaStudioItems}
                placements={venueMediaSlots}
              />
            </section>
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
                    <div className="event-workflow">
                      <span className="status-pill" data-status={event.status}>
                        {event.status === "published"
                          ? es
                            ? "Publicado"
                            : "Published"
                          : event.status === "pending"
                            ? es
                              ? "En revisión"
                              : "In review"
                            : event.status === "archived"
                              ? es
                                ? "Archivado"
                                : "Archived"
                              : es
                                ? "Borrador"
                                : "Draft"}
                      </span>
                      {event.status !== "published" &&
                      event.status !== "pending" ? (
                        <form action={publishEvent}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="venueId" value={id} />
                          <input
                            type="hidden"
                            name="eventId"
                            value={event.id}
                          />
                          <button className="button" type="submit">
                            {es ? "Publicar evento" : "Publish event"}
                          </button>
                        </form>
                      ) : event.status === "pending" ? (
                        <span className="event-workflow-note">
                          {es
                            ? "Listo. Está pasando por la revisión de publicación."
                            : "Ready. It is going through the publishing review."}
                        </span>
                      ) : (
                        <span className="event-workflow-note">
                          {es
                            ? "Este evento está visible para el público."
                            : "This event is live for the public."}
                        </span>
                      )}
                    </div>
                    <div className="event-editor">
                      <BusinessEventEditPanel
                        locale={locale}
                        venueId={id}
                        verifiedVenue={venue.verified === true}
                        event={{
                          id: event.id,
                          title:
                            locale === "en"
                              ? event.title_en || event.title_es
                              : event.title_es,
                          description:
                            locale === "en"
                              ? event.description_en || event.description_es
                              : event.description_es,
                          priceCents: event.price_cents,
                          priceDisplayMode:
                            event.price_display_mode === "hide"
                              ? "hide"
                              : "show",
                          bookingUrl: event.booking_url || "",
                          minimumAge: event.minimum_age,
                          accessibilityNotes:
                            locale === "en"
                              ? event.accessibility_notes_en ||
                                event.accessibility_notes_es ||
                                ""
                              : event.accessibility_notes_es || "",
                        }}
                        catalogueSections={catalogueDocument.sections
                          .filter((section) =>
                            section.items.some(
                              (item) => item.visible !== false,
                            ),
                          )
                          .map((section) => ({
                            id: section.id,
                            title: catalogueTextForDisplay(
                              section.title,
                              locale,
                              "section_title",
                            ),
                            itemCount: section.items.filter(
                              (item) => item.visible !== false,
                            ).length,
                          }))}
                        selectedCatalogueSectionIds={
                          event.catalogue_section_ids || []
                        }
                        venueMediaIds={mediaStudioItems.map((item) => item.id)}
                        media={[
                          ...mediaStudioItems,
                          ...allMediaItems.filter(
                            (item) =>
                              item.eventSpecific &&
                              (
                                eventPlacementMap.get(event.id)?.binMediaIds ||
                                []
                              ).includes(item.id),
                          ),
                        ].map((item) => ({
                          id: item.id,
                          url: item.url,
                          alt: item.alt,
                        }))}
                        bannerMediaId={
                          eventPlacementMap.get(event.id)?.bannerMediaId || ""
                        }
                        exploreMediaId={
                          eventPlacementMap.get(event.id)?.exploreMediaId || ""
                        }
                        profileMediaId={
                          eventPlacementMap.get(event.id)?.profileMediaId || ""
                        }
                        backgroundMediaId={
                          eventPlacementMap.get(event.id)?.backgroundMediaId ||
                          ""
                        }
                        mapMediaId={
                          eventPlacementMap.get(event.id)?.mapMediaId || ""
                        }
                        eventBinMediaIds={
                          eventPlacementMap.get(event.id)?.binMediaIds || []
                        }
                      />
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
        catalogue: (
          <section className="panel">
            <VenueCatalogueEditor
              locale={locale}
              venueId={id}
              revision={catalogue?.revision || 0}
              publishedRevision={catalogue?.published_revision ?? null}
              initialDocument={catalogueDocument}
              mediaOptions={mediaStudioItems.map((item) => ({
                id: item.id,
                url: item.url,
                alt: item.alt,
              }))}
            />
            {query.error === "allergens" && (
              <p className="notice notice-error" role="alert">
                {es
                  ? "Revisa los 14 alérgenos de cada comida/bebida visible antes de publicar."
                  : "Review all 14 allergens for every visible food/drink item before publishing."}
              </p>
            )}
          </section>
        ),
        rewards: (
          <section className="panel loyalty-workbench reward-hub">
            <div className="workspace-inline-heading">
              <div>
                <span className="eyebrow">{es ? "Fidelidad" : "Loyalty"}</span>
                <h2>
                  {es
                    ? "Premia a la gente que vuelve"
                    : "Reward people who come back"}
                </h2>
                <p>
                  {es
                    ? "Empieza por una tarjeta de sellos. Lo demás es opcional."
                    : "Start with a stamp card. Everything else is optional."}
                </p>
              </div>
              <span className="status-pill">
                {
                  (programs || []).filter((program: any) => program.active)
                    .length
                }{" "}
                {es ? "activas" : "active"}
              </span>
            </div>

            {!!programs?.length && (
              <div className="reward-card-list">
                {programs.map((program: any) => (
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
            )}

            <div className="reward-action-grid">
              <details
                className="workspace-action-card reward-action-card"
                name="reward-action"
              >
                <summary>
                  <span className="workspace-action-summary">
                    <span className="summary-icon">
                      <Icon name="gift" />
                    </span>
                    <span>
                      <strong>{es ? "Tarjeta de sellos" : "Stamp card"}</strong>
                      <small>
                        {es
                          ? "Ej. 5 visitas = café gratis"
                          : "E.g. 5 visits = a free coffee"}
                      </small>
                    </span>
                  </span>
                </summary>
                <form
                  action={createStampCard}
                  className="stack compact-action-form"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={id} />
                  <div className="form-grid-three">
                    <label>
                      {es ? "Nombre de la tarjeta" : "Card name"}
                      <input
                        name="title"
                        required
                        minLength={3}
                        placeholder={
                          es ? "Cliente habitual" : "Regular visitor"
                        }
                      />
                    </label>
                    <label>
                      {es ? "Premio" : "Reward"}
                      <input
                        name="reward"
                        required
                        minLength={3}
                        placeholder={es ? "Café gratis" : "Free coffee"}
                      />
                    </label>
                    <label>
                      {es ? "Visitas necesarias" : "Visits needed"}
                      <input
                        name="stampsRequired"
                        type="number"
                        min="2"
                        max="50"
                        defaultValue="5"
                        required
                      />
                    </label>
                  </div>
                  <button className="button" type="submit">
                    {es ? "Crear tarjeta" : "Create card"}
                  </button>
                </form>
              </details>

              <details
                className="workspace-action-card reward-action-card"
                name="reward-action"
              >
                <summary>
                  <span className="workspace-action-summary">
                    <span className="summary-icon">
                      <Icon name="star" />
                    </span>
                    <span>
                      <strong>{es ? "Recompensa" : "Reward"}</strong>
                      <small>
                        {es
                          ? "Crea un premio reutilizable"
                          : "Create a reusable prize"}
                      </small>
                    </span>
                  </span>
                </summary>
                <form
                  action={createBusinessReward}
                  className="stack compact-action-form"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={id} />
                  <div className="form-grid-two">
                    <label>
                      {es ? "Nombre" : "Name"}
                      <input
                        name="title"
                        required
                        placeholder={es ? "Postre gratis" : "Free dessert"}
                      />
                    </label>
                    <label>
                      {es ? "Días para usarlo" : "Days to redeem"}
                      <input
                        name="claimWindowDays"
                        type="number"
                        min="1"
                        max="365"
                        defaultValue="30"
                        required
                      />
                    </label>
                  </div>
                  <label>
                    {es ? "Qué incluye" : "What it includes"}
                    <textarea
                      name="description"
                      required
                      rows={3}
                      placeholder={
                        es
                          ? "Explica el premio y cualquier condición importante."
                          : "Explain the reward and any important conditions."
                      }
                    />
                  </label>
                  <button className="button" type="submit">
                    {es ? "Crear recompensa" : "Create reward"}
                  </button>
                </form>
              </details>

              <details
                className="workspace-action-card reward-action-card"
                name="reward-action"
              >
                <summary>
                  <span className="workspace-action-summary">
                    <span className="summary-icon">
                      <Icon name="megaphone" />
                    </span>
                    <span>
                      <strong>
                        {es ? "Oferta temporal" : "Limited-time offer"}
                      </strong>
                      <small>
                        {es
                          ? "Promoción con fecha de inicio y fin"
                          : "A promotion with a start and end date"}
                      </small>
                    </span>
                  </span>
                </summary>
                <form action={saveOffer} className="stack compact-action-form">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={id} />
                  <div className="form-grid-two">
                    <label>
                      {es ? "Título" : "Title"}
                      <input
                        name="title"
                        required
                        placeholder={es ? "2x1 los martes" : "2-for-1 Tuesdays"}
                      />
                    </label>
                    <label>
                      {es ? "Quién puede verla" : "Who can see it"}
                      <select name="audience" defaultValue="public">
                        <option value="public">
                          {es ? "Todo el mundo" : "Everyone"}
                        </option>
                        <option value="premium">
                          {es ? "Solo Premium" : "Premium only"}
                        </option>
                      </select>
                    </label>
                  </div>
                  <label>
                    {es ? "Condiciones" : "Terms"}
                    <textarea
                      name="terms"
                      required
                      minLength={10}
                      rows={3}
                      placeholder={
                        es
                          ? "Solo consumo en local. No acumulable."
                          : "Dine-in only. Cannot be combined with other offers."
                      }
                    />
                  </label>
                  <div className="form-grid-two">
                    <label>
                      {es ? "Empieza" : "Starts"}
                      <input type="datetime-local" name="startsAt" required />
                    </label>
                    <label>
                      {es ? "Termina" : "Ends"}
                      <input type="datetime-local" name="endsAt" required />
                    </label>
                  </div>
                  <button className="button" type="submit">
                    {es ? "Crear oferta" : "Create offer"}
                  </button>
                </form>
              </details>

              {!!rewards?.length && (
                <details
                  className="workspace-action-card reward-action-card"
                  name="reward-action"
                >
                  <summary>
                    <span className="workspace-action-summary">
                      <span className="summary-icon">
                        <Icon name="plus" />
                      </span>
                      <span>
                        <strong>
                          {es ? "Asignar recompensa" : "Assign a reward"}
                        </strong>
                        <small>
                          {es
                            ? "Conecta un premio a sellos o Pasaporte"
                            : "Connect a prize to stamps or Passport"}
                        </small>
                      </span>
                    </span>
                  </summary>
                  <form
                    action={assignReward}
                    className="stack compact-action-form"
                  >
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="venueId" value={id} />
                    <div className="form-grid-two">
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
                        {es ? "Dónde se consigue" : "Earned from"}
                        <select name="targetType">
                          <option value="stamp">
                            {es ? "Tarjeta de sellos" : "Stamp card"}
                          </option>
                          <option value="passport">
                            {es ? "Pasaporte" : "Passport"}
                          </option>
                        </select>
                      </label>
                    </div>
                    <div className="form-grid-two">
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
                        {es ? "Disponible para" : "Available to"}
                        <select name="accessTier">
                          <option value="free">
                            {es ? "Todo el mundo" : "Everyone"}
                          </option>
                          <option value="premium">Premium</option>
                        </select>
                      </label>
                    </div>
                    <button className="button secondary" type="submit">
                      {es ? "Asignar" : "Assign"}
                    </button>
                  </form>
                </details>
              )}
            </div>

            {!!offers?.length && (
              <div className="compact-managed-list">
                <div className="workspace-inline-heading">
                  <div>
                    <h3>{es ? "Ofertas creadas" : "Created offers"}</h3>
                  </div>
                </div>
                {offers.map((offer) => (
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
              </div>
            )}
          </section>
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
          <BookingManager
            locale={locale}
            venueId={id}
            settings={{
              ...bookingSettings,
              notification_email:
                bookingNotificationSettings?.notification_email,
            }}
            initialTab={query.bookingTab}
            notifications={bookingInbox.notifications}
            inbox={{
              ...bookingInbox.filters,
              total: bookingInbox.total,
              pending: pendingBookingCount || 0,
              error: bookingInbox.error,
              notificationError: bookingInbox.notificationError,
            }}
            emailConfigured={bookingEmailConfigured()}
            retryEmails={retryBookingEmails}
            slots={bookingSlots || []}
            resources={bookingResources || []}
            offerings={bookingOfferings || []}
            requests={bookingInbox.requests}
            save={saveBookingSettings}
            createSlot={createBookingSlot}
            createRecurringSlots={createRecurringBookingSlots}
            createResource={createBookingResource}
            createOffering={createBookingOffering}
            updateRequest={updateBookingRequest}
          />
        ),
        team: (
          <>
            <section className="panel team-hub">
              <div className="workspace-inline-heading">
                <div>
                  <span className="eyebrow">{es ? "Equipo" : "Team"}</span>
                  <h2>
                    {es
                      ? "Quién puede gestionar este local"
                      : "Who can manage this venue"}
                  </h2>
                  <p>
                    {es
                      ? "Mantén la lista corta y da solo el acceso necesario."
                      : "Keep the list small and give people only the access they need."}
                  </p>
                </div>
                <span className="status-pill">
                  {members?.length || 0} {es ? "personas" : "people"}
                </span>
              </div>

              <div className="team-member-grid">
                {members?.map((member) => {
                  const displayName = (
                    member.profiles as unknown as {
                      display_name: string | null;
                    } | null
                  )?.display_name;
                  return (
                    <article
                      className="team-member-card"
                      key={member.profile_id}
                    >
                      <span className="team-avatar">
                        {(displayName || member.profile_id)
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>
                      <span>
                        <strong>
                          {displayName ||
                            (es ? "Miembro del equipo" : "Team member")}
                        </strong>
                        <small>
                          {member.role === "owner"
                            ? es
                              ? "Propietario"
                              : "Owner"
                            : member.role === "manager"
                              ? es
                                ? "Gestor"
                                : "Manager"
                              : "Editor"}
                        </small>
                      </span>
                      <span className="status-pill">{member.role}</span>
                    </article>
                  );
                })}
              </div>

              <details className="workspace-action-card">
                <summary>
                  <span className="workspace-action-summary">
                    <span className="summary-icon">
                      <Icon name="plus" />
                    </span>
                    <span>
                      <strong>{es ? "Añadir a alguien" : "Add someone"}</strong>
                      <small>
                        {es
                          ? "Editor para contenido · Gestor para operaciones"
                          : "Editor for content · Manager for operations"}
                      </small>
                    </span>
                  </span>
                </summary>
                <form
                  action={addTeamMember}
                  className="stack compact-action-form"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={id} />
                  <div className="form-grid-two">
                    <label>
                      {es ? "Email de la persona" : "Person's email"}
                      <input
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder={
                          es ? "nombre@ejemplo.com" : "name@example.com"
                        }
                      />
                      <small>
                        {es
                          ? "Debe ser el email de una cuenta AkiPasa activa."
                          : "Use the email on their active AkiPasa account."}
                      </small>
                    </label>
                    <label>
                      {es ? "Acceso" : "Access"}
                      <select name="role">
                        <option value="editor">
                          {es ? "Editor · contenido" : "Editor · content"}
                        </option>
                        <option value="manager">
                          {es ? "Gestor · operaciones" : "Manager · operations"}
                        </option>
                      </select>
                    </label>
                  </div>
                  <button className="button" type="submit">
                    {es ? "Añadir al equipo" : "Add to team"}
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
