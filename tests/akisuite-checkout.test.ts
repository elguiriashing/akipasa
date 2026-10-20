import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/stripe", () => ({
  stripeRequest: vi.fn(),
  stripeRetrieve: vi.fn(),
}));

async function openCheckoutGates() {
  for (const key of [
    "AKISUITE_CHECKOUT_ENABLED",
    "AKISUITE_TAX_READY",
    "AKISUITE_FEATURES_READY",
    "AKISUITE_BILLING_VERIFIED",
    "AKISUITE_SUBSCRIPTIONS_READY",
    "AKISUITE_PERSONAL_PREMIUM_ENABLED",
  ])
    vi.stubEnv(key, "true");
  vi.stubEnv("AKISUITE_STRIPE_ACCOUNT_ID", "acct_1SVLH2GfzDhsgsQZ");
  vi.stubEnv("STRIPE_AKISUITE_MANAGEMENT_CONFIGURATION_ID", "bpc_management");
  vi.stubEnv("STRIPE_AKISUITE_PORTAL_CONFIGURATION_ID", "bpc_portal");
  vi.stubEnv("AKISUITE_ADOPTION_EARNED_POINTS", "1");
  vi.stubEnv("AKISUITE_ADOPTION_UNLOCK_THRESHOLD", "1");
  vi.stubEnv("AKISUITE_PERSONAL_PREMIUM_FORCE_OFF", "false");
  return import("../src/app/[locale]/account/subscription/akisuite-actions");
}

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

describe("AkiSuite checkout activation safeguards", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it.each([
    "akihq_standard",
    "akihq_pro",
    "akihq_business_addon",
    "aki_enterprise",
  ])(
    "rejects retired new acquisition %s even with every gate open",
    async (plan) => {
      const { startAkiSuiteCheckout } = await openCheckoutGates();
      const { requireUser } = await import("@/lib/auth");
      const { stripeRequest, stripeRetrieve } = await import("@/lib/stripe");
      const form = new FormData();
      form.set("locale", "en");
      form.set("plan", plan);
      form.set("interval", "month");
      form.set("workspaceId", "private-owner");
      await expect(startAkiSuiteCheckout(form)).rejects.toThrow(
        "REDIRECT:/en/account/subscription?error=plan",
      );
      expect(requireUser).not.toHaveBeenCalled();
      expect(stripeRequest).not.toHaveBeenCalled();
      expect(stripeRetrieve).not.toHaveBeenCalled();
    },
  );

  it.each(["akipasa_premium", "akibusiness_premium", "akiduermo_premium"])(
    "keeps %s behind the existing authenticated checkout workflow",
    async (plan) => {
      const { startAkiSuiteCheckout } = await openCheckoutGates();
      const { requireUser } = await import("@/lib/auth");
      const { stripeRequest, stripeRetrieve } = await import("@/lib/stripe");
      vi.mocked(requireUser).mockRejectedValueOnce(
        new Error("EXISTING_AUTH_WORKFLOW"),
      );
      const form = new FormData();
      form.set("locale", "es");
      form.set("plan", plan);
      form.set("interval", "month");
      form.set("workspaceId", "private-owner");
      await expect(startAkiSuiteCheckout(form)).rejects.toThrow(
        "EXISTING_AUTH_WORKFLOW",
      );
      expect(requireUser).toHaveBeenCalledWith(
        "es",
        "/es/account/subscription",
      );
      expect(stripeRequest).not.toHaveBeenCalled();
      expect(stripeRetrieve).not.toHaveBeenCalled();
    },
  );

  it("refuses checkout until billing and tax gates are enabled", async () => {
    vi.stubEnv("AKISUITE_CHECKOUT_ENABLED", "false");
    vi.stubEnv("AKISUITE_TAX_READY", "false");
    const { startAkiSuiteCheckout } = await import(
      "../src/app/[locale]/account/subscription/akisuite-actions"
    );
    const form = new FormData();
    form.set("locale", "en");
    form.set("plan", "aki_enterprise");
    form.set("interval", "year");
    await expect(startAkiSuiteCheckout(form)).rejects.toThrow(
      "REDIRECT:/en/account/subscription?error=checkout_unavailable",
    );
  });

  it("never trusts unsupported client plan codes", async () => {
    vi.stubEnv("AKISUITE_CHECKOUT_ENABLED", "true");
    vi.stubEnv("AKISUITE_TAX_READY", "true");
    vi.stubEnv("AKISUITE_STRIPE_ACCOUNT_ID", "acct_1SVLH2GfzDhsgsQZ");
    vi.stubEnv("AKISUITE_FEATURES_READY", "true");
    vi.stubEnv("AKISUITE_BILLING_VERIFIED", "true");
    vi.stubEnv("AKISUITE_SUBSCRIPTIONS_READY", "true");
    const { startAkiSuiteCheckout } = await import(
      "../src/app/[locale]/account/subscription/akisuite-actions"
    );
    const form = new FormData();
    form.set("locale", "es");
    form.set("plan", "free_enterprise_admin");
    form.set("interval", "month");
    await expect(startAkiSuiteCheckout(form)).rejects.toThrow(
      "REDIRECT:/es/account/subscription?error=plan",
    );
  });
});
