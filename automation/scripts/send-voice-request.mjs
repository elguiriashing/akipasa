import { createHash, createHmac, randomBytes } from "node:crypto";

function sortValue(value) {
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

const endpoint = process.env.AKIPASA_AUTOMATION_URL;
const secret = process.env.AKIPASA_SIGNING_SECRET;
const device = process.env.AKIPASA_DEVICE_ID;
const command = process.argv[2] || "send-investor-update";
const payload = process.argv[3] ? JSON.parse(process.argv[3]) : {};

if (!endpoint || !secret || !device) {
  console.error(
    "Set AKIPASA_AUTOMATION_URL, AKIPASA_SIGNING_SECRET, and AKIPASA_DEVICE_ID.",
  );
  process.exit(2);
}

const baseUrl = new URL(endpoint);
const localDevelopment =
  baseUrl.hostname === "127.0.0.1" || baseUrl.hostname === "localhost";
if (baseUrl.protocol !== "https:" && !localDevelopment) {
  console.error("The automation URL must use HTTPS outside local development.");
  process.exit(2);
}

const timestamp = new Date().toISOString();
const nonce = randomBytes(24).toString("base64url");
const payloadJson = JSON.stringify(sortValue(payload));
const payloadHash = createHash("sha256").update(payloadJson).digest("hex");
const canonical = [
  "v1",
  "POST",
  "/voice",
  command.trim().toLowerCase().replace(/\s+/g, " "),
  device,
  timestamp,
  nonce,
  payloadHash,
].join("\n");
const signature = `v1=${createHmac("sha256", secret)
  .update(canonical)
  .digest("hex")}`;
const request = { command, device, timestamp, nonce, signature, payload };

const startedAt = Date.now();
try {
  const response = await fetch(new URL("/voice", baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(5_000),
  });
  const body = await response.text();
  console.log(body);
  console.error(`AkiPasa command completed in ${Date.now() - startedAt} ms.`);
  if (!response.ok) process.exit(1);
} catch (error) {
  console.error(
    error instanceof Error
      ? `AkiPasa command failed: ${error.message}`
      : "AkiPasa command failed.",
  );
  process.exit(1);
}
