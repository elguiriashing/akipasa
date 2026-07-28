import type { Bindings } from "../bindings";
import { AppError, errorMessage } from "../errors";
import type { VoiceRequest } from "../schema";

export async function reserveNonce(
  request: VoiceRequest,
  env: Pick<
    Bindings,
    "AUTOMATION_DB" | "REPLAY_KV" | "COMMAND_MAX_AGE_SECONDS"
  >,
  now = new Date(),
) {
  return reserveOperation(
    {
      actor: request.device,
      operationId: request.nonce,
      command: request.command,
    },
    env,
    now,
  );
}

export async function reserveOperation(
  operation: {
    actor: string;
    operationId: string;
    command: string;
    ttlSeconds?: number;
  },
  env: Pick<
    Bindings,
    "AUTOMATION_DB" | "REPLAY_KV" | "COMMAND_MAX_AGE_SECONDS"
  >,
  now = new Date(),
) {
  const key = `nonce:${operation.actor}:${operation.operationId}`;
  if (await env.REPLAY_KV.get(key)) {
    throw new AppError("replay-detected", 409, "Request already processed.");
  }

  const ttl = Math.max(
    60,
    operation.ttlSeconds || Number(env.COMMAND_MAX_AGE_SECONDS) * 2,
  );
  const expiresAt = new Date(now.getTime() + ttl * 1_000).toISOString();
  try {
    await env.AUTOMATION_DB.prepare(
      `INSERT INTO request_nonces
        (device_id, nonce, command, accepted_at, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(
        operation.actor,
        operation.operationId,
        operation.command,
        now.toISOString(),
        expiresAt,
      )
      .run();
  } catch (error) {
    if (/unique|primary key/i.test(errorMessage(error))) {
      throw new AppError("replay-detected", 409, "Request already processed.");
    }
    throw new AppError(
      "replay-store-unavailable",
      503,
      "Replay protection unavailable.",
    );
  }

  await env.REPLAY_KV.put(key, "1", { expirationTtl: ttl });
}
