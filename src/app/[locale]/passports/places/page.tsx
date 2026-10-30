import Link from "next/link";
import { Icon } from "@/components/Icons";
import styles from "./places.module.css";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import scopes from "@/lib/achievement-scopes.json";
import { createSupabasePublicClient } from "@/lib/supabase/public";
export default async function PlacesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ city?: string; category?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const q = await searchParams;
  const city = scopes.cities.find((c) => c.key === q.city);
  const category = scopes.categories.find((c) => c.key === q.category);
  if (!city || (q.category && !category)) notFound();
  const { data, error } = await createSupabasePublicClient().rpc(
    "passport_places",
    { p_city: city.key, p_category: category?.key || null },
  );
  const places = (data || []) as { id: string; name: string; slug: string }[];
  const es = locale === "es";
  return (
    <main className={styles.page}>
      <Link
        className={styles.back}
        href={`/${locale}/passports?city=${city.key}`}
      >
        ← {es ? "Tu colección" : "Your collection"}
      </Link>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>
          {es ? "Passport / Sigue explorando" : "Passport / Keep exploring"}
        </span>
        <h1>
          {city[locale]}
          {category ? ` · ${category[locale]}` : ""}
        </h1>
        <p>
          {es
            ? "Solo estos locales participantes cuentan para este sello. Necesitas un check-in válido en el local."
            : "These participating venues qualify for this stamp. A valid on-site check-in is required."}
        </p>
      </header>
      <section
        className={styles.collection}
        aria-labelledby="participating-places-title"
      >
        <div className={styles.heading}>
          <div>
            <span className={styles.kicker}>
              {es ? "Tu próxima parada" : "Your next stop"}
            </span>
            <h2 id="participating-places-title">
              {es ? "Locales participantes" : "Participating venues"}
            </h2>
          </div>
          {!error && <span className={styles.count}>{places.length}</span>}
        </div>
        {error ? (
          <p className={styles.empty} role="alert">
            {es
              ? "No se pudieron cargar los locales."
              : "Places could not load."}
          </p>
        ) : places.length ? (
          <ul className={styles.list}>
            {places.map((v) => (
              <li key={v.id}>
                <Link href={`/${locale}/venues/${encodeURIComponent(v.slug)}`}>
                  <span className={styles.placeMark} aria-hidden="true">
                    <Icon name="venue" size={20} />
                  </span>
                  <strong>{v.name}</strong>
                  <span className={styles.open} aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>
            {es
              ? "Próximamente más locales participantes."
              : "More participating venues coming soon."}
          </p>
        )}
      </section>
    </main>
  );
}
