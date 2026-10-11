import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc }),
}));
import {
  claimSubmissionRecipients,
  renderClaimSubmissionAlert,
  sendClaimSubmissionAlert,
} from "../src/lib/claim-submission-alert";
import { dispatchClaimSubmissionAlerts } from "../src/lib/claim-alert-delivery";

const claim = {
  claimId: "10000000-0000-4000-8000-000000000010",
  venueId: "10000000-0000-4000-8000-000000000005",
  venueName: "Bar <World>",
  submittedAt: "2026-10-11T01:30:00Z",
};
const env = {
  RESEND_API_KEY: "disposable-test-only",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.test",
  SUPABASE_SERVICE_ROLE_KEY: "disposable-test-only",
};

beforeEach(() => rpc.mockReset());
afterEach(() => vi.unstubAllGlobals());

it("addresses both company inboxes and provides a staff-only review destination", () => {
  expect(claimSubmissionRecipients).toEqual([
    "alex@akipasa.com",
    "andrew@akipasa.com",
  ]);
  const body = renderClaimSubmissionAlert(claim);
  expect(body.subject).toContain("Bar <World>");
  expect(body.text).toContain("staff/moderation?queue=claims");
  expect(body.html).toContain("staff/moderation?queue=claims");
  expect(body.html).not.toContain("<World>");
  expect(body.html).toContain("&lt;World&gt;");
  expect(body.text).not.toContain("applicant@example.test");
  expect(body.text).not.toContain("evidence:");
});

it("sends one provider message to both owners using a stable idempotency key", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(async () => Response.json({ id: "mail-1" }));
  vi.stubGlobal("fetch", fetcher);
  for (let i = 0; i < 2; i++)
    expect(await sendClaimSubmissionAlert(claim, env.RESEND_API_KEY)).toEqual({
      ok: true,
      messageId: "mail-1",
    });
  const payload = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(payload.to).toEqual([...claimSubmissionRecipients]);
  expect(payload.from).toContain("support@akipasa.com");
  expect(fetcher.mock.calls[0][1].headers["Idempotency-Key"]).toBe(
    fetcher.mock.calls[1][1].headers["Idempotency-Key"],
  );
});

it("distinguishes permanent, retryable and ambiguous mail-provider failures", async () => {
  for (const status of [400, 429, 503, 409]) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status })),
    );
    const outcome = await sendClaimSubmissionAlert(claim, env.RESEND_API_KEY);
    expect(outcome).toMatchObject({
      ok: false,
      error: "provider_" + status,
      retryable: status !== 400,
      ambiguous: status === 503 || status === 409,
    });
  }
});

it("does not lease or consume attempts when provider configuration is missing", async () => {
  expect(
    await dispatchClaimSubmissionAlerts({
      ...env,
      RESEND_API_KEY: undefined,
    }),
  ).toEqual({ sent: 0, failed: 0, configured: false });
  expect(rpc).not.toHaveBeenCalled();
});

it("leases one queued alert, acknowledges outcome and never leaks recipients via RPC", async () => {
  rpc
    .mockResolvedValueOnce({
      data: [{ claim_id: claim.claimId, lease_id: "lease-1", payload: claim }],
      error: null,
    })
    .mockResolvedValueOnce({ data: true, error: null });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ id: "accepted-1" })),
  );
  expect(await dispatchClaimSubmissionAlerts(env, claim.claimId)).toEqual({
    sent: 1,
    failed: 0,
    configured: true,
  });
  expect(rpc).toHaveBeenNthCalledWith(1, "claim_due_submission_alerts", {
    p_claim: claim.claimId,
  });
  expect(rpc).toHaveBeenNthCalledWith(
    2,
    "finish_claim_submission_alert",
    expect.objectContaining({
      p_claim: claim.claimId,
      p_lease: "lease-1",
      p_message: "accepted-1",
      p_ok: true,
    }),
  );
  expect(JSON.stringify(rpc.mock.calls)).not.toContain("andrew@akipasa.com");
});
