"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  bookingRequestSchema,
  type BookingSubmissionResult,
} from "@/lib/booking-ui";

export async function requestVenueBooking(
  formData: FormData,
): Promise<BookingSubmissionResult | void> {
  const parsed = bookingRequestSchema.safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success)
    return {
      error:
        locale === "es"
          ? "Revisa tus datos de contacto."
          : "Please check your contact details.",
    };
  const v = parsed.data;
  const { supabase } = await requireUser(
    locale,
    `/${locale}/venues/${encodeURIComponent(v.slug)}/book`,
  );
  const { data: venue } = await supabase
    .from("venues")
    .select("id")
    .eq("id", v.venueId)
    .eq("slug", v.slug)
    .eq("status", "published")
    .maybeSingle();
  if (!venue)
    return {
      error:
        locale === "es"
          ? "Este local no está disponible."
          : "This venue is unavailable.",
    };
  const { data: id, error } = await supabase.rpc("request_booking_v2", {
    p_venue: v.venueId,
    p_slot: v.slotId,
    p_event: null,
    p_party_size: v.partySize,
    p_name: v.contactName,
    p_email: v.contactEmail,
    p_phone: v.contactPhone,
    p_notes: v.notes,
    p_key: v.requestKey,
    p_locale: locale,
  });
  if (error) {
    const { data: slots } = await supabase.rpc("booking_available_slots", {
      p_venue: v.venueId,
    });
    const remaining =
      (slots as Array<{ id: string; remaining: number }> | null)?.find(
        (s) => s.id === v.slotId,
      )?.remaining ?? 0;
    return {
      error:
        locale === "es"
          ? "La disponibilidad ha cambiado. Revisa las plazas o elige otro horario."
          : "Availability changed. Check the remaining places or choose another time.",
      remaining,
    };
  }
  redirect(
    `/${locale}/account/bookings?requested=${encodeURIComponent(String(id))}`,
  );
}
