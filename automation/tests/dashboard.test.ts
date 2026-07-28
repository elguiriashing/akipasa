import { describe, expect, it } from "vitest";
import {
  activityHtml,
  commandDetailHtml,
  commandHubHtml,
  commandResultHtml,
  dashboardHtml,
  loginHtml,
} from "../src/dashboard/html";
import type { CommandDescriptor } from "../src/command-router";

const reportCommand: CommandDescriptor = {
  name: "send-investor-update",
  aliases: ["send the boys the numbers", "investor update"],
  description: "Send the current financial snapshot to the investor group.",
  category: "reports",
  effect: "external",
  icon: "report",
};

const dashboardData = {
  total: 10,
  successful: 9,
  successRate: 90,
  averageLatencyMs: 412,
  pendingJobs: 2,
  lastReport: {
    created_at: "2026-07-27T09:00:00.000Z",
    report_type: "investor-update",
    telegram_message_id: "42",
  },
  executions: [
    {
      id: "one",
      command: "send-investor-update",
      caller: "device:alex-phone",
      started_at: "2026-07-27T09:00:00.000Z",
      duration_ms: 412,
      success: 1,
      error_code: null,
    },
  ],
};

describe("automation dashboard", () => {
  it("renders operational metrics without exposing secrets", () => {
    const html = dashboardHtml(dashboardData, "AkiPasa OS", true);
    expect(html).toContain("90%");
    expect(html).toContain("412 ms");
    expect(html).toContain("Telegram");
    expect(html).toContain("/dashboard/commands");
    expect(html).not.toContain("TELEGRAM_BOT_TOKEN");
  });

  it("renders an authenticated login form", () => {
    const html = loginHtml(true);
    expect(html).toContain('type="password"');
    expect(html).toContain("Access denied");
  });

  it("renders an icon-led command hub without dropdown controls", () => {
    const html = commandHubHtml([reportCommand]);
    expect(html).toContain("<svg");
    expect(html).toContain("send the boys the numbers");
    expect(html).toContain("/dashboard/commands/send-investor-update");
    expect(html).not.toContain("<select");
  });

  it("requires explicit confirmation for external commands", () => {
    const html = commandDetailHtml(reportCommand);
    expect(html).toContain("External action");
    expect(html).toContain("Confirm and run");
    expect(html).toContain('value="send-investor-update"');
  });

  it("escapes command result data and separates activity", () => {
    const result = commandResultHtml(reportCommand, {
      summary: "Complete",
      data: { unsafe: "<script>alert(1)</script>" },
    });
    expect(result).toContain("&lt;script&gt;");
    expect(result).not.toContain("<script>alert");
    expect(activityHtml(dashboardData)).toContain("device:alex-phone");
  });
});
