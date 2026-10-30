import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/config";

export default async function LegacyCreatorPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  let decodedSlug: string;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch {
    notFound();
  }
  if (
    !decodedSlug ||
    decodedSlug === "." ||
    decodedSlug === ".." ||
    decodedSlug.includes("/") ||
    decodedSlug.includes("\\")
  ) {
    notFound();
  }
  redirect(`/${locale}/community/creators/${encodeURIComponent(decodedSlug)}`);
}
