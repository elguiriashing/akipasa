import { describe, it, expect, vi } from "vitest";
import { executeReviewedIdentityDeletion } from "../src/lib/account-deletion-review";
import { purgeAccountDeletionEvidence } from "../src/lib/account-deletion-maintenance";
const target = "22222222-2222-4222-8222-222222222222",
  lease = "33333333-3333-4333-8333-333333333333";
describe("human-approved deletion boundary", () => {
  it("rejects mistyped identity before any provider call", async () => {
    const acquire = vi.fn();
    await expect(
      executeReviewedIdentityDeletion(
        target,
        "wrong",
        acquire,
        vi.fn(),
        vi.fn(),
      ),
    ).rejects.toThrow("Exact account");
    expect(acquire).not.toHaveBeenCalled();
  });
  it("rejects mismatched DB grant", async () => {
    const erase = vi.fn();
    await expect(
      executeReviewedIdentityDeletion(
        target,
        target,
        async () => ({ profile: lease, lease }),
        erase,
        vi.fn(),
      ),
    ).rejects.toThrow("mismatch");
    expect(erase).not.toHaveBeenCalled();
  });
  it("failed provider cannot complete; no automatic retry", async () => {
    const erase = vi.fn().mockRejectedValue(new Error("private provider body")),
      finish = vi.fn();
    await expect(
      executeReviewedIdentityDeletion(
        target,
        target,
        async () => ({ profile: target, lease }),
        erase,
        finish,
      ),
    ).rejects.toThrow("review before retrying");
    expect(erase).toHaveBeenCalledTimes(1);
    expect(finish).toHaveBeenCalledWith(lease, false);
  });
  it("success finalises only after provider success", async () => {
    const events: string[] = [];
    await executeReviewedIdentityDeletion(
      target,
      target,
      async () => ({ profile: target, lease }),
      async () => {
        events.push("erase");
      },
      async (_, ok) => {
        expect(ok).toBe(true);
        events.push("finish");
      },
    );
    expect(events).toEqual(["erase", "finish"]);
  });
  it("retention off makes zero calls; insecure endpoint rejected", async () => {
    const fetcher = vi.fn();
    await purgeAccountDeletionEvidence({}, fetcher);
    expect(fetcher).not.toHaveBeenCalled();
    await expect(
      purgeAccountDeletionEvidence(
        {
          ACCOUNT_DELETION_RETENTION_READY: "true",
          NEXT_PUBLIC_SUPABASE_URL: "http://example.test",
          SUPABASE_SERVICE_ROLE_KEY: "synthetic",
        },
        fetcher,
      ),
    ).rejects.toThrow("Encrypted");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
