"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

export async function cancelStayRequest(form: FormData) {
  const parsed = z
    .object({ locale: z.enum(["en", "es"]), bookingId: z.string().uuid() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect("/bookings?error=cancel");
  const { locale, bookingId } = parsed.data;
  const { supabase, user } = await requireUser(locale, "/bookings");
  const { data: owned } = await supabase
    .from("accommodation_reservations")
    .select("id,check_in,status")
    .eq("id", bookingId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!owned || !["requested", "confirmed"].includes(owned.status))
    redirect("/bookings?error=cancel");
  const { error } = await supabase.rpc("accommodation_change_status", {
    p_reservation: bookingId,
    p_status: "cancelled",
  });
  redirect(`/bookings?${error ? "error=cancel" : "tab=past&cancelled=1"}`);
}
