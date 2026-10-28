import { createClient } from "@supabase/supabase-js";
import {
  boundedJson,
  digestToken,
  launchWaitlistSchema,
  rateDigest,
  verificationMessage,
  verificationToken,
  verifyTurnstile,
  waitlistCorsHeaders,
  waitlistOriginProduct,
} from "@/lib/launch-waitlist";

export const dynamic = "force-dynamic";

function json(
  body: Record<string, string | boolean>,
  status: number,
  origin: string | null,
) {
  return Response.json(body, {
    status,
    headers: waitlistCorsHeaders(origin),
  });
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  if (!waitlistOriginProduct(origin))
    return json({ ok: false, status: "origin_not_allowed" }, 403, origin);
  return new Response(null, {
    status: 204,
    headers: waitlistCorsHeaders(origin),
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const expectedProduct = waitlistOriginProduct(origin);
  if (!expectedProduct)
    return json({ ok: false, status: "origin_not_allowed" }, 403, origin);

  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ ok: false, status: "invalid_request" }, 415, origin);

  let payload: unknown;
  try {
    payload = await boundedJson(request);
  } catch {
    return json({ ok: false, status: "invalid_request" }, 400, origin);
  }
  const parsed = launchWaitlistSchema.safeParse(payload);
  if (!parsed.success || parsed.data.product !== expectedProduct)
    return json({ ok: false, status: "invalid_request" }, 400, origin);
  const input = parsed.data;

  // Don't reveal the purpose of a hidden field to automated form fillers.
  if (input.website) return json({ ok: true, status: "check_email" }, 202, origin);

  const env = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    challengeSecret: process.env.LAUNCH_WAITLIST_TURNSTILE_SECRET,
    rateSecret: process.env.LAUNCH_WAITLIST_RATE_SECRET,
    resendKey: process.env.CLAIM_RESEND_API_KEY || process.env.RESEND_API_KEY,
  };
  // Fail closed until the migration, secrets, and verified mail domain are ready.
  if (Object.values(env).some((value) => !value))
    return json({ ok: false, status: "temporarily_unavailable" }, 503, origin);

  try {
    const isHuman = await verifyTurnstile(
      input.turnstileToken,
      env.challengeSecret!,
      origin!,
    );
    if (!isHuman)
      return json({ ok: false, status: "verification_failed" }, 400, origin);
  } catch {
    return json({ ok: false, status: "temporarily_unavailable" }, 503, origin);
  }

  const db = createClient(env.url!, env.serviceKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Both checks use an atomic SECURITY DEFINER function with service-only
  // EXECUTE permission, independent of client-controlled browser storage.
  const emailKey = rateDigest(
    env.rateSecret!,
    "email",
    input.product + ":" + input.email,
  );
  const { data: emailAllowed, error: emailError } = await db.rpc(
    "reserve_launch_waitlist_rate",
    { p_key_hash: emailKey, p_limit: 3, p_window_seconds: 3600 },
  );
  if (emailError)
    return json({ ok: false, status: "temporarily_unavailable" }, 503, origin);
  if (!emailAllowed)
    return json({ ok: false, status: "try_later" }, 429, origin);

  const cloudflareIp = request.headers.get("cf-connecting-ip");
  if (cloudflareIp) {
    const { data: ipAllowed, error: ipError } = await db.rpc(
      "reserve_launch_waitlist_rate",
      {
        p_key_hash: rateDigest(env.rateSecret!, "ip", cloudflareIp),
        p_limit: 12,
        p_window_seconds: 3600,
      },
    );
    if (ipError)
      return json({ ok: false, status: "temporarily_unavailable" }, 503, origin);
    if (!ipAllowed)
      return json({ ok: false, status: "try_later" }, 429, origin);
  }

  const token = verificationToken();
  const tokenHash = digestToken(token);
  const { data: rows, error: registrationError } = await db.rpc(
    "reserve_launch_waitlist_verification",
    {
      p_product: input.product,
      p_email: input.email,
      p_full_name: input.fullName,
      p_city: input.city,
      p_audience: input.audience,
      p_interests: input.interests,
      p_locale: input.locale,
      p_marketing_consent: input.marketingConsent,
      p_token_hash: tokenHash,
    },
  );
  if (registrationError)
    return json({ ok: false, status: "temporarily_unavailable" }, 503, origin);

  const entryId = (rows as Array<{ entry_id: string }> | null)?.[0]?.entry_id;
  // Already verified or recently sent. Never disclose subscriber state.
  if (!entryId)
    return json({ ok: true, status: "check_email" }, 202, origin);

  const email = verificationMessage({
    entryId,
    product: input.product,
    locale: input.locale,
    token,
  });

  let sent = false;
  try {
    const provider = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + env.resendKey,
        "Content-Type": "application/json",
        "Idempotency-Key": "launch-" + entryId + "-" + tokenHash.slice(0, 24),
      },
      body: JSON.stringify({
        from: "AkiPasa <support@akipasa.com>",
        to: [input.email],
        subject: email.subject,
        text: email.text,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (provider.ok) {
      const result = (await provider.json()) as { id?: string };
      sent = typeof result.id === "string" && result.id.length > 0;
    }
  } catch {
    // Do not claim success on a provider timeout or ambiguous send.
  }
  if (!sent) {
    // Release the retry hold only for the token from this exact request.
    // A later retry may already have replaced it: never invalidate that retry.
    await db
      .from("launch_waitlist_entries")
      .update({
        verification_hash: null,
        verification_expires_at: null,
        verification_sent_at: null,
      })
      .eq("id", entryId)
      .eq("verification_hash", tokenHash)
      .is("verified_at", null);
    return json({ ok: false, status: "temporarily_unavailable" }, 503, origin);
  }
  return json({ ok: true, status: "check_email" }, 202, origin);
}
