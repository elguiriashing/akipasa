import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  founderPushEnabled,
  founderPushStartedAt,
  founderPushTestEnabled,
  founderUserIds,
} from "./founder-push";

export type PushEnv = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  AKIPASA_PUSH_ENABLED?: string;
  AKIPASA_PUSH_STARTED_AT?: string;
  AKIPASA_PUSH_ENROLLMENT_ENABLED?: string;
  AKIPASA_PUSH_TEST_ENABLED?: string;
  AKIPASA_PUSH_FOUNDER_IDS?: string;
  AKIPASA_PUSH_WEBHOOK_SECRET?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
  FIREBASE_PROJECT_ID?: string;
};
/** Explicit projection keeps process.env compatible with typed Worker bindings. */
export function pushEnvironment(): PushEnv {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    AKIPASA_PUSH_ENABLED: process.env.AKIPASA_PUSH_ENABLED,
    AKIPASA_PUSH_STARTED_AT: process.env.AKIPASA_PUSH_STARTED_AT,
    AKIPASA_PUSH_ENROLLMENT_ENABLED:
      process.env.AKIPASA_PUSH_ENROLLMENT_ENABLED,
    AKIPASA_PUSH_TEST_ENABLED: process.env.AKIPASA_PUSH_TEST_ENABLED,
    AKIPASA_PUSH_FOUNDER_IDS: process.env.AKIPASA_PUSH_FOUNDER_IDS,
    AKIPASA_PUSH_WEBHOOK_SECRET: process.env.AKIPASA_PUSH_WEBHOOK_SECRET,
    FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  };
}
const serviceAccountSchema = z.object({
  project_id: z.string(),
  client_email: z.string().email(),
  private_key: z.string().min(100),
});
type ServiceAccount = z.infer<typeof serviceAccountSchema>;
export type PushOutcome = {
  status: "sent" | "failed" | "blocked";
  reason: string;
  invalidToken?: boolean;
};
type PushDevice = {
  token: string;
  user_id: string;
  session_id: string;
  expires_at: string;
  locale?: string;
};
function firebaseAccount(env: PushEnv): ServiceAccount | null {
  try {
    const account = serviceAccountSchema.parse(
      JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON || ""),
    );
    return account.project_id === env.FIREBASE_PROJECT_ID &&
      /^[a-z][a-z0-9-]{4,29}$/.test(account.project_id)
      ? account
      : null;
  } catch {
    return null;
  }
}
function b64url(bytes: Uint8Array): string {
  let str = "";
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function googleAccessToken(account: ServiceAccount) {
  const binary = Uint8Array.from(
    atob(
      account.private_key.replace(
        /-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,
        "",
      ),
    ),
    (c) => c.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binary,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    b64url(new TextEncoder().encode(JSON.stringify(value)));
  const assertion =
    encode({ alg: "RS256", typ: "JWT" }) +
    "." +
    encode({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    });
  const signature = b64url(
    new Uint8Array(
      await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        key,
        new TextEncoder().encode(assertion),
      ),
    ),
  );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: assertion + "." + signature,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("google_oauth_unavailable");
  const data = z
    .object({ access_token: z.string().min(1) })
    .parse(await response.json());
  return data.access_token;
}
/** FCM's HTTP status alone does not identify a bad token. Only its typed
 * UNREGISTERED response permits cleanup; generic 400/404 must preserve devices. */
export function classifyFcmResponse(
  status: number,
  payload: unknown,
): PushOutcome {
  const response = z
    .object({
      name: z.string().optional(),
      error: z
        .object({
          details: z
            .array(
              z.object({
                "@type": z.string().optional(),
                errorCode: z.string().optional(),
              }),
            )
            .optional(),
        })
        .optional(),
    })
    .safeParse(payload);
  if (status === 200)
    return response.success && response.data.name?.startsWith("projects/")
      ? { status: "sent", reason: "" }
      : { status: "blocked", reason: "provider_unconfirmed" };
  const code = response.success
    ? response.data.error?.details?.find(
        (detail) =>
          detail["@type"] ===
          "type.googleapis.com/google.firebase.fcm.v1.FcmError",
      )?.errorCode
    : undefined;
  if (code === "UNREGISTERED")
    return {
      status: "blocked",
      reason: "token_unregistered",
      invalidToken: true,
    };
  if (status === 429 || status >= 500)
    return { status: "failed", reason: "provider_retryable" };
  return {
    status: "blocked",
    reason:
      status === 401 || status === 403
        ? "provider_configuration"
        : "provider_rejected",
  };
}
export async function sendFounderPush(
  token: string,
  data: Record<string, string>,
  accessToken: string,
  project: string,
): Promise<PushOutcome> {
  try {
    const response = await fetch(
      "https://fcm.googleapis.com/v1/projects/" +
        encodeURIComponent(project) +
        "/messages:send",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: { token, data, android: { priority: "high", ttl: "3600s" } },
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    const payload: unknown = await response.json().catch(() => null);
    return classifyFcmResponse(response.status, payload);
  } catch {
    return { status: "blocked", reason: "provider_unconfirmed" };
  }
}
export async function sendFounderTestPush(
  env: PushEnv,
  device: PushDevice,
  testId: string,
): Promise<PushOutcome> {
  const account = firebaseAccount(env);
  if (
    !founderPushTestEnabled(env) ||
    !account ||
    !founderUserIds(env.AKIPASA_PUSH_FOUNDER_IDS).has(
      device.user_id.toLowerCase(),
    )
  )
    return { status: "blocked", reason: "not_configured" };
  let accessToken: string;
  try {
    accessToken = await googleAccessToken(account);
  } catch {
    return { status: "failed", reason: "credential_unavailable" };
  }
  return sendFounderPush(
    device.token,
    {
      type: "founder_test",
      event_id: testId,
      test_id: testId,
      registration_key: device.session_id,
      locale: device.locale === "es" ? "es" : "en",
    },
    accessToken,
    account.project_id,
  );
}
export async function dispatchFounderClaimPushes(
  env: PushEnv = pushEnvironment(),
  claimId?: string,
) {
  const account = firebaseAccount(env);
  if (
    !founderPushEnabled(env) ||
    !account ||
    !env.SUPABASE_SERVICE_ROLE_KEY ||
    !env.NEXT_PUBLIC_SUPABASE_URL
  )
    return { configured: false, sent: 0 };
  // Credential failure has not submitted anything to FCM and must not strand leases.
  let accessToken: string;
  try {
    accessToken = await googleAccessToken(account);
  } catch {
    console.error("founder_push_credentials_unavailable");
    return { configured: true, sent: 0 };
  }
  const db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: queue, error } = await db.rpc("claim_due_push_deliveries", {
    p_claim: claimId || null,
    p_started_at: founderPushStartedAt(env.AKIPASA_PUSH_STARTED_AT),
  });
  if (error) {
    console.error("founder_push_queue_unavailable");
    return { configured: true, sent: 0 };
  }
  const founders = founderUserIds(env.AKIPASA_PUSH_FOUNDER_IDS);
  const results = await Promise.all(
    (queue || []).map(
      async (job: {
        device_id: string;
        claim_id: string;
        lease_id: string;
        created_at: string;
      }) => {
        let outcome: PushOutcome = { status: "blocked", reason: "ineligible" };
        try {
          const { data: rows, error: deviceError } = await db.rpc(
            "active_founder_push_device",
            { p_device: job.device_id },
          );
          if (deviceError) throw new Error("device_read_failed");
          const device = rows?.[0] as PushDevice | undefined;
          if (
            device &&
            founders.has(device.user_id.toLowerCase()) &&
            new Date(device.expires_at).getTime() > Date.now() &&
            Date.now() - new Date(job.created_at).getTime() < 3600000
          ) {
            const { data: claim, error: claimError } = await db
              .from("venue_claims")
              .select("status")
              .eq("id", job.claim_id)
              .maybeSingle();
            if (claimError) throw new Error("claim_read_failed");
            if (claim?.status === "pending")
              outcome = await sendFounderPush(
                device.token,
                {
                  type: "venue_claim",
                  claim_id: job.claim_id,
                  event_id: job.claim_id,
                  registration_key: device.session_id,
                  locale: device.locale === "es" ? "es" : "en",
                },
                accessToken,
                account.project_id,
              );
          }
        } catch {
          outcome = { status: "failed", reason: "eligibility_unavailable" };
        }
        const { data: acknowledged, error: ack } = await db.rpc(
          "finish_claim_push_delivery",
          {
            p_claim: job.claim_id,
            p_device: job.device_id,
            p_lease: job.lease_id,
            p_status: outcome.status,
            p_error: outcome.reason || null,
          },
        );
        if (ack || acknowledged !== true)
          console.error("founder_push_ack_failed");
        if (outcome.invalidToken) {
          const { error: cleanupError } = await db
            .from("admin_push_devices")
            .delete()
            .eq("id", job.device_id);
          if (cleanupError) console.error("founder_push_token_cleanup_failed");
        }
        console.info("founder_push_delivery", {
          status: outcome.status,
          reason: outcome.reason,
        });
        return outcome.status === "sent" ? 1 : 0;
      },
    ),
  );
  return {
    configured: true,
    sent: results.reduce((sum: number, sent: number) => sum + sent, 0),
  };
}
