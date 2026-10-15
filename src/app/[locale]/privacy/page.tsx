import { notFound } from "next/navigation";
import LegalDocument from "@/components/LegalDocument";
import { legalMetadata } from "@/lib/legal-metadata";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (locale !== "es" && locale !== "en") notFound();
  return legalMetadata(locale, "privacy");
}
export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "es" && locale !== "en") notFound();
  return <LegalDocument locale={locale} documentKey="privacy" />;
}
