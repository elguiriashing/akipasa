import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  prestigeEnabled,
  type PublicPrestigeAward,
} from "@/lib/passport-prestige";
import { PassportPrestigeCard } from "@/components/PassportPrestigeCard";
import styles from "@/components/passport-prestige.module.css";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function HallPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || !prestigeEnabled()) notFound();
  const es = locale === "es";
  const query = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(query.page) || 1));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("prestige_public", {
    p_page: Math.floor(page),
  });
  const awards = (data || []) as PublicPrestigeAward[];
  return (
    <main className={styles.workspace}>
      <h1>{es ? "Salón de la Fama" : "Hall of Fame"}</h1>
      <p>
        {es
          ? "Participación voluntaria de exploradores con logros verificados."
          : "Voluntary recognition for explorers with verified achievements."}
      </p>
      {error ? (
        <p role="alert">
          {es ? "No disponible. Reinténtalo." : "Unavailable. Please retry."}
        </p>
      ) : (
        <>
          <div className={styles.grid}>
            {awards.map((a) => (
              <Link
                href={`/${locale}/passports/prestige/certificate/${a.public_id}`}
                key={a.public_id}
              >
                <PassportPrestigeCard locale={locale} award={a} />
              </Link>
            ))}
          </div>
          {!awards.length && (
            <p>
              {es
                ? "Aún no hay reconocimientos públicos en esta página."
                : "No public awards on this page yet."}
            </p>
          )}
          <nav aria-label={es ? "Páginas" : "Pages"}>
            {page > 1 && (
              <Link href={`?page=${page - 1}`}>
                {es ? "Anterior" : "Previous"}
              </Link>
            )}
            {awards.length === 24 && page < 10000 && (
              <Link href={`?page=${page + 1}`}>
                {es ? "Siguiente" : "Next"}
              </Link>
            )}
          </nav>
        </>
      )}
    </main>
  );
}
