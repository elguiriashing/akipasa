import { createSupabaseServerClient } from "./supabase/server";
import type { AchievementProgress } from "./achievements";

export async function myAchievements() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("my_achievement_progress");
  if (error) throw new Error("Unable to load achievement progress");
  return (data || []) as AchievementProgress[];
}
