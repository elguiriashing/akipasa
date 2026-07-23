import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { appRoles, isAdministrator, roleLabel } from "@/lib/roles";
import { CatalogueSettings } from "./CatalogueSettings";
import {
  changePlatformRole,
  createFeatureSlot,
  createPassport,
  updateDeletionRequest,
  updatePromotion,
} from "./actions";

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const { supabase, user } = await requireUser(locale, `/${locale}/admin`);
  const { data: me } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .single();
  if (!me || !isAdministrator(me.app_role)) notFound();
  const es = locale === "es";
  const [
    { data: profiles },
    { data: venues },
    { data: events },
    { data: promotions },
    { data: passports },
    { data: deletions },
    { data: features },
    { data: categories },
    { data: cities },
    { data: flags },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,display_name,app_role,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("venues").select("id,name,status").order("name"),
    supabase
      .from("events")
      .select("id,title_es,title_en,status,venues(name)")
      .eq("status", "published")
      .order("title_es"),
    supabase
      .from("promotion_requests")
      .select("id,service,message,state,operator_notes,created_at,venues(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("passports")
      .select("id,title_es,title_en,status,starts_at,ends_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("account_deletion_requests")
      .select(
        "id,profile_id,state,requested_at,profiles!account_deletion_requests_profile_id_fkey(display_name)",
      )
      .in("state", ["requested", "processing"])
      .order("requested_at"),
    supabase
      .from("feature_slots")
      .select("id,starts_at,ends_at,events(title_es)")
      .order("starts_at", { ascending: false }),
    supabase.from("categories").select("id,slug,name_es,name_en").order("slug"),
    supabase
      .from("cities")
      .select("id,slug,name_es,name_en,center,timezone")
      .order("name_es")
      .limit(100),
    supabase
      .from("feature_flags")
      .select("key,enabled,label_es,label_en,updated_at")
      .order("key"),
  ]);
  return (
    <main className="shell dashboard">
      <section className="hero">
        <div className="eyebrow">Admin</div>
        <h1>{es ? "Operaciones de plataforma" : "Platform operations"}</h1>
        <p className="lede">
          {es
            ? "Roles, pasaportes, promociones y solicitudes de privacidad con trazabilidad."
            : "Auditable roles, passports, promotions and privacy requests."}
        </p>
      </section>
      {query.updated && (
        <p className="notice">{es ? "Cambio guardado." : "Change saved."}</p>
      )}
      {query.error && (
        <p className="notice">
          {es
            ? "No se pudo guardar el cambio."
            : "The change could not be saved."}
        </p>
      )}
      <section className="dashboard-grid">
        <details className="panel">
          <summary>
            <strong>{es ? "Crear pasaporte" : "Create passport"}</strong>
          </summary>
          <form action={createPassport} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <label>
              Slug
              <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
            </label>
            <label>
              {es ? "Título" : "Spanish title"}
              <input name="titleEs" required />
            </label>
            <label>
              {es ? "Título en inglés" : "English title"}
              <input name="titleEn" />
            </label>
            <label>
              {es ? "Descripción" : "Spanish description"}
              <textarea name="descriptionEs" required minLength={20} />
            </label>
            <label>
              {es ? "Descripción en inglés" : "English description"}
              <textarea name="descriptionEn" />
            </label>
            <label>
              {es ? "Recompensa" : "Spanish reward"}
              <input name="rewardEs" required />
            </label>
            <label>
              {es ? "Recompensa en inglés" : "English reward"}
              <input name="rewardEn" />
            </label>
            <label>
              {es ? "Primer local" : "First venue"}
              <select name="venueId" required>
                {venues?.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {es ? "Paso" : "Spanish step"}
              <input name="stepEs" required />
            </label>
            <label>
              {es ? "Paso en inglés" : "English step"}
              <input name="stepEn" />
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
              {es ? "Publicar pasaporte" : "Publish passport"}
            </button>
          </form>
          {passports?.map((item) => (
            <div className="managed-row" key={item.id}>
              <strong>
                {locale === "en"
                  ? item.title_en || item.title_es
                  : item.title_es}
              </strong>
              <span>{item.status}</span>
            </div>
          ))}
        </details>
        <details className="panel">
          <summary>
            <strong>
              {es ? "Programar destacado" : "Schedule sponsored feature"}
            </strong>
          </summary>
          <form action={createFeatureSlot} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <label>
              {es ? "Evento" : "Event"}
              <select name="eventId" required>
                {events?.map((event) => (
                  <option key={event.id} value={event.id}>
                    {locale === "en"
                      ? event.title_en || event.title_es
                      : event.title_es}
                  </option>
                ))}
              </select>
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
              {es ? "Programar" : "Schedule"}
            </button>
          </form>
          {features?.map((item) => (
            <div className="managed-row" key={item.id}>
              <strong>
                {
                  (item.events as unknown as { title_es: string } | null)
                    ?.title_es
                }
              </strong>
              <span>{new Date(item.starts_at).toLocaleDateString(locale)}</span>
            </div>
          ))}
        </details>
        <section className="panel">
          <h2>{es ? "Solicitudes de eliminación" : "Deletion requests"}</h2>
          {deletions?.length ? (
            deletions.map((item) => (
              <form
                action={updateDeletionRequest}
                className="stack"
                key={item.id}
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="requestId" value={item.id} />
                <strong>
                  {(
                    item.profiles as unknown as {
                      display_name: string | null;
                    } | null
                  )?.display_name ||
                    item.profile_id?.slice(0, 8) ||
                    (es ? "Identidad eliminada" : "Deleted identity")}
                </strong>
                <span>{item.state}</span>
                <label>
                  {es ? "Estado" : "State"}
                  <select name="state" defaultValue="processing">
                    <option value="processing">
                      {es ? "En proceso" : "Processing"}
                    </option>
                    <option value="completed">
                      {es ? "Completada" : "Completed"}
                    </option>
                    <option value="cancelled">
                      {es ? "Cancelada" : "Cancelled"}
                    </option>
                  </select>
                </label>
                <label>
                  {es
                    ? "Motivo y registro operativo"
                    : "Reason and operator record"}
                  <textarea name="reason" required minLength={10} />
                </label>
                <label className="consent-row">
                  <input name="confirmedDeleted" type="checkbox" />
                  <span>
                    {es
                      ? "La identidad de Supabase y los datos eliminables ya se borraron. Obligatorio para completar."
                      : "The Supabase identity and erasable data have been deleted. Required before completion."}
                  </span>
                </label>
                <button className="button" type="submit">
                  {es ? "Actualizar solicitud" : "Update request"}
                </button>
              </form>
            ))
          ) : (
            <p>
              {es ? "No hay solicitudes pendientes." : "No pending requests."}
            </p>
          )}
        </section>
      </section>
      <CatalogueSettings
        locale={locale}
        categories={categories || []}
        cities={cities || []}
        flags={flags || []}
      />
      <section className="queue-section">
        <h2>{es ? "Solicitudes de promoción" : "Promotion requests"}</h2>
        {promotions?.length ? (
          promotions.map((item) => (
            <article className="panel queue-card" key={item.id}>
              <h3>
                {(item.venues as unknown as { name: string } | null)?.name} ·{" "}
                {item.service}
              </h3>
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
            </article>
          ))
        ) : (
          <p>{es ? "No hay solicitudes." : "No requests."}</p>
        )}
      </section>
      <section className="queue-section">
        <h2>{es ? "Acceso y roles" : "Access and roles"}</h2>
        <div className="dashboard-grid">
          {profiles?.map((profile) => (
            <article className="panel" key={profile.id}>
              <h3>
                {profile.display_name ||
                  (es ? "Usuario sin nombre" : "Unnamed user")}
              </h3>
              <p>
                {roleLabel(profile.app_role, locale)} · {profile.id.slice(0, 8)}
              </p>
              {profile.id !== user.id && (
                <form action={changePlatformRole} className="stack">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="profileId" value={profile.id} />
                  <label>
                    {es ? "Nuevo rol" : "New role"}
                    <select name="role" defaultValue={profile.app_role}>
                      {appRoles.map((role) => (
                        <option value={role} key={role}>
                          {roleLabel(role, locale)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {es ? "Motivo (obligatorio)" : "Reason (required)"}
                    <textarea name="reason" required minLength={10} />
                  </label>
                  <button className="button" type="submit">
                    {es ? "Cambiar rol" : "Change role"}
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
