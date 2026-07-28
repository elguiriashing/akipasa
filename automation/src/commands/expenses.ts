import type { AutomationCommand } from "./types";
import { loadFinancialSnapshot } from "../services/finance";

const command: AutomationCommand = {
  name: "show-expenses",
  aliases: ["show expenses", "expenses"],
  description: "Return the current 30-day expense position.",
  category: "finance",
  effect: "read",
  icon: "expenses",
  async execute({ env, now }) {
    const snapshot = await loadFinancialSnapshot(env, now);
    return {
      summary: "Expense position loaded.",
      data: {
        currency: snapshot.currency,
        totalExpensesMinor: snapshot.totalExpensesMinor,
        monthlyBurnMinor: snapshot.monthlyBurnMinor,
        latestPurchases: snapshot.latestPurchases,
      },
    };
  },
};

export default command;
