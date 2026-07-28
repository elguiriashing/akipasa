import type { AutomationCommand } from "./types";
import { sendTelegramMarkdown } from "../services/telegram";

const connectionMessage = [
  "🟢 *AkiPasa automation is online*",
  "",
  "Voice command routing and Telegram delivery are connected\\.",
  "",
  "_Generated automatically by AkiPasa OS_",
].join("\n");

const command: AutomationCommand = {
  name: "send-telegram-test",
  aliases: ["test the bot", "test telegram", "telegram test"],
  description: "Send a labelled connection test to the configured group.",
  category: "system",
  effect: "external",
  icon: "activity",
  async execute({ env }) {
    const telegram = await sendTelegramMarkdown(env, connectionMessage);
    return {
      summary: "Telegram connection test sent.",
      data: { telegramMessageId: telegram.messageId },
    };
  },
};

export default command;
