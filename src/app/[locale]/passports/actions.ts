"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

export async function enrollPassport(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const passport = z.string().uuid().safeParse(formData.get("passportId"));
  if (!passport.success)
    redirect(`/${locale}/passports?view=passports&passport=invalid`);
  const { supabase } = await requireUser(
    locale,
    `/${locale}/passports?view=passports`,
  );
  const { error } = await supabase.rpc("enroll_in_passport", {
    p_passport: passport.data,
  });
  redirect(
    `/${locale}/passports?view=passports&passport=${error ? "unavailable" : "started"}`,
  );
}

export async function claimStampReward(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const program = z.string().uuid().safeParse(formData.get("programId"));
  const reward = z.string().uuid().safeParse(formData.get("rewardId"));
  if (!program.success || !reward.success)
    redirect(`/${locale}/passports?view=stamps&reward=invalid`);
  const { supabase } = await requireUser(locale, `/${locale}/passports`);
  const { error } = await supabase.rpc("claim_stamp_reward", {
    p_program: program.data,
    p_reward: reward.data,
  });
  redirect(
    `/${locale}/passports?view=stamps&reward=${error ? "unavailable" : "ready"}`,
  );
}

export async function claimPassportReward(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const enrollment = z.string().uuid().safeParse(formData.get("enrollmentId"));
  const reward = z.string().uuid().safeParse(formData.get("rewardId"));
  if (!enrollment.success || !reward.success)
    redirect(`/${locale}/passports?view=passports&reward=invalid`);
  const { supabase } = await requireUser(locale, `/${locale}/passports`);
  const { error } = await supabase.rpc("claim_passport_reward", {
    p_enrollment: enrollment.data,
    p_reward: reward.data,
  });
  redirect(
    `/${locale}/passports?view=passports&reward=${error ? "unavailable" : "ready"}`,
  );
}
