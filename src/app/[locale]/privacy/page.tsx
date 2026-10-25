import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { SuitePrivacyNotice } from "@/components/SuitePrivacyNotice";
import { publicPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = publicPageMetadata("/privacy");

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <SuitePrivacyNotice locale={locale} />;
}
