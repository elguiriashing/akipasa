import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeProgress } from "@/components/BadgeProgress";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";

export default async function RewardsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase, user } = await requireUser(locale);
  const { data: xp } = await supabase
    .from("xp_ledger")
    .select("delta")
    .eq("profile_id", user.id);
  const totalXp = xp?.reduce((sum, entry) => sum + entry.delta, 0) || 0;
  const es = locale === "es";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Progreso" : "Progress"}
        title={es ? "Pasaportes y recompensas" : "Passports and rewards"}
        description={
          es
            ? "Tu progreso de exploración y los premios que puedes desbloquear."
            : "Your exploration progress and available rewards."
        }
        actions={
          <Link className="button secondary" href={`/${locale}/passports`}>
            {es ? "Abrir pasaportes" : "Open passports"}
          </Link>
        }
      />
      <BadgeProgress locale={locale} totalXp={totalXp} />
    </>
  );
}
