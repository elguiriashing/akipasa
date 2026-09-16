import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { AITeamDashboard } from "./AITeamDashboard";

export default async function AITeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase } = await requireUser(locale, `/${locale}/admin/ai-team`);
  const month = new Date();
  const monthStart = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1),
  );

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
    supabase.from("ai_agents").select("*").order("created_at"),
    supabase
      .from("ai_chat_messages")
      .select("id,agent_id,role,content,created_at")
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("ai_tasks")
      .select("*,assigned:ai_agents!assigned_agent_id(agent_key,display_name)")
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("ai_approvals")
      .select("*,agent:ai_agents!requested_by_agent_id(agent_key,display_name)")
      .order("requested_at", { ascending: false })
      .limit(60),
    supabase
      .from("ai_activity_log")
      .select("*,agent:ai_agents(agent_key,display_name)")
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("ai_budget_settings")
      .select("*")
      .eq("singleton", true)
      .maybeSingle(),
    supabase
      .from("ai_usage_ledger")
      .select("*")
      .gte("created_at", monthStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
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
  const es = locale === "es";

  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Operaciones autónomas" : "Autonomous operations"}
        title={es ? "Equipo de IA" : "AI Team"}
        description={
          es
            ? "Seis especialistas con permisos acotados, memoria, aprobaciones y un presupuesto duro compartido."
            : "Six role-based specialists with scoped permissions, memory, approvals, and one shared hard budget."
        }
      />
      <AITeamDashboard
        locale={locale}
        providerConfigured={Boolean(process.env.OPENAI_API_KEY)}
        setupError={firstError?.message || null}
        initial={{
          agents: agents.data || [],
          messages: (messages.data || []).reverse(),
          tasks: tasks.data || [],
          approvals: approvals.data || [],
          activity: activity.data || [],
          budget: budget.data,
          usage: usage.data || [],
          schedules: schedules.data || [],
        }}
      />
    </>
  );
}
