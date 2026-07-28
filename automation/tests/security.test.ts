import { describe, expect, it } from "vitest";
import { canonicalVoiceRequest, stableJson } from "../src/security/canonical";
import { signHmac } from "../src/security/hmac";
import { authenticateVoiceRequest } from "../src/security/voice-auth";
import { voiceRequestSchema, type VoiceRequest } from "../src/schema";

const secret = "0123456789abcdef0123456789abcdef";
const baseRequest = {
  command: "send-investor-update",
  device: "alex-phone",
  timestamp: "2026-07-27T09:00:00.000Z",
  nonce: "nonce_0123456789abcdef",
  payload: { beta: 2, alpha: { z: true, a: 1 } },
};

describe("voice request authentication", () => {
  it("canonicalizes payload keys deterministically", () => {
    expect(stableJson({ b: 2, a: { d: 4, c: 3 } })).toBe(
      '{"a":{"c":3,"d":4},"b":2}',
    );
  });

  it("accepts a fresh signed request from an allowed device", async () => {
    const canonical = await canonicalVoiceRequest(baseRequest);
    const request: VoiceRequest = {
      ...baseRequest,
      signature: `v1=${await signHmac(secret, canonical)}`,
    };
    await expect(
      authenticateVoiceRequest(
        request,
        {
          ALLOWED_DEVICE_IDS: "alex-phone,backup-phone",
          COMMAND_MAX_AGE_SECONDS: "300",
          SIGNING_SECRET: secret,
        },
        new Date("2026-07-27T09:02:00.000Z"),
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects stale, unknown-device, and modified requests", async () => {
    const signature = `v1=${await signHmac(
      secret,
      await canonicalVoiceRequest(baseRequest),
    )}`;
    const request: VoiceRequest = { ...baseRequest, signature };
    const environment = {
      ALLOWED_DEVICE_IDS: "alex-phone",
      COMMAND_MAX_AGE_SECONDS: "300",
      SIGNING_SECRET: secret,
    };
    await expect(
      authenticateVoiceRequest(
        request,
        environment,
        new Date("2026-07-27T10:00:00.000Z"),
      ),
    ).rejects.toMatchObject({ code: "unauthorized" });
    await expect(
      authenticateVoiceRequest(
        { ...request, device: "unknown-phone" },
        environment,
        new Date("2026-07-27T09:02:00.000Z"),
      ),
    ).rejects.toMatchObject({ code: "unauthorized" });
    await expect(
      authenticateVoiceRequest(
        { ...request, command: "show-revenue" },
        environment,
        new Date("2026-07-27T09:02:00.000Z"),
      ),
    ).rejects.toMatchObject({ code: "unauthorized" });
  });

  it("enforces the signed request contract", () => {
    expect(
      voiceRequestSchema.safeParse({
        ...baseRequest,
        signature: "not-a-signature",
      }).success,
    ).toBe(false);
    expect(
      voiceRequestSchema.parse({
        ...baseRequest,
        command: "SEND INVESTOR UPDATE",
        signature: `v1=${"a".repeat(64)}`,
      }).command,
    ).toBe("send investor update");
  });
});
