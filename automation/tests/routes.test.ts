import { describe, expect, it, vi } from "vitest";
import type { Bindings } from "../src/bindings";
import { createDashboardSession } from "../src/dashboard/auth";
import { app } from "../src/index";

const sessionSecret = "0123456789abcdef0123456789abcdef";

async function authenticatedCookie(env: Bindings) {
  const token = await createDashboardSession(env);
  return `akipasa_automation_session=${token}`;
}

describe("Command Centre routes", () => {
  it("redirects unauthenticated operators to login", async () => {
    const response = await app.request(
      "/dashboard/commands",
      {},
      {} as Bindings,
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/dashboard/login");
  });

  it("renders the command catalogue for an authenticated operator", async () => {
    const env = {
      DASHBOARD_SESSION_SECRET: sessionSecret,
      DASHBOARD_SESSION_TTL_SECONDS: "3600",
    } as unknown as Bindings;
    const response = await app.request(
      "/dashboard/commands",
      { headers: { cookie: await authenticatedCookie(env) } },
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("send-investor-update");
  });

  it("accepts a browser login when privacy settings omit Origin", async () => {
    const env = {
      DASHBOARD_PASSWORD: "correct horse battery staple",
      DASHBOARD_SESSION_SECRET: sessionSecret,
      DASHBOARD_SESSION_TTL_SECONDS: "3600",
    } as unknown as Bindings;
    const response = await app.request(
      "/dashboard/login",
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "sec-fetch-site": "same-origin",
          "sec-fetch-mode": "navigate",
        },
        body: "password=correct+horse+battery+staple",
      },
      env,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/dashboard");
    expect(response.headers.get("set-cookie")).toContain(
      "akipasa_automation_session=",
    );
  });

  it("rejects a cross-site login even with forged fetch metadata", async () => {
    const env = {
      DASHBOARD_PASSWORD: "correct horse battery staple",
      DASHBOARD_SESSION_SECRET: sessionSecret,
      DASHBOARD_SESSION_TTL_SECONDS: "3600",
    } as unknown as Bindings;
    const response = await app.request(
      "/dashboard/login",
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://attacker.example",
          "sec-fetch-site": "same-origin",
          "sec-fetch-mode": "navigate",
        },
        body: "password=correct+horse+battery+staple",
      },
      env,
    );

    expect(response.status).toBe(403);
  });

  it("executes a confirmed same-origin operator command with an audit", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn(() => ({ run }));
    const prepare = vi.fn((sql: string) => {
      if (sql.includes("SELECT 1 AS healthy")) {
        return { first: vi.fn().mockResolvedValue({ healthy: 1 }) };
      }
      return { bind };
    });
    const env = {
      DASHBOARD_SESSION_SECRET: sessionSecret,
      DASHBOARD_SESSION_TTL_SECONDS: "3600",
      AUTOMATION_DB: { prepare },
      REPLAY_KV: {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
      },
      COMMAND_MAX_AGE_SECONDS: "300",
    } as unknown as Bindings;
    const response = await app.request(
      "/dashboard/commands/automation-status/run",
      {
        method: "POST",
        headers: {
          cookie: await authenticatedCookie(env),
          "content-type": "application/x-www-form-urlencoded",
          origin: "http://localhost",
        },
        body: "confirmation=automation-status&operationId=73681326-835d-4742-90d9-26e1580d3f20",
      },
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Command complete");
    expect(prepare).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO execution_logs"),
    );
  });
});
