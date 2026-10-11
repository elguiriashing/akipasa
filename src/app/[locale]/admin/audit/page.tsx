import { AdminSearchList } from "../AdminSearchList";
import { notFound } from "next/navigation";
import {
  WorkspaceEmpty,
  WorkspacePageHeader,
} from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { isAdministrator } from "@/lib/roles";

export default async function AdminAuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/admin/audit`,
  );
  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !isAdministrator(profile.app_role)) notFound();
  const { data } = await supabase
    .from("moderation_actions")
    .select(
      "id,actor_id,action,target_type,target_id,reason,metadata,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(150);
  const es = locale === "es";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Gobernanza" : "Governance"}
        title={es ? "Historial de auditoría" : "Audit history"}
        description={
          es
            ? "Cambios privilegiados y decisiones operativas recientes."
            : "Recent privileged changes and operational decisions."
        }
      />
      <AdminSearchList
        locale={locale}
        label={es ? "Historial de auditoría" : "Audit history"}
        statuses={[]}
        items={(data || []).map((item) => {
          const badgeClass =
            item.action.includes("published") || item.action.includes("create")
              ? "badge-success"
              : item.action.includes("delete") || item.action.includes("reject")
                ? "badge-danger"
                : item.action.includes("role")
                  ? "badge-warning"
                  : "badge-neutral";
          return {
            id: item.id,
            status: item.target_type,
            search: [
              item.action,
              item.target_type,
              item.reason,
              item.target_id,
              item.actor_id,
            ]
              .filter(Boolean)
              .join(" "),
            content: (
              <article className="panel audit-card">
                <div className="audit-card-header">
                  <div className="audit-title-group">
                    <span className={`status-pill ${badgeClass}`}>
                      {item.action.replaceAll("_", " ")}
                    </span>
                    <strong className="audit-target-type">
                      {item.target_type.replaceAll("_", " ")}
                    </strong>
                  </div>
                  <time className="audit-time" dateTime={item.created_at}>
                    {new Intl.DateTimeFormat(es ? "es-ES" : "en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(item.created_at))}
                  </time>
                </div>
                <p className="audit-reason">{item.reason}</p>
              </article>
            ),
          };
        })}
      />
    </>
  );
}
