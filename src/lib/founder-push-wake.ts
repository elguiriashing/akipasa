import { z } from "zod";
import { founderPushEnabled } from "./founder-push";
import {
  dispatchFounderClaimPushes,
  type PushEnv,
} from "./founder-push-delivery";
import { readBoundedText } from "./request-security";

const noStore = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
async function matchesSecret(supplied: string, expected: string) {
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all(
    [supplied, expected].map((value) =>
      crypto.subtle.digest("SHA-256", encoder.encode(value)),
    ),
  );
  const a = new Uint8Array(left),
    b = new Uint8Array(right);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
/** A wake-up carries only an outbox identity. Its claim/device state and all
 * recipient permissions are read again from the database before sending. */
export async function handleFounderPushWake(
  request: Request,
  env: PushEnv,
  waitUntil: (work: Promise<unknown>) => void,
) {
  const empty = (status: number) =>
    new Response(null, { status, headers: noStore });
  if (request.method !== "POST") return empty(405);
  if (!founderPushEnabled(env)) return empty(404);
  const secret = env.AKIPASA_PUSH_WEBHOOK_SECRET;
  const authorization = request.headers.get("authorization") || "";
  if (
    !secret ||
    secret.length < 32 ||
    authorization.length > 1024 ||
    !(await matchesSecret(authorization, "Bearer " + secret))
  )
    return empty(403);
  let payload;
  try {
    payload = z
      .object({ claim_id: z.string().uuid() })
      .strict()
      .parse(JSON.parse(await readBoundedText(request, 256)));
  } catch {
    return empty(400);
  }
  waitUntil(
    dispatchFounderClaimPushes(env, payload.claim_id).catch(() =>
      console.error("founder_push_wake_failed"),
    ),
  );
  return empty(202);
}
