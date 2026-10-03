import { cookies } from "next/headers";
import { statePortrait } from "./art";
import { optionalUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { initialState, type State } from "./engine";

export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  "CDN-Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  Vary: "Cookie",
};

/** The role comes from the protected profile, never user-editable user_metadata. */
export async function previewAccess() {
  const { supabase, user } = await optionalUser();
  if (!user) return { user: null, supabase, allowed: false };
  const { data: profile, error } = await supabase.from("profiles").select("app_role").eq("id", user.id).maybeSingle();
  if (error) throw new Error("Preview authorization unavailable");
  if (profile?.app_role === "administrator") return { user, supabase, allowed: true };
  const { data: invitation, error: inviteError } = await supabase.from("pals_preview_access").select("expires_at").eq("user_id", user.id).maybeSingle();
  if (inviteError) throw new Error("Preview authorization unavailable");
  return { user, supabase, allowed: Boolean(invitation && Date.parse(invitation.expires_at) > Date.now()) };
}

/** Call only after previewAccess. The service key never leaves server modules. */
export async function readState(userId: string, initialize = false) {
  const db = createSupabaseServiceClient();
  if (initialize) {
    const { error } = await db.from("pals_states").upsert({ user_id: userId, state: initialState(Date.now()), version: 0 }, { onConflict: "user_id", ignoreDuplicates: true });
    if (error) throw new Error("Preview save could not be initialized");
  }
  const { data, error } = await db.from("pals_states").select("state, version").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("Preview save unavailable");
  if (!data) return null;
  if (data.state?.schema !== 1) throw new Error("Unsupported preview save version");
  return { db, state: data.state as State, version: data.version as number };
}

/** Ordinary visitors incur no preview auth, storage or marker requests. */
export async function mapPreviewPortrait(): Promise<string | null> {
  if ((await cookies()).get("akipals_preview")?.value !== "1") return null;
  try {
    const access = await previewAccess();
    if (!access.user || !access.allowed) return null;
    const saved = await readState(access.user.id);
    return saved?.state.family && saved.state.mapEnabled
      ? statePortrait(saved.state, "map-companion")
      : null;
  } catch {
    // A preview service failure must not interrupt the existing public map.
    return null;
  }
}
