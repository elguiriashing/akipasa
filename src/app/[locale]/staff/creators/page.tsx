import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { requireUser } from "@/lib/auth";
import { moderateCreator } from "./actions";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
export default async function CreatorModerationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  const query = await searchParams;
  const { supabase } = await requireUser(locale);
  const { data: requests, error: loadError } = await supabase
    .from("creator_profiles")
    .select(
      "profile_id,slug,display_name,headline_es,headline_en,bio_es,bio_en,locality,province,avatar_url,website_url,instagram_url,youtube_url,updated_at",
    )
    .eq("verification_state", "pending")
    .order("updated_at");
  return (
    <>
      <WorkspacePageHeader
        level={1}
        eyebrow={es ? "Confianza" : "Trust"}
        title={es ? "Verificación de creadores" : "Creator verification"}
        description={
          es
            ? "Comprueba identidad, presencia pública, historial y cumplimiento antes de aprobar."
            : "Check identity, public presence, history and compliance before approval."
        }
      />
      {query.updated && (
        <p className="notice">
          {es ? "Decisión guardada." : "Decision saved."}
        </p>
      )}
      {query.error && (
        <p className="notice" role="alert">
          {es
            ? "No se pudo guardar la decisión. Revisa los datos, el motivo y los permisos."
            : "Could not save the decision. Check the data, reason, and permissions."}
        </p>
      )}
      {loadError ? (
        <div className="notice" role="alert">
          <p>
            {es
              ? "No se pudieron cargar las solicitudes de creadores. Vuelve a intentarlo."
              : "Could not load creator requests. Please try again."}
          </p>
          <Link className="button secondary" href={`/${locale}/staff/creators`}>
            {es ? "Reintentar" : "Retry"}
          </Link>
        </div>
      ) : (
        <div className="creator-review-queue">
          {(requests || []).map((request) => (
            <article className="panel" key={request.profile_id}>
              <div>
                <span className="pill-muted">
                  {[request.locality, request.province]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </span>
                <h2>{request.display_name}</h2>
                <p>
                  {(es ? request.headline_es : request.headline_en) ||
                    request.headline_es}
                </p>
                <p>
                  {(es ? request.bio_es : request.bio_en) || request.bio_es}
                </p>
                <div className="creator-socials">
                  {request.website_url && (
                    <a
                      href={request.website_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Website
                    </a>
                  )}
                  {request.instagram_url && (
                    <a
                      href={request.instagram_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Instagram
                    </a>
                  )}
                  {request.youtube_url && (
                    <a
                      href={request.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      YouTube
                    </a>
                  )}
                </div>
              </div>
              <form action={moderateCreator} className="stack">
                <input type="hidden" name="locale" value={locale} />
                <input
                  type="hidden"
                  name="profileId"
                  value={request.profile_id}
                />
                <label>
                  {es
                    ? "Motivo y notas de auditoría"
                    : "Reason and audit notes"}
                  <textarea
                    name="reason"
                    required
                    minLength={3}
                    maxLength={1000}
                  />
                </label>
                <div className="inline-actions">
                  <button
                    className="button button-strong"
                    name="decision"
                    value="verified"
                  >
                    {es ? "Verificar" : "Verify"}
                  </button>
                  <button className="button" name="decision" value="rejected">
                    {es ? "Rechazar" : "Reject"}
                  </button>
                </div>
              </form>
            </article>
          ))}
        </div>
      )}
      {!loadError && !requests?.length && (
        <p className="empty-state">
          {es ? "No hay solicitudes pendientes." : "No pending requests."}
        </p>
      )}
    </>
  );
}
