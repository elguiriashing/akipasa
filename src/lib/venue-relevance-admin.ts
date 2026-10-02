import { optionalUser } from "./auth";
import { isAdministrator } from "./roles";
import { createSupabaseServiceClient } from "./supabase/service";

export async function relevanceAdministrator() {
  const { user, supabase } = await optionalUser();
  if (!user) return { error: "Sign in required", status: 401 } as const;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !profile || !isAdministrator(profile.app_role))
    return { error: "Administrator access required", status: 403 } as const;
  return { user, service: createSupabaseServiceClient() };
}
