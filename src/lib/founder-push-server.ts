import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { optionalUser } from "./auth";
import { founderUserIds } from "./founder-push";
import { readBoundedText } from "./request-security";

export const pushNoStore = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex",
};
export const pushTokenSchema = z.string().regex(/^[A-Za-z0-9:_-]{20,4096}$/);
export const pushRegistrationSchema = z
  .object({ token: pushTokenSchema, registration_key: z.string().uuid() })
  .strict();

export function nativePushRequest(request: Request) {
  return (
    new URL(request.url).origin === "https://akipasa.com" &&
    request.headers.get("origin") === "https://akipasa.com" &&
    /\bAkiPasaAndroid\//.test(request.headers.get("user-agent") || "")
  );
}
export function pushServiceDb() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
export async function readPushJson(request: Request) {
  return JSON.parse(await readBoundedText(request, 5000)) as unknown;
}
/** getUser verifies identity; the service RPC then checks the current Auth session
 * against the user, founder registry, administrator role and adult eligibility. */
export async function pushIdentity(requireEligible = true) {
  const { user, supabase, error: authError } = await optionalUser();
  // Transient Auth failures must not tell native to revoke a valid registration.
  if (
    authError &&
    (!authError.status || authError.status === 429 || authError.status >= 500)
  )
    throw new Error("push_auth_unavailable");
  if (authError || !user) return null;
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error && (!error.status || error.status === 429 || error.status >= 500))
    throw new Error("push_auth_unavailable");
  if (error || !session) return null;
  let sessionId: string;
  try {
    const payload = JSON.parse(
      Buffer.from(
        session.access_token.split(".")[1] || "",
        "base64url",
      ).toString("utf8"),
    );
    sessionId = z.string().uuid().parse(payload.session_id);
  } catch {
    return null;
  }
  const db = pushServiceDb();
  if (!db) throw new Error("push_database_unavailable");
  if (requireEligible) {
    if (
      !founderUserIds(process.env.AKIPASA_PUSH_FOUNDER_IDS).has(
        user.id.toLowerCase(),
      )
    )
      return null;
    const { data, error: eligibilityError } = await db.rpc(
      "active_founder_push_eligible",
      { p_user: user.id, p_session: sessionId },
    );
    if (eligibilityError) throw new Error("push_eligibility_unavailable");
    if (data !== true) return null;
  }
  return { user, supabase, db, sessionId };
}
