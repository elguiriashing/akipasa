import { z } from "zod";
import type { Bindings } from "./bindings";
import { resolveCommand } from "./command-router";
import type { CommandResult } from "./commands/types";
import { AppError } from "./errors";
import { finishExecution, startExecution } from "./execution-log";
import type { VoiceRequest } from "./schema";
import { reserveOperation } from "./security/replay";
import { sendTelegramMessage } from "./services/telegram";

const telegramUpdateSchema = z.object({
  update_id: z.number().int().nonnegative(),
  message: z
    .object({
      message_id: z.number().int().positive(),
      chat: z.object({
        id: z.number().int(),
        type: z.enum(["group", "supergroup", "private", "channel"]),
      }),
      text: z.string().max(4_096).optional(),
    })
    .optional(),
});

const slashCommands = {
  numbers: "send-investor-update",
  revenue: "show-revenue",
  expenses: "show-expenses",
  status: "automation-status",
  test: "send-telegram-test",
} as const;

const helpText = [
  "AkiPasa Command Centre",
  "",
  "/numbers - Send the current investor update",
  "/revenue - Show 30-day revenue, MRR and net",
  "/expenses - Show 30-day expenses and monthly burn",
  "/status - Check Worker and database health",
  "/test - Send a Telegram connection test",
  "/help - Show this command menu",
].join("\n");

type SlashCommand = keyof typeof slashCommands | "help";

export function parseTelegramCommand(text: string): SlashCommand | null {
  const match = text.trim().match(/^\/([a-z]+)(?:@[a-z0-9_]+)?(?:\s|$)/i);
  if (!match) return null;
  const name = match[1].toLowerCase();
  if (name === "help" || name === "commands") return "help";
  return name in slashCommands ? (name as keyof typeof slashCommands) : null;
}

async function secretsMatch(actual: string, expected: string) {
  const encoder = new TextEncoder();
  const [actualDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(actualDigest);
  const right = new Uint8Array(expectedDigest);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0 && actual.length === expected.length;
}

function money(minor: unknown, currency: unknown) {
  const amount = typeof minor === "number" ? minor : 0;
  const code = typeof currency === "string" ? currency : "EUR";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatResult(command: string, result: CommandResult) {
  const data = result.data || {};
  if (command === "show-revenue") {
    return [
      "AkiPasa revenue - last 30 days",
      `Revenue: ${money(data.revenueMinor, data.currency)}`,
      `MRR: ${money(data.mrrMinor, data.currency)}`,
      `Net: ${money(data.netMinor, data.currency)}`,
    ].join("\n");
  }
  if (command === "show-expenses") {
    return [
      "AkiPasa expenses - last 30 days",
      `Expenses: ${money(data.totalExpensesMinor, data.currency)}`,
      `Monthly burn: ${money(data.monthlyBurnMinor, data.currency)}`,
      `Latest purchases: ${
        Array.isArray(data.latestPurchases) && data.latestPurchases.length
          ? data.latestPurchases.length
          : "none"
      }`,
    ].join("\n");
  }
  if (command === "automation-status") {
    return [
      "AkiPasa automation status",
      `Worker: online`,
      `Database: ${data.database === "ok" ? "healthy" : "degraded"}`,
    ].join("\n");
  }
  return result.summary;
}

export async function handleTelegramWebhook(
  request: Request,
  env: Bindings,
  requestId: string,
) {
  const suppliedSecret =
    request.headers.get("x-telegram-bot-api-secret-token") || "";
  if (
    !env.TELEGRAM_WEBHOOK_SECRET ||
    !(await secretsMatch(suppliedSecret, env.TELEGRAM_WEBHOOK_SECRET))
  ) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ ok: true });
  }
  const parsed = telegramUpdateSchema.safeParse(input);
  if (!parsed.success || !parsed.data.message?.text) {
    return Response.json({ ok: true });
  }

  const { message, update_id: updateId } = parsed.data;
  if (
    !["group", "supergroup"].includes(message.chat.type) ||
    String(message.chat.id) !== env.TELEGRAM_CHAT_ID
  ) {
    return Response.json({ ok: true });
  }

  const slashCommand = parseTelegramCommand(message.text || "");
  if (!slashCommand) {
    return Response.json({ ok: true });
  }
  const commandName =
    slashCommand === "help" ? "telegram-help" : slashCommands[slashCommand];

  try {
    await reserveOperation(
      {
        actor: "telegram-group",
        operationId: String(updateId),
        command: commandName,
        ttlSeconds: 172_800,
      },
      env,
    );
  } catch (error) {
    if (error instanceof AppError && error.code === "replay-detected") {
      return Response.json({ ok: true, duplicate: true });
    }
    throw error;
  }

  const execution = await startExecution(env, {
    requestId,
    command: commandName,
    caller: "telegram:group",
  });

  try {
    if (slashCommand === "help") {
      const telegram = await sendTelegramMessage(env, helpText, {
        replyToMessageId: message.message_id,
      });
      const data = { telegramMessageId: telegram.messageId };
      await finishExecution(env, execution, { success: true, data });
      return Response.json({ ok: true });
    }

    const command = resolveCommand(commandName);
    const now = new Date();
    const syntheticRequest: VoiceRequest = {
      command: command.name,
      device: "telegram-group",
      timestamp: now.toISOString(),
      nonce: String(updateId).padStart(16, "0"),
      signature: `v1=${"0".repeat(64)}`,
      payload: {},
    };
    const result = await command.execute({
      env,
      request: syntheticRequest,
      execution,
      now,
    });

    if (command.effect === "read") {
      await sendTelegramMessage(env, formatResult(command.name, result), {
        replyToMessageId: message.message_id,
      });
    }
    await finishExecution(env, execution, {
      success: true,
      data: result.data,
    });
    return Response.json({ ok: true });
  } catch (error) {
    await finishExecution(env, execution, {
      success: false,
      code:
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "telegram-command-failed",
      error,
    });
    throw error;
  }
}
