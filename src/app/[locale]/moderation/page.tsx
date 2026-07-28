import { redirect } from "next/navigation";

export default async function ModerationCompatibilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const destination =
    query.view === "support"
      ? `/${locale}/staff/support`
      : query.view === "inventory"
        ? `/${locale}/staff/catalogue`
        : query.view === "commercial"
          ? `/${locale}/staff/promotions`
          : query.view === "audit"
            ? `/${locale}/staff/audit`
            : `/${locale}/staff/moderation${query.queue ? `?queue=${encodeURIComponent(query.queue)}` : ""}`;
  redirect(destination);
}
