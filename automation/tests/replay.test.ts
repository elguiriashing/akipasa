import { describe, expect, it, vi } from "vitest";
import type { Bindings } from "../src/bindings";
import { reserveNonce } from "../src/security/replay";
import type { VoiceRequest } from "../src/schema";

const request: VoiceRequest = {
  command: "send-investor-update",
  device: "alex-phone",
  timestamp: "2026-07-27T09:00:00.000Z",
  nonce: "nonce_0123456789abcdef",
  signature: `v1=${"a".repeat(64)}`,
  payload: {},
};

function environment(options?: { cached?: boolean; insertError?: Error }) {
  const run = options?.insertError
    ? vi.fn().mockRejectedValue(options.insertError)
    : vi.fn().mockResolvedValue({ success: true });
  const bind = vi.fn(() => ({ run }));
  const prepare = vi.fn(() => ({ bind }));
  const get = vi.fn().mockResolvedValue(options?.cached ? "1" : null);
  const put = vi.fn().mockResolvedValue(undefined);

  return {
    env: {
      AUTOMATION_DB: { prepare },
      REPLAY_KV: { get, put },
      COMMAND_MAX_AGE_SECONDS: "300",
    } as unknown as Pick<
      Bindings,
      "AUTOMATION_DB" | "REPLAY_KV" | "COMMAND_MAX_AGE_SECONDS"
    >,
    prepare,
    bind,
    put,
  };
}

describe("replay protection", () => {
  it("reserves the nonce authoritatively in D1 and caches it in KV", async () => {
    const fixture = environment();
    await reserveNonce(
      request,
      fixture.env,
      new Date("2026-07-27T09:00:01.000Z"),
    );

    expect(fixture.prepare).toHaveBeenCalledOnce();
    expect(fixture.bind).toHaveBeenCalledWith(
      request.device,
      request.nonce,
      request.command,
      "2026-07-27T09:00:01.000Z",
      "2026-07-27T09:10:01.000Z",
    );
    expect(fixture.put).toHaveBeenCalledWith(
      `nonce:${request.device}:${request.nonce}`,
      "1",
      { expirationTtl: 600 },
    );
  });

  it("rejects a KV cache hit without writing to D1", async () => {
    const fixture = environment({ cached: true });
    await expect(reserveNonce(request, fixture.env)).rejects.toMatchObject({
      code: "replay-detected",
      status: 409,
    });
    expect(fixture.prepare).not.toHaveBeenCalled();
  });

  it("maps the D1 primary-key conflict to a replay rejection", async () => {
    const fixture = environment({
      insertError: new Error("UNIQUE constraint failed: request_nonces"),
    });
    await expect(reserveNonce(request, fixture.env)).rejects.toMatchObject({
      code: "replay-detected",
      status: 409,
    });
    expect(fixture.put).not.toHaveBeenCalled();
  });
});
