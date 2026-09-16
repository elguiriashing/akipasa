import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/config";

export default async function LegacyCreatorPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/community/creators/${encodeURIComponent(slug)}`);
}
