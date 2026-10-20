import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { requirePrestigePrivacyIdentity } from "@/lib/passport-prestige-identity";
import { prestigeEnabled, type PrestigeAward } from "@/lib/passport-prestige";
import { PassportPrestigePrivacy } from "@/components/PassportPrestigePrivacy";
import styles from "@/components/passport-prestige.module.css";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function PrestigePrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (
    !isLocale(locale) ||
    (process.env.AKIPASA_PRESTIGE_SCHEMA_READY !== "true" && !prestigeEnabled())
  )
    notFound();
  const es = locale === "es";
  const { supabase } = await requirePrestigePrivacyIdentity(locale);
  const { data, error } = await supabase.rpc("prestige_member", {
    p_action: "export",
  });
  const awards = (data?.awards || []) as PrestigeAward[];
  const addresses = (data?.shipping_addresses || []) as {
    award_id: string;
    delete_after: string;
  }[];
  return (
    <main className={styles.workspace}>
      <h1>{es ? "Privacidad de prestigio" : "Prestige privacy"}</h1>
      <p>
        {es
          ? "Gestiona la publicación y elimina direcciones guardadas, aunque el programa esté pausado."
          : "Manage publication and delete saved addresses even when the programme is paused."}
      </p>
      <Link href={`/${locale}/account/export`}>
        {es ? "Exportar mis datos" : "Export my data"}
      </Link>
      {error ? (
        <p role="alert">
          {es
            ? "No se pudo cargar. Reinténtalo."
            : "Could not load. Please retry."}
        </p>
      ) : (
        <div className={styles.grid}>
          {awards.map((a) => (
            <section key={a.id} className={styles.panel}>
              <h2>
                #{a.serial} · {es ? a.title_es : a.title_en}
              </h2>
              {addresses.some((s) => s.award_id === a.id) && (
                <p>
                  {es ? "Dirección guardada hasta" : "Address retained until"}{" "}
                  {new Date(
                    addresses.find((s) => s.award_id === a.id)!.delete_after,
                  ).toLocaleDateString(es ? "es-ES" : "en-GB", {
                    timeZone: "Europe/Madrid",
                  })}
                </p>
              )}
              <PassportPrestigePrivacy
                locale={locale}
                awardId={a.id}
                address={addresses.some((s) => s.award_id === a.id)}
                shared={a.shared}
              />
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
