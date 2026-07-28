import { afterEach, describe, expect, it, vi } from "vitest";
import type { Bindings } from "../src/bindings";
import { app } from "../src/index";
import { canonicalVoiceRequest } from "../src/security/canonical";
import { signHmac } from "../src/security/hmac";

const signingSecret = "0123456789abcdef0123456789abcdef";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("signed voice route", () => {
  it("authenticates, reserves replay state, audits, and sends to Telegram", async () => {
    const databaseRun = vi.fn().mockResolvedValue({ success: true });
    const prepare = vi.fn(() => ({
      bind: vi.fn(() => ({ run: databaseRun })),
    }));
    const replayGet = vi.fn().mockResolvedValue(null);
    const replayPut = vi.fn().mockResolvedValue(undefined);
    const telegramFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          result: { message_id: 731 },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", telegramFetch);

    const unsigned = {
      command: "test the bot",
      device: "test-phone",
      timestamp: new Date().toISOString(),
      nonce: "voice_test_nonce_0123456789",
      payload: {},
    };
    const signature = `v1=${await signHmac(
      signingSecret,
      await canonicalVoiceRequest(unsigned),
    )}`;
    const env = {
      AUTOMATION_DB: { prepare },
      REPLAY_KV: { get: replayGet, put: replayPut },
      ALLOWED_DEVICE_IDS: "test-phone",
      COMMAND_MAX_AGE_SECONDS: "300",
      SIGNING_SECRET: signingSecret,
      TELEGRAM_BOT_TOKEN: "test-token",
      TELEGRAM_CHAT_ID: "-1000000000000",
      TELEGRAM_API_BASE: "https://api.telegram.test",
    } as unknown as Bindings;

    const response = await app.request(
      "/voice",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...unsigned, signature }),
      },
      env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      command: "send-telegram-test",
      data: { telegramMessageId: "731" },
    });
    expect(replayPut).toHaveBeenCalledOnce();
    expect(prepare).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO request_nonces"),
    );
    expect(prepare).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO execution_logs"),
    );
    expect(telegramFetch).toHaveBeenCalledWith(
      expect.stringContaining("/sendMessage"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
