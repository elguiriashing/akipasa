import { myAchievements } from "@/lib/achievement-repository";
import type { Locale } from "@/lib/config";
import { AchievementCollection } from "./AchievementCollection";

export async function BadgeProgress({
  locale,
  totalXp,
}: {
  locale: Locale;
  totalXp: number;
}) {
  try {
    const items = await myAchievements();
    return (
      <AchievementCollection locale={locale} items={items} totalXp={totalXp} />
    );
  } catch {
    return (
      <p role="alert" className="notice">
        {locale === "es"
          ? "No se pudo cargar tu colección. Actualiza para reintentar."
          : "Your collection could not be loaded. Refresh to try again."}
      </p>
    );
  }
}
