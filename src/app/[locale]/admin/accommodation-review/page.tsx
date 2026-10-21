import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { NativeAccommodationReviewForm } from "@/components/NativeAccommodationReviewForm";
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
    <>
      <WorkspacePageHeader
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
        <p role="alert">
          {es
            ? "La cola no está disponible. No se considera una cola vacía."
            : "The queue is unavailable. This is not treated as an empty queue."}
        </p>
      ) : (
        <>
          <nav aria-label={es ? "Páginas de revisión" : "Review pages"}>
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
            <p>
              {es
                ? "No hay solicitudes pendientes en esta página."
                : "No pending submissions on this page."}
            </p>
          ) : (
            <div className="admin-card-grid">
              {rows.slice(0, 100).map((row) => (
                <article className="card" key={row.id}>
                  <h2>{row.name}</h2>
                  <p>
                    {row.city} · {row.address}
                  </p>
                  <p style={{ whiteSpace: "pre-wrap" }}>{row.description_es}</p>
                  <p style={{ whiteSpace: "pre-wrap" }}>{row.description_en}</p>
                  {row.orphaned ? (
                    <p role="status">
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
    </>
  );
}
