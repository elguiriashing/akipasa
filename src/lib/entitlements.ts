import { redirect } from "next/navigation";
import { requireUser } from "./auth";
import type { Locale } from "./config";
import { isAdministrator } from "./roles";

export async function requireBusinessAccess(
  locale: Locale,
  next = `/${locale}/business`,
) {
  const context = await requireUser(locale, next);
  const { data: profile } = await context.supabase
    .from("profiles")
    .select("app_role")
    .eq("id", context.user.id)
    .maybeSingle();

  if (isAdministrator(profile?.app_role || "")) return context;

  const { data: active, error } = await context.supabase.rpc(
    "has_active_entitlement",
    {
      p_profile: context.user.id,
      p_plan: "business",
    },
  );
  if (error || !active)
    redirect(
      `/${locale}/account/subscription?plan=business&error=business_required`,
    );

  return context;
}
