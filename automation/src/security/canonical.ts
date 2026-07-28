import type { VoiceRequest } from "../schema";

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, sortValue(entry)]),
    );
  }
  return value;
}

export function stableJson(value: unknown) {
  return JSON.stringify(sortValue(value));
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function canonicalVoiceRequest(
  request: Omit<VoiceRequest, "signature">,
) {
  const payloadHash = await sha256Hex(stableJson(request.payload));
  return [
    "v1",
    "POST",
    "/voice",
    request.command,
    request.device,
    request.timestamp,
    request.nonce,
    payloadHash,
  ].join("\n");
}
