import { aiErrorResponse, requireAIAdministrator } from "@/lib/ai-team/auth";
import { requireSameOrigin } from "@/lib/ai-team/request-security";

export async function GET(request: Request) {
  try {
    await requireSameOrigin(request);
    const { service } = await requireAIAdministrator(request);
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString();

    const [
      agents,
      messages,
      tasks,
      approvals,
      activity,
      budget,
      usage,
      schedules,
    ] = await Promise.all([
      service.from("ai_agents").select("*").order("created_at"),
      service
        .from("ai_chat_messages")
        .select("id,agent_id,role,content,created_at")
        .in("role", ["user", "assistant"])
        .order("created_at", { ascending: false })
        .limit(120),
      service
        .from("ai_tasks")
        .select(
          "*,assigned:ai_agents!assigned_agent_id(agent_key,display_name)",
        )
        .order("created_at", { ascending: false })
        .limit(80),
      service
        .from("ai_approvals")
        .select(
          "*,agent:ai_agents!requested_by_agent_id(agent_key,display_name)",
        )
        .order("requested_at", { ascending: false })
        .limit(60),
      service
        .from("ai_activity_log")
        .select("*,agent:ai_agents(agent_key,display_name)")
        .order("created_at", { ascending: false })
        .limit(120),
      service
        .from("ai_budget_settings")
        .select("*")
        .eq("singleton", true)
        .maybeSingle(),
      service
        .from("ai_usage_ledger")
        .select("*")
        .gte("created_at", monthStart)
        .order("created_at", { ascending: false })
        .limit(500),
      service
        .from("ai_schedules")
        .select("*,agent:ai_agents(agent_key,display_name)")
        .order("created_at", { ascending: false })
        .limit(80),
    ]);

    const firstError = [
      agents,
      messages,
      tasks,
      approvals,
      activity,
      budget,
      usage,
      schedules,
    ]
      .map((result) => result.error)
      .find(Boolean);
    if (firstError) throw new Error(firstError.message);

    return Response.json(
      {
        ok: true,
        providerConfigured: Boolean(process.env.OPENAI_API_KEY),
        data: {
          agents: agents.data || [],
          messages: (messages.data || []).reverse(),
          tasks: tasks.data || [],
          approvals: approvals.data || [],
          activity: activity.data || [],
          budget: budget.data,
          usage: usage.data || [],
          schedules: schedules.data || [],
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return aiErrorResponse(error);
  }
}
