import type { AutomationCommand } from "./types";
import { loadFinancialSnapshot } from "../services/finance";

const command: AutomationCommand = {
  name: "show-revenue",
  aliases: ["show revenue", "revenue"],
  description: "Return the current revenue and MRR position.",
  category: "finance",
  effect: "read",
  icon: "revenue",
  async execute({ env, now }) {
    const snapshot = await loadFinancialSnapshot(env, now);
    return {
      summary: "Revenue position loaded.",
      data: {
        currency: snapshot.currency,
        revenueMinor: snapshot.revenueMinor,
        mrrMinor: snapshot.mrrMinor,
        netMinor: snapshot.netMinor,
      },
    };
  },
};

export default command;
