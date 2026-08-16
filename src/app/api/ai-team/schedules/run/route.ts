import { aiErrorResponse } from "@/lib/ai-team/auth";
import { runAIAgent } from "@/lib/ai-team/gateway";
import { timingSafeSecretEqual } from "@/lib/ai-team/request-security";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    const expected = process.env.AI_SCHEDULER_SECRET;
    const supplied = request.headers.get("x-akipasa-ai-scheduler") || "";
    if (!expected || !(await timingSafeSecretEqual(supplied, expected))) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const service = createSupabaseServiceClient();
    const { data: schedules, error } = await service.rpc(
      "claim_due_ai_schedules",
      {
        p_limit: 3,
      },
    );
    if (error) throw new Error(error.message);

    const results: Array<{ scheduleId: string; ok: boolean; error?: string }> =
      [];
    for (const schedule of schedules || []) {
      try {
        await runAIAgent({
          service,
          agentId: schedule.agent_id,
          actorId: null,
          message: schedule.prompt,
          requestKind: "scheduled",
          taskId: schedule.task_id,
          administratorAuthorized: true,
        });
        results.push({ scheduleId: schedule.schedule_id, ok: true });
      } catch (runError) {
        const message =
          runError instanceof Error ? runError.message : "Scheduled run failed";
        await service
          .from("ai_schedules")
          .update({
            last_error: message.slice(0, 2000),
            updated_at: new Date().toISOString(),
          })
          .eq("id", schedule.schedule_id);
        results.push({
          scheduleId: schedule.schedule_id,
          ok: false,
          error: message,
        });
      }
    }
    return Response.json({ ok: true, claimed: results.length, results });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
