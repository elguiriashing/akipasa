import { beforeEach, afterEach, expect, it, vi } from "vitest";

const { rpc, from, adminGetUserById } = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  adminGetUserById: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc,
    from,
    auth: { admin: { getUserById: adminGetUserById } },
  }),
}));
import { dispatchSuiteEmails } from "../src/lib/suite-mail-delivery";

const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.test",
  SUPABASE_SERVICE_ROLE_KEY: "test-only",
  CLAIM_RESEND_API_KEY: "test-only",
};
const row = {
  id: "00000000-0000-4000-8000-000000000040",
  dedupe_key: "welcome:user:akipasa",
  kind: "welcome_akipasa",
  profile_id: "00000000-0000-4000-8000-000000000041",
  recipient: "account@example.test",
  locale: "en",
  payload: { product: "akipasa" },
  lease_id: "00000000-0000-4000-8000-000000000042",
};

beforeEach(() => {
  rpc.mockReset();
  from.mockReset();
  adminGetUserById.mockReset();
  rpc.mockImplementation(async (name: string) => {
    if (name === "queue_due_suite_reminders") return { data: 0, error: null };
    if (name === "claim_due_suite_emails") return { data: [row], error: null };
    if (name === "finish_suite_email") return { data: true, error: null };
    return { data: null, error: { code: "unknown" } };
  });
});
afterEach(() => vi.unstubAllGlobals());

it("does not lease pending jobs when sending configuration is absent", async () => {
  expect(
    await dispatchSuiteEmails({
      ...env,
      CLAIM_RESEND_API_KEY: undefined,
    }),
  ).toEqual({
    sent: 0,
    failed: 0,
    skipped: 0,
    configured: false,
  });
  expect(rpc).not.toHaveBeenCalled();
});

it("sends a welcome once and acknowledges only a provider-confirmed message ID", async () => {
  adminGetUserById.mockResolvedValue({
    data: {
      user: {
        email: "account@example.test",
        email_confirmed_at: "2026-10-01T11:00:00Z",
        deleted_at: null,
      },
    },
    error: null,
  });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(async () => Response.json({ id: "provider-123" })),
  );
  const result = await dispatchSuiteEmails(env);
  expect(result).toMatchObject({ sent: 1, failed: 0, configured: true });
  expect(rpc).toHaveBeenCalledWith("queue_due_suite_reminders");
  expect(rpc).toHaveBeenCalledWith(
    "finish_suite_email",
    expect.objectContaining({
      p_id: row.id,
      p_lease: row.lease_id,
      p_ok: true,
      p_message: "provider-123",
    }),
  );
});

it("blocks a queued notification if the account changed address", async () => {
  adminGetUserById.mockResolvedValue({
    data: {
      user: {
        email: "new-account@example.test",
        email_confirmed_at: "2026-10-01T11:00:00Z",
        deleted_at: null,
      },
    },
    error: null,
  });
  const sender = vi.fn();
  vi.stubGlobal("fetch", sender);
  expect(await dispatchSuiteEmails(env)).toMatchObject({
    sent: 0,
    failed: 1,
    skipped: 1,
  });
  expect(sender).not.toHaveBeenCalled();
  expect(rpc).toHaveBeenCalledWith(
    "finish_suite_email",
    expect.objectContaining({
      p_ok: false,
      p_retryable: false,
      p_ambiguous: false,
      p_error: "verified_account_email_changed_or_deleted",
    }),
  );
});

it("blocks rental updates after a state or operator identity change", async () => {
  adminGetUserById.mockResolvedValue({
    data: {
      user: { email: "account@example.test", email_confirmed_at: "2098-01-01" },
    },
    error: null,
  });
  const rental = {
    ...row,
    kind: "rental_booking_update",
    payload: {
      bookingId: "booking",
      companyId: "branch",
      status: "confirmed",
      audience: "operator",
    },
  };
  rpc.mockImplementation(async (name: string) => ({
    data: name === "claim_due_suite_emails" ? [rental] : true,
    error: null,
  }));
  const q = {
    select: () => q,
    eq: () => q,
    maybeSingle: vi.fn().mockResolvedValue({
      data: {
        status: "cancelled",
        renter_id: "renter",
        vehicle: { company_id: "branch" },
      },
      error: null,
    }),
  };
  from.mockReturnValue(q);
  const sender = vi.fn();
  vi.stubGlobal("fetch", sender);
  expect(await dispatchSuiteEmails(env)).toMatchObject({ sent: 0, skipped: 1 });
  expect(sender).not.toHaveBeenCalled();
  q.maybeSingle
    .mockResolvedValueOnce({
      data: {
        status: "confirmed",
        renter_id: "renter",
        vehicle: { company_id: "branch" },
      },
      error: null,
    })
    .mockResolvedValueOnce({
      data: { submitted_by: "new-owner" },
      error: null,
    });
  expect(await dispatchSuiteEmails(env)).toMatchObject({ sent: 0, skipped: 1 });
  expect(sender).not.toHaveBeenCalled();
});
