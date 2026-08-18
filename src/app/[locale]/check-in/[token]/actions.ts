"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { recordTrustedBehaviour } from "@/lib/personalisation/trusted";

const schema = z.object({
  locale: z.enum(["es", "en"]),
  token: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
});

export async function completeCheckIn(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success) redirect(`/${locale}/passports?checkin=invalid`);
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/check-in/${parsed.data.token}`,
  );
  const { data, error } = await supabase.rpc("check_in_by_token", {
    p_token: parsed.data.token,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  const state = error
    ? "invalid"
    : String((data as { state?: string } | null)?.state || "invalid");
  if (state === "accepted") {
    try {
      const checkInId = String(
        (data as { check_in_id?: string } | null)?.check_in_id || "",
      );
      const service = createSupabaseServiceClient();
      const { data: checkIn } = await service
        .from("check_ins")
        .select("venue_id")
        .eq("id", checkInId)
        .maybeSingle();
      if (checkIn?.venue_id)
        await recordTrustedBehaviour({
          eventType: "event_checked_in",
          profileId: user.id,
          entityType: "venue",
          entityId: checkIn.venue_id,
          surface: "check_in",
          essential: true,
        });
    } catch {
      // The verified check-in remains successful if behavioural logging fails.
    }
  }
  redirect(`/${locale}/passports?checkin=${encodeURIComponent(state)}`);
}
