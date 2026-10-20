import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";

const labels = {
  repeated_title: [
    "Repeated title / possible recreation",
    "Título repetido / posible recreación",
  ],
  continuous_multiday: [
    "Continuous multi-day event",
    "Evento continuo de varios días",
  ],
  opening_hours_content: [
    "Possible ordinary opening hours",
    "Posible horario habitual",
  ],
} as const;
export default async function ListingReviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  const { supabase } = await requireUser(
    locale,
    `/${locale}/admin/listing-review`,
  );
  const { data, error } = await supabase.rpc("listing_event_review_queue");
  const rows = (data || []) as Array<{
    venue_id: string;
    event_id: string;
    signal: string;
    detected_at: string;
    venue_name: string | null;
    event_title: string | null;
  }>;
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Moderación" : "Moderation"}
        title={es ? "Revisión de eventos" : "Event review signals"}
        description={
          es
            ? "Hasta 100 señales recientes. Una señal requiere revisión; no demuestra abuso ni bloquea un festival legítimo."
            : "Up to 100 recent signals. A signal requires review; it does not prove abuse or block a legitimate festival."
        }
      />
      {error ? (
        <p role="alert">
          {es
            ? "La cola no está disponible. No se puede confirmar si hay señales pendientes."
            : "The queue is unavailable. Pending signals cannot be confirmed."}{" "}
          <Link href={`/${locale}/admin/listing-review`}>
            {es ? "Reintentar" : "Retry"}
          </Link>
        </p>
      ) : !rows.length ? (
        <p>{es ? "No hay señales registradas." : "No recorded signals."}</p>
      ) : (
        <div className="admin-card-grid">
          {rows.map((row) => (
            <article className="card" key={`${row.event_id}:${row.signal}`}>
              <h2>
                {row.event_title || (es ? "Evento eliminado" : "Deleted event")}
              </h2>
              <p>{row.venue_name || row.venue_id}</p>
              <p>
                {labels[row.signal as keyof typeof labels]?.[es ? 1 : 0] ||
                  (es ? "Revisión requerida" : "Review required")}
              </p>
              <time dateTime={row.detected_at}>
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Europe/Madrid",
                }).format(new Date(row.detected_at))}
              </time>
              <p>
                <Link
                  href={`/${locale}/business/venue/${row.venue_id}?section=events&event=${row.event_id}`}
                >
                  {es ? "Revisar ficha y evento" : "Review listing and event"}
                </Link>
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
