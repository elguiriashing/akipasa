import { z } from "zod";
import { createSupabasePublicClient } from "@/lib/supabase/public";

const bounds = z
  .object({
    west: z.coerce.number().finite().min(-180).max(180),
    east: z.coerce.number().finite().min(-180).max(180),
    south: z.coerce.number().finite().min(-85).max(85),
    north: z.coerce.number().finite().min(-85).max(85),
    after: z.string().uuid().optional(),
  })
  .refine((b) => b.west < b.east && b.south < b.north);

export async function GET(request: Request) {
  const parsed = bounds.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return Response.json({ error: "Invalid map bounds" }, { status: 400 });
  const b = parsed.data;
  const { data, error } = await createSupabasePublicClient().rpc(
    "public_map_venue_page",
    {
      p_west: b.west,
      p_east: b.east,
      p_south: b.south,
      p_north: b.north,
      p_after: b.after ?? null,
    },
  );
  if (error)
    return Response.json(
      { error: "Map venues temporarily unavailable" },
      { status: 503 },
    );
  return Response.json(data, {
    headers: { "Cache-Control": "public, max-age=30, s-maxage=30" },
  });
}
