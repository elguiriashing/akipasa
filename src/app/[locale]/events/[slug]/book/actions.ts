"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { occurrenceHref, requestedOccurrenceId } from "@/lib/event-occurrence";

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
      requestKey: z.string().uuid(),
      occurrence: z.string().max(100).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const slug = String(formData.get("slug") || "");
  const occurrence = requestedOccurrenceId(formData.get("occurrence"));
  const bookingPath = occurrence
    ? occurrenceHref(`/${locale}/events/${slug}/book`, occurrence)
    : `/${locale}/events/${slug}/book`;
  const separator = bookingPath.includes("?") ? "&" : "?";
  if (!parsed.success) redirect(`${bookingPath}${separator}error=validation`);
  const { supabase } = await requireUser(locale, bookingPath);
  const { error } = await supabase.rpc("request_booking_v2", {
    p_slot: parsed.data.slotId,
    p_event: parsed.data.eventId,
    p_party_size: parsed.data.partySize,
    p_name: parsed.data.contactName,
    p_email: parsed.data.contactEmail,
    p_phone: parsed.data.contactPhone,
    p_notes: parsed.data.notes,
    p_key: parsed.data.requestKey,
    p_locale: parsed.data.locale,
  });
  redirect(
    `${bookingPath}${separator}${error ? "error=unavailable" : "requested=1"}`,
  );
}
