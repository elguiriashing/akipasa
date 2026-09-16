import { z } from "zod";
import { aiErrorResponse } from "@/lib/ai-team/auth";
import { runAIAgent } from "@/lib/ai-team/gateway";
import { timingSafeSecretEqual } from "@/lib/ai-team/request-security";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const requestSchema = z.object({
  instruction: z.string().trim().min(1).max(4_000),
  telegramUserId: z.string().regex(/^\d{1,20}$/),
  telegramChatId: z.string().regex(/^-?\d{1,20}$/),
  workspaceId: z.string().trim().min(1).max(120).default("ws_akipasa"),
});

const telegramTools = [
  "crm_workspace_overview",
  "crm_search_workspace",
  "crm_get_workspace_record",
  "crm_create_workspace_project",
  "crm_get_single_media_category_link",
  "crm_create_workspace_task",
  "crm_manage_workspace_record",
  "crm_post_team_chat_message",
  "ai_request_tool_capability",
  "ai_request_agent_configuration_change",
  "crm_create_knowledge_article",
  "crm_create_calendar_event",
  "crm_request_workspace_record_change",
  "crm_get_business_overview",
  "crm_list_catalogue",
  "crm_list_support_queue",
];

export async function POST(request: Request) {
  try {
    const expected = process.env.AI_SCHEDULER_SECRET;
    const supplied = request.headers.get("x-akipasa-ai-scheduler") || "";
    if (!expected || !(await timingSafeSecretEqual(supplied, expected))) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const input = requestSchema.parse(await request.json());
    const now = new Date();
    const localNow = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      dateStyle: "full",
      timeStyle: "long",
    }).format(now);
    const result = await runAIAgent({
      service: createSupabaseServiceClient(),
      agentKey: "manager",
      actorId: null,
      message: input.instruction,
      requestKind: "task",
      workspaceId: input.workspaceId,
      allowedToolNames: telegramTools,
      includeMemory: false,
      administratorAuthorized: true,
      allowWebSearch: true,
      additionalInstructions: [
        "This request came from the admin-only AkiPasa Telegram CRM command.",
        `Telegram user ID: ${input.telegramUserId}.`,
        `Telegram chat ID: ${input.telegramChatId}.`,
        `Current UTC instant: ${now.toISOString()}.`,
        `AkiHQ local date and time: ${localNow}. Default time zone: Europe/Madrid.`,
        "Act like an operator, not an intake form. Execute a supported action immediately whenever the instruction contains enough practical context.",
        "For calendar requests, assume the current local year when the year is omitted and the current local month when the month is omitted. Resolve today, tomorrow, weekdays, and partial dates from the supplied local date.",
        "Do not ask for a time zone. Use Europe/Madrid for Spain or when no different zone is explicitly stated. If the instruction clearly supplies another location or time zone, use that context.",
        "If duration is omitted, use 60 minutes. If the title is omitted, infer a short title from the instruction and use Appointment only as the final fallback. Treat a supplied address as the location and a supplied person as attendee context unless explicitly labelled as the title.",
        "If date, time, location, title, or duration can be inferred with these defaults, call crm_create_calendar_event now. Ask one concise follow-up only when the start date or start time is genuinely absent and cannot be inferred.",
        "Inspect the destination before mutating when a record ID, project ID, assignee, campaign, conversation, or other linkage is not already known. Reuse matching workspace data to fill useful native fields, but never invent personal data, identifiers, financial values, or external facts.",
        "Infer sensible low-risk defaults when the operator omits them: concise descriptions from the request, medium priority, Active project status, todo task status, and due dates appropriate to the requested workflow. State material assumptions in the reply.",
        "For multi-step work, use IDs returned by earlier tools immediately. Create a requested project before its tasks, then link every task to the returned project ID and preserve each explicitly requested task status.",
        "Use governed web search only when current external information would materially improve the result. Prefer workspace data for internal facts and cite external sources in the reply.",
        "If no supplied tool can complete a requested capability, call ai_request_tool_capability with a precise gap analysis and intended destination. Never claim the missing capability was implemented or activated; it enters the administrator-governed Coder workflow.",
        "For Knowledge requests involving a media category, call crm_get_single_media_category_link first. Create the Knowledge article only after that tool returns exactly one verified item and HTTPS link; include the verified item name and link in the article.",
        "The synchronized AkiHQ workspace tools cover CRM, Inbox, Tasks & Projects, Calendar, Inventory, Sales & Billing, Marketing, Sites & Forms, Automation, Team Chat, People, and Knowledge. Use the exact destination entity type and native fields; inspect before updating.",
        "Agent configuration changes must use ai_request_agent_configuration_change and remain pending until an administrator approves them.",
        "Perform only supported CRM actions through the supplied tools.",
        "Reply concisely for Telegram and list exactly what was created, changed, found, or left pending.",
      ].join("\n"),
    });

    return Response.json({
      ok: true,
      text: result.text.slice(0, 4_000),
      agentKey: result.agentKey,
      status: result.status,
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
