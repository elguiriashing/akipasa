import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { AccountItems } from "../AccountItems";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase } = await requireUser(locale);
  const { data } = await supabase
    .from("recent_event_view_refs")
    .select("event_key,title,href,viewed_at")
    .order("viewed_at", { ascending: false })
    .limit(25);
  const es = locale === "es";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Historial" : "History"}
        title={es ? "Actividad reciente" : "Recent activity"}
        description={
          es
            ? "Los últimos planes que consultaste."
            : "The latest plans you viewed."
        }
      />
      <AccountItems
        locale={locale}
        items={(data || []).map((item) => ({
          id: `${item.event_key}-${item.viewed_at}`,
          label: item.title,
          href: item.href,
          date: item.viewed_at,
        }))}
        emptyTitle={es ? "Sin actividad reciente" : "No recent activity"}
        emptyDescription={
          es
            ? "Los eventos que visites aparecerán aquí."
            : "Events you view will appear here."
        }
      />
    </>
  );
}
