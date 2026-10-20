import { PassportPrestigeDownload } from "@/components/PassportPrestigeDownload";
import { notFound } from "next/navigation";
import { z } from "zod";
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
export default async function CertificatePage({
  params,
}: {
  params: Promise<{ locale: string; publicId: string }>;
}) {
  const { locale, publicId } = await params;
  if (
    !isLocale(locale) ||
    !prestigeEnabled() ||
    !z.string().uuid().safeParse(publicId).success
  )
    notFound();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("prestige_public", {
    p_public_id: publicId,
  });
  if (error)
    return (
      <p role="alert">
        {locale === "es"
          ? "No se pudo verificar el certificado. Reinténtalo."
          : "Could not verify the certificate. Please retry."}
      </p>
    );
  const award = (data as PublicPrestigeAward[] | null)?.[0];
  if (!award) notFound();
  return (
    <main className={styles.workspace}>
      <h1>
        {locale === "es" ? "Certificado de logro" : "Achievement certificate"}
      </h1>
      <PassportPrestigeCard locale={locale} award={award} />
      <p>
        {locale === "es"
          ? "Reconocimiento digital AkiPasa. Este certificado no garantiza un premio físico."
          : "AkiPasa digital recognition. This certificate does not guarantee a physical award."}
      </p>
      <PassportPrestigeDownload locale={locale} publicId={publicId} />
    </main>
  );
}
