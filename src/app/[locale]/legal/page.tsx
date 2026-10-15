import { notFound } from "next/navigation";
import { LegalNavigation } from "@/components/LegalDocument";
import { LEGAL_REVIEW_APPROVED } from "@/lib/legal-documents";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (locale !== "es" && locale !== "en") notFound();
  return {
    title: locale === "es" ? "Información legal | AkiPasa" : "Legal information | AkiPasa",
    robots: { index: LEGAL_REVIEW_APPROVED, follow: true },
    alternates: { canonical: `https://akipasa.com/${locale}/legal` },
  };
}
export default async function LegalIndexPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "es" && locale !== "en") notFound();
  const es = locale === "es";
  return (
    <main className="shell legal">
      <section className="hero"><h1>{es ? "Información legal" : "Legal information"}</h1></section>
      {!LEGAL_REVIEW_APPROVED && <p role="note">{es ? "Paquete en revisión. No constituye aprobación jurídica ni sustituye contratos aceptados." : "Package under review. Not legal approval and not a replacement for accepted contracts."}</p>}
      <LegalNavigation locale={locale} />
    </main>
  );
}
