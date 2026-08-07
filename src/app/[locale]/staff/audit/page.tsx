import { notFound } from "next/navigation";
import {
  WorkspaceEmpty,
  WorkspacePageHeader,
} from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";

export default async function StaffAuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase } = await requireUser(locale, `/${locale}/staff/audit`);
  const { data } = await supabase
    .from("moderation_actions")
    .select("id,action,target_type,target_id,reason,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const es = locale === "es";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Trazabilidad" : "Traceability"}
        title={es ? "Historial de auditoría" : "Audit history"}
        description={
          es
            ? "Decisiones recientes de moderación y operaciones."
            : "Recent moderation and operations decisions."
        }
      />
      {data?.length ? (
        <div className="audit-card-list">
          {data.map((item) => {
            const badgeClass =
              item.action.includes("published") || item.action.includes("create")
                ? "badge-success"
                : item.action.includes("delete") || item.action.includes("reject")
                  ? "badge-danger"
                  : item.action.includes("role")
                    ? "badge-warning"
                    : "badge-neutral";

            return (
              <article className="panel audit-card" key={item.id}>
                <div className="audit-card-header">
                  <div className="audit-title-group">
                    <span className={`status-pill ${badgeClass}`}>
                      {item.action}
                    </span>
                    <strong className="audit-target-type">{item.target_type}</strong>
                  </div>
                  <time className="audit-time" dateTime={item.created_at}>
                    {new Intl.DateTimeFormat(es ? "es-ES" : "en-GB", {
                      dateStyle: "medium",
                      timeStyle: "medium",
                    }).format(new Date(item.created_at))}
                  </time>
                </div>
                <p className="audit-reason">{item.reason}</p>
              </article>
            );
          })}
        </div>
      ) : (
        <WorkspaceEmpty
          title={es ? "Sin actividad" : "No activity"}
          description={
            es
              ? "Las acciones auditadas aparecerán aquí."
              : "Audited actions will appear here."
          }
        />
      )}
    </>
  );
}
