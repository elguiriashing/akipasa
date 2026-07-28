import type { Bindings } from "./bindings";
import { resolveCommand } from "./command-router";
import type { CommandResult } from "./commands/types";
import { finishExecution, startExecution } from "./execution-log";
import type { VoiceRequest } from "./schema";
import { reserveNonce } from "./security/replay";

export async function executeOperatorCommand(
  env: Bindings,
  commandName: string,
  requestId: string,
  operationId: string,
  now = new Date(),
): Promise<CommandResult> {
  const command = resolveCommand(commandName);
  const request: VoiceRequest = {
    command: command.name,
    device: "dashboard",
    timestamp: now.toISOString(),
    nonce: operationId,
    signature: `v1=${"0".repeat(64)}`,
    payload: {},
  };
  await reserveNonce(request, env, now);
  const execution = await startExecution(env, {
    requestId,
    command: command.name,
    caller: "operator:dashboard",
    now,
  });

  try {
    const result = await command.execute({
      env,
      request,
      execution,
      now,
    });
    await finishExecution(env, execution, {
      success: true,
      data: result.data,
    });
    return result;
  } catch (error) {
    await finishExecution(env, execution, {
      success: false,
      code:
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "operator-command-failed",
      error,
    });
    throw error;
  }
}
