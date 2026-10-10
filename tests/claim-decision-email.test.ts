import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc }) }));
import {
  claimEmailFrom,
  renderClaimDecision,
  sendClaimDecisionEmail,
} from "../src/lib/claim-decision-email";
import { dispatchClaimDecisions } from "../src/lib/claim-mail-delivery";
const claim = {
  claimId: "10000000-0000-4000-8000-000000000010",
  venueId: "10000000-0000-4000-8000-000000000005",
  venueName: "Test <Venue>",
  applicantName: "Guest <script>alert(1)</script>",
  reason: "Missing proof\nContact <example>",
  locale: "en" as const,
  decision: "approved" as const,
};
const env = {
  RESEND_API_KEY: "disposable-test-only",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.test",
  SUPABASE_SERVICE_ROLE_KEY: "disposable-test-only",
};
beforeEach(() => rpc.mockReset());
afterEach(() => vi.unstubAllGlobals());
it("renders both decisions in both languages with safe HTML, real feedback and correct destinations", () => {
  for (const locale of ["en", "es"] as const)
    for (const decision of ["approved", "rejected"] as const) {
      const mail = renderClaimDecision({ ...claim, locale, decision });
      expect(mail.html).toContain(`lang="${locale}"`);
      expect(mail.html).not.toContain("<script>");
      expect(mail.html).toContain("&lt;script&gt;");
      expect(mail.text).toContain(claim.reason);
      expect(mail.html).toContain("Contact &lt;example&gt;");
      expect(mail.html).toContain('role="presentation"');
      if (decision === "approved") {
        expect(mail.text).toContain(
          `${locale}/business/venue/${claim.venueId}`,
        );
        expect(mail.text).toContain(
          locale === "es" ? "propietario" : "owner access",
        );
      } else {
        expect(mail.text).toContain(`view=claims&venueId=${claim.venueId}`);
        expect(mail.text).toContain(
          locale === "es" ? "web oficial" : "official website",
        );
        expect(mail.text).toContain(
          locale === "es" ? "no garantiza" : "does not guarantee",
        );
      }
    }
});
it("handles missing applicant name and sanitizes the subject", () => {
  const mail = renderClaimDecision({
    ...claim,
    applicantName: null,
    venueName: "Venue\r\nInjected",
  });
  expect(mail.subject).not.toMatch(/[\r\n]/);
  expect(mail.text).toMatch(/^Hello,/);
});
it("uses the requested sender/reply address and stable claim key across retries", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(async () => Response.json({ id: "mail-1" }));
  vi.stubGlobal("fetch", fetcher);
  for (let i = 0; i < 2; i++)
    expect(
      await sendClaimDecisionEmail(
        { ...claim, recipient: "applicant@example.test" },
        env.RESEND_API_KEY,
      ),
    ).toMatchObject({ ok: true, messageId: "mail-1" });
  const first = fetcher.mock.calls[0][1];
  expect(first.headers["Idempotency-Key"]).toBe(
    fetcher.mock.calls[1][1].headers["Idempotency-Key"],
  );
  expect(JSON.parse(first.body)).toMatchObject({
    from: claimEmailFrom,
    reply_to: "alex@akipasa.com",
    to: ["applicant@example.test"],
  });
});
it("distinguishes retryable, permanent and ambiguous provider failures without pretending delivery", async () => {
  for (const status of [422, 429, 503, 409]) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status })),
    );
    expect(
      await sendClaimDecisionEmail(
        { ...claim, recipient: "applicant@example.test" },
        env.RESEND_API_KEY,
      ),
    ).toMatchObject({
      ok: false,
      error: `provider_${status}`,
      retryable: status !== 422,
      ambiguous: status === 503 || status === 409,
    });
  }
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));
  expect(
    await sendClaimDecisionEmail(
      { ...claim, recipient: "applicant@example.test" },
      env.RESEND_API_KEY,
    ),
  ).toMatchObject({ ok: false, ambiguous: true });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
  expect(
    await sendClaimDecisionEmail(
      { ...claim, recipient: "applicant@example.test" },
      env.RESEND_API_KEY,
    ),
  ).toMatchObject({ ok: false, ambiguous: true });
});
it("does not lease or send without runtime secrets", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect(await dispatchClaimDecisions({})).toEqual({
    sent: 0,
    failed: 0,
    configured: false,
  });
  expect(
    await sendClaimDecisionEmail({
      ...claim,
      recipient: "applicant@example.test",
    }),
  ).toMatchObject({ ok: false, error: "api_key_missing" });
  expect(rpc).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});
it("scopes immediate dispatch to the approved claim and acknowledges its exact lease", async () => {
  rpc
    .mockResolvedValueOnce({
      data: [
        {
          claim_id: claim.claimId,
          lease_id: "lease-1",
          recipient: "applicant@example.test",
          payload: claim,
        },
      ],
      error: null,
    })
    .mockResolvedValueOnce({ data: true, error: null });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => Response.json({ id: "mail-1" })),
  );
  expect(await dispatchClaimDecisions(env, claim.claimId)).toEqual({
    sent: 1,
    failed: 0,
    configured: true,
  });
  expect(rpc.mock.calls[0]).toEqual([
    "claim_claim_decision_emails",
    { p_claim: claim.claimId },
  ]);
  expect(rpc.mock.calls[1]).toEqual([
    "finish_claim_decision_email",
    expect.objectContaining({
      p_claim: claim.claimId,
      p_lease: "lease-1",
      p_ok: true,
      p_message: "mail-1",
    }),
  ]);
});
it("leaves queue read failures unsent and acknowledges provider failures for retry", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  rpc.mockResolvedValueOnce({ error: { code: "offline" } });
  expect((await dispatchClaimDecisions(env)).sent).toBe(0);
  rpc
    .mockResolvedValueOnce({
      data: [
        {
          claim_id: claim.claimId,
          lease_id: "lease-1",
          recipient: "applicant@example.test",
          payload: claim,
        },
      ],
    })
    .mockResolvedValueOnce({ data: true });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("", { status: 503 })),
  );
  expect((await dispatchClaimDecisions(env)).failed).toBe(1);
  expect(rpc.mock.calls.at(-1)?.[1]).toMatchObject({
    p_ok: false,
    p_retryable: true,
    p_ambiguous: true,
  });
  log.mockRestore();
});
it("supports an isolated claim-only key without enabling booking delivery", async () => {
  rpc
    .mockResolvedValueOnce({
      data: [
        {
          claim_id: claim.claimId,
          lease_id: "lease-1",
          recipient: "applicant@example.test",
          payload: claim,
        },
      ],
    })
    .mockResolvedValueOnce({ data: true });
  const fetcher = vi.fn().mockResolvedValue(Response.json({ id: "mail-1" }));
  vi.stubGlobal("fetch", fetcher);
  expect(
    await dispatchClaimDecisions({
      ...env,
      RESEND_API_KEY: undefined,
      CLAIM_RESEND_API_KEY: "claim-only-disposable",
    }),
  ).toMatchObject({ sent: 1, configured: true });
  expect(fetcher.mock.calls[0][1].headers.Authorization).toBe(
    "Bearer claim-only-disposable",
  );
});
