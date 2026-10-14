import { runAIAgent } from "../src/lib/ai-team/gateway";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

type FixtureRow = Record<string, unknown>;
type ProviderInput = {
  instructions: string;
  input: Array<{
    role?: string;
    content?: string;
    type?: string;
    output?: string;
  }>;
  tools: Array<{ name?: string }>;
};

// Use the installed client and provider adapter; every HTTP response is inert.
function gatewayFixture(
  rows: FixtureRow[] = [],
  permissions: string[] = [],
  providerOutputs: FixtureRow[][] = [],
) {
  process.env.OPENAI_API_KEY = "test-key";
  const support = { ...agent(permissions), agent_key: "support" };
  const tables: Record<string, FixtureRow[]> = {
    ai_agents: [support],
    ai_chat_messages: rows.map((row) => ({ ...row })),
    ai_activity_log: [],
    ai_approvals: [],
    reports: [{ state: "open", details: "inert internal support marker" }],
  };
  const databaseRequests: Array<{
    url: URL;
    method: string;
    body: FixtureRow;
  }> = [];
  const providerRequests: ProviderInput[] = [];
  const valueAt = (row: FixtureRow, column: string) => {
    const [field, key] = column.split("->>");
    const value = key ? (row[field] as FixtureRow)?.[key] : row[field];
    if (value == null) return null;
    // PostgreSQL ->> keeps scalar strings but serializes JSON arrays/objects.
    return key && typeof value !== "string"
      ? JSON.stringify(value)
      : String(value);
  };
  const matches = (row: FixtureRow, column: string, filter: string) => {
    const value = valueAt(row, column);
    if (filter.startsWith("eq.")) return value === filter.slice(3);
    if (filter === "is.null") return value === null;
    if (filter.startsWith("in.("))
      return filter
        .slice(4, -1)
        .split(",")
        .includes(value || "");
    throw new Error(`Unsupported fixture filter: ${filter}`);
  };
  const service = createClient("https://ai-team-test.invalid", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (rawUrl, init) => {
        const url = new URL(String(rawUrl));
        if (url.origin !== "https://ai-team-test.invalid")
          throw new Error("Unexpected database destination");
        const method = init?.method || "GET";
        const body = JSON.parse(String(init?.body || "{}")) as FixtureRow;
        databaseRequests.push({ url, method, body });
        const table = url.pathname.split("/").at(-1) || "";
        if (url.pathname.includes("/rpc/")) {
          if (table === "reserve_ai_budget")
            return Response.json({ reservation_id: "reservation-test" });
          if (["complete_ai_budget", "fail_ai_budget"].includes(table))
            return Response.json(null);
          throw new Error(`Unexpected fixture RPC: ${table}`);
        }
        if (!tables[table])
          throw new Error(`Unexpected fixture table: ${table}`);
        if (method === "POST") {
          const inserted = {
            id: `fixture-${tables[table].length}`,
            created_at: new Date(
              Date.UTC(2099, 0, 1, 0, 0, databaseRequests.length),
            ).toISOString(),
            ...(table === "ai_approvals" ? { status: "pending" } : {}),
            ...body,
          };
          tables[table].push(inserted);
          return new Headers(init?.headers)
            .get("prefer")
            ?.includes("representation")
            ? Response.json(inserted)
            : new Response(null, { status: 201 });
        }
        if (method === "PATCH") return new Response(null, { status: 204 });
        let selected = tables[table].filter((row) =>
          [...url.searchParams].every(([column, filter]) => {
            if (["select", "order", "limit"].includes(column)) return true;
            if (column === "or")
              return filter
                .slice(1, -1)
                .split(",")
                .some((expression) => {
                  const [, name, predicate] =
                    expression.match(/^(.*?)\.(eq\..*|is\.null)$/) || [];
                  if (!name)
                    throw new Error("Unsupported fixture OR expression");
                  return matches(row, name, predicate);
                });
            return matches(row, column, filter);
          }),
        );
        const order = url.searchParams.get("order");
        if (order) {
          const [column, direction] = order.split(".");
          selected = [...selected].sort(
            (a, b) =>
              String(a[column]).localeCompare(String(b[column])) *
              (direction === "desc" ? -1 : 1),
          );
        }
        const count = selected.length;
        const limit = url.searchParams.get("limit");
        if (limit) selected = selected.slice(0, Number(limit));
        if (method === "HEAD")
          return new Response(null, {
            headers: { "content-range": `0-0/${count}` },
          });
        const single = new Headers(init?.headers)
          .get("accept")
          ?.includes("object+json");
        return Response.json(single ? selected[0] || null : selected);
      },
    },
  });
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    if (String(url) !== "https://api.openai.com/v1/responses")
      throw new Error("Unexpected provider destination");
    providerRequests.push(JSON.parse(String(init?.body)) as ProviderInput);
    return Response.json({
      id: `response-${providerRequests.length}`,
      output: providerOutputs[providerRequests.length - 1] || [],
      output_text: "Inert reply",
      usage: { input_tokens: 10, output_tokens: 5 },
    });
  });
  return { service, support, tables, databaseRequests, providerRequests };
}

