import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/config";
import { loadFeatureFlags } from "@/lib/feature-flags";
import { requireBusinessAccess } from "@/lib/entitlements";
import {
  confirmRedemption,
  createEvent,
  createVenue,
  requestPromotion,
  saveLoyaltyProgram,
  submitVenueClaim,
} from "./actions";
import { SpainAddressAutocomplete } from "@/components/SpainAddressAutocomplete";
import { PromotionRequestFields } from "@/components/PromotionRequestFields";
import {
  WorkspaceShell,
  type WorkspaceItem,
} from "@/components/WorkspaceShell";
import { isAdministrator } from "@/lib/roles";

type ManagedVenue = {
  role: string;
  venues: {
    id: string;
    name: string;
    slug: string;
    status: string;
    verified: boolean;
  } | null;
};

export default async function BusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const view = ["venues", "loyalty", "growth", "analytics", "claims"].includes(
    query.view || "",
  )
    ? query.view!
    : "venues";

  const { supabase, user } = await requireBusinessAccess(locale);
  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profile?.app_role !== "organiser" &&
    !isAdministrator(profile?.app_role || "")
  ) {
    redirect(`/${locale}/business/apply`);
  }

  const flags = await loadFeatureFlags(supabase);
  const es = locale === "es";

  const [
    { data: members },
    { data: categories },
    { data: claimable },
    { data: claims },
    { data: programs },
    { data: redemptions },
    { data: promotions },
  ] = await Promise.all([
    supabase
      .from("venue_members")
      .select("role,venues(id,name,slug,status,verified)"),
    supabase.from("categories").select("id,name_es,name_en").order("name_es"),
    supabase
      .from("venues")
      .select("id,name")
      .eq("status", "published")
      .order("name"),
    supabase
      .from("venue_claims")
      .select("id,status,created_at,venues(name)")
      .eq("claimant_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("loyalty_programs")
      .select(
        "id,venue_id,title_es,title_en,reward_es,reward_en,stamps_required,check_in_token,active",
      ),
    supabase
      .from("reward_redemptions")
      .select(
        "id,requested_at,profiles(display_name),loyalty_programs(title_es,venue_id)",
      )
      .eq("state", "requested")
      .order("requested_at"),
    supabase
      .from("promotion_requests")
      .select("id,venue_id,service,state,created_at")
      .order("created_at", { ascending: false }),
  ]);

  const managed = (members || []) as unknown as ManagedVenue[];
  const managedVenueIds = managed.flatMap((item) =>
    item.venues ? [item.venues.id] : [],
  );
  const { data: promotionEvents } = managedVenueIds.length
    ? await supabase
        .from("events")
        .select("id,venue_id,title_es,title_en")
        .in("venue_id", managedVenueIds)
        .eq("status", "published")
        .order("title_es")
    : { data: [] };
  const analytics = await Promise.all(
    managed
      .filter((item) => item.venues)
      .map(async (item) => {
        const venue = item.venues!;
        const { data } = await supabase.rpc("venue_analytics", {
          p_venue: venue.id,
        });
        return {
          venue,
          rows: (data || []) as { action: string; total: number }[],
        };
      }),
  );

  const base = `/${locale}/business`;
  const items: WorkspaceItem[] = [
    {
      href: base,
      label: es ? "Locales" : "Venues",
      icon: "venue",
      count: managed.length || undefined,
    },
    {
      href: `${base}?view=loyalty`,
      label: es ? "Fidelidad" : "Loyalty",
      icon: "gift",
      count: redemptions?.length || undefined,
    },
    {
      href: `${base}?view=growth`,
      label: es ? "Promoción" : "Growth",
      icon: "megaphone",
    },
    { href: `${base}?view=analytics`, label: "Analytics", icon: "activity" },
    {
      href: `${base}?view=claims`,
      label: es ? "Reclamar" : "Claims",
      icon: "inbox",
      count: claims?.length || undefined,
    },
  ];
  return (
    <WorkspaceShell
      title={es ? "Tu negocio" : "Your business"}
      eyebrow={es ? "Panel de negocio" : "Business workspace"}
      description={
        es
          ? "Gestiona tus locales, fidelidad y crecimiento desde un solo espacio."
          : "Manage venues, loyalty, and growth from one focused workspace."
      }
      homeHref={base}
      items={items}
      navigationTitle={es ? "Negocio" : "Business"}
    >
      {(query.created || query.error) && (
        <p
          className={`notice ${query.created ? "notice-success" : "notice-error"}`}
        >
          {query.created
            ? es
              ? "✓ Guardado correctamente. Puede estar pendiente de revisión."
              : "✓ Saved successfully. It may be awaiting review."
            : es
              ? "✕ No se pudo guardar. Revisa los campos o permisos."
              : "✕ Could not save. Check the fields or permissions."}
        </p>
      )}
      <section className="dashboard-grid">
        {/* Managed Venues List */}
        {view === "venues" && (
          <div className="panel catalogue-edit-card">
            <div className="catalogue-section-header">
              <h2>{es ? "Locales gestionados" : "Managed venues"}</h2>
              <p className="catalogue-section-sub">
                {es
                  ? "Locales donde tienes permisos de edición u organización."
                  : "Venues where you have management or organisation privileges."}
              </p>
            </div>

            {managed.length ? (
              <div className="managed-list">
                {managed.map(
                  (m) =>
                    m.venues && (
                      <div className="managed-row" key={m.venues.id}>
                        <div>
                          <strong>{m.venues.name}</strong>
                          <span>
                            {m.role} · <small>{m.venues.status}</small>
                          </span>
                        </div>
                        <a
                          className="button secondary small-btn"
                          href={`/${locale}/business/venue/${m.venues.id}`}
                        >
                          {es ? "Gestionar →" : "Manage →"}
                        </a>
                      </div>
                    ),
                )}
              </div>
            ) : (
              <div className="catalogue-empty-card">
                <p>
                  {es
                    ? "Todavía no gestionas ningún local. ¡Crea el primero abajo!"
                    : "You do not manage a venue yet. Create your first one below!"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Create Venue Form */}
        {view === "venues" && (
          <details className="panel catalogue-edit-card" open={!managed.length}>
            <summary>
              <strong>
                {es ? "+ Crear un nuevo local" : "+ Create a new venue"}
              </strong>
            </summary>

            <form action={createVenue} className="stack focused-form">
              <input type="hidden" name="locale" value={locale} />

              <div className="form-grid-two">
                <label>
                  {es ? "Nombre del local" : "Venue name"}
                  <input
                    name="name"
                    required
                    minLength={2}
                    placeholder="Ej. El Asador"
                  />
                </label>
              </div>

              <div className="form-grid-two">
                <SpainAddressAutocomplete locale={locale} mode="address" />
              </div>
              <p className="fine-print">
                {es
                  ? "AkiPasa creará automáticamente la dirección web de tu local."
                  : "AkiPasa will create your venue’s web address automatically."}
              </p>

              <div className="form-grid-two">
                <label>
                  {es ? "Descripción en español" : "Spanish description"}
                  <textarea
                    name="descriptionEs"
                    required
                    minLength={20}
                    rows={3}
                  />
                </label>

                <label>
                  {es ? "Descripción en inglés" : "English description"}
                  <textarea name="descriptionEn" rows={3} />
                </label>
              </div>

              <div className="form-actions-right">
                <p className="fine-print form-action-note">
                  {es
                    ? "Podrás añadir imágenes una vez creado."
                    : "You can add images after creation."}
                </p>
                <button className="button primary" type="submit">
                  {es
                    ? "Crear y enviar a revisión"
                    : "Create and submit for review"}
                </button>
              </div>
            </form>
          </details>
        )}

        {/* Create Event Form */}
        {view === "venues" && managed.length > 0 && (
          <details className="panel catalogue-edit-card">
            <summary>
              <strong>
                {es
                  ? "+ Crear evento o actividad"
                  : "+ Create event or activity"}
              </strong>
            </summary>

            <form action={createEvent} className="stack focused-form">
              <input type="hidden" name="locale" value={locale} />

              <div className="form-grid-two">
                <label>
                  {es ? "Local emisor" : "Publishing venue"}
                  <select name="venueId" required>
                    {managed.map(
                      (m) =>
                        m.venues && (
                          <option key={m.venues.id} value={m.venues.id}>
                            {m.venues.name}
                          </option>
                        ),
                    )}
                  </select>
                </label>

                <label>
                  {es ? "Categoría" : "Category"}
                  <select name="categoryId" required>
                    {categories?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {locale === "es" ? c.name_es : c.name_en}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-grid-two">
                <label>
                  {es ? "Título en español" : "Spanish title"}
                  <input
                    name="titleEs"
                    required
                    placeholder="Ej. Noche de Jazz"
                  />
                </label>

                <label>
                  {es ? "Título en inglés" : "English title"}
                  <input name="titleEn" placeholder="e.g. Jazz Night" />
                </label>
              </div>

              <div className="form-grid-two">
                <label>
                  {es ? "Enlace de reserva (HTTPS)" : "HTTPS booking link"}
                  <input name="bookingUrl" type="url" placeholder="https://" />
                </label>

                <p className="muted">
                  {es
                    ? "AkiPasa creará automáticamente la dirección web del evento."
                    : "AkiPasa will create the event web address automatically."}
                </p>
              </div>

              <div className="form-grid-two">
                <label>
                  {es ? "Descripción en español" : "Spanish description"}
                  <textarea
                    name="descriptionEs"
                    required
                    minLength={20}
                    rows={3}
                  />
                </label>

                <label>
                  {es ? "Descripción en inglés" : "English description"}
                  <textarea name="descriptionEn" rows={3} />
                </label>
              </div>

              <div className="form-grid-two">
                <label>
                  {es ? "Precio en céntimos" : "Price in cents"}
                  <input
                    name="priceCents"
                    type="number"
                    min="0"
                    defaultValue="0"
                    required
                  />
                </label>
              </div>

              <div className="form-grid-two">
                <label>
                  {es ? "Inicio" : "Starts"}
                  <input name="startsAt" type="datetime-local" required />
                </label>

                <label>
                  {es ? "Fin" : "Ends"}
                  <input name="endsAt" type="datetime-local" required />
                </label>
              </div>

              <div className="form-actions-right">
                <button className="button primary" type="submit">
                  {es ? "Crear evento" : "Create event"}
                </button>
              </div>
            </form>
          </details>
        )}

        {/* Loyalty & Stamps View */}
        {view === "loyalty" && managed.length > 0 && (
          <details className="panel catalogue-edit-card" open>
            <summary>
              <strong>
                {es
                  ? "Programa de Sellos y Recompensas"
                  : "Stamps & Rewards Program"}
              </strong>
            </summary>

            <form action={saveLoyaltyProgram} className="stack focused-form">
              <input type="hidden" name="locale" value={locale} />

              <div className="form-grid-two">
                <label>
                  {es ? "Local" : "Venue"}
                  <select name="venueId" required>
                    {managed.map(
                      (m) =>
                        m.venues && (
                          <option key={m.venues.id} value={m.venues.id}>
                            {m.venues.name}
                          </option>
                        ),
                    )}
                  </select>
                </label>

                <label>
                  {es ? "Sellos necesarios" : "Stamps required"}
                  <input
                    name="stampsRequired"
                    type="number"
                    min="2"
                    max="50"
                    defaultValue="8"
                    required
                  />
                </label>
              </div>

              <div className="form-grid-two">
                <label>
                  {es ? "Nombre del programa (ES)" : "Programme name (ES)"}
                  <input
                    name="titleEs"
                    required
                    minLength={3}
                    placeholder="Ej. Tarjeta VIP"
                  />
                </label>

                <label>
                  {es ? "Nombre en inglés (EN)" : "English name (EN)"}
                  <input name="titleEn" placeholder="e.g. VIP Card" />
                </label>
              </div>

              <div className="form-grid-two">
                <label>
                  {es ? "Recompensa (ES)" : "Reward (ES)"}
                  <textarea
                    name="rewardEs"
                    required
                    minLength={3}
                    rows={2}
                    placeholder="Ej. Bebida gratis en tu 8ª visita"
                  />
                </label>

                <label>
                  {es ? "Recompensa en inglés (EN)" : "English reward (EN)"}
                  <textarea
                    name="rewardEn"
                    rows={2}
                    placeholder="e.g. Free drink on 8th visit"
                  />
                </label>
              </div>

              <div className="form-actions-right">
                <button className="button primary" type="submit">
                  {es ? "Guardar programa" : "Save programme"}
                </button>
              </div>
            </form>

            {programs && programs.length > 0 && (
              <div className="managed-list">
                {programs.map((program) => (
                  <div className="managed-row" key={program.id}>
                    <div>
                      <strong>
                        {locale === "en"
                          ? program.title_en || program.title_es
                          : program.title_es}
                      </strong>
                      <span className="managed-meta">
                        <a
                          href={`/${locale}/check-in/${program.check_in_token}`}
                          className="inline-detail-link"
                        >
                          {es
                            ? "Abrir enlace de check-in"
                            : "Open check-in link"}
                        </a>
                      </span>
                    </div>
                    <span className="status-pill badge-neutral">
                      {program.stamps_required} {es ? "sellos" : "stamps"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </details>
        )}

        {view === "loyalty" && redemptions && redemptions.length > 0 && (
          <section className="panel catalogue-edit-card">
            <h2>
              {es
                ? "Recompensas pendientes de canje"
                : "Pending reward redemptions"}
            </h2>
            <div className="managed-list">
              {redemptions.map((item) => (
                <form
                  action={confirmRedemption}
                  className="managed-row"
                  key={item.id}
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="redemptionId" value={item.id} />
                  <strong>
                    {(
                      item.profiles as unknown as {
                        display_name: string | null;
                      } | null
                    )?.display_name || (es ? "Usuario" : "User")}
                  </strong>
                  <button className="button primary small-btn" type="submit">
                    {es ? "Confirmar entrega" : "Confirm handover"}
                  </button>
                </form>
              ))}
            </div>
          </section>
        )}

        {/* Growth & Promotion Requests */}
        {view === "growth" && managed.length > 0 && (
          <details className="panel catalogue-edit-card" open>
            <summary>
              <strong>
                {es
                  ? "Solicitar Promoción Comercial"
                  : "Request Commercial Promotion"}
              </strong>
            </summary>

            {flags.promotion_requests ? (
              <form action={requestPromotion} className="stack focused-form">
                <input type="hidden" name="locale" value={locale} />

                <PromotionRequestFields
                  locale={locale}
                  venues={managed.flatMap((item) =>
                    item.venues
                      ? [{ id: item.venues.id, name: item.venues.name }]
                      : [],
                  )}
                  events={(promotionEvents || []).map((event) => ({
                    id: event.id,
                    venueId: event.venue_id,
                    title:
                      (es ? event.title_es : event.title_en) || event.title_es,
                  }))}
                />

                <div className="form-grid-two" hidden>
                  <label>
                    {es ? "Local" : "Venue"}
                    <select name="legacyVenueId" disabled>
                      {managed.map(
                        (item) =>
                          item.venues && (
                            <option key={item.venues.id} value={item.venues.id}>
                              {item.venues.name}
                            </option>
                          ),
                      )}
                    </select>
                  </label>

                  <label>
                    {es ? "Tipo de servicio" : "Service type"}
                    <select name="legacyService" disabled>
                      <option value="featured_listing">
                        {es ? "Destacado patrocinado" : "Sponsored feature"}
                      </option>
                      <option value="social_campaign">
                        {es
                          ? "Campaña en redes sociales"
                          : "Social media campaign"}
                      </option>
                      <option value="content_package">
                        {es
                          ? "Paquete de contenido VIP"
                          : "VIP Content package"}
                      </option>
                      <option value="other">
                        {es ? "Otro / Personalizado" : "Other / Custom"}
                      </option>
                    </select>
                  </label>
                </div>

                <label>
                  {es ? "Detalles de tu solicitud" : "Request details"}
                  <textarea
                    name="message"
                    required
                    minLength={20}
                    rows={4}
                    placeholder={
                      es
                        ? "Cuéntanos qué fechas y objetivos buscas promocionar..."
                        : "Tell us the dates and goals for your campaign..."
                    }
                  />
                </label>

                <div className="form-actions-right">
                  <button className="button primary" type="submit">
                    {es ? "Enviar solicitud" : "Send request"}
                  </button>
                </div>
              </form>
            ) : (
              <p className="notice notice-error">
                {es
                  ? "Las nuevas solicitudes de promoción están pausadas temporalmente. Tus solicitudes anteriores siguen visibles."
                  : "New promotion requests are temporarily paused. Your previous requests remain visible."}
              </p>
            )}

            {promotions && promotions.length > 0 && (
              <div className="managed-list">
                {promotions.map((item) => (
                  <div className="managed-row" key={item.id}>
                    <strong>{item.service}</strong>
                    <span className="status-pill badge-neutral">
                      {item.state}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </details>
        )}

        {/* Analytics View */}
        {view === "analytics" &&
          analytics.map(({ venue, rows }) => (
            <section className="panel catalogue-edit-card" key={venue.id}>
              <h2>
                {venue.name} · {es ? "Últimos 30 días" : "Last 30 days"}
              </h2>

              {rows.length ? (
                <div className="workspace-summary-grid">
                  {rows.map((row) => (
                    <article className="panel workspace-stat" key={row.action}>
                      <span>{row.action.replaceAll("_", " ")}</span>
                      <strong>{row.total}</strong>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="catalogue-empty-card">
                  <p>
                    {es
                      ? "Aún no hay actividad o impresiones registradas en los últimos 30 días."
                      : "No activity or impressions registered in the last 30 days yet."}
                  </p>
                </div>
              )}
            </section>
          ))}

        {/* Claim Venue View */}
        {view === "claims" && claimable && claimable.length > 0 && (
          <details className="panel catalogue-edit-card" open>
            <summary>
              <strong>
                {es ? "Reclamar un local existente" : "Claim an existing venue"}
              </strong>
            </summary>

            <form action={submitVenueClaim} className="stack focused-form">
              <input type="hidden" name="locale" value={locale} />

              <label>
                {es
                  ? "Selecciona el local a reclamar"
                  : "Select venue to claim"}
                <select name="venueId" required>
                  {claimable.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {es
                  ? "Prueba de propiedad o administración del negocio"
                  : "Evidence of ownership or business relationship"}
                <textarea
                  name="evidence"
                  minLength={20}
                  required
                  rows={4}
                  placeholder={
                    es
                      ? "Proporciona enlaces, teléfono o datos de contacto oficial..."
                      : "Provide links, phone or official contact information..."
                  }
                />
              </label>

              <div className="form-actions-right">
                <button className="button primary" type="submit">
                  {es ? "Enviar reclamación" : "Submit claim"}
                </button>
              </div>
            </form>
          </details>
        )}

        {view === "claims" && claims && claims.length > 0 && (
          <section className="panel catalogue-edit-card">
            <h2>{es ? "Historial de reclamaciones" : "Claims history"}</h2>
            <div className="managed-list">
              {claims.map((c) => (
                <div className="managed-row" key={c.id}>
                  <strong>
                    {(c.venues as unknown as { name: string } | null)?.name}
                  </strong>
                  <span className="status-pill badge-neutral">{c.status}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </WorkspaceShell>
  );
}
