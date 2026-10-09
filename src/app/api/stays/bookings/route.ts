import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  stayMutationSchema,
  staySearchSchema,
} from "@/lib/accommodation-booking";

const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET(request: Request) {
  const db = await createSupabaseServerClient();
  const params = Object.fromEntries(new URL(request.url).searchParams);
  if (params.action === "history") {
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return reply({ error: "sign_in" }, 401);
    const { data, error } = await db
      .from("accommodation_reservations")
      .select(
        "id,venue_id,check_in,check_out,guests,status,quoted_total_cents,quote_snapshot",
      )
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    return error
      ? reply({ error: "unavailable" }, 503)
      : reply({ reservations: data });
  }
  const parsed = staySearchSchema.safeParse(params);
  if (!parsed.success) return reply({ error: "invalid_dates" }, 400);
  const { data, error } = await db.rpc("accommodation_available_rooms", {
    p_venue: parsed.data.venue,
    p_in: parsed.data.checkIn,
    p_out: parsed.data.checkOut,
    p_guests: parsed.data.guests,
  });
  return error ? reply({ error: "unavailable" }, 409) : reply({ rooms: data });
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return reply({ error: "origin" }, 403);
  if (Number(request.headers.get("content-length") || 0) > 8192)
    return reply({ error: "invalid" }, 413);
  const parsed = stayMutationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return reply({ error: "invalid" }, 400);
  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return reply({ error: "sign_in" }, 401);
  const p = parsed.data;
  const result =
    p.action === "quote"
      ? await db.rpc("accommodation_create_quote", {
          p_type: p.roomType,
          p_in: p.checkIn,
          p_out: p.checkOut,
          p_guests: p.guests,
        })
      : p.action === "request"
        ? await db.rpc("accommodation_request_booking", {
            p_quote: p.quote,
            p_key: p.key,
            p_name: p.name,
            p_email: p.email,
            p_locale: p.locale,
          })
        : await db.rpc("accommodation_change_status", {
            p_reservation: p.reservation,
            p_status: "cancelled",
          });
  if (result.error) return reply({ error: "unavailable" }, 409);
  return reply({ result: result.data });
}
