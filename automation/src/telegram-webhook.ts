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
      from: z
        .object({
          id: z.number().int().positive(),
          username: z.string().max(64).optional(),
          first_name: z.string().max(128).optional(),
          last_name: z.string().max(128).optional(),
        })
        .optional(),
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
  stats: "crm-stats",
  venues: "crm-venues",
  deals: "crm-deals",
  contacts: "crm-contacts",
  tasks: "crm-tasks",
  addlead: "crm-add-lead",
  backup: "telegram-backup",
  numbers: "send-investor-update",
  revenue: "show-revenue",
  expenses: "show-expenses",
  status: "automation-status",
  test: "send-telegram-test",
} as const;

const helpText = [
  "AkiHQ CRM Telegram Command Centre",
  "",
  "/stats - Live CRM dashboard stats and metrics",
  "/venues - List top registered AkiPasa venues",
  "/deals - Active pipeline sales deals summary",
  "/contacts - Team members and registered contacts",
  "/tasks - Current open team assignments",
  "/addlead <name> <company/email> - Quick add lead to CRM",
  "/backup - Trigger instant 24h chat backup",
  "/numbers - Current investor update",
  "/revenue - 30-day revenue, MRR and net",
  "/expenses - 30-day expenses and burn rate",
  "/status - Worker, Supabase DB and bot health",
  "/test - Telegram bot connection test",
  "/crm <instruction> - Run an administrator-approved CRM action",
  "/whoami - Show your Telegram user ID for administrator setup",
  "/help - Show this command menu",
].join("\n");
type SlashCommand = keyof typeof slashCommands | "help" | "crm" | "whoami";

export function parseTelegramCommand(text: string): SlashCommand | null {
  const match = text.trim().match(/^\/([a-z]+)(?:@[a-z0-9_]+)?(?:\s|$)/i);
  if (!match) return null;
  const name = match[1].toLowerCase();
  if (name === "help" || name === "commands") return "help";
  if (name === "crm" || name === "whoami") return name as "crm" | "whoami";
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
  if (command === "crm-stats") {
    return [
      "ðŸ“Š AkiHQ CRM Live Dashboard Stats",
      `ðŸ¢ Venues: ${data.totalVenues || 0} (${data.verifiedVenues || 0} verified)`,
      `ðŸ‘¥ Registered Users: ${data.totalUsers || 0}`,
      `ðŸ‘” Staff Members: ${data.staffUsers || 0}`,
      `â³ Pending Claims: ${data.pendingClaims || 0}`,
      `ðŸ’¼ Active Deals: ${data.activeDeals || 0}`,
    ].join("\n");
  }
  if (command === "crm-venues") {
    return [
      "ðŸ¢ AkiPasa Venues Overview",
      `Total Venues: ${data.totalVenues || 0}`,
      `Verified: ${data.verifiedVenues || 0}`,
      `Top Venues: ${Array.isArray(data.topVenues) ? data.topVenues.join(", ") : "All venues synced live to CRM"}`,
    ].join("\n");
  }
  if (command === "crm-deals") {
    return [
      "ðŸ’¼ AkiHQ Sales Deals & Pipeline",
      `Active Deals: ${data.activeDeals || 0}`,
      `Pipeline Value: ${money((typeof data.pipelineValue === "number" ? data.pipelineValue : 0) * 100, "EUR")}`,
      `Stages: Prospect, Product Tour, Contact Needed, Closed Won`,
    ].join("\n");
  }
  if (command === "crm-contacts") {
    return [
      "ðŸ‘¥ AkiHQ CRM Team & Contacts",
      `Total Contacts: ${data.totalContacts || 0}`,
      `Staff Roster: ${data.staffCount || 0} active members`,
      `Sync Status: Connected to Supabase`,
    ].join("\n");
  }
  if (command === "crm-tasks") {
    return [
      "ðŸ“‹ AkiHQ CRM Tasks & Work",
      `Open Tasks: ${data.openTasks || 0}`,
      `Completed: ${data.completedTasks || 0}`,
    ].join("\n");
  }
  if (command === "crm-add-lead") {
    return [
      "âœ… Lead Created in AkiHQ CRM",
      `Lead Name: ${data.leadName || "New Lead"}`,
      `Detail: ${data.leadDetail || "Added via Telegram Bot"}`,
      `Status: New Â· Assigned to CRM Lead Inbox`,
    ].join("\n");
  }
  if (command === "telegram-backup") {
    return [
      "ðŸ’¾ Telegram 24h Chat Backup Triggered",
      `Status: Complete`,
      `Snapshot: Saved to AkiHQ CRM Telegram Tab`,
      `Timestamp: ${new Date().toISOString()}`,
    ].join("\n");
  }
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
      `Telegram Bot: Active`,
      `24h Backup: Enabled`,
    ].join("\n");
  }
  return result.summary;
}

function commandArguments(text: string) {
  return text
    .trim()
    .replace(/^\/[a-z]+(?:@[a-z0-9_]+)?\s*/i, "")
    .trim();
}

function isTelegramAdmin(env: Bindings, userId?: number) {
  return Boolean(
    userId &&
      env.TELEGRAM_ADMIN_USER_IDS?.split(",")
        .map((value) => value.trim())
        .includes(String(userId)),
  );
}

