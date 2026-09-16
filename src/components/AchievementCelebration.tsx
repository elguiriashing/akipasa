import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/config";
import styles from "./AchievementCollection.module.css";

export async function AchievementCelebration({
  locale,
  checkInId,
}: {
  locale: Locale;
  checkInId?: string;
}) {
  if (!z.string().uuid().safeParse(checkInId).success) return null;
  const supabase = await createSupabaseServerClient();
  const { data: unlocks, error } = await supabase
    .from("achievement_unlocks")
    .select("achievement_key")
    .eq("check_in_id", checkInId!)
    .gte("unlocked_at", new Date(Date.now() - 3600000).toISOString());
  if (error || !unlocks?.length) return null;
  const { data: items } = await supabase
    .from("achievements")
    .select("key,title_es,title_en")
    .eq("active", true)
    .in(
      "key",
      unlocks.map((item) => item.achievement_key),
    );
  if (!items?.length) return null;
  const es = locale === "es";
  return (
    <section className={styles.celebration} role="status">
      <h3>
        {es ? "¡Nuevos logros desbloqueados!" : "New achievements unlocked!"}
      </h3>
      <p>
        {es
          ? "Cada salida tiene su recompensa."
          : "A little adventure. A new milestone."}
      </p>
      <ul>
        {items.slice(0, 6).map((item) => (
          <li key={item.key}>{item[`title_${locale}`]}</li>
        ))}
      </ul>
      {items.length > 6 && (
        <p>
          +{items.length - 6} {es ? "logros más" : "more achievements"}
        </p>
      )}
      <a href={`/${locale}/passports?view=badges`}>
        {es ? "Ver mi colección" : "See my collection"} →
      </a>
    </section>
  );
}
