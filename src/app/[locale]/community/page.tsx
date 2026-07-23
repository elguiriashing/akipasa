import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { loadFeatureFlags } from "@/lib/feature-flags";
import { submitCommunityEvent, submitReport } from "./actions";

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const { supabase, user } = await requireUser(locale, `/${locale}/community`);
  const flags = await loadFeatureFlags(supabase);
  const es = locale === "es";
  const [
    { data: events },
    { data: venues },
    { data: submissions },
    { data: reports },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id,title_es,title_en")
      .eq("status", "published")
      .order("title_es"),
    supabase
      .from("venues")
      .select("id,name")
      .eq("status", "published")
      .order("name"),
    supabase
      .from("event_submissions")
      .select("id,title,state,created_at")
      .eq("submitter_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reports")
      .select("id,target_type,reason,state,created_at")
      .eq("reporter_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  return (
    <main className="shell dashboard">
      <section className="hero">
        <div className="eyebrow">{es ? "Comunidad" : "Community"}</div>
        <h1>
          {es ? "Ayuda a mantener AkiPasa al día" : "Help keep AkiPasa current"}
        </h1>
        <p className="lede">
          {es
            ? "Sugiere actividades que faltan o avísanos de información incorrecta. Las sugerencias se revisan antes de publicarse."
            : "Suggest missing activities or flag incorrect information. Suggestions are reviewed before publication."}
        </p>
      </section>
      {query.created && (
        <p className="notice">
          {es
            ? "Enviado correctamente para revisión."
            : "Submitted successfully for review."}
        </p>
      )}
      {query.error && (
        <p className="notice">
          {query.error === "rate-limit"
            ? es
              ? "Has alcanzado el límite temporal de envíos. Inténtalo de nuevo más tarde."
              : "You have reached the temporary submission limit. Try again later."
            : es
              ? "No se pudo enviar. Revisa los datos o si ya enviaste el mismo aviso."
              : "Could not submit. Check the details or whether you already sent the same report."}
        </p>
      )}
      <section className="dashboard-grid">
        <details className="panel" open>
          <summary>
            <strong>{es ? "Sugerir un evento" : "Suggest an event"}</strong>
          </summary>
          {flags.community_submissions ? (
            <form action={submitCommunityEvent} className="stack">
              <input type="hidden" name="locale" value={locale} />
              <label>
                {es ? "Nombre del local" : "Venue name"}
                <input name="venueName" required minLength={2} />
              </label>
              <label>
                {es ? "Dirección" : "Address"}
                <input name="venueAddress" required minLength={5} />
              </label>
              <label>
                {es ? "Título" : "Title"}
                <input name="title" required minLength={3} />
              </label>
              <label>
                {es ? "Descripción" : "Description"}
                <textarea name="description" required minLength={20} />
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
              <label>
                {es ? "Fuente HTTPS (opcional)" : "HTTPS source (optional)"}
                <input name="sourceUrl" type="url" placeholder="https://" />
              </label>
              <button className="button" type="submit">
                {es ? "Enviar a revisión" : "Submit for review"}
              </button>
            </form>
          ) : (
            <p className="notice">
              {es
                ? "Las sugerencias de eventos están pausadas temporalmente. Los avisos sobre eventos existentes siguen disponibles."
                : "Event suggestions are temporarily paused. Reports about existing events remain available."}
            </p>
          )}
        </details>
        <details className="panel">
          <summary>
            <strong>
              {es ? "Informar de un problema" : "Report a problem"}
            </strong>
          </summary>
          <form action={submitReport} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <label>
              {es ? "Elemento" : "Item"}
              <select
                name="target"
                required
                defaultValue={
                  typeof query.target === "string" ? query.target : undefined
                }
              >
                <optgroup label={es ? "Eventos" : "Events"}>
                  {events?.map((event) => (
                    <option key={event.id} value={`event:${event.id}`}>
                      {locale === "es"
                        ? event.title_es
                        : event.title_en || event.title_es}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={es ? "Locales" : "Venues"}>
                  {venues?.map((venue) => (
                    <option key={venue.id} value={`venue:${venue.id}`}>
                      {venue.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <label>
              {es ? "Motivo" : "Reason"}
              <select name="reason" required>
                <option value="cancelled">
                  {es ? "Cancelado" : "Cancelled"}
                </option>
                <option value="duplicate">
                  {es ? "Duplicado" : "Duplicate"}
                </option>
                <option value="incorrect">
                  {es ? "Datos incorrectos" : "Incorrect details"}
                </option>
                <option value="scam">Scam</option>
                <option value="other">{es ? "Otro" : "Other"}</option>
              </select>
            </label>
            <label>
              {es ? "Detalles" : "Details"}
              <textarea name="details" required minLength={10} />
            </label>
            <button
              className="button"
              type="submit"
              disabled={!events?.length && !venues?.length}
            >
              {es ? "Enviar aviso" : "Submit report"}
            </button>
          </form>
        </details>
        <section className="panel">
          <h2>{es ? "Tus sugerencias" : "Your suggestions"}</h2>
          {submissions?.length ? (
            submissions.map((item) => (
              <div className="managed-row" key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.state}</span>
              </div>
            ))
          ) : (
            <p>
              {es
                ? "Aún no has enviado sugerencias."
                : "No suggestions submitted yet."}
            </p>
          )}
        </section>
        <section className="panel">
          <h2>{es ? "Tus avisos" : "Your reports"}</h2>
          {reports?.length ? (
            reports.map((item) => (
              <div className="managed-row" key={item.id}>
                <strong>
                  {item.target_type} · {item.reason}
                </strong>
                <span>{item.state}</span>
              </div>
            ))
          ) : (
            <p>
              {es ? "Aún no has enviado avisos." : "No reports submitted yet."}
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
