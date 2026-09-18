import { z } from "zod";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const parsed = z
    .string()
    .uuid()
    .safeParse((await context.params).id);
  if (!parsed.success)
    return Response.json({ error: "Invalid venue" }, { status: 400 });
  const { data, error } = await createSupabasePublicClient()
    .from("venues")
    .select("id,slug,name,address,accessibility")
    .eq("id", parsed.data)
    .eq("status", "published")
    .maybeSingle();
  if (error)
    return Response.json(
      { error: "Venue temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  if (!data)
    return Response.json(
      { error: "Venue no longer available" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  return Response.json(
    {
      id: data.id,
      slug: data.slug,
      name: data.name,
      address: data.address,
      claimStatus:
        data.accessibility?.claim_status === "unclaimed"
          ? "unclaimed"
          : "claimed",
    },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
  );
}
