import { notFound } from "next/navigation";
import {
  WorkspaceEmpty,
  WorkspacePageHeader,
} from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";

export default async function StaffPromotionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase } = await requireUser(locale, `/${locale}/staff/promotions`);
  const { data } = await supabase
    .from("promotion_requests")
    .select("id,service,message,state,operator_notes,created_at,venues(name)")
    .order("created_at", { ascending: false })
    .limit(50);
  const es = locale === "es";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Comercial" : "Commercial"}
        title={es ? "Promociones" : "Promotions"}
        description={
          es
            ? "Solicitudes de visibilidad y servicios enviadas por negocios."
            : "Visibility and service requests submitted by businesses."
        }
      />
      {data?.length ? (
        <div className="queue-list">
          {data.map((item) => {
            const venue = item.venues as unknown as {
              name?: string | null;
            } | null;
            return (
              <article className="panel queue-card" key={item.id}>
                <div className="queue-card-header">
                  <div>
                    <h2>
                      {venue?.name || (es ? "Local" : "Venue")} / {item.service}
                    </h2>
                    <p>{item.message}</p>
                  </div>
                  <span className="status-pill">{item.state}</span>
                </div>
                {item.operator_notes && <p>{item.operator_notes}</p>}
              </article>
            );
          })}
        </div>
      ) : (
        <WorkspaceEmpty
          title={es ? "Sin solicitudes" : "No requests"}
          description={
            es
              ? "Las nuevas promociones aparecerán aquí."
              : "New promotion requests will appear here."
          }
        />
      )}
    </>
  );
}
