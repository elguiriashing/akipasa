import { createSupabaseServiceClient } from "@/lib/supabase/service";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { data, error } = await createSupabaseServiceClient().rpc(
      "public_product_release_ready",
    );
    const ready =
      !error &&
      data?.database_ready === true &&
      data?.release === "2026-09-26-product-readiness";
    return Response.json(
      {
        release: "2026-09-26-product-readiness",
        billingRelease: "2026-09-28-billing-catalogue",
        databaseReady: ready,
      },
      { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        release: "2026-09-26-product-readiness",
        billingRelease: "2026-09-28-billing-catalogue",
        databaseReady: false,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
