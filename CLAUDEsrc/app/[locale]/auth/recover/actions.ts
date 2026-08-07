"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { passwordSchema } from "@/lib/auth-security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateRecoveredPassword(formData: FormData) {
  const parsed = z
    .object({
      locale: z.enum(["es", "en"]),
      password: passwordSchema,
      confirmPassword: z.string(),
    })
    .refine((value) => value.password === value.confirmPassword, {
      path: ["confirmPassword"],
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success)
    redirect(`/${locale}/auth/recover?error=password-policy`);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth?error=recovery`);
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) redirect(`/${locale}/auth/recover?error=save`);
  await supabase.auth.signOut();
  redirect(`/${locale}/auth?reset=1`);
}
