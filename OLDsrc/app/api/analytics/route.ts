import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const signalSchema = z
  .object({
    action: z.enum([
      "event_view",
      "venue_view",
      "directions_click",
      "booking_click",
      "share",
    ]),
    venueId: z.string().uuid().nullable().optional(),
    eventId: z.string().uuid().nullable().optional(),
    locale: z.enum(["es", "en"]),
  })
  .strict();

export async function POST(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    return NextResponse.json({ error: "unsupported" }, { status: 415 });
  const body = await request.json().catch(() => null);
  const parsed = signalSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("record_analytics", {
    p_action: parsed.data.action,
    p_venue: parsed.data.venueId || null,
    p_event: parsed.data.eventId || null,
    p_metadata: { locale: parsed.data.locale },
  });
  return error
    ? NextResponse.json({ error: "unavailable" }, { status: 503 })
    : new NextResponse(null, { status: 204 });
}
