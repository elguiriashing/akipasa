import { describe, expect, it } from "vitest";
import { formatInvestorUpdate } from "../src/commands/investor";
import { listCommands, resolveCommand } from "../src/command-router";
import type { FinancialSnapshot } from "../src/services/finance";

const snapshot: FinancialSnapshot = {
  companyId: "akipasa",
  companyName: "AkiPasa",
  currency: "EUR",
  cashRemainingMinor: 100_000,
  mrrMinor: 48_200,
  revenueMinor: 48_200,
  totalExpensesMinor: 11_940,
  netMinor: 36_260,
  monthlyBurnMinor: 11_940,
  runwayWeeks: 36,
  latestPurchases: [
    {
      merchant: "Cloudflare",
      category: "infrastructure",
      amount_minor: 2_500,
      incurred_at: "2026-07-26T12:00:00.000Z",
    },
  ],
  periodStart: "2026-06-27T09:00:00.000Z",
  asOf: "2026-07-27T09:00:00.000Z",
};

describe("automation commands", () => {
  it("routes the public demonstration phrase to the investor command", () => {
    expect(resolveCommand("send the boys the numbers").name).toBe(
      "send-investor-update",
    );
    expect(resolveCommand(" SHOW   REVENUE ").name).toBe("show-revenue");
  });

  it("rejects unregistered commands", () => {
    expect(() => resolveCommand("restart everything")).toThrowError(
      "not registered",
    );
  });

  it("publishes typed command-hub metadata", () => {
    expect(listCommands()).toContainEqual(
      expect.objectContaining({
        name: "send-investor-update",
        category: "reports",
        effect: "external",
        icon: "report",
      }),
    );
    expect(resolveCommand("test the bot").name).toBe("send-telegram-test");
  });

  it("formats an escaped Telegram investor update from typed metrics", () => {
    const report = formatInvestorUpdate(snapshot);
    expect(report).toContain("*AkiPasa Investor Update*");
    expect(report).toContain("Revenue: *€482*");
    expect(report).toContain("Cloudflare");
    expect(report).toContain("Runway: *36 weeks*");
    expect(report).not.toContain("undefined");
  });
});
