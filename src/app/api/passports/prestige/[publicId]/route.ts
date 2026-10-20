import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  prestigeEnabled,
  prestigeShareSvg,
  type PublicPrestigeAward,
} from "@/lib/passport-prestige";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;
  if (!prestigeEnabled() || !z.string().uuid().safeParse(publicId).success)
    return new Response(null, { status: 404 });
  const locale =
    new URL(request.url).searchParams.get("lang") === "es" ? "es" : "en";
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("prestige_public", {
    p_public_id: publicId,
  });
  if (error)
    return new Response(null, {
      status: 503,
      headers: { "Cache-Control": "private, no-store" },
    });
  const award = (data as PublicPrestigeAward[] | null)?.[0];
  if (!award)
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  return new Response(prestigeShareSvg(award, locale), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": 'attachment; filename="akipasa-prestige.svg"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'none'; sandbox",
    },
  });
}
