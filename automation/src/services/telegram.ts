import { z } from "zod";
import type { Bindings } from "../bindings";
import { AppError } from "../errors";

const telegramResponseSchema = z.object({
  ok: z.boolean(),
  result: z
    .object({
      message_id: z.number(),
    })
    .optional(),
});

export type TelegramSendResult = {
  messageId: string;
  chatIdSuffix: string;
};

export async function sendTelegramMessage(
  env: Bindings,
  text: string,
  options: {
    parseMode?: "MarkdownV2";
    replyToMessageId?: number;
  } = {},
): Promise<TelegramSendResult> {
  if (!env.TELEGRAM_BOT_TOKEN || !/^-?\d+$/.test(env.TELEGRAM_CHAT_ID)) {
    throw new AppError(
      "telegram-misconfigured",
      500,
      "Telegram secrets are not configured.",
    );
  }
  const endpoint = `${env.TELEGRAM_API_BASE}/bot${encodeURIComponent(
    env.TELEGRAM_BOT_TOKEN,
  )}/sendMessage`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        ...(options.parseMode ? { parse_mode: options.parseMode } : {}),
        ...(options.replyToMessageId
          ? {
              reply_parameters: {
                message_id: options.replyToMessageId,
                allow_sending_without_reply: true,
              },
            }
          : {}),
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(3_500),
    });
  } catch {
    throw new AppError("telegram-unavailable", 502, "Telegram request failed.");
  }

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > 64_000) {
    throw new AppError(
      "telegram-invalid-response",
      502,
      "Telegram returned an invalid response.",
    );
  }
  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    throw new AppError(
      "telegram-invalid-response",
      502,
      "Telegram returned an invalid response.",
    );
  }
  const parsed = telegramResponseSchema.safeParse(responseBody);
  if (
    !response.ok ||
    !parsed.success ||
    !parsed.data.ok ||
    !parsed.data.result
  ) {
    throw new AppError(
      "telegram-rejected",
      502,
      `Telegram rejected the message with status ${response.status}.`,
    );
  }

  return {
    messageId: String(parsed.data.result.message_id),
    chatIdSuffix: env.TELEGRAM_CHAT_ID.slice(-6),
  };
}

export function sendTelegramMarkdown(env: Bindings, markdown: string) {
  return sendTelegramMessage(env, markdown, { parseMode: "MarkdownV2" });
}
