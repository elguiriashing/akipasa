import { sitemapIndex } from "@/lib/sitemaps";
import { headers } from "next/headers";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";
export async function GET() {
  const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase();
  if (host === "akiconduzco.akipasa.com") {
    const origin = "https://akiconduzco.akipasa.com";
    const { data, error } = await createSupabasePublicClient()
      .from("car_rental_companies")
      .select("slug,updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(49998);
    if (error)
      return new Response("Sitemap temporarily unavailable.", {
        status: 503,
        headers: { "Cache-Control": "no-store", "Retry-After": "60" },
      });
    const urls = [
      "/",
      "/map",
      ...(data || []).map(
        (company) => `/rentals/${encodeURIComponent(company.slug)}`,
      ),
    ];
    const escapeXml = (value: string) =>
      value.replace(
        /[<>&"']/g,
        (char) =>
          ({
            "<": "&lt;",
            ">": "&gt;",
            "&": "&amp;",
            '"': "&quot;",
            "'": "&apos;",
          })[char]!,
      );
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((path) => `<url><loc>${escapeXml(origin + path)}</loc></url>`).join("")}</urlset>`,
      {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=0, s-maxage=300",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
  return sitemapIndex();
}
