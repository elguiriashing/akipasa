import { z } from "zod";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { stayQuerySchema } from "@/lib/akiduermo";
const schema = stayQuerySchema
  .extend({
    west: z.coerce.number().min(-180).max(180),
    east: z.coerce.number().min(-180).max(180),
    south: z.coerce.number().min(-85).max(85),
    north: z.coerce.number().min(-85).max(85),
  })
  .refine((b) => b.west < b.east && b.south < b.north);
export async function GET(request: Request) {
  const parsed = schema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return Response.json({ error: "Invalid stay viewport" }, { status: 400 });
  const b = parsed.data;
  const { data, error } = await createSupabasePublicClient().rpc(
    "public_stay_viewport",
    {
      p_west: b.west,
      p_east: b.east,
      p_south: b.south,
      p_north: b.north,
      p_type: b.type,
      p_query: b.q,
    },
  );
  if (error)
    return Response.json(
      { error: "Stay map temporarily unavailable" },
      { status: 503 },
    );
  return Response.json(data, {
    headers: { "Cache-Control": "public, max-age=30, s-maxage=60" },
  });
}
