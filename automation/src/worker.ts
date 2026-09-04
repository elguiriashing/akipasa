import type { Bindings } from "./bindings";
import { app } from "./index";
import { runMaintenance } from "./maintenance";

type AISchedulerBindings = Bindings & {
  AI_SCHEDULER_SECRET?: string;
  PUBLIC_APP: Fetcher;
};

async function runAIScheduler(env: AISchedulerBindings) {
  if (!env.AI_SCHEDULER_SECRET) {
    console.warn(
      JSON.stringify({
        event: "ai_scheduler_skipped",
        reason: "secret_missing",
      }),
    );
    return;
  }
  const response = await env.PUBLIC_APP.fetch(
    new Request("https://akipasa.internal/api/ai-team/schedules/run", {
      method: "POST",
      headers: { "x-akipasa-ai-scheduler": env.AI_SCHEDULER_SECRET },
    }),
  );
  if (!response.ok) {
    console.error(
      JSON.stringify({
        event: "ai_scheduler_failed",
        status: response.status,
      }),
    );
    return;
  }
  const result = await response.json<{ claimed?: number }>();
  console.log(
    JSON.stringify({
      event: "ai_scheduler_completed",
      claimed: result.claimed || 0,
    }),
  );
}

export default {
  fetch: app.fetch,
  scheduled(
    _controller: ScheduledController,
    env: AISchedulerBindings,
    context: ExecutionContext,
  ) {
    context.waitUntil(Promise.all([runMaintenance(env), runAIScheduler(env)]));
  },
} satisfies ExportedHandler<AISchedulerBindings>;
