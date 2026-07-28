import { describe, expect, it } from "vitest";
import { verifyStripeSignature } from "../src/lib/stripe";

async function sign(payload: string, timestamp: number, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const signature = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  return `t=${timestamp},v1=${signature}`;
}

describe("Stripe webhook signatures", () => {
  it("accepts a current valid signature", async () => {
    const payload = '{"id":"evt_test"}';
    const timestamp = 1_800_000_000;
    const header = await sign(payload, timestamp, "whsec_test");
    await expect(
      verifyStripeSignature(payload, header, "whsec_test", timestamp),
    ).resolves.toBe(true);
  });

  it("rejects tampering and stale signatures", async () => {
    const timestamp = 1_800_000_000;
    const header = await sign("original", timestamp, "whsec_test");
    await expect(
      verifyStripeSignature("tampered", header, "whsec_test", timestamp),
    ).resolves.toBe(false);
    await expect(
      verifyStripeSignature("original", header, "whsec_test", timestamp + 301),
    ).resolves.toBe(false);
  });
});
