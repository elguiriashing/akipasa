import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { AccountItems } from "../AccountItems";

export default async function SavedEventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase } = await requireUser(locale);
  const { data } = await supabase
    .from("saved_event_refs")
    .select("event_key,title,href,created_at")
    .order("created_at", { ascending: false });
  const es = locale === "es";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Colección" : "Collection"}
        title={es ? "Eventos guardados" : "Saved events"}
        description={
          es
            ? "Planes que reservaste para volver más tarde."
            : "Plans you kept for later."
        }
      />
      <AccountItems
        locale={locale}
        items={(data || []).map((item) => ({
          id: item.event_key,
          label: item.title,
          href: item.href,
          date: item.created_at,
        }))}
        emptyTitle={es ? "Nada guardado todavía" : "Nothing saved yet"}
        emptyDescription={
          es
            ? "Guarda un evento desde discovery para verlo aquí."
            : "Save an event from discovery to see it here."
        }
      />
    </>
  );
}
