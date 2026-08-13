import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createAIProvider, estimateTokens } from "../src/lib/ai-team/provider";
import { availableTools } from "../src/lib/ai-team/tools";
import type { AIAgent } from "../src/lib/ai-team/types";

const originalOpenAIKey = process.env.OPENAI_API_KEY;

function agent(permissions: string[]): AIAgent {
  return {
    id: "a1000000-0000-4000-8000-000000000001",
    agent_key: "manager",
    display_name: "Manager",
    role_description: "Coordinates the AI team.",
    system_instructions:
      "Coordinate bounded work and respect all permissions and approvals.",
    permissions,
    provider: "openai",
    model: "gpt-5.6-luna",
    status: "idle",
    enabled: true,
    last_active_at: null,
    last_error: null,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  if (originalOpenAIKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalOpenAIKey;
});

describe("AI Team boundaries", () => {
  it("exposes only tools covered by an agent permission", () => {
    const tools = availableTools(
      agent(["crm:summary:read", "ai:tasks:create", "ai:memory:write"]),
    );
    expect(tools.map((tool) => tool.name)).toEqual([
      "crm_get_business_overview",
      "ai_create_task",
      "ai_remember_context",
    ]);
    expect(tools.some((tool) => tool.approvalRequired)).toBe(false);
  });

  it("marks the catalogue mutation tool as approval-required", () => {
    const tools = availableTools(agent(["crm:catalogue:request_update"]));
    expect(tools).toHaveLength(1);
    expect(tools[0]).toMatchObject({
      name: "crm_request_venue_status_update",
      approvalRequired: true,
    });
  });

  it("uses non-strict provider schema only for the dynamically keyed CRM change tool", () => {
    const tools = availableTools(agent(["crm:records:request_change"]));
    expect(tools).toHaveLength(1);
    expect(tools[0]).toMatchObject({
      name: "crm_request_workspace_record_change",
      approvalRequired: true,
      strict: false,
    });
  });

  it("separates safe CRM workspace skills from approval-controlled record changes", () => {
    const tools = availableTools(
      agent([
        "crm:workspace:read",
        "crm:records:read",
        "crm:tasks:create",
        "crm:records:request_change",
      ]),
    );
    expect(tools.map((tool) => tool.name)).toEqual([
      "crm_workspace_overview",
      "crm_search_workspace",
      "crm_get_workspace_record",
      "crm_create_workspace_task",
      "crm_request_workspace_record_change",
    ]);
    expect(
      tools.filter((tool) => tool.approvalRequired).map((tool) => tool.name),
    ).toEqual(["crm_request_workspace_record_change"]);
  });

  it("blocks a paid provider before network access when its secret is absent", () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => createAIProvider("openai")).toThrow(
      "The OpenAI provider is not configured",
    );
  });

  it("does not expose an OpenAI error body when authentication fails", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            message: "Incorrect API key provided: akipasa SECRET-VALUE PHYA",
            type: "invalid_request_error",
            code: "invalid_api_key",
          },
        }),
        { status: 401, headers: { "content-type": "application/json" } },
      ),
    );

    const provider = createAIProvider("openai");
    const request = provider.run({
      model: "gpt-5.6-luna",
      instructions: "Answer safely.",
      messages: [{ role: "user", content: "Hello" }],
      tools: [],
      maxOutputTokens: 100,
      maxProviderRounds: 1,
      safetyIdentifier: "test",
      executeTool: async () => ({}),
    });

    await expect(request).rejects.toMatchObject({
      message:
        "OpenAI authentication failed (401: invalid_api_key). Replace the server-side OPENAI_API_KEY secret.",
      code: "openai_invalid_api_key",
    });
    await expect(request).rejects.not.toThrow(/akipasa|SECRET-VALUE|PHYA/);
  });

  it("uses a stable conservative token estimate", () => {
    expect(estimateTokens("12345678")).toBe(3);
    expect(estimateTokens("")).toBe(1);
  });

  it("qualifies ledger cost columns inside the budget reservation function", () => {
    for (const migration of [
      "0034_ai_team.sql",
      "0040_ai_budget_reservation_ambiguity.sql",
    ]) {
      const sql = readFileSync(
        join(process.cwd(), "database", "migrations", migration),
        "utf8",
      );
      expect(sql).toContain("ledger.reserved_cost_eur");
      expect(sql).not.toMatch(
        /sum\s*\(\s*coalesce\s*\(\s*actual_cost_eur\s*,\s*reserved_cost_eur\s*\)/i,
      );
    }
  });

  it("does not charge the internal budget for provider-rejected requests", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "database",
        "migrations",
        "0041_ai_failed_request_costs.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("when v_rejected_without_usage then 0");
    expect(sql).toContain("coalesce(input_tokens, 0) = 0");
    expect(sql).toContain("coalesce(output_tokens, 0) = 0");
  });

  it("isolates customer Support chats from shared memory and CRM tools", () => {
    const gateway = readFileSync(
      join(process.cwd(), "src", "lib", "ai-team", "gateway.ts"),
      "utf8",
    );
    const supportRoute = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "support-agent",
        "chat",
        "route.ts",
      ),
      "utf8",
    );

    expect(gateway).toContain('.eq("actor_id", input.actorId)');
    expect(supportRoute).toContain('agentKey: "support"');
    expect(supportRoute).toContain("allowedToolNames: []");
    expect(supportRoute).toContain("includeMemory: false");
    expect(supportRoute).toContain('chatAudience: "customer"');
    expect(supportRoute).toContain("requireAIUser(request)");
    expect(supportRoute).not.toContain("requireAIAdministrator");
  });
});
