import type { Bindings } from "./bindings";
import { AppError } from "./errors";
import { sendTelegramMessage } from "./services/telegram";
import {
  createTelegramBackup,
  recordTelegramMessage,
} from "./telegram-webhook";

async function secretsMatch(actual: string, expected: string) {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1)
    difference |= left[index] ^ right[index];
  return difference === 0 && actual.length === expected.length;
}

export async function handleAkiHQTelegramRequest(
  request: Request,
  env: Bindings,
) {
  const supplied = request.headers.get("x-akihq-telegram-gateway") || "";
  if (
    !env.AKIHQ_TELEGRAM_GATEWAY_SECRET ||
    !(await secretsMatch(supplied, env.AKIHQ_TELEGRAM_GATEWAY_SECRET))
  )
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  if (
    request.method === "GET" &&
    url.pathname === "/internal/akihq/telegram/overview"
  ) {
    const [messages, backups] = await Promise.all([
      env.AUTOMATION_DB.prepare(
        "SELECT id, telegram_message_id, chat_id, user_id, username, display_name, direction, command, body, reply_to_message_id, created_at FROM telegram_messages ORDER BY created_at DESC LIMIT 250",
      ).all(),
      env.AUTOMATION_DB.prepare(
        "SELECT id, requested_by_user_id, period_start, period_end, message_count, created_at FROM telegram_backups ORDER BY created_at DESC LIMIT 60",
      ).all(),
    ]);
    return Response.json({
      ok: true,
      configured: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
      messages: messages.results || [],
      backups: backups.results || [],
      refreshedAt: new Date().toISOString(),
    });
  }
  const input =
    request.method === "POST"
      ? await request.json<Record<string, unknown>>()
      : {};
  if (
    request.method === "POST" &&
    url.pathname === "/internal/akihq/telegram/send"
  ) {
    const message = String(input.message || "").trim();
    const displayName = String(input.displayName || "AkiHQ user")
      .replace(/[\r\n]+/g, " ")
      .trim()
      .slice(0, 80);
    if (!message || message.length > 3500)
      throw new AppError(
        "invalid-message",
        400,
        "Enter a message of up to 3,500 characters.",
        true,
      );
    const text = `${message}\n-${displayName}`;
    const sent = await sendTelegramMessage(env, text);
    await recordTelegramMessage(env, {
      messageId: Number(sent.messageId),
      chatId: Number(env.TELEGRAM_CHAT_ID),
      displayName,
      direction: "outbound",
      command: "dashboard-chat",
      body: text,
    });
    return Response.json(
      { ok: true, messageId: sent.messageId, text, displayName },
      { status: 201 },
    );
  }
  if (
    request.method === "POST" &&
    url.pathname === "/internal/akihq/telegram/backups"
  ) {
    const backup = await createTelegramBackup(env);
    return Response.json(
      {
        ok: true,
        backup: {
          id: backup.id,
          message_count: backup.messageCount,
          period_end: backup.periodEnd,
          created_at: backup.periodEnd,
        },
      },
      { status: 201 },
    );
  }
  if (
    request.method === "GET" &&
    url.pathname.startsWith("/internal/akihq/telegram/backups/")
  ) {
    const id = decodeURIComponent(
      url.pathname.slice("/internal/akihq/telegram/backups/".length),
    ).slice(0, 100);
    const backup = await env.AUTOMATION_DB.prepare(
      "SELECT id, period_start, period_end, message_count, snapshot_json, created_at FROM telegram_backups WHERE id = ?",
    )
      .bind(id)
      .first<Record<string, unknown>>();
    if (!backup)
      throw new AppError(
        "backup-not-found",
        404,
        "Telegram backup was not found.",
        true,
      );
    return Response.json({
      ok: true,
      backup: {
        ...backup,
        messages: JSON.parse(String(backup.snapshot_json || "[]")),
        snapshot_json: undefined,
      },
    });
  }
  return Response.json({ ok: false, error: "not-found" }, { status: 404 });
}
