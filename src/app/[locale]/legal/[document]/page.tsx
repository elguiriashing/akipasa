import { notFound, redirect } from "next/navigation";
import LegalDocument from "@/components/LegalDocument";
import { isLegalDocumentKey, legalDocumentPath } from "@/lib/legal-documents";
import { legalMetadata } from "@/lib/legal-metadata";

type Props = { params: Promise<{ locale: string; document: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, document } = await params;
  if ((locale !== "es" && locale !== "en") || !isLegalDocumentKey(document)) notFound();
  return legalMetadata(locale, document);
}

export default async function LegalDetailPage({ params }: Props) {
  const { locale, document } = await params;
  if ((locale !== "es" && locale !== "en") || !isLegalDocumentKey(document)) notFound();
  if (document === "terms" || document === "privacy") redirect(legalDocumentPath(locale, document));
  return <LegalDocument locale={locale} documentKey={document} />;
}
