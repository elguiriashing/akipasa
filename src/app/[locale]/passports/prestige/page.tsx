import { PassportPrestigeShipping } from "@/components/PassportPrestigeShipping";
import { PassportPrestigePrivacy } from "@/components/PassportPrestigePrivacy";
import { PassportPrestigeDownload } from "@/components/PassportPrestigeDownload";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import {
  prestigeDeliveryLabel,
  prestigeEnabled,
  type PrestigeState,
} from "@/lib/passport-prestige";
import { PassportPrestigeCard } from "@/components/PassportPrestigeCard";
import styles from "@/components/passport-prestige.module.css";
import { PrestigeControls } from "./PrestigeControls";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function PrestigePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || !prestigeEnabled()) notFound();
  const es = locale === "es";
  const { supabase } = await requireUser(
    locale,
    `/${locale}/passports/prestige`,
  );
  const { data, error } = await supabase.rpc("prestige_member", {
    p_action: "read",
  });
  const state = data as PrestigeState | null;
  return (
    <main className={styles.workspace}>
      <Link href={`/${locale}/passports`}>← Passport</Link>
      <h1>{es ? "Prestigio AkiPasa" : "AkiPasa Prestige"}</h1>
      <p>
        {es
          ? "Reconocimientos extraordinarios. Solo cuenta tu actividad aceptada, nunca los niveles de prueba."
          : "Extraordinary recognition. Only accepted activity counts, never test tiers."}
      </p>
      <Link href={`/${locale}/privacy/prestige`}>
        {es ? "Privacidad y direcciones" : "Privacy and addresses"}
      </Link>
      <Link href={`/${locale}/passports/prestige/hall`}>
        {es ? "Salón de la Fama" : "Hall of Fame"}
      </Link>
      {error || !state ? (
        <p role="alert">
          {es ? "No se pudo cargar." : "Could not load."}{" "}
          <Link href={`/${locale}/passports/prestige`}>
            {es ? "Reintentar" : "Retry"}
          </Link>
        </p>
      ) : (
        <>
          <div className={styles.grid}>
            {state.awards
              .filter((a) => !a.revoked_at)
              .map((a) => (
                <section className={styles.panel} key={a.id}>
                  <PassportPrestigeCard award={a} locale={locale} />
                  <PrestigeControls
                    locale={locale}
                    award={a}
                    shippingIntakeEnabled={state.shipping_intake_enabled}
                    physicalEligible={state.programmes.some(
                      (p) => p.key === a.programme_key && p.physical_eligible,
                    )}
                  />
                  <p>
                    {es ? "Entrega:" : "Delivery:"}{" "}
                    {prestigeDeliveryLabel(a.delivery_status, locale)}
                  </p>
                  <PassportPrestigeShipping
                    locale={locale}
                    awardId={a.id}
                    enabled={state.shipping_intake_enabled}
                    reviewed={a.physical_status === "reviewed"}
                    status={a.delivery_status}
                  />
                  <PassportPrestigePrivacy
                    locale={locale}
                    awardId={a.id}
                    address={a.has_shipping_address}
                  />
                  {a.shared && (
                    <>
                      <Link
                        href={`/${locale}/passports/prestige/certificate/${a.public_id}`}
                      >
                        {es ? "Certificado" : "Certificate"}
                      </Link>
                      <PassportPrestigeDownload
                        locale={locale}
                        publicId={a.public_id}
                      />
                    </>
                  )}
                </section>
              ))}
          </div>
          <h2>{es ? "Tu próximo logro" : "Your next achievement"}</h2>
          {!state.programmes.length && (
            <p>
              {es
                ? "Los próximos hitos están en revisión."
                : "Upcoming milestones are under review."}
            </p>
          )}
          <div className={styles.grid}>
            {state.programmes
              .filter(
                (p) => !state.awards.some((a) => a.programme_key === p.key),
              )
              .map((p) => (
                <section key={p.key} className={styles.panel}>
                  <h3>{es ? p.title_es : p.title_en}</h3>
                  <ul>
                    {p.requirements?.map((r) => (
                      <li key={r.key}>
                        {es ? r.title_es : r.title_en} · {r.current}/{r.target}
                        <progress
                          value={Math.min(r.current, r.target)}
                          max={r.target}
                          aria-label={es ? r.title_es : r.title_en}
                        />
                      </li>
                    ))}
                  </ul>
                  {p.definition_current === false ? (
                    <p role="status">
                      {es
                        ? "Requisitos en revisión."
                        : "Requirements under review."}
                    </p>
                  ) : (
                    <PrestigeControls locale={locale} programmeKey={p.key} />
                  )}
                </section>
              ))}
          </div>
        </>
      )}
    </main>
  );
}
