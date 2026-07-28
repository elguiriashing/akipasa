import type { Bindings } from "./bindings";
import { errorMessage } from "./errors";

export type ExecutionRecord = {
  id: string;
  requestId: string;
  command: string;
  caller: string;
  startedAt: string;
  startedMs: number;
};

export async function startExecution(
  env: Bindings,
  input: {
    requestId: string;
    command: string;
    caller: string;
    now?: Date;
  },
): Promise<ExecutionRecord> {
  const now = input.now || new Date();
  const execution = {
    id: crypto.randomUUID(),
    requestId: input.requestId,
    command: input.command,
    caller: input.caller,
    startedAt: now.toISOString(),
    startedMs: Date.now(),
  };
  await env.AUTOMATION_DB.prepare(
    `INSERT INTO execution_logs
      (id, request_id, command, caller, started_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      execution.id,
      execution.requestId,
      execution.command,
      execution.caller,
      execution.startedAt,
    )
    .run();
  return execution;
}

export async function finishExecution(
  env: Bindings,
  execution: ExecutionRecord,
  result:
    | { success: true; data?: unknown }
    | { success: false; code: string; error: unknown },
) {
  const completedAt = new Date();
  const durationMs = Math.max(0, Date.now() - execution.startedMs);
  await env.AUTOMATION_DB.prepare(
    `UPDATE execution_logs
     SET completed_at = ?, duration_ms = ?, success = ?,
         error_code = ?, error_message = ?, result_json = ?
     WHERE id = ?`,
  )
    .bind(
      completedAt.toISOString(),
      durationMs,
      result.success ? 1 : 0,
      result.success ? null : result.code,
      result.success ? null : errorMessage(result.error).slice(0, 500),
      result.success && result.data !== undefined
        ? JSON.stringify(result.data).slice(0, 4_000)
        : null,
      execution.id,
    )
    .run();

  console.log(
    JSON.stringify({
      event: "automation_execution",
      requestId: execution.requestId,
      executionId: execution.id,
      command: execution.command,
      caller: execution.caller,
      durationMs,
      success: result.success,
      ...(!result.success ? { errorCode: result.code } : {}),
    }),
  );
}
