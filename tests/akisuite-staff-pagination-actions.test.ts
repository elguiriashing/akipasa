import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  rpc: vi.fn(),
  mail: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.access }));
vi.mock("@/lib/claim-mail-delivery", () => ({
  dispatchClaimDecisions: mocks.mail,
}));
vi.mock("next/navigation", () => ({
  redirect(url: string) {
    throw Error("redirect:" + url);
  },
}));
import {
  moderateItem,
  reviewRentalCompany,
  setAutomaticModeration,
} from "../src/app/[locale]/moderation/actions";
const id = "00000000-0000-4000-8000-000000000001";
function form(input: Record<string, string>) {
  const value = new FormData();
  for (const [k, v] of Object.entries(input)) value.set(k, v);
  return value;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.access.mockResolvedValue({
    supabase: { rpc: mocks.rpc },
    user: { id: "staff" },
  });
  mocks.mail.mockResolvedValue({ sent: 1 });
});
describe("moderation action paging context", () => {
  it.each([
    ["venue", "venues", "published"],
    ["event", "events", "published"],
    ["offer", "offers", "published"],
    ["submission", "community", "approved"],
    ["venue_claim", "claims", "approved"],
  ])(
    "preserves %s queue/page without changing audited payload",
    async (target, queue, decision) => {
      const value = form({
        locale: "en",
        targetType: target,
        targetId: id,
        decision,
        reason: "Reviewed fixture",
        queuePage: "3",
        claimPage: "4",
      });
      await expect(moderateItem(value)).rejects.toThrow(
        `redirect:/en/staff/moderation?queue=${queue}&page=${queue === "claims" ? 4 : 3}&updated=decision${queue === "claims" ? "&mail=sent" : ""}`,
      );
      expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("moderate_item", {
        target_type: target,
        target_id: id,
        decision,
        reason: "Reviewed fixture",
        p_duplicate_of: null,
      });
      expect(mocks.access).toHaveBeenCalledWith(
        "en",
        `/en/staff/moderation?queue=${queue}&page=${queue === "claims" ? 4 : 3}`,
      );
      if (queue === "claims")
        expect(mocks.mail).toHaveBeenCalledExactlyOnceWith(undefined, id);
      else expect(mocks.mail).not.toHaveBeenCalled();
    },
  );
  it.each(["en", "es"])(
    "%s failed decision retains queue/page and never sends mail",
    async (locale) => {
      mocks.rpc.mockResolvedValue({ error: { code: "42501" } });
      await expect(
        moderateItem(
          form({
            locale,
            targetType: "event",
            targetId: id,
            decision: "rejected",
            reason: "Fixture reason",
            queuePage: "7",
          }),
        ),
      ).rejects.toThrow(
        `redirect:/${locale}/staff/moderation?queue=events&page=7&error=decision`,
      );
      expect(mocks.mail).not.toHaveBeenCalled();
    },
  );
  it("invalid mutation retains only bounded derived context and never reaches auth/RPC", async () => {
    await expect(
      moderateItem(
        form({
          locale: "en",
          targetType: "offer",
          targetId: "invalid",
          decision: "published",
          reason: "yes",
          queuePage: "https://evil.test/",
        }),
      ),
    ).rejects.toThrow(
      "redirect:/en/staff/moderation?queue=offers&error=decision",
    );
    expect(mocks.access).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    "rental review error=%s retains page and exact RPC",
    async (failed) => {
      mocks.rpc.mockResolvedValue({ error: failed ? { code: "PT409" } : null });
      await expect(
        reviewRentalCompany(
          form({
            locale: "es",
            companyId: id,
            status: "published",
            note: "Reviewed fixture",
            queuePage: "5",
          }),
        ),
      ).rejects.toThrow(
        `redirect:/es/staff/moderation?queue=rentals&page=5&${failed ? "error" : "updated"}=review`,
      );
      expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
        "review_car_rental_company",
        { p_company: id, p_status: "published", p_note: "Reviewed fixture" },
      );
    },
  );
  it.each([false, true])(
    "mode change error=%s retains selected queue, not arbitrary destination",
    async (failed) => {
      mocks.rpc.mockResolvedValue({ error: failed ? { code: "42501" } : null });
      await expect(
        setAutomaticModeration(
          form({
            locale: "en",
            enabled: "true",
            queue: "community",
            queuePage: "2",
          }),
        ),
      ).rejects.toThrow(
        `redirect:/en/staff/moderation?queue=community&page=2&${failed ? "error" : "updated"}=automatic-mode`,
      );
      expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
        "set_automatic_moderation",
        { p_enabled: true },
      );
    },
  );
  it("claim email failure preserves the committed decision and claim paging", async () => {
    mocks.mail.mockRejectedValue(Error("fixture provider unavailable"));
    await expect(
      moderateItem(
        form({
          locale: "en",
          targetType: "venue_claim",
          targetId: id,
          decision: "approved",
          reason: "Fixture reason",
          claimPage: "2",
        }),
      ),
    ).rejects.toThrow(
      "redirect:/en/staff/moderation?queue=claims&page=2&updated=decision&mail=not_sent",
    );
    expect(mocks.rpc).toHaveBeenCalledOnce();
  });
});

it("derives return queue from the validated mutation when duplicate target fields are supplied", async () => {
  const input = form({
    locale: "en",
    targetType: "venue",
    targetId: id,
    decision: "published",
    reason: "Fixture reason",
    queuePage: "3",
  });
  input.append("targetType", "event");
  await expect(moderateItem(input)).rejects.toThrow(
    "redirect:/en/staff/moderation?queue=events&page=3&updated=decision",
  );
  expect(mocks.rpc).toHaveBeenCalledWith(
    "moderate_item",
    expect.objectContaining({ target_type: "event" }),
  );
});
