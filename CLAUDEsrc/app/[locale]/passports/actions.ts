"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

export async function requestReward(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const program = z.string().uuid().safeParse(formData.get("programId"));
  if (!program.success) redirect(`/${locale}/passports?reward=invalid`);
  const { supabase } = await requireUser(locale, `/${locale}/passports`);
  const { error } = await supabase.rpc("request_reward_redemption", {
    p_program: program.data,
  });
  redirect(
    `/${locale}/passports?reward=${error ? "unavailable" : "requested"}`,
  );
}
