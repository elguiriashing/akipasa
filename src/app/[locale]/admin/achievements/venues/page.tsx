import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isAdministrator } from "@/lib/roles";
import { isLocale } from "@/lib/config";
import { VenueCategoryEditor } from "./VenueCategoryEditor";
import styles from "../achievements.module.css";
export default async function AchievementVenuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/admin/achievements/venues`,
  );
  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !isAdministrator(profile.app_role)) notFound();
  const query = await searchParams;
  const search = (query.q || "").replace(/[%_\\]/g, "").slice(0, 100);
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(query.page || "1", 10) || 1),
  );
  let request = supabase
    .from("venues")
    .select("id,name,address,venue_achievement_categories(category_key)", {
      count: "exact",
    })
    .order("name")
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (search) request = request.ilike("name", `%${search}%`);
  const { data: venues, error, count } = await request;
  return (
    <section className={styles.manager}>
      <a href={`/${locale}/admin/achievements`}>
        ← {es ? "Logros" : "Achievements"}
      </a>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            {es
              ? "CADA LOCAL, SU CATEGORÍA"
              : "THE RIGHT PLACE, THE RIGHT BADGE"}
          </span>
          <h2>{es ? "Categorías de locales" : "Venue categories"}</h2>
          <p>
            {es
              ? "Confirma qué ofrece cada local. Estas categorías permiten ganar logros como Foodie con visitas reales."
              : "Confirm what each venue offers. These categories power achievements such as Foodie from real visits."}
          </p>
        </div>
      </header>
      <p className={styles.hint}>
        {es
          ? "No inferimos categorías por el nombre. Marca solo las que hayas comprobado. Los check-ins anteriores también cuentan."
          : "Categories are not guessed from venue names. Select only those you have verified. Past accepted check-ins count too."}
      </p>
      <form className={styles.toolbar}>
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder={es ? "Buscar local…" : "Search venues…"}
          aria-label={es ? "Buscar local" : "Search venues"}
        />
        <button className={styles.primary}>{es ? "Buscar" : "Search"}</button>
      </form>
      {error ? (
        <p role="alert">
          {es ? "No se pudieron cargar los locales." : "Could not load venues."}
        </p>
      ) : (
        <>
          <p>
            {count || 0} {es ? "locales" : "venues"}
          </p>
          {venues?.map((venue) => (
            <details className={styles.venueRow} key={venue.id}>
              <summary>
                <strong>{venue.name}</strong>
                <small>
                  {venue.venue_achievement_categories.length}{" "}
                  {es ? "categorías" : "categories"} · {venue.address}
                </small>
              </summary>
              <VenueCategoryEditor
                key={`${venue.id}:${venue.venue_achievement_categories
                  .map((c) => c.category_key)
                  .sort()
                  .join(",")}`}
                locale={locale}
                id={venue.id}
                categories={venue.venue_achievement_categories.map(
                  (c) => c.category_key,
                )}
              />
            </details>
          ))}
          <nav
            className={styles.filters}
            aria-label={es ? "Páginas de locales" : "Venue pages"}
          >
            {page > 1 && (
              <a href={`?q=${encodeURIComponent(search)}&page=${page - 1}`}>
                ← {es ? "Anterior" : "Previous"}
              </a>
            )}
            {page * 20 < (count || 0) && (
              <a href={`?q=${encodeURIComponent(search)}&page=${page + 1}`}>
                {es ? "Siguiente" : "Next"} →
              </a>
            )}
          </nav>
        </>
      )}
    </section>
  );
}
