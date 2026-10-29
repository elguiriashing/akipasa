import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  gt: vi.fn(),
  is: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
  notice: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: db.from }),
}));
vi.mock("../src/lib/launch-waitlist-founder-notice", () => ({
  sendFounderWaitlistNotice: db.notice,
}));

import { POST } from "../src/app/api/launch-waitlist/confirm/route";
import { digestToken } from "../src/lib/launch-waitlist";

const token = "a".repeat(64);
const entry = {
  id: "20000000-0000-4000-8000-000000000022",
  product: "duermo",
  full_name: "Example Person",
  email: "person@example.invalid",
  city: "Fuengirola",
  audience: "person",
  interests: "",
  locale: "en",
  verified_at: "2026-10-29T00:00:00Z",
  marketing_consent_at: null,
};

function request(proof = token) {
  return new Request("https://akipasa.com/api/launch-waitlist/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ entry: entry.id, token: proof, lang: "en" }),
  });
}

function status(response: Response) {
  expect(response.status).toBe(303);
  return new URL(response.headers.get("location")!).searchParams.get("status");
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-server-key");
  vi.stubEnv("RESEND_API_KEY", "primary-test-key");
  vi.stubEnv("CLAIM_RESEND_API_KEY", "legacy-test-key");
  vi.stubEnv("LAUNCH_WAITLIST_FOUNDER_NOTICES_ENABLED", "true");
  const chain = {
    update: db.update,
    eq: db.eq,
    gt: db.gt,
    is: db.is,
    select: db.select,
    maybeSingle: db.maybeSingle,
  };
  for (const method of [db.from, db.update, db.eq, db.gt, db.is, db.select]) {
    method.mockReturnValue(chain);
  }
  db.maybeSingle.mockResolvedValue({ data: entry, error: null });
  db.notice.mockResolvedValue(true);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("verified waitlist founder notification boundary", () => {
  it("sends only after the exact atomic proof consumption succeeds", async () => {
    expect(status(await POST(request()))).toBe("confirmed");
    expect(db.from).toHaveBeenCalledWith("launch_waitlist_entries");
    expect(db.eq).toHaveBeenCalledWith("id", entry.id);
    expect(db.eq).toHaveBeenCalledWith("verification_hash", digestToken(token));
    expect(db.gt).toHaveBeenCalledWith(
      "verification_expires_at",
      expect.any(String),
    );
    expect(db.is).toHaveBeenCalledWith("verified_at", null);
    expect(db.update).toHaveBeenCalledWith({
      verified_at: expect.any(String),
      verification_hash: null,
      verification_expires_at: null,
    });
    expect(db.notice).toHaveBeenCalledExactlyOnceWith(
      entry,
      "primary-test-key",
    );
  });

  it("never notifies on expired or replayed proof", async () => {
    db.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(status(await POST(request()))).toBe("invalid");
    expect(db.notice).not.toHaveBeenCalled();
  });

  it("does not send a second notice when the consumed link is posted again", async () => {
    db.maybeSingle
      .mockResolvedValueOnce({ data: entry, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    expect(status(await POST(request()))).toBe("confirmed");
    expect(status(await POST(request()))).toBe("invalid");
    expect(db.notice).toHaveBeenCalledOnce();
  });

  it("never sends when confirmation storage is unavailable", async () => {
    db.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "private-database-failure" },
    });
    expect(status(await POST(request()))).toBe("unavailable");
    expect(db.notice).not.toHaveBeenCalled();
  });

  it("rejects malformed proof before database access or email", async () => {
    expect(status(await POST(request("invalid")))).toBe("invalid");
    expect(db.from).not.toHaveBeenCalled();
    expect(db.notice).not.toHaveBeenCalled();
  });

  it.each(["reject", "timeout"] as const)(
    "does not reverse verified consent after mail %s",
    async (failure) => {
      if (failure === "timeout") {
        db.notice.mockRejectedValue(new Error("provider-private-details"));
      } else {
        db.notice.mockResolvedValue(false);
      }
      expect(status(await POST(request()))).toBe("confirmed");
      expect(db.update).toHaveBeenCalledOnce();
      expect(db.notice).toHaveBeenCalledOnce();
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining("provider-private-details"),
      );
    },
  );
});

it("keeps founder mail disabled without the exact activation value", async () => {
  for (const value of [undefined, "", "false", "TRUE", "1"]) {
    vi.stubEnv("LAUNCH_WAITLIST_FOUNDER_NOTICES_ENABLED", value);
    expect(status(await POST(request()))).toBe("confirmed");
  }
  expect(db.notice).not.toHaveBeenCalled();
});
