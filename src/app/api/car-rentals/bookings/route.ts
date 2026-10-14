import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import { validDate } from "@/lib/akiconduzco";

export const dynamic = "force-dynamic";
const bookingSchema = z
  .object({
    vehicleId: z.string().uuid(),
    start: validDate,
    end: validDate,
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(40).optional().default(""),
    note: z.string().trim().max(1000).optional().default(""),
    idempotencyKey: z.string().uuid(),
  })
  .refine(
    (x) =>
      x.end > x.start &&
      x.start >= new Date().toISOString().slice(0, 10) &&
      (Date.parse(`${x.end}T00:00:00Z`) - Date.parse(`${x.start}T00:00:00Z`)) /
        86_400_000 <=
        30,
  );

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return Response.json({ error: "sign_in_required" }, { status: 401 });
  const { data, error } = await supabase
    .from("car_rental_bookings")
    .select(
      "id,start_date,end_date,contact_name,quoted_total_cents,currency,status,created_at,vehicle:car_rental_vehicles(name,category,company:car_rental_companies(name,city))",
    )
    .eq("renter_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error)
    return Response.json(
      { error: "booking_history_unavailable" },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  return Response.json(
    { rows: data || [] },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "origin_mismatch" }, { status: 403 });
  const input = bookingSchema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return Response.json({ error: "invalid_request" }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return Response.json({ error: "sign_in_required" }, { status: 401 });
  if (!auth.user.email || !auth.user.email_confirmed_at)
    return Response.json({ error: "verified_email_required" }, { status: 403 });
  const { data, error } = await supabase.rpc("request_car_rental_booking", {
    p_vehicle: input.data.vehicleId,
    p_start: input.data.start,
    p_end: input.data.end,
    p_contact_name: input.data.name,
    p_contact_email: auth.user.email,
    p_contact_phone: input.data.phone || null,
    p_note: input.data.note || null,
    p_idempotency_key: input.data.idempotencyKey,
  });
  if (error) {
    const conflict = error.code === "PT409";
    return Response.json(
      { error: conflict ? "dates_unavailable" : "booking_request_unavailable" },
      { status: conflict ? 409 : 503 },
    );
  }
  return Response.json(
    { bookingId: data, status: "requested" },
    { status: 201, headers: { "Cache-Control": "private, no-store" } },
  );
}
