"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

export async function requestVenueBooking(formData: FormData) {
  const parsed = z
    .object({
      locale: z.enum(["es", "en"]),
      slug: z.string().min(1).max(180),
      venueId: z.string().uuid(),
      slotId: z.string().uuid(),
      partySize: z.coerce.number().int().min(1).max(100),
      contactName: z.string().trim().min(2).max(120),
      contactEmail: z.string().email().max(254),
      contactPhone: z.string().trim().max(40).default(""),
      notes: z.string().trim().max(1000).default(""),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const slug = String(formData.get("slug") || "");
  const url = `/${locale}/venues/${encodeURIComponent(slug)}/book`;
  if (!parsed.success) redirect(`${url}?error=validation`);
  const { supabase } = await requireUser(locale, url);
  // Verify venue identity server side: no cross-venue slot substitutions.
  const { data: slot } = await supabase
    .from("venue_availability_slots")
    .select("id")
    .eq("id", parsed.data.slotId)
    .eq("venue_id", parsed.data.venueId)
    .eq("active", true)
    .maybeSingle();
  const { data: venue } = await supabase
    .from("venues")
    .select("id")
    .eq("id", parsed.data.venueId)
    .eq("slug", parsed.data.slug)
    .maybeSingle();
  if (!slot || !venue) redirect(`${url}?error=unavailable`);
  const { error } = await supabase.rpc("request_booking", {
    p_slot: parsed.data.slotId,
    p_event: null,
    p_party_size: parsed.data.partySize,
    p_name: parsed.data.contactName,
    p_email: parsed.data.contactEmail,
    p_phone: parsed.data.contactPhone,
    p_notes: parsed.data.notes,
  });
  redirect(`${url}?${error ? "error=unavailable" : "requested=1"}`);
}
