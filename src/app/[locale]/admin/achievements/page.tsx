import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { isAdministrator } from "@/lib/roles";
import type { Achievement } from "@/lib/achievements";
import { AchievementManager } from "./AchievementManager";

export default async function AchievementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/admin/achievements`,
  );
  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !isAdministrator(profile.app_role)) notFound();
  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .order("minimum_xp")
    .order("key");
  if (error)
    return (
      <p role="alert" className="notice">
        {locale === "es"
          ? "No se pudieron cargar los logros. Actualiza la página para reintentar."
          : "Achievements could not be loaded. Refresh the page to retry."}
      </p>
    );
  return (
    <AchievementManager locale={locale} achievements={data as Achievement[]} />
  );
}
