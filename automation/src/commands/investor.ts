import type { AutomationCommand } from "./types";
import {
  loadFinancialSnapshot,
  type FinancialSnapshot,
} from "../services/finance";
import { sendTelegramMarkdown } from "../services/telegram";

function escapeMarkdown(value: string) {
  return value.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

function money(minor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export function formatInvestorUpdate(snapshot: FinancialSnapshot) {
  const latestSpend = snapshot.latestPurchases.length
    ? snapshot.latestPurchases
        .map(
          (expense) =>
            `• ${escapeMarkdown(expense.merchant)} — ${escapeMarkdown(
              money(expense.amount_minor, snapshot.currency),
            )}`,
        )
        .join("\n")
    : "_No expenses recorded_";
  const runway =
    snapshot.runwayWeeks === null
      ? "No current burn"
      : `${snapshot.runwayWeeks} weeks`;

  return [
    "📈 *AkiPasa Investor Update*",
    "",
    "*Last 30 days*",
    `Revenue: *${escapeMarkdown(money(snapshot.revenueMinor, snapshot.currency))}*`,
    `Expenses: *${escapeMarkdown(
      money(snapshot.totalExpensesMinor, snapshot.currency),
    )}*`,
    `Net: *${escapeMarkdown(money(snapshot.netMinor, snapshot.currency))}*`,
    "",
    "*Position*",
    `Cash remaining: *${escapeMarkdown(
      money(snapshot.cashRemainingMinor, snapshot.currency),
    )}*`,
    `MRR: *${escapeMarkdown(money(snapshot.mrrMinor, snapshot.currency))}*`,
    `Monthly burn: *${escapeMarkdown(
      money(snapshot.monthlyBurnMinor, snapshot.currency),
    )}*`,
    `Runway: *${escapeMarkdown(runway)}*`,
    "",
    "*Latest spend*",
    latestSpend,
    "",
    `_Generated automatically by AkiPasa OS · ${escapeMarkdown(
      new Date(snapshot.asOf).toLocaleString("en-GB", {
        timeZone: "Europe/Madrid",
        dateStyle: "medium",
        timeStyle: "short",
      }),
    )}_`,
  ].join("\n");
}

const command: AutomationCommand = {
  name: "send-investor-update",
  aliases: ["send the boys the numbers", "investor update"],
  description: "Send the current financial snapshot to the investor group.",
  category: "reports",
  effect: "external",
  icon: "report",
  async execute({ env, execution, now }) {
    const snapshot = await loadFinancialSnapshot(env, now);
    const report = formatInvestorUpdate(snapshot);
    const telegram = await sendTelegramMarkdown(env, report);
    await env.AUTOMATION_DB.prepare(
      `INSERT INTO generated_reports
        (id, execution_id, company_id, report_type, body,
         telegram_chat_id_suffix, telegram_message_id, created_at)
       VALUES (?, ?, ?, 'investor-update', ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        execution.id,
        snapshot.companyId,
        report,
        telegram.chatIdSuffix,
        telegram.messageId,
        now.toISOString(),
      )
      .run();
    return {
      summary: "Investor update sent.",
      data: {
        telegramMessageId: telegram.messageId,
        reportAsOf: snapshot.asOf,
      },
    };
  },
};

export default command;
