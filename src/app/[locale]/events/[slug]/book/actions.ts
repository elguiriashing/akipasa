"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

export async function requestEventBooking(formData: FormData) {
  const parsed = z
    .object({
      locale: z.enum(["es", "en"]),
      slug: z.string().min(1).max(180),
      eventId: z.string().uuid(),
      slotId: z.string().uuid(),
      partySize: z.coerce.number().int().min(1).max(100),
      contactName: z.string().trim().min(2).max(120),
      contactEmail: z.string().email().max(254),
      contactPhone: z.string().trim().max(40),
      notes: z.string().trim().max(1000),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const slug = String(formData.get("slug") || "");
  if (!parsed.success)
    redirect(`/${locale}/events/${slug}/book?error=validation`);
  const { supabase } = await requireUser(
    locale,
    `/${locale}/events/${slug}/book`,
  );
  const { error } = await supabase.rpc("request_booking", {
    p_slot: parsed.data.slotId,
    p_event: parsed.data.eventId,
    p_party_size: parsed.data.partySize,
    p_name: parsed.data.contactName,
    p_email: parsed.data.contactEmail,
    p_phone: parsed.data.contactPhone,
    p_notes: parsed.data.notes,
  });
  redirect(
    `/${locale}/events/${slug}/book?${error ? "error=unavailable" : "requested=1"}`,
  );
}
