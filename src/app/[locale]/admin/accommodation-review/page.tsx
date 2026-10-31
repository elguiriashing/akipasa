import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { NativeAccommodationReviewForm } from "@/components/NativeAccommodationReviewForm";
import styles from "@/components/NativeReviewSurfaces.module.css";
type Row = {
  id: string;
  name: string;
  status: string;
  revision_id: string;
  city: string;
  address: string;
  description_es: string;
  description_en: string;
  orphaned: boolean;
};
export default async function NativeAccommodationReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es",
    base = `/${locale}/admin/accommodation-review`;
  const query = await searchParams;
  const raw = query.page ?? "0";
  if (!/^(0|[1-9]\d{0,2})$/.test(raw) || Number(raw) > 100) notFound();
  const page = Number(raw);
  const { supabase } = await requireUser(locale, base);
  const result =
    process.env.AKISUITE_ACCOMMODATION_READY === "true"
      ? await supabase.rpc("accommodation_property_review_page", {
          p_limit: 101,
          p_offset: page * 100,
        })
      : { data: null, error: { message: "unavailable" } };
  const rows = (result.data ?? []) as Row[];
  return (
    <section className={styles.queue}>
      <WorkspacePageHeader
        level={1}
        eyebrow={es ? "Moderación" : "Moderation"}
        title={
          es
            ? "Revisión de alojamientos independientes"
            : "Independent accommodation review"
        }
        description={
          es
            ? "Solicitudes enviadas y propiedades sin titular que requieren revisión. No se transfiere la propiedad automáticamente."
            : "Submitted listings and orphaned properties requiring review. Ownership never transfers automatically."
        }
      />
      {result.error ? (
        <div className={styles.unavailable} role="alert">
          <h2>{es ? "Cola no disponible" : "Review queue unavailable"}</h2>
          <p>
            {es
              ? "La cola no está disponible. No se considera una cola vacía."
              : "The queue is unavailable. This is not treated as an empty queue."}
          </p>
          <Link className={styles.link} href={`${base}?page=${page}`}>
            {es ? "Reintentar" : "Retry"}
          </Link>
        </div>
      ) : (
        <>
          <nav
            className={styles.pagination}
            aria-label={es ? "Páginas de revisión" : "Review pages"}
          >
            <span>{es ? `Página ${page + 1}` : `Page ${page + 1}`}</span>
            {page > 0 && (
              <Link href={`${base}?page=${page - 1}`}>
                {es ? "Anterior" : "Previous"}
              </Link>
            )}
            {rows.length > 100 && page < 100 && (
              <Link href={`${base}?page=${page + 1}`}>
                {es ? "Siguiente" : "Next"}
              </Link>
            )}
          </nav>
          {!rows.length ? (
            <div className={styles.empty}>
              <h2>
                {es
                  ? "No hay solicitudes pendientes en esta página."
                  : "No pending submissions on this page."}
              </h2>
            </div>
          ) : (
            <div className={styles.grid}>
              {rows.slice(0, 100).map((row) => (
                <article className={styles.card} key={row.id}>
                  <header className={styles.cardHeading}>
                    <span className={styles.badge}>
                      {row.orphaned
                        ? es
                          ? "Revisión de titularidad"
                          : "Ownership review"
                        : es
                          ? "Versión enviada"
                          : "Submitted revision"}
                    </span>
                    <h2>{row.name}</h2>
                  </header>
                  <p className={styles.metadata}>
                    {row.city} · {row.address}
                  </p>
                  <div className={styles.description} lang="es">
                    <h3>
                      {es ? "Descripción en español" : "Spanish description"}
                    </h3>
                    <p>{row.description_es}</p>
                  </div>
                  <div className={styles.description} lang="en">
                    <h3>
                      {es ? "Descripción en inglés" : "English description"}
                    </h3>
                    <p>{row.description_en}</p>
                  </div>
                  {row.orphaned ? (
                    <p className={styles.notice} role="status">
                      {es
                        ? "Sin titular: requiere revisión de propiedad. La ficha y sus datos permanecen privados."
                        : "No owner: ownership review is required. The listing and its data remain private."}
                    </p>
                  ) : (
                    <NativeAccommodationReviewForm
                      property={row.id}
                      revision={row.revision_id}
                      locale={locale}
                    />
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
