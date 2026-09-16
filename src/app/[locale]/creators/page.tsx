import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/config";

export default async function LegacyCreatorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) next.set(key, value);
  }
  redirect(
    `/${locale}/community/creators${next.size ? `?${next.toString()}` : ""}`,
  );
}