function chatRow(content: string, metadata: FixtureRow = {}) {
  return {
    agent_id: agent([]).id,
    actor_id: "same-account",
    role: "assistant",
    content,
    metadata,
    created_at: "2026-01-01T00:00:00Z",
  };
}

describe("AI gateway request boundaries", () => {
  it("restarts customer context without rewriting pre-boundary replies", async () => {
    // The old gateway could ingest operator context and persist its echo as a
    // customer-tagged reply. Such a tag alone cannot establish safe provenance.
    const oldRows = [
      chatRow("Inert operator marker", { audience: "operator" }),
      {
        ...chatRow("Initial customer question", { audience: "customer" }),
        role: "user",
      },
      chatRow("Inert operator marker echoed", { audience: "customer" }),
    ];
    const fixture = gatewayFixture(oldRows);
    const input = {
      service: fixture.service,
      actorId: "same-account",
      agentKey: "support",
      requestKind: "chat" as const,
      chatAudience: "customer" as const,
      allowedToolNames: [],
      includeMemory: false,
      message: "Fresh customer question",
    };
    await runAIAgent(input);
    expect(fixture.providerRequests[0].input).toEqual([
      { role: "user", content: "Fresh customer question" },
    ]);
    expect(fixture.tables.ai_chat_messages.slice(0, oldRows.length)).toEqual(
      oldRows,
    );
    expect(
      fixture.tables.ai_chat_messages.slice(-2).map((row) => row.metadata),
    ).toEqual([
      { audience: "customer", customer_context_version: 1 },
      expect.objectContaining({
        audience: "customer",
        customer_context_version: 1,
      }),
    ]);
    await runAIAgent({ ...input, message: "Follow-up customer question" });
    expect(fixture.providerRequests[1].input).toEqual([
      { role: "user", content: "Fresh customer question" },
      { role: "assistant", content: "Inert reply" },
      { role: "user", content: "Follow-up customer question" },
    ]);
    expect(fixture.tables.ai_chat_messages.slice(0, oldRows.length)).toEqual(
      oldRows,
    );
  });

  it.each([
    ["customer", ["Customer history"]],
    ["operator", ["Operator history", "Untagged legacy", "Null legacy"]],
    [undefined, ["Operator history", "Untagged legacy", "Null legacy"]],
  ] as const)(
    "filters %s history by audience, actor, agent and role",
    async (chatAudience, expected) => {
      const rows = [
        chatRow("Customer history", {
          audience: "customer",
          customer_context_version: 1,
        }),
        chatRow("Operator history", { audience: "operator" }),
        chatRow("Untagged legacy"),
        chatRow("Null legacy", { audience: null }),
        chatRow("Unknown audience", { audience: "other" }),
        chatRow("Invalid audience", { audience: false }),
        chatRow("Array customer audience", {
          audience: ["customer"],
          customer_context_version: 1,
        }),
        chatRow("Array operator audience", {
          audience: ["operator"],
          customer_context_version: 1,
        }),
        chatRow("Object audience", {
          audience: { value: "customer" },
          customer_context_version: 1,
        }),
        chatRow("Unversioned customer", { audience: "customer" }),
        ...[0, 2, null, [1], { value: 1 }].map((version) =>
          chatRow("Invalid context version", {
            audience: "customer",
            customer_context_version: version,
          }),
        ),
        {
          ...chatRow("Other actor", {
            audience: chatAudience || "operator",
            customer_context_version: 1,
          }),
          actor_id: "other-account",
        },
        {
          ...chatRow("Other agent", {
            audience: chatAudience || "operator",
            customer_context_version: 1,
          }),
          agent_id: "other-agent",
        },
        {
          ...chatRow("Tool role", {
            audience: chatAudience || "operator",
            customer_context_version: 1,
          }),
          role: "tool",
        },
        {
          ...chatRow("System role", {
            audience: chatAudience || "operator",
            customer_context_version: 1,
          }),
          role: "system",
        },
      ].map((row, index) => ({
        ...row,
        created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
      }));
      const fixture = gatewayFixture(rows);
      await runAIAgent({
        service: fixture.service,
        actorId: "same-account",
        agentKey: "support",
        requestKind: "chat",
        message: "Current question",
        chatAudience,
        includeMemory: false,
      });
      expect(fixture.providerRequests[0].input).toEqual([
        ...expected.map((content) => ({ role: "assistant", content })),
        { role: "user", content: "Current question" },
      ]);
      const historyQuery = fixture.databaseRequests.find(
        ({ url, method }) =>
          method === "GET" && url.pathname.endsWith("/ai_chat_messages"),
      )?.url.searchParams;
      expect(historyQuery?.get("agent_id")).toBe(`eq.${fixture.support.id}`);
      expect(historyQuery?.get("actor_id")).toBe("eq.same-account");
      expect(historyQuery?.get("role")).toBe("in.(user,assistant)");
      if (chatAudience === "customer") {
        expect(historyQuery?.get("metadata->>audience")).toBe("eq.customer");
        expect(historyQuery?.get("metadata->>customer_context_version")).toBe(
          "eq.1",
        );
        expect(historyQuery?.has("or")).toBe(false);
      } else {
        expect(historyQuery?.has("metadata->>customer_context_version")).toBe(
          false,
        );
        expect(historyQuery?.get("or")).toBe(
          "(metadata->>audience.eq.operator,metadata->>audience.is.null)",
        );
      }
      expect(
        fixture.tables.ai_chat_messages
          .slice(-2)
          .map((row) => (row.metadata as FixtureRow).audience),
      ).toEqual([chatAudience || "operator", chatAudience || "operator"]);
    },
  );

  it.each(["customer", "operator"] as const)(
    "takes the latest 20 %s messages after filtering",
    async (chatAudience) => {
      const matching = Array.from({ length: 24 }, (_, index) => ({
        ...chatRow(`Matching ${index}`, {
          audience: chatAudience,
          customer_context_version: 1,
        }),
        role: index % 2 ? "assistant" : "user",
        created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
      }));
      const newerOtherAudience = Array.from({ length: 25 }, (_, index) => ({
        ...chatRow(`Other audience ${index}`, {
          audience: chatAudience === "customer" ? "operator" : "customer",
        }),
        created_at: new Date(Date.UTC(2026, 0, 2, 0, 0, index)).toISOString(),
      }));
      const oldCustomerContext =
        chatAudience === "customer"
          ? Array.from({ length: 25 }, (_, index) => ({
              ...chatRow(`Old customer context ${index}`, {
                audience: "customer",
              }),
              created_at: new Date(
                Date.UTC(2026, 0, 3, 0, 0, index),
              ).toISOString(),
            }))
          : [];
      const fixture = gatewayFixture([
        ...matching,
        ...newerOtherAudience,
        ...oldCustomerContext,
      ]);
      await runAIAgent({
        service: fixture.service,
        actorId: "same-account",
        agentKey: "support",
        requestKind: "chat",
        message: "Current question",
        chatAudience,
        includeMemory: false,
      });
      expect(fixture.providerRequests[0].input).toEqual([
        ...matching.slice(5).map(({ role, content }) => ({ role, content })),
        { role: "user", content: "Current question" },
      ]);
      const historyQuery = fixture.databaseRequests.find(
        ({ url, method }) =>
          method === "GET" && url.pathname.endsWith("/ai_chat_messages"),
      )?.url.searchParams;
      expect(historyQuery?.get("order")).toBe("created_at.desc");
      expect(historyQuery?.get("limit")).toBe("20");
    },
  );

  it("keeps same-account operator history out of a later customer prompt", async () => {
    const fixture = gatewayFixture();
    await runAIAgent({
      service: fixture.service,
      actorId: "same-account",
      agentKey: "support",
      requestKind: "chat",
      message: "Inert operator-only marker",
      administratorAuthorized: true,
      includeMemory: false,
    });
    await runAIAgent({
      service: fixture.service,
      actorId: "same-account",
      agentKey: "support",
      requestKind: "chat",
      message: "Help with my AkiPasa application",
      chatAudience: "customer",
      administratorAuthorized: false,
      allowedToolNames: [],
      includeMemory: false,
    });
    expect(fixture.providerRequests[1].input).toEqual([
      { role: "user", content: "Help with my AkiPasa application" },
    ]);
    expect(
      fixture.databaseRequests.some(({ url }) =>
        url.pathname.endsWith("/ai_agent_memory"),
      ),
    ).toBe(false);
  });

  it("rejects an unsolicited customer tool call despite the agent permission", async () => {
    const fixture = gatewayFixture(
      [],
      ["crm:support:read"],
      [
        [
          {
            type: "function_call",
            call_id: "unsolicited-call",
            name: "crm_list_support_queue",
            arguments: '{"limit":1}',
          },
        ],
      ],
    );
    await runAIAgent({
      service: fixture.service,
      actorId: "same-account",
      agentKey: "support",
      requestKind: "chat",
      message: "Help with AkiPasa",
      chatAudience: "customer",
      allowedToolNames: [],
      includeMemory: false,
    });
    expect(fixture.providerRequests[0].tools).toEqual([]);
    expect(
      fixture.databaseRequests.some(({ url }) =>
        url.pathname.endsWith("/reports"),
      ),
    ).toBe(false);
    expect(fixture.providerRequests[1].input).toContainEqual({
      type: "function_call_output",
      call_id: "unsolicited-call",
      output: JSON.stringify({
        ok: false,
        error: "tool_execution_failed",
        message: "The agent is not permitted to use this tool",
      }),
    });
    expect(
      fixture.databaseRequests
        .filter(({ url }) => url.pathname.includes("/rpc/"))
        .map(({ url }) => url.pathname.split("/").at(-1)),
    ).toEqual(["reserve_ai_budget", "complete_ai_budget"]);
    expect(fixture.tables.ai_activity_log.map((row) => row.event_type)).toEqual(
      ["chat.started", "chat.completed"],
    );
  });

  it.each([
    [undefined, ["crm:support:read"], "crm_list_support_queue", true],
    [
      ["crm_list_support_queue"],
      ["crm:support:read"],
      "crm_list_support_queue",
      true,
    ],
    [["crm_list_support_queue"], [], "crm_list_support_queue", false],
    [
      ["crm_list_catalogue"],
      ["crm:support:read"],
      "crm_list_support_queue",
      false,
    ],
    [undefined, ["crm:support:read"], "unknown_tool", false],
  ] as const)(
    "enforces the effective advertised tools (%s, %s, %s)",
    async (allowedToolNames, permissions, name, permitted) => {
      const fixture = gatewayFixture(
        [],
        [...permissions],
        [
          [
            {
              type: "function_call",
              call_id: "test-call",
              name,
              arguments: '{"limit":1}',
            },
          ],
        ],
      );
      await runAIAgent({
        service: fixture.service,
        actorId: "same-account",
        agentKey: "support",
        requestKind: "task",
        message: "Inspect the support queue",
        allowedToolNames: allowedToolNames && [...allowedToolNames],
        includeMemory: false,
      });
      expect(
        fixture.providerRequests[0].tools.map((tool) => tool.name),
      ).toEqual(
        permitted || (!allowedToolNames && permissions.length)
          ? ["crm_list_support_queue"]
          : [],
      );
      expect(
        fixture.databaseRequests.some(({ url }) =>
          url.pathname.endsWith("/reports"),
        ),
      ).toBe(permitted);
      const output = fixture.providerRequests[1].input.find(
        (item) => item.type === "function_call_output",
      );
      expect(JSON.parse(output?.output || "null")).toEqual(
        permitted
          ? { reports: fixture.tables.reports }
          : {
              ok: false,
              error: "tool_execution_failed",
              message: "The agent is not permitted to use this tool",
            },
      );
    },
  );

  it("preserves approval and audit for an allowed operator tool", async () => {
    const fixture = gatewayFixture(
      [],
      ["crm:catalogue:request_update"],
      [
        [
          {
            type: "function_call",
            call_id: "approval-call",
            name: "crm_request_venue_status_update",
            arguments: JSON.stringify({
              venue_id: "b1000000-0000-4000-8000-000000000001",
              status: "published",
              reason: "Inert review request",
            }),
          },
        ],
      ],
    );
    const result = await runAIAgent({
      service: fixture.service,
      actorId: "same-account",
      agentKey: "support",
      requestKind: "chat",
      message: "Request review",
      allowedToolNames: ["crm_request_venue_status_update"],
      includeMemory: false,
    });
    expect(result.status).toBe("waiting");
    expect(fixture.tables.ai_approvals).toHaveLength(1);
    expect(fixture.tables.ai_approvals[0]).toMatchObject({
      requested_by_agent_id: fixture.support.id,
      tool_name: "crm_request_venue_status_update",
      status: "pending",
    });
    expect(fixture.tables.ai_activity_log.map((row) => row.event_type)).toEqual(
      ["chat.started", "approval.requested", "chat.completed"],
    );
    expect(
      fixture.databaseRequests.some(({ url }) =>
        url.pathname.endsWith("/venues"),
      ),
    ).toBe(false);
    const output = fixture.providerRequests[1].input.find(
      (item) => item.type === "function_call_output",
    );
    expect(JSON.parse(output?.output || "null")).toMatchObject({
      approval_required: true,
      status: "pending",
    });
  });
});

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
      "crm_get_single_media_category_link",
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

  it("returns tool validation failures to the model so it can recover", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "resp_1",
            output: [
              {
                type: "function_call",
                call_id: "call_1",
                name: "crm_create_knowledge_article",
                arguments: "{}",
              },
            ],
            usage: { input_tokens: 10, output_tokens: 5 },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "resp_2",
            output: [
              {
                type: "message",
                content: [{ type: "output_text", text: "Recovered" }],
              },
            ],
            usage: { input_tokens: 12, output_tokens: 3 },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    const result = await createAIProvider("openai").run({
      model: "gpt-5.6-luna",
      instructions: "Correct invalid tool calls.",
      messages: [{ role: "user", content: "Save the research" }],
      tools: [
        {
          name: "crm_create_knowledge_article",
          description: "Save knowledge",
          permission: "crm:knowledge:create",
          approvalRequired: false,
          parameters: {
            type: "object",
            properties: {},
            required: [],
            additionalProperties: false,
          },
        },
      ],
      maxOutputTokens: 100,
      maxProviderRounds: 3,
      safetyIdentifier: "test",
      executeTool: async () => {
        throw new Error("title, category, and content are required");
      },
    });

    expect(result.text).toBe("Recovered");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondRequest = JSON.parse(
      String((fetchMock.mock.calls[1][1] as RequestInit).body),
    );
    expect(secondRequest.input).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "function_call_output",
          call_id: "call_1",
          output: expect.stringContaining("tool_execution_failed"),
        }),
      ]),
    );
  });

  it("adds governed OpenAI web search when the internal agent permission enables it", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "resp_web",
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: "Researched" }],
            },
          ],
          usage: { input_tokens: 8, output_tokens: 2 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    await createAIProvider("openai").run({
      model: "gpt-5.6-luna",
      instructions: "Research current facts.",
      messages: [{ role: "user", content: "Find current evidence" }],
      tools: [],
      enableWebSearch: true,
      maxOutputTokens: 100,
      maxProviderRounds: 1,
      safetyIdentifier: "test",
      executeTool: async () => ({}),
    });

    const body = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(body.tools).toEqual([
      { type: "web_search", search_context_size: "medium" },
    ]);
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

  it("raises the internal provider round guard for longer tool workflows", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "database",
        "migrations",
        "0053_raise_ai_provider_round_limit.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("p_max_provider_rounds not between 1 and 16");
  });

  it("grants web research explicitly through the internal agent permission model", () => {
    const sql = readFileSync(
      join(process.cwd(), "database", "migrations", "0055_ai_web_research.sql"),
      "utf8",
    );
    const gateway = readFileSync(
      join(process.cwd(), "src", "lib", "ai-team", "gateway.ts"),
      "utf8",
    );
    const chatRoute = readFileSync(
      join(process.cwd(), "src", "app", "api", "ai-team", "chat", "route.ts"),
      "utf8",
    );
    expect(sql).toContain('"web:search"');
    expect(sql).toContain("agent_key in");
    expect(sql).not.toContain("'support'");
    expect(sql).toContain("allow_web_search boolean not null default false");
    expect(gateway).toContain("input.allowWebSearch === true");
    expect(chatRoute).toContain(
      "allowWebSearch: z.boolean().optional().default(false)",
    );
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

  it("gives Telegram CRM calendar requests decisive defaults", () => {
    const route = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "ai-team",
        "telegram",
        "run",
        "route.ts",
      ),
      "utf8",
    );
    expect(route).toContain('timeZone: "Europe/Madrid"');
    expect(route).toContain("Current UTC instant");
    expect(route).toContain("assume the current local year");
    expect(route).toContain("current local month");
    expect(route).toContain("Do not ask for a time zone");
    expect(route).toContain("If duration is omitted, use 60 minutes");
    expect(route).toContain("call crm_create_calendar_event now");
    expect(route).toContain("Inspect the destination before mutating");
  });

  it("gives the administrator Telegram bot governed workspace management and self-extension", () => {
    const tools = readFileSync(
      join(process.cwd(), "src", "lib", "ai-team", "tools.ts"),
      "utf8",
    );
    const route = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "ai-team",
        "telegram",
        "run",
        "route.ts",
      ),
      "utf8",
    );
    const migration = readFileSync(
      join(
        process.cwd(),
        "database",
        "migrations",
        "0056_ai_workspace_management.sql",
      ),
      "utf8",
    );

    expect(route).toContain('"crm_create_workspace_project"');
    expect(route).toContain('"crm_manage_workspace_record"');
    expect(route).toContain('"ai_request_tool_capability"');
    expect(route).toContain("allowWebSearch: true");
    expect(route).toContain("use IDs returned by earlier tools immediately");
    expect(tools).toContain(
      'status: z.enum(["todo", "in-progress", "review", "done"])',
    );
    expect(tools).toContain('z.enum(["create", "update"])');
    expect(tools).not.toContain('z.enum(["create", "update", "delete"])');
    expect(tools).toContain('activation: "administrator_approval_required"');
    expect(migration).toContain('"crm:workspace:manage"');
    expect(migration).toContain('"ai:tools:request"');
  });

  it("connects verified media and all synchronized AkiHQ modules to Manager and Coder", () => {
    const tools = readFileSync(
      join(process.cwd(), "src", "lib", "ai-team", "tools.ts"),
      "utf8",
    );
    const route = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "ai-team",
        "telegram",
        "run",
        "route.ts",
      ),
      "utf8",
    );
    const config = readFileSync(join(process.cwd(), "wrangler.jsonc"), "utf8");
    const migration = readFileSync(
      join(
        process.cwd(),
        "database",
        "migrations",
        "0057_ai_full_workspace_and_agent_configuration.sql",
      ),
      "utf8",
    );

    expect(config).toContain('"AKIHQ_GATEWAY"');
    expect(tools).toContain('name: "crm_get_single_media_category_link"');
    expect(tools).toContain('name: "crm_post_team_chat_message"');
    expect(tools).toContain('name: "ai_request_agent_configuration_change"');
    for (const entity of [
      "event",
      "product",
      "invoice",
      "page",
      "form",
      "automation",
      "employee",
      "article",
    ]) {
      expect(tools).toContain(`${entity}: new Set(`);
    }
    expect(route).toContain('"crm_get_single_media_category_link"');
    expect(route).toContain('"crm_post_team_chat_message"');
    expect(route).toContain('"ai_request_agent_configuration_change"');
    expect(route).toContain(
      "Create the Knowledge article only after that tool returns exactly one verified item",
    );
    expect(migration).toContain('"crm:workspace:manage"');
    expect(migration).toContain('"ai:agents:request_change"');
    expect(migration).toContain("where agent_key = 'manager'");
    expect(migration).not.toContain("where agent_key = 'coder'");
  });
});

