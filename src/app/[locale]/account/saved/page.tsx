import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { AccountItems } from "../AccountItems";
import { setSavedEventReminder } from "./actions";

export default async function SavedEventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase } = await requireUser(locale);
  const { data: emailPreferences } = await supabase.rpc("suite_email_reminder_preferences", { p_event: null, p_stay: null });
  const eventReminders = emailPreferences?.event_reminders === true;
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
      <section className="settings-row" aria-label={es ? "Recordatorios de eventos" : "Event reminders"}>
        <div>
          <strong>{es ? "Recordatorios de eventos guardados" : "Saved event reminders"}</strong>
          <p>{es ? "Opcional: un recordatorio por email aproximadamente 2 días antes de un evento guardado con fecha confirmada." : "Optional: one email about 2 days before a saved event with a confirmed date."}</p>
        </div>
        <form action={setSavedEventReminder}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="enabled" value={eventReminders ? "false" : "true"} />
          <button type="submit" className="button secondary">{eventReminders ? (es ? "Desactivar" : "Disable") : (es ? "Activar emails" : "Enable emails")}</button>
        </form>
      </section>
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
