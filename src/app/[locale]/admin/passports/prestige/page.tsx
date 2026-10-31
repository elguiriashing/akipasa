import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { isAdministrator } from "@/lib/roles";
import { prestigeEnabled } from "@/lib/passport-prestige";
import styles from "@/components/passport-prestige.module.css";
import { PrestigeStudio } from "./PrestigeStudio";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function PrestigeAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || !prestigeEnabled()) notFound();
  const es = locale === "es";
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/admin/passports/prestige`,
  );
  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !isAdministrator(profile.app_role)) notFound();
  const query = await searchParams;
  const page = Math.floor(
    Math.max(1, Math.min(10000, Number(query.page) || 1)),
  );
  const { data, error } = await supabase.rpc("prestige_admin", {
    p_action: "read",
    p_payload: { page },
  });
  return (
    <main className={styles.workspace}>
      <Link href={`/${locale}/admin/passports/awards`}>← Passport</Link>
      <h1>{es ? "Estudio de prestigio" : "Prestige studio"}</h1>
      <p>
        {es
          ? "Elegibilidad verificada y privacidad voluntaria. Compras y envíos desactivados."
          : "Verified eligibility and voluntary privacy. Purchases and shipping disabled."}
      </p>
      {error || !data ? (
        <p role="alert">
          {es ? "No disponible. Reinténtalo." : "Unavailable. Please retry."}{" "}
          <Link
            className="button secondary"
            href={`/${locale}/admin/passports/prestige?page=${page}`}
          >
            {es ? "Reintentar" : "Retry"}
          </Link>
        </p>
      ) : (
        <>
          <p>
            {es ? "Programa digital:" : "Digital programme:"}{" "}
            {data.enabled
              ? es
                ? "Activo"
                : "Active"
              : es
                ? "Cerrado para lanzamiento"
                : "Closed for launch"}
          </p>
          <PrestigeStudio
            locale={locale}
            programmes={data.programmes}
            requests={data.requests}
            fulfilmentEnabled={data.fulfilment_enabled}
          />
          <nav aria-label={es ? "Solicitudes" : "Requests"}>
            {page > 1 && (
              <Link href={`?page=${page - 1}`}>
                {es ? "Anterior" : "Previous"}
              </Link>
            )}
            {data.requests.length === 24 && page < 10000 && (
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
