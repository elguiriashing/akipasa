import { z } from "zod";
import { aiErrorResponse, requireAIAdministrator } from "@/lib/ai-team/auth";
import { requireSameOrigin } from "@/lib/ai-team/request-security";
import { executeApprovedTool } from "@/lib/ai-team/tools";
import { runAIAgent } from "@/lib/ai-team/gateway";
import type { AIAgent } from "@/lib/ai-team/types";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("decide_approval"),
    approvalId: z.string().uuid(),
    decision: z.enum(["approve", "reject"]),
    note: z.string().trim().max(1000).default(""),
  }),
  z.object({
    action: z.literal("create_task"),
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().min(2).max(8000),
    assignedAgentId: z.string().uuid(),
    priority: z.number().int().min(1).max(5),
  }),
  z.object({
    action: z.literal("run_task"),
    taskId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("cancel_task"),
    taskId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("update_budget"),
    monthlyLimitEur: z.number().min(0).max(100000),
    hardCapEnabled: z.boolean(),
    requestsPerMinute: z.number().int().min(1).max(300),
    requestsPerHour: z.number().int().min(1).max(10000),
  }),
  z.object({
    action: z.literal("update_agent"),
    agentId: z.string().uuid(),
    provider: z.string().regex(/^[a-z][a-z0-9_-]{1,31}$/),
    model: z.string().trim().min(2).max(120),
    enabled: z.boolean(),
  }),
  z.object({
    action: z.literal("create_schedule"),
    agentId: z.string().uuid(),
    name: z.string().trim().min(2).max(120),
    prompt: z.string().trim().min(5).max(8000),
    intervalMinutes: z.number().int().min(5).max(43200),
  }),
  z.object({
    action: z.literal("toggle_schedule"),
    scheduleId: z.string().uuid(),
    enabled: z.boolean(),
  }),
]);

