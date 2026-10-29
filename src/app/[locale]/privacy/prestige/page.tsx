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
    <main className={[styles.workspace, styles.privacyWorkspace].join(" ")}>
      <nav
        className={styles.privacyNavigation}
        aria-label={es ? "Navegación de privacidad" : "Privacy navigation"}
      >
        <Link href={"/" + locale + "/passports"}>
          {es ? "Pasaporte" : "Passport"}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">
          {es ? "Privacidad de prestigio" : "Prestige privacy"}
        </span>
      </nav>

      <header className={styles.privacyHero}>
        <span className={styles.privacyEyebrow}>
          AkiPasa · {es ? "Control de privacidad" : "Privacy controls"}
        </span>
        <h1>{es ? "Privacidad de prestigio" : "Prestige privacy"}</h1>
        <p>
          {es
            ? "Gestiona la publicación y elimina direcciones guardadas, aunque el programa esté pausado."
            : "Manage publication and delete saved addresses even when the programme is paused."}
        </p>
        <div className={styles.privacyActions}>
          <Link href={"/" + locale + "/account/export"}>
            {es ? "Exportar mis datos" : "Export my data"}
          </Link>
        </div>
      </header>

      {error ? (
        <p className={styles.privacyNotice} role="alert">
          {es
            ? "No se pudo cargar. Reinténtalo."
            : "Could not load. Please retry."}
        </p>
      ) : (
        <section
          className={styles.privacySection}
          aria-labelledby="prestige-privacy-awards"
        >
          <div className={styles.privacySectionHeading}>
            <div>
              <h2 id="prestige-privacy-awards">
                {es ? "Tus reconocimientos" : "Your awards"}
              </h2>
              <p>
                {es
                  ? "Solo tus reconocimientos. Las direcciones se mantienen privadas y nunca se muestran aquí."
                  : "Only your awards. Shipping addresses stay private and are never displayed here."}
              </p>
            </div>
            <span className={styles.privacyCount}>
              {awards.length} {es ? "reconocimientos" : "awards"}
            </span>
          </div>
          {awards.length === 0 ? (
            <div className={styles.privacyEmpty} role="status">
              <h3>
                {es ? "Nada que gestionar todavía" : "Nothing to manage yet"}
              </h3>
              <p>
                {es
                  ? "Cuando tengas un reconocimiento, aquí aparecerán sus controles de privacidad."
                  : "When you earn an award, its privacy controls will appear here."}
              </p>
            </div>
          ) : (
            <div className={styles.grid}>
              {awards.map((award) => {
                const address = addresses.find(
                  (item) => item.award_id === award.id,
                );
                return (
                  <section
                    key={award.id}
                    className={[styles.panel, styles.privacyAwardCard].join(
                      " ",
                    )}
                  >
                    <span className={styles.privacySerial}>
                      {es ? "Reconocimiento" : "Award"} #{award.serial}
                    </span>
                    <h3>
                      {es
                        ? award.title_es || award.title_en
                        : award.title_en || award.title_es}
                    </h3>
                    <p>
                      {address ? (
                        <>
                          {es ? "Dirección conservada hasta" : "Address retained until"}{" "}
                          {new Date(address.delete_after).toLocaleDateString(
                            es ? "es-ES" : "en-GB",
                            { timeZone: "Europe/Madrid" },
                          )}
                        </>
                      ) : es ? (
                        "No hay ninguna dirección de envío guardada."
                      ) : (
                        "No shipping address is stored."
                      )}
                    </p>
                    <PassportPrestigePrivacy
                      locale={locale}
                      awardId={award.id}
                      address={Boolean(address)}
                      shared={award.shared}
                    />
                  </section>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
