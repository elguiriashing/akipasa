import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/config";

/**
 * Historical moderation links remain redirects, never a second moderation UI.
 * Role and claim-review permission checks live in the canonical destinations.
 */
export default async function ModerationCompatibilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const destinations: Record<string, string> = {
    support: `/${locale}/staff/support`,
    inventory: `/${locale}/staff/catalogue`,
    commercial: `/${locale}/staff/promotions`,
    audit: `/${locale}/admin/audit`,
  };
  const selected = query.view ? destinations[query.view] : undefined;
  const destination =
    selected ||
    `/${locale}/staff/moderation${query.queue ? `?queue=${encodeURIComponent(query.queue)}` : ""}`;
  redirect(destination);
}
