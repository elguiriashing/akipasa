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
        <div className="panel managed-list">
          {data.map((item) => (
            <div className="managed-row" key={item.id}>
              <div>
                <strong>
                  {item.action} / {item.target_type}
                </strong>
                <span>{item.reason}</span>
              </div>
              <time dateTime={item.created_at}>
                {new Date(item.created_at).toLocaleString(locale)}
              </time>
            </div>
          ))}
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
