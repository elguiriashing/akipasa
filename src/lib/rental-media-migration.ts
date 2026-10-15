import type { SupabaseClient } from "@supabase/supabase-js";
/** Bounded, repeatable copy of selected historical covers. Never deletes originals. */
export async function migrateRentalCoverMedia(db: SupabaseClient) {
  let copied = 0;
  try {
    const { data, error } = await db
      .from("car_rental_media")
      .select("id,company_id,storage_path")
      .eq("storage_bucket", "event-media")
      .limit(10);
    if (error || !data) return copied;
    for (const row of data) {
      const suffix = String(row.storage_path).split(".").pop()?.toLowerCase();
      const path = `${row.company_id}/${row.id}.${["jpg", "jpeg", "png", "webp"].includes(suffix || "") ? suffix : "jpg"}`;
      const { error: copyError } = await db.storage
        .from("event-media")
        .copy(row.storage_path, path, { destinationBucket: "rental-media" });
      if (copyError && String(copyError.statusCode) !== "409") continue;
      const { error: updateError } = await db
        .from("car_rental_media")
        .update({ storage_bucket: "rental-media", storage_path: path })
        .eq("id", row.id)
        .eq("storage_bucket", "event-media");
      if (!updateError) copied++;
    }
  } catch {
    /* Schema rollout or provider issue: retain original references and retry later. */
  }
  return copied;
}
