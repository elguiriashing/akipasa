import { notFound } from "next/navigation";
import {
  WorkspacePageHeader,
  WorkspaceEmpty,
} from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { resolveReport } from "../../moderation/actions";

export default async function SupportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const { supabase } = await requireUser(locale, `/${locale}/staff/support`);
  const { data } = await supabase
    .from("reports")
    .select("id,target_type,target_id,reason,details,state,created_at")
    .eq("state", "open")
    .order("created_at");
  const es = locale === "es";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Casos" : "Cases"}
        title={es ? "Soporte al cliente" : "Customer support"}
        description={
          es
            ? "Avisos enviados por usuarios. AkiPasa todavía no almacena conversaciones de soporte."
            : "User-submitted reports. AkiPasa does not yet store support conversations."
        }
      />
      {(query.updated || query.error) && (
        <p className="notice">
          {query.updated
            ? es
              ? "Caso actualizado."
              : "Case updated."
            : es
              ? "No se pudo actualizar."
              : "Update failed."}
        </p>
      )}
      {data?.length ? (
        <div className="queue-list">
          {data.map((item) => (
            <article className="panel queue-card" key={item.id}>
              <div className="queue-card-header">
                <div>
                  <h2>
                    {item.target_type} / {item.reason}
                  </h2>
                  <p>{item.details}</p>
                </div>
                <span className="status-pill">{item.state}</span>
              </div>
              <form action={resolveReport} className="moderation-form">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="reportId" value={item.id} />
                <input
                  name="resolution"
                  required
                  minLength={3}
                  aria-label={es ? "Resolución" : "Resolution"}
                  placeholder={es ? "Resolución" : "Resolution"}
                />
                <button className="button" name="decision" value="resolved">
                  {es ? "Resolver" : "Resolve"}
                </button>
                <button
                  className="button secondary"
                  name="decision"
                  value="dismissed"
                >
                  {es ? "Descartar" : "Dismiss"}
                </button>
              </form>
            </article>
          ))}
        </div>
      ) : (
        <WorkspaceEmpty
          title={es ? "Sin casos abiertos" : "No open cases"}
          description={
            es
              ? "Los nuevos avisos aparecerán aquí."
              : "New user reports will appear here."
          }
        />
      )}
    </>
  );
}
