import { founderPushTestEnabled } from "@/lib/founder-push";
import {
  pushEnvironment,
  sendFounderTestPush,
} from "@/lib/founder-push-delivery";
import {
  nativePushRequest,
  pushIdentity,
  pushNoStore,
  pushRegistrationSchema,
  readPushJson,
} from "@/lib/founder-push-server";

export const dynamic = "force-dynamic";
const empty = (status: number) =>
  new Response(null, { status, headers: pushNoStore });
export async function POST(req: Request) {
  if (!nativePushRequest(req)) return empty(403);
  if (!founderPushTestEnabled(process.env)) return empty(404);
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
    const { data: device, error } = await identity.db
      .from("admin_push_devices")
      .select("id")
      .eq("token", input.token)
      .eq("user_id", identity.user.id)
      .eq("session_id", identity.sessionId)
      .maybeSingle();
    if (error) return empty(503);
    if (!device) return empty(403);
    // The database reserves a cooldown atomically, without creating a claim.
    const { data: reserved, error: reserveError } = await identity.db.rpc(
      "reserve_founder_push_test",
      {
        p_user: identity.user.id,
        p_session: identity.sessionId,
        p_device: device.id,
      },
    );
    if (reserveError) return empty(reserveError.code === "42501" ? 403 : 503);
    if (!reserved?.[0]) return empty(429);
    const test = reserved[0];
    const result = await sendFounderTestPush(
      pushEnvironment(),
      { ...test, session_id: identity.sessionId },
      test.test_id,
    );
    if (result.invalidToken)
      await identity.db.rpc("revoke_founder_push_device", {
        p_user: identity.user.id,
        p_session: identity.sessionId,
        p_token: input.token,
      });
    console.info("founder_push_test", {
      status: result.status,
      reason: result.reason,
    });
    return Response.json(
      { accepted: result.status === "sent", test_id: test.test_id },
      { status: result.status === "sent" ? 200 : 503, headers: pushNoStore },
    );
  } catch {
    return empty(503);
  }
}
