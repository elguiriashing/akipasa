import type { AutomationCommand } from "./types";

const command: AutomationCommand = {
  name: "automation-status",
  aliases: ["status", "worker health"],
  description: "Check the automation database and command service.",
  category: "system",
  effect: "read",
  icon: "activity",
  async execute({ env }) {
    const result = await env.AUTOMATION_DB.prepare(
      "SELECT 1 AS healthy",
    ).first<{ healthy: number }>();
    return {
      summary: "Automation platform is healthy.",
      data: { database: result?.healthy === 1 ? "ok" : "degraded" },
    };
  },
};

export default command;
