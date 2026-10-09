"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
export async function cancelMyBooking(form: FormData) {
  const v = z
    .object({ locale: z.enum(["en", "es"]), bookingId: z.string().uuid() })
    .safeParse(Object.fromEntries(form));
  const locale = form.get("locale") === "en" ? "en" : "es";
  if (!v.success) redirect(`/${locale}/account/bookings?error=cancel`);
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/account/bookings`,
  );
  const { data, error } = await supabase
    .from("booking_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", v.data.bookingId)
    .eq("profile_id", user.id)
    .in("status", ["requested", "confirmed"])
    .select("id")
    .maybeSingle();
  redirect(
    `/${locale}/account/bookings?${error || !data ? "error=cancel" : "tab=past&cancelled=1"}`,
  );
}
export async function cancelMyStay(form: FormData) {
  const v = z
    .object({ locale: z.enum(["en", "es"]), bookingId: z.string().uuid() })
    .safeParse(Object.fromEntries(form));
  if (!v.success) throw new Error("Invalid reservation");
  const { supabase, user } = await requireUser(
    v.data.locale,
    `/${v.data.locale}/account/bookings`,
  );
  const { data: owned } = await supabase
    .from("accommodation_reservations")
    .select("id")
    .eq("id", v.data.bookingId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!owned) redirect(`/${v.data.locale}/account/bookings?error=cancel`);
  const { error } = await supabase.rpc("accommodation_change_status", {
    p_reservation: v.data.bookingId,
    p_status: "cancelled",
  });
  redirect(
    `/${v.data.locale}/account/bookings?${error ? "error=cancel" : "cancelled=1"}`,
  );
}
