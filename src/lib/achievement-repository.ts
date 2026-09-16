import { createSupabaseServerClient } from "./supabase/server";
import { achievementBadge, type Achievement } from "./achievements";

export async function activeAchievementBadges() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .eq("active", true)
    .order("minimum_xp")
    .order("key");
  if (error) throw new Error("Unable to load achievements");
  return (data as Achievement[]).map(achievementBadge);
}
