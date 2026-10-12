import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}));
import RewardsPage from "../src/app/[locale]/account/rewards/page";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.redirect.mockImplementation((path: string) => {
    throw new Error(`redirect:${path}`);
  });
  mocks.notFound.mockImplementation(() => {
    throw new Error("not-found");
  });
});

describe("legacy account progress links", () => {
  it.each(["en", "es"])(
    "takes an authenticated %s bookmark to the matching Passport area",
    async (locale) => {
      mocks.requireUser.mockResolvedValue({
        user: { id: "disposable-account" },
      });
      await expect(
        RewardsPage({ params: Promise.resolve({ locale }) }),
      ).rejects.toThrow(`redirect:/${locale}/passports`);
      expect(mocks.requireUser).toHaveBeenCalledWith(locale);
      expect(mocks.requireUser.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.redirect.mock.invocationCallOrder[0],
      );
    },
  );

  it("retains the account authentication gate before redirecting", async () => {
    mocks.requireUser.mockRejectedValue(new Error("authentication-required"));
    await expect(
      RewardsPage({ params: Promise.resolve({ locale: "es" }) }),
    ).rejects.toThrow("authentication-required");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("rejects unsupported locales without starting an account lookup", async () => {
    await expect(
      RewardsPage({ params: Promise.resolve({ locale: "fr" }) }),
    ).rejects.toThrow("not-found");
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