function assertResult(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function normalizeAgent(row: Record<string, unknown>): AIAgent {
  return {
    id: String(row.id),
    agent_key: String(row.agent_key),
    display_name: String(row.display_name),
    role_description: String(row.role_description),
    system_instructions: String(row.system_instructions),
    permissions: Array.isArray(row.permissions)
      ? row.permissions.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    provider: String(row.provider),
    model: String(row.model),
    status: String(row.status) as AIAgent["status"],
    enabled: row.enabled === true,
    last_active_at:
      typeof row.last_active_at === "string" ? row.last_active_at : null,
    last_error: typeof row.last_error === "string" ? row.last_error : null,
  };
}

export async function POST(request: Request) {
  try {
    await requireSameOrigin(request);
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { ok: false, error: "invalid_request" },
        { status: 400 },
      );
    }
    const { user, service } = await requireAIAdministrator(request);
    const action = parsed.data;

    if (action.action === "create_task") {
      const { data, error } = await service
        .from("ai_tasks")
        .insert({
          title: action.title,
          description: action.description,
          assigned_agent_id: action.assignedAgentId,
          created_by_profile_id: user.id,
          priority: action.priority,
        })
        .select("id,status")
        .single();
      assertResult(error);
      return Response.json({ ok: true, task: data });
    }

    if (action.action === "run_task") {
      const now = new Date().toISOString();
      const { data: task, error } = await service
        .from("ai_tasks")
        .update({ status: "in_progress", started_at: now, updated_at: now })
        .eq("id", action.taskId)
        .eq("status", "queued")
        .select("id,title,description,assigned_agent_id")
        .maybeSingle();
      assertResult(error);
      if (!task) throw new Error("Task is no longer queued");
      const result = await runAIAgent({
        service,
        agentId: task.assigned_agent_id,
        actorId: user.id,
        requestKind: "task",
        taskId: task.id,
        administratorAuthorized: true,
        message: task.description,
      });
      return Response.json({ ok: true, taskId: task.id, result });
    }

    if (action.action === "cancel_task") {
      const now = new Date().toISOString();
      const { data, error } = await service
        .from("ai_tasks")
        .update({ status: "cancelled", completed_at: now, updated_at: now })
        .eq("id", action.taskId)
        .eq("status", "queued")
        .select("id,status")
        .maybeSingle();
      assertResult(error);
      if (!data) throw new Error("Task is no longer queued");
      return Response.json({ ok: true, task: data });
    }

    if (action.action === "update_budget") {
      const { error } = await service
        .from("ai_budget_settings")
        .update({
          monthly_limit_eur: action.monthlyLimitEur,
          hard_cap_enabled: action.hardCapEnabled,
          requests_per_minute: action.requestsPerMinute,
          requests_per_hour: action.requestsPerHour,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("singleton", true);
      assertResult(error);
      await service.from("ai_activity_log").insert({
        event_type: "budget.updated",
        message: "AI budget and rate limits were updated",
        details: {
          monthly_limit_eur: action.monthlyLimitEur,
          hard_cap_enabled: action.hardCapEnabled,
          requests_per_minute: action.requestsPerMinute,
          requests_per_hour: action.requestsPerHour,
        },
      });
      return Response.json({ ok: true });
    }

    if (action.action === "update_agent") {
      const { error } = await service
        .from("ai_agents")
        .update({
          provider: action.provider,
          model: action.model,
          enabled: action.enabled,
          status: action.enabled ? "idle" : "waiting",
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", action.agentId);
      assertResult(error);
      return Response.json({ ok: true });
    }

    if (action.action === "create_schedule") {
      const { data, error } = await service
        .from("ai_schedules")
        .insert({
          agent_id: action.agentId,
          name: action.name,
          prompt: action.prompt,
          interval_minutes: action.intervalMinutes,
          next_run_at: new Date(
            Date.now() + action.intervalMinutes * 60_000,
          ).toISOString(),
          created_by: user.id,
        })
        .select("id")
        .single();
      assertResult(error);
      return Response.json({ ok: true, schedule: data });
    }

    if (action.action === "toggle_schedule") {
      const update: Record<string, unknown> = {
        enabled: action.enabled,
        updated_at: new Date().toISOString(),
      };
      if (action.enabled) update.next_run_at = new Date().toISOString();
      const { error } = await service
        .from("ai_schedules")
        .update(update)
        .eq("id", action.scheduleId);
      assertResult(error);
      return Response.json({ ok: true });
    }

    const { data: claimedApproval, error: claimError } = await service
      .from("ai_approvals")
      .update({
        status: action.decision === "approve" ? "approved" : "rejected",
        decided_at: new Date().toISOString(),
        decided_by: user.id,
        decision_note: action.note || null,
      })
      .eq("id", action.approvalId)
      .eq("status", "pending")
      .select("*,ai_agents(*)")
      .maybeSingle();
    assertResult(claimError);
    if (!claimedApproval) throw new Error("Approval is no longer pending");

    const agentRow = claimedApproval.ai_agents;
    if (!agentRow || Array.isArray(agentRow))
      throw new Error("Approval agent is unavailable");
    const agent = normalizeAgent(agentRow);
    if (action.decision === "reject") {
      await service.from("ai_activity_log").insert({
        agent_id: agent.id,
        task_id: claimedApproval.task_id,
        approval_id: action.approvalId,
        event_type: "approval.rejected",
        level: "warning",
        message: "Administrator rejected a requested action",
        details: { tool_name: claimedApproval.tool_name },
      });
      return Response.json({ ok: true, status: "rejected" });
    }

    try {
      const result = await executeApprovedTool(
        claimedApproval.tool_name,
        claimedApproval.arguments,
        { service, agent, actorId: user.id, taskId: claimedApproval.task_id },
      );
      const { error } = await service
        .from("ai_approvals")
        .update({
          status: "executed",
          executed_at: new Date().toISOString(),
          execution_result: result,
        })
        .eq("id", action.approvalId)
        .eq("status", "approved");
      assertResult(error);
      return Response.json({ ok: true, status: "executed", result });
    } catch (error) {
      await service
        .from("ai_approvals")
        .update({
          status: "failed",
          error:
            error instanceof Error
              ? error.message.slice(0, 2000)
              : "Execution failed",
        })
        .eq("id", action.approvalId);
      throw error;
    }
  } catch (error) {
    return aiErrorResponse(error);
  }
}
