import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  dispatch: vi.fn().mockResolvedValue({ configured: true, sent: 0 }),
}));
vi.mock("../src/lib/founder-push-delivery", () => ({
  dispatchFounderClaimPushes: mocks.dispatch,
}));
import { handleFounderPushWake } from "../src/lib/founder-push-wake";
const claim = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const secret = "synthetic-test-secret-with-at-least-32-characters";
const env = {
  AKIPASA_PUSH_ENABLED: "true",
  AKIPASA_PUSH_STARTED_AT: "2026-01-01T00:00:00.000Z",
  AKIPASA_PUSH_FOUNDER_IDS: claim,
  AKIPASA_PUSH_WEBHOOK_SECRET: secret,
};
const request = (
  body: unknown = { claim_id: claim },
  authorization = "Bearer " + secret,
) =>
  new Request("https://akipasa.com/api/internal/founder-push/wake", {
    method: "POST",
    headers: { Authorization: authorization },
    body: JSON.stringify(body),
  });
afterEach(() => vi.clearAllMocks());
describe("post-commit push wake", () => {
  it("requires separate high-entropy webhook authorization and production activation", async () => {
    const wait = vi.fn();
    expect(
      (
        await handleFounderPushWake(
          request(),
          { ...env, AKIPASA_PUSH_ENABLED: "false" },
          wait,
        )
      ).status,
    ).toBe(404);
    expect(
      (await handleFounderPushWake(request({}, "Bearer wrong"), env, wait))
        .status,
    ).toBe(403);
    expect(wait).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it("accepts only a bounded claim id without applicant data or client recipients", async () => {
    for (const payload of [
      { claim_id: claim, recipient: claim },
      { claim_id: claim, evidence: "private" },
      { claim_id: "x".repeat(1000) },
    ]) {
      expect(
        (await handleFounderPushWake(request(payload), env, vi.fn())).status,
      ).toBe(400);
    }
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it("dispatches the existing scoped outbox through waitUntil; duplicate wakeups use database leases", async () => {
    const wait = vi.fn();
    expect((await handleFounderPushWake(request(), env, wait)).status).toBe(
      202,
    );
    expect(wait).toHaveBeenCalledWith(expect.any(Promise));
    expect(mocks.dispatch).toHaveBeenCalledWith(env, claim);
  });
});
