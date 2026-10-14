import { createSupabasePublicClient } from "@/lib/supabase/public";
import { rentalSearchSchema, type RentalListing } from "@/lib/akiconduzco";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = rentalSearchSchema.safeParse(Object.fromEntries(params));
  if (!parsed.success)
    return Response.json({ error: "invalid_search" }, { status: 400 });
  const input = parsed.data;
  let bounds: number[] | null = null;
  if (input.bounds) {
    const values = input.bounds.split(",").map(Number);
    if (
      values.length !== 4 ||
      values.some((n) => !Number.isFinite(n)) ||
      values[0] < 27 ||
      values[2] > 44 ||
      values[1] < -19 ||
      values[1] > 5 ||
      values[3] < -19 ||
      values[3] > 5 ||
      values[0] >= values[2]
    ) {
      return Response.json({ error: "invalid_bounds" }, { status: 400 });
    }
    bounds = values;
  }
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc("search_car_rentals", {
    p_q: input.q || null,
    p_city: input.city || null,
    p_category: input.category === "all" ? null : input.category,
    p_start: input.start || null,
    p_end: input.end || null,
    p_min_price: input.min ?? null,
    p_max_price: input.max ?? null,
    p_bounds: bounds,
    p_limit: bounds ? 100 : 24,
    p_offset: bounds ? 0 : (input.page - 1) * 24,
  });
  if (error)
    return Response.json(
      { error: "rental_search_unavailable" },
      {
        status: 503,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  const rows = (data || []) as RentalListing[];
  return Response.json(
    {
      rows,
      total: Number(rows[0]?.total || 0),
      page: input.page,
      availabilityChecked: Boolean(input.start && input.end),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    },
  );
}
