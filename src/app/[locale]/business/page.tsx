import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { loadFeatureFlags } from "@/lib/feature-flags";
import { requireUser } from "@/lib/auth";
import {
  confirmRedemption,
  createEvent,
  createVenue,
  requestPromotion,
  saveLoyaltyProgram,
  submitVenueClaim,
} from "./actions";
import { sortedSpainLocations } from "@/lib/locations";

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
  const { supabase, user } = await requireUser(locale);
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
  return (
    <main className="shell dashboard">
      <section className="hero">
        <div className="eyebrow">{es ? "Negocios" : "Business"}</div>
        <h1>{es ? "Tu panel" : "Your dashboard"}</h1>
        <p className="lede">
          {es
            ? "Crea o reclama un local y publica actividades."
            : "Create or claim a venue and publish activities."}
        </p>
      </section>
      {query.created && (
        <p className="notice">
          {es
            ? "Guardado correctamente. Puede estar pendiente de revisión."
            : "Saved successfully. It may be awaiting review."}
        </p>
      )}
      {query.error && (
        <p className="notice">
          {es
            ? "No se pudo guardar. Revisa los campos o permisos."
            : "Could not save. Check the fields or permissions."}
        </p>
      )}
      <section className="dashboard-grid">
        <div className="panel">
          <h2>{es ? "Locales gestionados" : "Managed venues"}</h2>
          {managed.length ? (
            managed.map(
              (m) =>
                m.venues && (
                  <div className="managed-row" key={m.venues.id}>
                    <strong>
                      <a href={`/${locale}/business/venue/${m.venues.id}`}>
                        {m.venues.name} →
                      </a>
                    </strong>
                    <span>
                      {m.role} · {m.venues.status}
                    </span>
                  </div>
                ),
            )
          ) : (
            <p>
              {es
                ? "Todavía no gestionas ningún local."
                : "You do not manage a venue yet."}
            </p>
          )}
        </div>
        <details className="panel" open={!managed.length}>
          <summary>
            <strong>{es ? "Crear un local" : "Create a venue"}</strong>
          </summary>
          <form action={createVenue} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <label>
              {es ? "Ciudad" : "City"}
              <select name="locality" required defaultValue="fuengirola">
                {sortedSpainLocations.map(([key, place]) => (
                  <option key={key} value={key}>
                    {place[locale]} · {place.province}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {es ? "Nombre" : "Name"}
              <input name="name" required minLength={2} />
            </label>
            <label>
              Slug
              <input
                name="slug"
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="mi-local"
              />
            </label>
            <label>
              {es ? "Descripción en español" : "Spanish description"}
              <textarea name="descriptionEs" required minLength={20} />
            </label>
            <label>
              {es ? "Descripción en inglés" : "English description"}
              <textarea name="descriptionEn" />
            </label>
            <label>
              {es ? "Dirección" : "Address"}
              <input name="address" required />
            </label>
            <div className="two-col">
              <label>
                Latitude
                <input
                  name="latitude"
                  type="number"
                  step="any"
                  defaultValue="36.539"
                  required
                />
              </label>
              <label>
                Longitude
                <input
                  name="longitude"
                  type="number"
                  step="any"
                  defaultValue="-4.624"
                  required
                />
              </label>
            </div>
            <button className="button" type="submit">
              {es
                ? "Crear y enviar a revisión"
                : "Create and submit for review"}
            </button>
          </form>
        </details>
        {managed.length > 0 && (
          <details className="panel">
            <summary>
              <strong>{es ? "Crear evento" : "Create event"}</strong>
            </summary>
            <form action={createEvent} className="stack">
              <input type="hidden" name="locale" value={locale} />
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
                {es ? "Categoría" : "Category"}
                <select name="categoryId" required>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {locale === "es" ? c.name_es : c.name_en}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Slug
                <input
                  name="slug"
                  required
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                />
              </label>
              <label>
                {es ? "Título en español" : "Spanish title"}
                <input name="titleEs" required />
              </label>
              <label>
                {es ? "Título en inglés" : "English title"}
                <input name="titleEn" />
              </label>
              <label>
                {es ? "Descripción en español" : "Spanish description"}
                <textarea name="descriptionEs" required minLength={20} />
              </label>
              <label>
                {es ? "Descripción en inglés" : "English description"}
                <textarea name="descriptionEn" />
              </label>
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
              <label>
                {es ? "Enlace de reserva HTTPS" : "HTTPS booking link"}
                <input name="bookingUrl" type="url" placeholder="https://" />
              </label>
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
                {es ? "Crear evento" : "Create event"}
              </button>
            </form>
          </details>
        )}
        {managed.length > 0 && (
          <details className="panel">
            <summary>
              <strong>
                {es ? "Sellos y recompensas" : "Stamps and rewards"}
              </strong>
            </summary>
            <form action={saveLoyaltyProgram} className="stack">
              <input type="hidden" name="locale" value={locale} />
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
                {es ? "Nombre del programa" : "Programme name"}
                <input name="titleEs" required minLength={3} />
              </label>
              <label>
                {es ? "Nombre en inglés" : "English name"}
                <input name="titleEn" />
              </label>
              <label>
                {es ? "Recompensa" : "Reward"}
                <textarea name="rewardEs" required minLength={3} />
              </label>
              <label>
                {es ? "Recompensa en inglés" : "English reward"}
                <textarea name="rewardEn" />
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
              <button className="button" type="submit">
                {es ? "Guardar programa" : "Save programme"}
              </button>
            </form>
            {programs?.map((program) => (
              <div className="managed-row" key={program.id}>
                <div>
                  <strong>
                    {locale === "en"
                      ? program.title_en || program.title_es
                      : program.title_es}
                  </strong>
                  <br />
                  <a href={`/${locale}/check-in/${program.check_in_token}`}>
                    {es ? "Abrir enlace de check-in" : "Open check-in link"}
                  </a>
                </div>
                <span>
                  {program.stamps_required} {es ? "sellos" : "stamps"}
                </span>
              </div>
            ))}
          </details>
        )}
        {redemptions && redemptions.length > 0 && (
          <section className="panel">
            <h2>{es ? "Recompensas pendientes" : "Pending rewards"}</h2>
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
                <button className="button" type="submit">
                  {es ? "Confirmar entrega" : "Confirm handover"}
                </button>
              </form>
            ))}
          </section>
        )}
        {managed.length > 0 && (
          <details className="panel">
            <summary>
              <strong>
                {es ? "Promocionar un evento" : "Promote an event"}
              </strong>
            </summary>
            {flags.promotion_requests ? (
              <form action={requestPromotion} className="stack">
                <input type="hidden" name="locale" value={locale} />
                <label>
                  {es ? "Local" : "Venue"}
                  <select name="venueId" required>
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
                  {es ? "Servicio" : "Service"}
                  <select name="service">
                    <option value="featured_listing">
                      {es ? "Destacado patrocinado" : "Sponsored feature"}
                    </option>
                    <option value="social_campaign">
                      {es ? "Campaña social" : "Social campaign"}
                    </option>
                    <option value="content_package">
                      {es ? "Paquete de contenido" : "Content package"}
                    </option>
                    <option value="other">{es ? "Otro" : "Other"}</option>
                  </select>
                </label>
                <label>
                  {es ? "Cuéntanos qué necesitas" : "Tell us what you need"}
                  <textarea name="message" required minLength={20} />
                </label>
                <button className="button" type="submit">
                  {es ? "Enviar solicitud" : "Send request"}
                </button>
              </form>
            ) : (
              <p className="notice">
                {es
                  ? "Las nuevas solicitudes de promoción están pausadas temporalmente. Tus solicitudes anteriores siguen visibles."
                  : "New promotion requests are temporarily paused. Your previous requests remain visible."}
              </p>
            )}
            {promotions?.map((item) => (
              <div className="managed-row" key={item.id}>
                <strong>{item.service}</strong>
                <span>{item.state}</span>
              </div>
            ))}
          </details>
        )}
        {analytics.map(({ venue, rows }) => (
          <section className="panel" key={venue.id}>
            <h2>
              {venue.name} · {es ? "últimos 30 días" : "last 30 days"}
            </h2>
            {rows.length ? (
              rows.map((row) => (
                <div className="managed-row" key={row.action}>
                  <strong>{row.action.replaceAll("_", " ")}</strong>
                  <span>{row.total}</span>
                </div>
              ))
            ) : (
              <p>
                {es
                  ? "Aún no hay actividad agregada."
                  : "No aggregate activity yet."}
              </p>
            )}
          </section>
        ))}
        {claimable && claimable.length > 0 && (
          <details className="panel">
            <summary>
              <strong>{es ? "Reclamar un local" : "Claim a venue"}</strong>
            </summary>
            <form action={submitVenueClaim} className="stack">
              <input type="hidden" name="locale" value={locale} />
              <label>
                {es ? "Local" : "Venue"}
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
                  ? "Prueba de relación con el negocio"
                  : "Evidence of your relationship"}
                <textarea name="evidence" minLength={20} required />
              </label>
              <button className="button" type="submit">
                {es ? "Enviar reclamación" : "Submit claim"}
              </button>
            </form>
          </details>
        )}
        {claims && claims.length > 0 && (
          <section className="panel">
            <h2>{es ? "Reclamaciones" : "Claims"}</h2>
            {claims.map((c) => (
              <div className="managed-row" key={c.id}>
                <strong>
                  {(c.venues as unknown as { name: string } | null)?.name}
                </strong>
                <span>{c.status}</span>
              </div>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