it("passes authorized web search through the gateway into the provider request", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  const requests: Array<{ tools: Array<{ type: string }> }> = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
    requests.push(JSON.parse(String(init?.body)));
    return Response.json({
      id: "response-test",
      output_text: "Checked",
      usage: { input_tokens: 1, output_tokens: 1 },
    });
  });
  for (const [permission, requested, customer, expected] of [
    [true, true, false, true],
    [false, true, false, false],
    [true, false, false, false],
    [true, true, true, false],
  ]) {
    const service = {
      from: (table: string) => {
        const result = {
          data:
            table === "ai_agents"
              ? agent(permission ? ["web:search"] : [])
              : [],
          error: null,
          count: 0,
        };
        const query = {
          select: () => query,
          eq: () => query,
          update: () => query,
          insert: () => query,
          maybeSingle: async () => result,
          then: (resolve: (value: typeof result) => unknown) =>
            Promise.resolve(result).then(resolve),
        };
        return query;
      },
      rpc: async (name: string) => ({
        data:
          name === "reserve_ai_budget"
            ? { reservation_id: "reservation-test" }
            : null,
        error: null,
      }),
    } as unknown as SupabaseClient;
    await runAIAgent({
      service,
      actorId: "admin",
      agentKey: "manager",
      requestKind: "task",
      message: "Research the business address",
      includeMemory: false,
      allowedToolNames: [],
      allowWebSearch: requested,
      chatAudience: customer ? "customer" : "operator",
    });
    expect(
      requests.at(-1)?.tools.some((tool) => tool.type === "web_search"),
    ).toBe(expected);
  }
});