export async function recordTelegramMessage(
  env: Bindings,
  input: {
    updateId?: number;
    messageId: number;
    chatId: number;
    userId?: number;
    username?: string;
    displayName?: string;
    direction: "inbound" | "outbound";
    command: string;
    body: string;
    replyTo?: number;
  },
) {
  await env.AUTOMATION_DB.prepare(
    `INSERT OR IGNORE INTO telegram_messages
    (id, update_id, telegram_message_id, chat_id, user_id, username, display_name, direction, command, body, reply_to_message_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      input.updateId ?? null,
      input.messageId,
      String(input.chatId),
      input.userId ? String(input.userId) : null,
      input.username || null,
      input.displayName || null,
      input.direction,
      input.command,
      input.body,
      input.replyTo ?? null,
      new Date().toISOString(),
    )
    .run();
}

async function sendRecordedReply(
  env: Bindings,
  text: string,
  input: { updateId: number; chatId: number; replyTo: number; command: string },
) {
  const sent = await sendTelegramMessage(env, text.slice(0, 4_096), {
    replyToMessageId: input.replyTo,
  });
  await recordTelegramMessage(env, {
    updateId: input.updateId,
    messageId: Number(sent.messageId),
    chatId: input.chatId,
    direction: "outbound",
    command: input.command,
    body: text,
    replyTo: input.replyTo,
  });
  return sent;
}

async function runTelegramCrm(
  env: Bindings,
  instruction: string,
  userId: number,
  chatId: number,
) {
  if (!env.AI_SCHEDULER_SECRET)
    throw new AppError(
      "configuration-error",
      503,
      "AI scheduler secret is unavailable.",
      true,
    );
  const response = await env.PUBLIC_APP.fetch(
    new Request("https://akipasa.internal/api/ai-team/telegram/run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-akipasa-ai-scheduler": env.AI_SCHEDULER_SECRET,
      },
      body: JSON.stringify({
        instruction,
        telegramUserId: String(userId),
        telegramChatId: String(chatId),
        workspaceId: "ws_akipasa",
      }),
    }),
  );
  const result = await response.json<{
    ok?: boolean;
    text?: string;
    error?: string;
  }>();
  if (!response.ok || !result.ok || !result.text)
    throw new AppError(
      "crm-command-failed",
      502,
      result.error || "CRM command failed.",
      true,
    );
  return result.text;
}

export async function createTelegramBackup(env: Bindings, userId?: number) {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 86_400_000);
  const rows = await env.AUTOMATION_DB.prepare(
    "SELECT * FROM telegram_messages WHERE created_at >= ? AND created_at <= ? ORDER BY created_at ASC",
  )
    .bind(periodStart.toISOString(), periodEnd.toISOString())
    .all<Record<string, unknown>>();
  const messages = rows.results || [];
  const id = crypto.randomUUID();
  await env.AUTOMATION_DB.prepare(
    "INSERT INTO telegram_backups (id, requested_by_user_id, period_start, period_end, message_count, snapshot_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      id,
      userId ? String(userId) : null,
      periodStart.toISOString(),
      periodEnd.toISOString(),
      messages.length,
      JSON.stringify(messages),
      periodEnd.toISOString(),
    )
    .run();
  return {
    id,
    messageCount: messages.length,
    periodEnd: periodEnd.toISOString(),
  };
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
  const commandName: string =
    slashCommand === "help"
      ? "telegram-help"
      : slashCommand === "crm"
        ? "telegram-crm"
        : slashCommand === "whoami"
          ? "telegram-whoami"
          : slashCommands[slashCommand as keyof typeof slashCommands];
  const userId = message.from?.id;
  const messageText = message.text as string;

  try {
    await reserveOperation(
      {
        actor: `telegram:${userId || "unknown"}`,
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

  await recordTelegramMessage(env, {
    updateId,
    messageId: message.message_id,
    chatId: message.chat.id,
    userId,
    username: message.from?.username,
    displayName: [message.from?.first_name, message.from?.last_name]
      .filter(Boolean)
      .join(" "),
    direction: "inbound",
    command: commandName,
    body: messageText,
  });

  const execution = await startExecution(env, {
    requestId,
    command: commandName,
    caller: `telegram:${userId || "unknown"}`,
  });

  try {
    let responseText = "";
    let data: Record<string, unknown> = {};
    if (slashCommand === "help") responseText = helpText;
    else if (slashCommand === "whoami")
      responseText = `Your Telegram user ID is ${userId || "unavailable"}.`;
    else if (slashCommand === "backup") {
      const backup = await createTelegramBackup(env, userId);
      data = backup;
      responseText = `Telegram 24h backup saved.\nMessages: ${backup.messageCount}\nSnapshot ID: ${backup.id}\nPeriod end: ${backup.periodEnd}`;
    } else if (
      [
        "crm",
        "stats",
        "venues",
        "deals",
        "contacts",
        "tasks",
        "addlead",
      ].includes(slashCommand)
    ) {
      const instructions: Record<string, string> = {
        stats: "Summarize current CRM workspace metrics.",
        venues: "List the top registered AkiPasa venues.",
        deals: "Summarize active sales deals and pipeline value.",
        contacts: "Summarize CRM contacts and team members.",
        tasks: "List open team tasks and the completed-task count.",
        addlead: `Create or request the supported CRM record change for this new lead: ${commandArguments(messageText)}`,
      };
      const mutation = slashCommand === "crm" || slashCommand === "addlead";
      if (mutation && !isTelegramAdmin(env, userId))
        responseText =
          "This CRM command is restricted to configured Telegram administrators.";
      else if (!userId) responseText = "Telegram user identity is unavailable.";
      else {
        const instruction =
          slashCommand === "crm"
            ? commandArguments(messageText)
            : instructions[slashCommand];
        responseText = instruction
          ? await runTelegramCrm(env, instruction, userId, message.chat.id)
          : "Usage: /crm <instruction>";
      }
    } else {
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
      data = result.data || {};
      if (command.effect === "read")
        responseText = formatResult(command.name, result);
    }
    if (responseText)
      await sendRecordedReply(env, responseText, {
        updateId,
        chatId: message.chat.id,
        replyTo: message.message_id,
        command: commandName,
      });
    await finishExecution(env, execution, { success: true, data });
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
