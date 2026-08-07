"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { config, isLocale } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { passwordSchema, safeAuthDestination } from "@/lib/auth-security";

function requestOrigin(headerStore: Awaited<ReturnType<typeof headers>>) {
  return headerStore.get("origin") || "http://localhost:3000";
}

export async function requestMagicLink(formData: FormData) {
  const parsed = z
    .object({
      email: z.string().email(),
      locale: z.string(),
      next: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success || !isLocale(parsed.data.locale))
    redirect("/es/auth?error=invalid");
  const locale = parsed.data.locale;
  const next = safeAuthDestination(locale, parsed.data.next);
  const headerStore = await headers();
  const origin = requestOrigin(headerStore);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/${locale}/auth/callback?next=${encodeURIComponent(next)}`,
      shouldCreateUser: false,
    },
  });
  if (error) redirect(`/${locale}/auth?error=send`);
  redirect(`/${locale}/auth?sent=1`);
}

export async function requestPasswordReset(formData: FormData) {
  const parsed = z
    .object({
      email: z.string().email(),
      locale: z.enum(["es", "en"]),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success) redirect(`/${locale}/auth?error=invalid`);
  const origin = requestOrigin(await headers());
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${origin}/${locale}/auth/callback?next=${encodeURIComponent(`/${locale}/auth/recover`)}`,
    },
  );
  if (error) redirect(`/${locale}/auth?error=send`);
  redirect(`/${locale}/auth?recovery=sent`);
}

export async function signUpWithPassword(formData: FormData) {
  const parsed = z
    .object({
      email: z.string().email(),
      password: passwordSchema,
      confirmPassword: z.string(),
      acceptTerms: z.literal("accepted"),
      locale: z.enum(["es", "en"]),
      next: z.string().optional(),
    })
    .refine((value) => value.password === value.confirmPassword, {
      path: ["confirmPassword"],
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success) redirect(`/${locale}/auth?error=password-policy`);
  const next = safeAuthDestination(parsed.data.locale, parsed.data.next);
  const origin = requestOrigin(await headers());
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/${locale}/auth/callback?next=${encodeURIComponent(next)}`,
      data: {
        preferred_locale: locale,
        terms_version: config.currentTermsVersion,
      },
    },
  });
  if (error) redirect(`/${locale}/auth?error=signup`);
  if (data.session) redirect(next);
  redirect(`/${locale}/auth?registered=1`);
}

export async function signInWithPassword(formData: FormData) {
  const parsed = z
    .object({
      email: z.string().email(),
      password: z.string().min(1).max(128),
      locale: z.enum(["es", "en"]),
      next: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success) redirect(`/${locale}/auth?error=signin`);
  const next = safeAuthDestination(parsed.data.locale, parsed.data.next);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) redirect(`/${locale}/auth?error=signin`);
  redirect(next);
}

export async function signInWithGoogle(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (formData.get("acceptTerms") !== "accepted")
    redirect(`/${locale}/auth?error=terms`);
  const next = safeAuthDestination(locale, String(formData.get("next") || ""));
  const origin = requestOrigin(await headers());
  const cookieStore = await cookies();
  cookieStore.set("akipasa_terms_ack", config.currentTermsVersion, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    sameSite: "lax",
    secure: origin.startsWith("https://"),
  });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/${locale}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error || !data.url) redirect(`/${locale}/auth?error=google`);
  redirect(data.url);
}

export async function signOut(formData: FormData) {
  const locale = String(formData.get("locale"));
  const safeLocale = isLocale(locale) ? locale : "es";
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`/${safeLocale}`);
}
