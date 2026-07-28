import { AppError } from "../errors";

function signatureBytes(signature: string) {
  const hex = signature.slice(3);
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }
  return bytes;
}

async function importHmacKey(secret: string, usages: KeyUsage[]) {
  if (secret.length < 32) {
    throw new AppError(
      "server-misconfigured",
      500,
      "Signing secrets must contain at least 32 characters.",
    );
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

export async function verifyHmac(
  secret: string,
  message: string,
  signature: string,
) {
  const key = await importHmacKey(secret, ["verify"]);
  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes(signature),
    new TextEncoder().encode(message),
  );
}

export async function signHmac(secret: string, message: string) {
  const key = await importHmacKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
