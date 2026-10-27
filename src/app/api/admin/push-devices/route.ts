import { z } from "zod";
import {
  founderPushEnrollmentEnabled,
  founderPushTestEnabled,
} from "@/lib/founder-push";
import {
  nativePushRequest,
  pushIdentity,
  pushNoStore,
  pushRegistrationSchema,
  pushTokenSchema,
  readPushJson,
} from "@/lib/founder-push-server";

export const dynamic = "force-dynamic";
const empty = (status: number) =>
  new Response(null, { status, headers: pushNoStore });

export async function GET(req: Request) {
  if (!nativePushRequest(req)) return empty(403);
  if (!founderPushEnrollmentEnabled(process.env)) return empty(404);
  try {
    const identity = await pushIdentity();
    if (!identity) return empty(403);
    const { data, error } = await identity.supabase
      .from("profiles")
      .select("preferred_locale")
      .eq("id", identity.user.id)
      .maybeSingle();
    if (error) return empty(503);
    return Response.json(
      {
        eligible: true,
        registration_key: identity.sessionId,
        locale: data?.preferred_locale === "es" ? "es" : "en",
        test_enabled: founderPushTestEnabled(process.env),
      },
      { headers: pushNoStore },
    );
  } catch {
    return empty(503);
  }
}
export async function POST(req: Request) {
  if (!nativePushRequest(req)) return empty(403);
  if (!founderPushEnrollmentEnabled(process.env)) return empty(404);
  let input;
  try {
    input = pushRegistrationSchema.parse(await readPushJson(req));
  } catch {
    return empty(400);
  }
  try {
    const identity = await pushIdentity();
    if (!identity || input.registration_key !== identity.sessionId)
      return empty(403);
    const { error } = await identity.db.rpc("register_founder_push_device", {
      p_user: identity.user.id,
      p_session: identity.sessionId,
      p_token: input.token,
    });
    if (error) {
      console.error("founder_push_registration_failed");
      return empty(error.code === "42501" ? 403 : 503);
    }
    return empty(204);
  } catch {
    return empty(503);
  }
}
export async function DELETE(req: Request) {
  if (!nativePushRequest(req)) return empty(403);
  let input;
  try {
    input = z
      .object({ token: pushTokenSchema })
      .strict()
      .parse(await readPushJson(req));
  } catch {
    return empty(400);
  }
  try {
    // Revocation remains available after flags/role/allowlist change.
    const identity = await pushIdentity(false);
    if (!identity) return empty(403);
    const { error } = await identity.db.rpc("revoke_founder_push_device", {
      p_user: identity.user.id,
      p_session: identity.sessionId,
      p_token: input.token,
    });
    return empty(error ? 503 : 204);
  } catch {
    return empty(503);
  }
}
