import Link from "next/link";
import { notFound } from "next/navigation";
import {
  WorkspaceEmpty,
  WorkspacePageHeader,
} from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { reviewBusinessApplication } from "./actions";

const statuses = ["draft", "pending", "published", "rejected", "archived"];

export default async function StaffCataloguePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const kind =
    query.kind === "events" || query.kind === "applications"
      ? query.kind
      : "venues";
  const search = String(query.q || "")
    .trim()
    .slice(0, 80);
  const status = statuses.includes(query.status || "") ? query.status! : "";
  const { supabase } = await requireUser(locale, `/${locale}/staff/catalogue`);

  let response;
  if (kind === "venues") {
    let request = supabase
      .from("venues")
      .select("id,name,slug,status,verified,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (search) request = request.ilike("name", `%${search}%`);
    if (status) request = request.eq("status", status);
    response = await request;
  } else if (kind === "events") {
    let request = supabase
      .from("events")
      .select("id,venue_id,title_es,title_en,status,created_at,venues(id,name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (search) request = request.ilike("title_es", `%${search}%`);
    if (status) request = request.eq("status", status);
    response = await request;
  } else {
    let request = supabase
      .from("business_applications")
      .select(
        "id,applicant_id,business_name,contact_name,locality,state,payment_state,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (search) request = request.ilike("business_name", `%${search}%`);
    response = await request;
  }

  const es = locale === "es";
  const rows = (response.data || []) as Array<Record<string, unknown>>;

  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Inventario" : "Inventory"}
        title={es ? "Locales y eventos" : "Venues and events"}
        description={
          es
            ? "Busca cualquier registro, abre su ficha y aplica cambios auditados."
            : "Search any record, open its workspace, and apply audited changes."
        }
      />
      {(query.updated || query.error) && (
        <p className="notice">
          {query.updated
            ? es
              ? "Cambio guardado y auditado."
              : "Change saved and audited."
            : es
              ? "No se pudo guardar la decision."
              : "The decision could not be saved."}
        </p>
      )}
      <nav
        className="workspace-subnav"
        aria-label={es ? "Tipo de catalogo" : "Catalogue type"}
      >
        <Link
          href={`/${locale}/staff/catalogue?kind=venues`}
          className={kind === "venues" ? "active" : undefined}
        >
          {es ? "Locales" : "Venues"}
        </Link>
        <Link
          href={`/${locale}/staff/catalogue?kind=events`}
          className={kind === "events" ? "active" : undefined}
        >
          {es ? "Eventos" : "Events"}
        </Link>
        <Link
          href={`/${locale}/staff/catalogue?kind=applications`}
          className={kind === "applications" ? "active" : undefined}
        >
          {es ? "Solicitudes de negocio" : "Business applications"}
        </Link>
      </nav>
      <form className="panel workspace-filter-bar" method="get">
        <input type="hidden" name="kind" value={kind} />
        <label>
          {es ? "Buscar" : "Search"}
          <input
            name="q"
            defaultValue={search}
            placeholder={
              kind === "venues"
                ? es
                  ? "Nombre del local"
                  : "Venue name"
                : kind === "events"
                  ? es
                    ? "Titulo del evento"
                    : "Event title"
                  : es
                    ? "Nombre del negocio"
                    : "Business name"
            }
          />
        </label>
        {kind !== "applications" && (
          <label>
            {es ? "Estado" : "Status"}
            <select name="status" defaultValue={status}>
              <option value="">{es ? "Todos" : "All"}</option>
              {statuses.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="button secondary" type="submit">
          {es ? "Aplicar" : "Apply"}
        </button>
      </form>
      {rows.length ? (
        <div className="panel managed-list">
          {rows.map((item) => (
            <div className="managed-row" key={String(item.id)}>
              <div>
                <strong>
                  {kind === "venues"
                    ? String(item.name)
                    : kind === "applications"
                      ? String(item.business_name)
                      : String(
                          (locale === "en"
                            ? item.title_en || item.title_es
                            : item.title_es || item.title_en) || item.id,
                        )}
                </strong>
                <span>
                  {kind === "venues"
                    ? `${String(item.slug)} / ${String(item.status)}`
                    : kind === "applications"
                      ? `${String(item.locality)} / ${String(item.state)} / ${String(item.payment_state)}`
                      : `${String((item.venues as { name?: string } | null)?.name || "")} / ${String(item.status)}`}
                </span>
              </div>
              {kind === "venues" && (
                <Link
                  className="button secondary"
                  href={`/${locale}/staff/catalogue/venues/${String(item.id)}`}
                >
                  {es ? "Gestionar" : "Manage"}
                </Link>
              )}
              {kind === "events" && (
                <Link
                  className="button secondary"
                  href={`/${locale}/staff/catalogue/venues/${String(item.venue_id)}`}
                >
                  {es ? "Gestionar" : "Manage"}
                </Link>
              )}
              {kind === "applications" && (
                <details className="settings-disclosure">
                  <summary>{es ? "Revisar" : "Review"}</summary>
                  <form action={reviewBusinessApplication} className="stack">
                    <input type="hidden" name="locale" value={locale} />
                    <input
                      type="hidden"
                      name="applicationId"
                      value={String(item.id)}
                    />
                    <input
                      type="hidden"
                      name="applicantId"
                      value={String(item.applicant_id)}
                    />
                    <label>
                      {es ? "Decision" : "Decision"}
                      <select name="state" defaultValue="under_review">
                        <option value="under_review">under_review</option>
                        <option value="awaiting_payment">
                          awaiting_payment
                        </option>
                        <option value="rejected">rejected</option>
                      </select>
                    </label>
                    <label>
                      {es ? "Acceso sin cobro" : "No-charge access"}
                      <select name="grantKind" defaultValue="none">
                        <option value="none">{es ? "Ninguno" : "None"}</option>
                        <option value="trial_1_month">
                          {es ? "Prueba de 1 mes" : "1-month trial"}
                        </option>
                        <option value="trial_3_month">
                          {es ? "Prueba de 3 meses" : "3-month trial"}
                        </option>
                        <option value="waived">
                          {es ? "Exencion indefinida" : "Indefinite waiver"}
                        </option>
                      </select>
                    </label>
                    <label>
                      {es ? "Motivo" : "Reason"}
                      <textarea name="reason" required minLength={10} />
                    </label>
                    <button className="button secondary" type="submit">
                      {es ? "Guardar decision" : "Save decision"}
                    </button>
                  </form>
                </details>
              )}
            </div>
          ))}
        </div>
      ) : (
        <WorkspaceEmpty
          title={es ? "Sin resultados" : "No results"}
          description={
            es
              ? "No hay registros que coincidan con estos filtros."
              : "No records match these filters."
          }
        />
      )}
    </>
  );
}
