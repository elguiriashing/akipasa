"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  locale: z.enum(["es", "en"]),
  token: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
});

export async function completeCheckIn(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success) redirect(`/${locale}/passports?checkin=invalid`);
  const { supabase } = await requireUser(
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
  redirect(`/${locale}/passports?checkin=${encodeURIComponent(state)}`);
}
