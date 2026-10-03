import Link from "next/link";
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
    <main className="stack container" style={{ padding: "32px 20px" }}>
      <Link href={`/${locale}/passports?city=${city.key}`}>
        ← {es ? "Tu colección" : "Your collection"}
      </Link>
      <h1>
        {city[locale]}
        {category ? ` · ${category[locale]}` : ""}
      </h1>
      <p>
        {es
          ? "Solo estos locales participantes cuentan para este sello. Necesitas un check-in válido en el local."
          : "These participating venues qualify for this stamp. A valid on-site check-in is required."}
      </p>
      {error ? (
        <p role="alert">
          {es ? "No se pudieron cargar los locales." : "Places could not load."}
        </p>
      ) : places.length ? (
        <ul>
          {places.map((v) => (
            <li key={v.id}>
              <Link href={`/${locale}/venues/${encodeURIComponent(v.slug)}`}>
                {v.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          {es
            ? "Próximamente más locales participantes."
            : "More participating venues coming soon."}
        </p>
      )}
    </main>
  );
}
