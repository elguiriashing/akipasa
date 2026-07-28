import { afterEach, describe, expect, it, vi } from "vitest";
import type { Bindings } from "../src/bindings";
import { app } from "../src/index";
import { parseTelegramCommand } from "../src/telegram-webhook";

afterEach(() => {
  vi.unstubAllGlobals();
});

function environment(options?: { replayed?: boolean }) {
  const run = vi.fn().mockResolvedValue({ success: true });
  const bind = vi.fn(() => ({
    run,
    first: vi.fn().mockResolvedValue({ healthy: 1 }),
  }));
  const prepare = vi.fn(() => ({
    bind,
    first: vi.fn().mockResolvedValue({ healthy: 1 }),
  }));
  const get = vi.fn().mockResolvedValue(options?.replayed ? "1" : null);
  const put = vi.fn().mockResolvedValue(undefined);
  return {
    env: {
      AUTOMATION_DB: { prepare },
      REPLAY_KV: { get, put },
      COMMAND_MAX_AGE_SECONDS: "300",
      TELEGRAM_BOT_TOKEN: "test-token",
      TELEGRAM_CHAT_ID: "-5114676407",
      TELEGRAM_WEBHOOK_SECRET:
        "telegram-webhook-secret-with-at-least-32-characters",
      TELEGRAM_API_BASE: "https://api.telegram.test",
    } as unknown as Bindings,
    prepare,
    put,
  };
}

function webhookRequest(
  text: string,
  options?: { secret?: string; chatId?: number; updateId?: number },
) {
  return new Request("https://automation.test/telegram/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token":
        options?.secret ||
        "telegram-webhook-secret-with-at-least-32-characters",
    },
    body: JSON.stringify({
      update_id: options?.updateId || 731,
      message: {
        message_id: 42,
        chat: {
          id: options?.chatId || -5114676407,
          type: "group",
        },
        text,
      },
    }),
  });
}

describe("Telegram command parsing", () => {
  it.each([
    ["/help", "help"],
    ["/commands@akipasabot", "help"],
    ["/numbers", "numbers"],
    ["/revenue@akipasabot now", "revenue"],
    ["/expenses", "expenses"],
    ["/status", "status"],
    ["/test", "test"],
    ["hello", null],
    ["/unknown", null],
  ])("parses %s", (input, expected) => {
    expect(parseTelegramCommand(input)).toBe(expected);
  });
});

describe("Telegram webhook", () => {
  it("rejects a request without the configured webhook secret", async () => {
    const fixture = environment();
    const response = await app.fetch(
      webhookRequest("/help", { secret: "wrong-secret" }),
      fixture.env,
    );

    expect(response.status).toBe(401);
    expect(fixture.prepare).not.toHaveBeenCalled();
  });

  it("ignores commands from any other chat", async () => {
    const fixture = environment();
    const telegramFetch = vi.fn();
    vi.stubGlobal("fetch", telegramFetch);

    const response = await app.fetch(
      webhookRequest("/help", { chatId: -100123456 }),
      fixture.env,
    );

    expect(response.status).toBe(200);
    expect(fixture.prepare).not.toHaveBeenCalled();
    expect(telegramFetch).not.toHaveBeenCalled();
  });

  it("reserves and audits /help before replying with the command menu", async () => {
    const fixture = environment();
    const telegramFetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ ok: true, result: { message_id: 99 } }),
      );
    vi.stubGlobal("fetch", telegramFetch);

    const response = await app.fetch(webhookRequest("/help"), fixture.env);

    expect(response.status).toBe(200);
    expect(fixture.prepare).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO request_nonces"),
    );
    expect(fixture.prepare).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO execution_logs"),
    );
    expect(fixture.put).toHaveBeenCalledWith("nonce:telegram-group:731", "1", {
      expirationTtl: 172_800,
    });
    const telegramBody = JSON.parse(
      String(telegramFetch.mock.calls[0][1]?.body),
    );
    expect(telegramBody.text).toContain("/numbers");
    expect(telegramBody.reply_parameters).toMatchObject({ message_id: 42 });
  });

  it("executes /status through the command router and replies once", async () => {
    const fixture = environment();
    const telegramFetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ ok: true, result: { message_id: 100 } }),
      );
    vi.stubGlobal("fetch", telegramFetch);

    const response = await app.fetch(webhookRequest("/status"), fixture.env);

    expect(response.status).toBe(200);
    expect(telegramFetch).toHaveBeenCalledOnce();
    const telegramBody = JSON.parse(
      String(telegramFetch.mock.calls[0][1]?.body),
    );
    expect(telegramBody.text).toContain("Database: healthy");
  });

  it("acknowledges a duplicate update without executing it again", async () => {
    const fixture = environment({ replayed: true });
    const telegramFetch = vi.fn();
    vi.stubGlobal("fetch", telegramFetch);

    const response = await app.fetch(webhookRequest("/numbers"), fixture.env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      duplicate: true,
    });
    expect(fixture.prepare).not.toHaveBeenCalled();
    expect(telegramFetch).not.toHaveBeenCalled();
  });
});
