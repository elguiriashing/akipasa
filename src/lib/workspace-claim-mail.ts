import type { BookingMailOutcome } from "./booking-confirmation-email";
import { claimEmailFrom, renderClaimDecision, type ClaimDecision } from "./claim-decision-email";

/** Workspace Admin must delegate ONLY https://www.googleapis.com/auth/gmail.send to this service account. */
export type WorkspaceMailCredentials = {
  GOOGLE_WORKSPACE_CLIENT_EMAIL?: string;
  GOOGLE_WORKSPACE_PRIVATE_KEY?: string;
  GOOGLE_WORKSPACE_SENDER?: string;
};

const encode = (data: Uint8Array) =>
  btoa(Array.from(data, (byte) => String.fromCharCode(byte)).join(""))
    .replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/g, "");
const utf8 = (text: string) => new TextEncoder().encode(text);
const sanitizeHeader = (text: string) => text.replace(/[\r\n]/g, " ");
const address = "alex@akipasa.com";

async function getAccessToken(credentials: WorkspaceMailCredentials) {
  const client = credentials.GOOGLE_WORKSPACE_CLIENT_EMAIL;
  const pem = credentials.GOOGLE_WORKSPACE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!client || !pem || credentials.GOOGLE_WORKSPACE_SENDER !== address)
    throw new Error("workspace_config_missing");
  const match = pem.match(/-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/);
  if (!match) throw new Error("workspace_key_invalid");
  const der = Uint8Array.from(atob(match[1].replace(/\s/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const header = encode(utf8(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = encode(utf8(JSON.stringify({
    iss: client, sub: address, aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/gmail.send", iat: now, exp: now + 300,
  })));
  const unsigned = `${header}.${claims}`;
  const signature = encode(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, utf8(unsigned))));
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`workspace_auth_${response.status}`);
  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) throw new Error("workspace_auth_invalid");
  return payload.access_token;
}

/** Gmail has no server-side idempotency key. Ambiguous sends must be held for review, never blindly replayed. */
export async function sendWorkspaceClaimDecision(
  data: ClaimDecision & { recipient: string },
  credentials: WorkspaceMailCredentials,
): Promise<BookingMailOutcome & { retryable?: boolean }> {
  let accessToken: string;
  try {
    accessToken = await getAccessToken(credentials);
  } catch (error) {
    const code = error instanceof Error ? error.message : "workspace_auth_unavailable";
    return { ok: false, error: code.startsWith("workspace_") ? code : "workspace_auth_unavailable", ambiguous: false, retryable: false };
  }
  const rendered = renderClaimDecision(data);
  const boundary = "akipasa_claim_" + data.claimId.replace(/[^a-zA-Z0-9]/g, "");
  const mime = [
    `From: ${claimEmailFrom}`,
    `To: ${sanitizeHeader(data.recipient)}`,
    `Reply-To: ${address}`,
    `Subject: =?UTF-8?B?${btoa(Array.from(utf8(rendered.subject), (b) => String.fromCharCode(b)).join(""))}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    btoa(Array.from(utf8(rendered.text), (b) => String.fromCharCode(b)).join("")),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    btoa(Array.from(utf8(rendered.html), (b) => String.fromCharCode(b)).join("")),
    `--${boundary}--`, "",
  ].join("\r\n");
  try {
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: encode(utf8(mime)) }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return {
      ok: false, error: `gmail_${response.status}`,
      ambiguous: response.status >= 500 || response.status === 429,
      retryable: false,
    };
    const payload = (await response.json()) as { id?: string };
    return payload.id
      ? { ok: true, messageId: payload.id }
      : { ok: false, error: "gmail_response_invalid", ambiguous: true, retryable: false };
  } catch {
    return { ok: false, error: "gmail_send_uncertain", ambiguous: true, retryable: false };
  }
}
