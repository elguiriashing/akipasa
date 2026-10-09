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
