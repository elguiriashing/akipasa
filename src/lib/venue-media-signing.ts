import type { SupabaseClient } from "@supabase/supabase-js";

type MediaRow = {
  id: string;
  storage_path: string;
  alt_es: string;
  alt_en: string | null;
};

export async function signVenueMedia(
  supabase: SupabaseClient,
  rows: MediaRow[],
) {
  if (!rows.length) return [];
  const paths = [...new Set(rows.map((row) => row.storage_path))];
  const { data } = await supabase.storage
    .from("event-media")
    .createSignedUrls(paths, 3600);
  const urls = new Map(
    (data || []).flatMap((item) =>
      item.path && item.signedUrl && !item.error
        ? [[item.path, item.signedUrl] as const]
        : [],
    ),
  );
  // Match by path, not response index: failed/missing objects and reordered
  // batch responses must never attach another object's image to this row.
  return rows.flatMap((row) => {
    const url = urls.get(row.storage_path);
    return url
      ? [
          {
            id: String(row.id),
            url,
            alt: {
              es: String(row.alt_es),
              ...(row.alt_en ? { en: String(row.alt_en) } : {}),
            },
          },
        ]
      : [];
  });
}
