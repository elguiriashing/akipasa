import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import styles from "@/components/NativeReviewSurfaces.module.css";

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
    <section className={styles.queue}>
      <WorkspacePageHeader
        level={1}
        eyebrow={es ? "Moderación" : "Moderation"}
        title={es ? "Revisión de eventos" : "Event review signals"}
        description={
          es
            ? "Hasta 100 señales recientes. Una señal requiere revisión; no demuestra abuso ni bloquea un festival legítimo."
            : "Up to 100 recent signals. A signal requires review; it does not prove abuse or block a legitimate festival."
        }
      />
      {error ? (
        <div className={styles.unavailable} role="alert">
          <h2>{es ? "Cola no disponible" : "Review queue unavailable"}</h2>
          <p>
            {es
              ? "La cola no está disponible. No se puede confirmar si hay señales pendientes."
              : "The queue is unavailable. Pending signals cannot be confirmed."}
          </p>
          <Link
            className={styles.link}
            href={`/${locale}/admin/listing-review`}
          >
            {es ? "Reintentar" : "Retry"}
          </Link>
        </div>
      ) : !rows.length ? (
        <div className={styles.empty}>
          <h2>{es ? "No hay señales registradas." : "No recorded signals."}</h2>
        </div>
      ) : (
        <div className={styles.grid}>
          {rows.map((row) => (
            <article
              className={styles.card}
              key={`${row.event_id}:${row.signal}`}
            >
              <header className={styles.cardHeading}>
                <span className={styles.badge}>
                  {es ? "Señal para revisar" : "Signal for review"}
                </span>
                <h2>
                  {row.event_title ||
                    (es ? "Evento eliminado" : "Deleted event")}
                </h2>
              </header>
              <p className={styles.metadata}>
                {row.venue_name || row.venue_id}
              </p>
              <p className={styles.description}>
                {labels[row.signal as keyof typeof labels]?.[es ? 1 : 0] ||
                  (es ? "Revisión requerida" : "Review required")}
              </p>
              <time className={styles.time} dateTime={row.detected_at}>
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Europe/Madrid",
                }).format(new Date(row.detected_at))}
              </time>
              <Link
                className={styles.link}
                href={`/${locale}/business/venue/${row.venue_id}?section=events&event=${row.event_id}`}
              >
                {es ? "Revisar ficha y evento" : "Review listing and event"}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
