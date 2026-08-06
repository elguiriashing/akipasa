import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { StaffQueue, type StaffQueueItem } from "../StaffQueue";

const queues = ["venues", "events", "offers", "community", "claims"] as const;
type Queue = (typeof queues)[number];

async function loadQueue(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  queue: Queue,
) {
  if (queue === "venues")
    return supabase
      .from("venues")
      .select("id,name,address,status,created_at")
      .eq("status", "pending")
      .order("created_at");
  if (queue === "events")
    return supabase
      .from("events")
      .select("id,title_es,title_en,status,created_at,venues(name)")
      .eq("status", "pending")
      .order("created_at");
  if (queue === "offers")
    return supabase
      .from("offers")
      .select("id,title_es,title_en,status,created_at,venues(name)")
      .eq("status", "pending")
      .order("created_at");
  if (queue === "community")
    return supabase
      .from("event_submissions")
      .select("id,title,venue_name,venue_address,state,created_at")
      .eq("state", "pending")
      .order("created_at");
  return supabase
    .from("venue_claims")
    .select("id,evidence,status,created_at,venues(name)")
    .eq("status", "pending")
    .order("created_at");
}

export default async function StaffModerationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const queue: Queue = queues.includes(query.queue as Queue)
    ? (query.queue as Queue)
    : "venues";
  const { supabase } = await requireUser(locale, `/${locale}/staff/moderation`);
  const { data } = await loadQueue(supabase, queue);
  const es = locale === "es";
  const labels: Record<Queue, string> = {
    venues: es ? "Locales" : "Venues",
    events: es ? "Eventos" : "Events",
    offers: es ? "Ofertas" : "Offers",
    community: es ? "Comunidad" : "Community",
    claims: es ? "Reclamaciones" : "Claims",
  };
  const target =
    queue === "venues"
      ? "venue"
      : queue === "events"
        ? "event"
        : queue === "offers"
          ? "offer"
          : queue === "community"
            ? "submission"
            : "venue_claim";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Confianza" : "Trust"}
        title={es ? "Moderación" : "Moderation"}
        description={
          es
            ? "Selecciona una cola. Solo se carga el contenido de esa tarea."
            : "Select a queue. Only that task's content is loaded."
        }
      />
      {(query.updated || query.error) && (
        <p className="notice">
          {query.updated
            ? es
              ? "Decisión registrada."
              : "Decision recorded."
            : es
              ? "No se pudo registrar."
              : "Decision failed."}
        </p>
      )}
      <nav
        className="workspace-subnav"
        aria-label={es ? "Colas de moderación" : "Moderation queues"}
      >
        {queues.map((value) => (
          <Link
            href={`/${locale}/staff/moderation?queue=${value}`}
            className={queue === value ? "active" : undefined}
            aria-current={queue === value ? "page" : undefined}
            key={value}
          >
            {labels[value]}
          </Link>
        ))}
      </nav>
      <section>
        <h2>{labels[queue]}</h2>
        <StaffQueue
          locale={locale}
          items={(data || []) as StaffQueueItem[]}
          targetType={target}
          approve={
            queue === "community" || queue === "claims"
              ? "approved"
              : "published"
          }
        />
      </section>
    </>
  );
}
