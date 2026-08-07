import { notFound } from "next/navigation";
import {
  WorkspaceEmpty,
  WorkspacePageHeader,
} from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { createPassport } from "../actions";

export default async function AdminPassportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const { supabase } = await requireUser(locale, `/${locale}/admin/passports`);
  const [{ data: passports }, { data: venues }] = await Promise.all([
    supabase
      .from("passports")
      .select("id,title_es,title_en,status,starts_at,ends_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("venues")
      .select("id,name")
      .eq("status", "published")
      .order("name"),
  ]);
  const es = locale === "es";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Recompensas" : "Rewards"}
        title={es ? "Pasaportes" : "Passports"}
        description={
          es
            ? "Consulta campañas existentes. El formulario de creación permanece oculto hasta que lo necesitas."
            : "Review existing campaigns. Creation stays hidden until needed."
        }
      />
      {(query.updated || query.error) && (
        <p className="notice">
          {query.updated
            ? es
              ? "Pasaporte creado."
              : "Passport created."
            : es
              ? "No se pudo crear."
              : "Creation failed."}
        </p>
      )}
      <details className="panel sensitive-action">
        <summary>{es ? "Crear pasaporte" : "Create passport"}</summary>
        <form action={createPassport} className="stack">
          <input type="hidden" name="locale" value={locale} />
          <label>
            Slug
            <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
          </label>
          <div className="two-col">
            <label>
              {es ? "Título en español" : "Spanish title"}
              <input name="titleEs" required minLength={3} />
            </label>
            <label>
              {es ? "Título en inglés" : "English title"}
              <input name="titleEn" />
            </label>
          </div>
          <label>
            {es ? "Descripción en español" : "Spanish description"}
            <textarea name="descriptionEs" required minLength={20} />
          </label>
          <label>
            {es ? "Descripción en inglés" : "English description"}
            <textarea name="descriptionEn" />
          </label>
          <label>
            {es ? "Premio en español" : "Spanish reward"}
            <input name="rewardEs" required minLength={3} />
          </label>
          <label>
            {es ? "Premio en inglés" : "English reward"}
            <input name="rewardEn" />
          </label>
          <label>
            {es ? "Local del primer paso" : "First step venue"}
            <select name="venueId" required>
              <option value="">
                {es ? "Selecciona un local" : "Select a venue"}
              </option>
              {(venues || []).map((venue) => (
                <option value={venue.id} key={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </label>
          <div className="two-col">
            <label>
              {es ? "Paso en español" : "Spanish step"}
              <input name="stepEs" required minLength={3} />
            </label>
            <label>
              {es ? "Paso en inglés" : "English step"}
              <input name="stepEn" />
            </label>
          </div>
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
            {es ? "Crear campaña" : "Create campaign"}
          </button>
        </form>
      </details>
      {passports?.length ? (
        <div className="panel managed-list">
          {passports.map((item) => (
            <div className="managed-row" key={item.id}>
              <div>
                <strong>
                  {locale === "en"
                    ? item.title_en || item.title_es
                    : item.title_es}
                </strong>
                <span>
                  {new Date(item.starts_at).toLocaleDateString(locale)} –{" "}
                  {new Date(item.ends_at).toLocaleDateString(locale)}
                </span>
              </div>
              <span className="status-pill">{item.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <WorkspaceEmpty
          title={es ? "Sin pasaportes" : "No passports"}
          description={
            es
              ? "Crea la primera campaña cuando esté lista."
              : "Create the first campaign when it is ready."
          }
        />
      )}
    </>
  );
}
