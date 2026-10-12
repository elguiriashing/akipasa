import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";

export default async function RewardsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireUser(locale);
  // Preserve old bookmarks while keeping progress in its dedicated home.
  redirect(`/${locale}/passports`);
}
