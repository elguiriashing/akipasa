import { describe, expect, it, vi } from "vitest";
import type { Bindings } from "../src/bindings";
import { executeOperatorCommand } from "../src/operator-command";

describe("operator command execution", () => {
  it("executes a registered command and writes start and finish audits", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn(() => ({ run }));
    const prepare = vi.fn((sql: string) => {
      if (sql.includes("SELECT 1 AS healthy")) {
        return { first: vi.fn().mockResolvedValue({ healthy: 1 }) };
      }
      return { bind };
    });
    const env = {
      AUTOMATION_DB: { prepare },
      REPLAY_KV: {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
      },
      COMMAND_MAX_AGE_SECONDS: "300",
    } as unknown as Bindings;

    const result = await executeOperatorCommand(
      env,
      "automation-status",
      "request-one",
      "73681326-835d-4742-90d9-26e1580d3f20",
      new Date("2026-07-27T10:00:00.000Z"),
    );

    expect(result).toEqual({
      summary: "Automation platform is healthy.",
      data: { database: "ok" },
    });
    expect(prepare).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO execution_logs"),
    );
    expect(prepare).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE execution_logs"),
    );
  });
});
