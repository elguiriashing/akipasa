import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { canModerate } from "@/lib/roles";
import { reviewAccommodation } from "./actions";
export default async function AccommodationReview({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; result?: string }>;
}) {
  if (process.env.AKISUITE_INDEPENDENT_ACCOMMODATION_ENABLED !== "true")
    notFound();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  const query = await searchParams;
  const page = Math.min(
    5000,
    Math.max(1, Number.parseInt(query.page || "1", 10) || 1),
  );
  const path = `/${locale}/staff/accommodations`;
  const { supabase, user } = await requireUser(locale, path);
  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !canModerate(profile.app_role)) notFound();
  const { data, error } = await supabase.rpc(
    "pending_accommodation_properties",
    { p_limit: 20, p_offset: (page - 1) * 20 },
  );
  type Property = {
    id: string;
    name: string;
    address: string;
    city: string;
    latitude: number;
    longitude: number;
    description_es: string;
    description_en: string;
    website_url: string | null;
    review_revision: string;
  };
  const properties = (data?.rows || []) as Property[];
  const media = properties.length
    ? await supabase
        .from("accommodation_property_media")
        .select("property_id,storage_path,alt_text")
        .in(
          "property_id",
          properties.map((p) => p.id),
        )
        .not("public_position", "is", null)
        .order("public_position")
        .limit(240)
    : { data: [], error: null };
  const signed = media.data?.length
    ? await supabase.storage.from("accommodation-media").createSignedUrls(
        media.data.map((m) => m.storage_path),
        600,
      )
    : { data: [], error: null };
  const urls = new Map(
    (signed.data || [])
      .filter((m) => !m.error && m.path)
      .map((m) => [m.path, m.signedUrl]),
  );
  return (
    <section>
      <h1>
        {es
          ? "Revisar alojamientos independientes"
          : "Review independent stays"}
      </h1>
      <p>
        {es
          ? "La publicación requiere una revisión explícita. No cambia la propiedad ni confirma reservas."
          : "Publication requires an explicit review. It does not change ownership or confirm bookings."}
      </p>
      {query.result && (
        <p role="status">
          {query.result === "reviewed"
            ? es
              ? "Revisión guardada."
              : "Review saved."
            : es
              ? "No se pudo guardar. Recarga y revisa el estado actual."
              : "Could not save. Reload and review the current state."}
        </p>
      )}
      {error ? (
        <p role="alert">
          {es ? "Cola no disponible." : "Queue unavailable."}{" "}
          <a href={path}>{es ? "Reintentar" : "Retry"}</a>
        </p>
      ) : (
        <>
          {!properties.length && (
            <p>
              {es
                ? "No hay alojamientos pendientes en esta página."
                : "No pending stays on this page."}
            </p>
          )}
          {properties.map((p) => (
            <article
              key={p.id}
              style={{
                padding: "1rem",
                marginBlock: "1rem",
                border: "1px solid currentColor",
                borderRadius: ".75rem",
              }}
            >
              <h2>{p.name}</h2>
              <p>
                {p.address} · {p.city}
              </p>
              <p>
                {p.latitude}, {p.longitude}
              </p>
              <p>{p.description_es}</p>
              <p>{p.description_en}</p>
              {p.website_url && (
                <a
                  href={p.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {es ? "Sitio declarado" : "Submitted website"}
                </a>
              )}
              {media.error || signed.error ? (
                <p role="alert">
                  {es
                    ? "Imágenes no disponibles; no publiques hasta revisarlas."
                    : "Images unavailable; review them before publishing."}
                </p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                  {(media.data || [])
                    .filter((m) => m.property_id === p.id)
                    .map((m) => {
                      const url = urls.get(m.storage_path);
                      return url ? (
                        <a
                          key={m.storage_path}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {m.alt_text ||
                            (es
                              ? "Revisar imagen seleccionada"
                              : "Review selected image")}
                        </a>
                      ) : (
                        <span key={m.storage_path}>
                          {es ? "Imagen no disponible" : "Image unavailable"}
                        </span>
                      );
                    })}
                </div>
              )}
              <form action={reviewAccommodation}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="property" value={p.id} />
                <input
                  type="hidden"
                  name="revision"
                  value={p.review_revision}
                />
                <label>
                  {es ? "Motivo de revisión" : "Review reason"}
                  <textarea
                    name="reason"
                    required
                    minLength={10}
                    maxLength={2000}
                  />
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                  <button
                    name="decision"
                    value="publish"
                    disabled={Boolean(
                      media.error ||
                        signed.error ||
                        (media.data || []).some(
                          (m) =>
                            m.property_id === p.id && !urls.get(m.storage_path),
                        ),
                    )}
                  >
                    {es ? "Aprobar publicación" : "Approve publication"}
                  </button>
                  <button name="decision" value="reject">
                    {es ? "Devolver a privado" : "Return to private"}
                  </button>
                </div>
              </form>
            </article>
          ))}
          <nav aria-label={es ? "Páginas" : "Pages"}>
            {page > 1 && (
              <a href={`${path}?page=${page - 1}`}>
                {es ? "Anterior" : "Previous"}
              </a>
            )}{" "}
            {page * 20 < Number(data?.total || 0) && (
              <a href={`${path}?page=${page + 1}`}>
                {es ? "Siguiente" : "Next"}
              </a>
            )}
          </nav>
        </>
      )}
    </section>
  );
}
